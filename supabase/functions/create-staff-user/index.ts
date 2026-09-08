import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const caller = createClient(url, service, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const admin = createClient(url, service);
  const { data: staffCaller } = await admin.from("staff").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (staffCaller) return new Response(JSON.stringify({ error: "Staff accounts cannot create staff users" }), { status: 403, headers: { "Content-Type": "application/json" } });

  const body = await req.json();
  const name = String(body.name || "").trim();
  const phone = body.phone ? String(body.phone).trim() : null;
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!name || !email || password.length < 6) return new Response(JSON.stringify({ error: "Name, email and a password of at least 6 characters are required" }), { status: 400, headers: { "Content-Type": "application/json" } });

  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: "staff", name } });
  if (createError) return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { "Content-Type": "application/json" } });

  let staff;
  let staffError;
  if (body.staffId) {
    const existing = await admin.from("staff").select("id").eq("id", body.staffId).maybeSingle();
    if (!existing.data) { await admin.auth.admin.deleteUser(created.user.id); return new Response(JSON.stringify({ error: "Staff member not found" }), { status: 404, headers: { "Content-Type": "application/json" } }); }
    const result = await admin.from("staff").update({ name, phone, email, auth_user_id: created.user.id, active: true }).eq("id", body.staffId).select().single();
    staff = result.data; staffError = result.error;
  } else {
    const result = await admin.from("staff").insert({ name, phone, email, auth_user_id: created.user.id, active: true }).select().single();
    staff = result.data; staffError = result.error;
  }
  if (staffError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return new Response(JSON.stringify({ error: staffError.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ staff }), { status: 200, headers: { "Content-Type": "application/json" } });
});
