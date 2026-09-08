import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized: missing Authorization header" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "Server configuration error: Supabase service credentials are missing." }, 500);

    // Verify the caller with the user's access token.
    const caller = createClient(url, serviceKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized: your admin session is invalid or expired. Please sign in again." }, 401);

    const admin = createClient(url, serviceKey);
    const { data: staffCaller, error: staffCheckError } = await admin
      .from("staff")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (staffCheckError) return json({ error: staffCheckError.message }, 500);
    if (staffCaller) return json({ error: "Staff accounts cannot create staff users." }, 403);

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON request body." }, 400);

    const name = String(body.name || "").trim();
    const phone = body.phone ? String(body.phone).trim() : null;
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const staffId = body.staffId ? String(body.staffId) : null;
    const basicSalary = Number(body.basicSalary ?? 2000);
    const allowance = Number(body.allowance ?? 0);
    const bonus = Number(body.bonus ?? 0);
    if (![basicSalary, allowance, bonus].every(Number.isFinite) || basicSalary < 0 || allowance < 0 || bonus < 0) {
      return json({ error: "Salary, allowance and bonus must be valid non-negative numbers." }, 400);
    }

    if (!name || !email || password.length < 6) {
      return json({ error: "Name, email and a password of at least 6 characters are required." }, 400);
    }

    if (staffId) {
      const { data: existing, error: existingError } = await admin.from("staff").select("id, auth_user_id").eq("id", staffId).maybeSingle();
      if (existingError) return json({ error: existingError.message }, 500);
      if (!existing) return json({ error: "Staff member not found." }, 404);
      if (existing.auth_user_id) return json({ error: "This staff member already has a login." }, 409);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "staff", name },
    });
    if (createError) return json({ error: createError.message }, 400);

    const result = staffId
      ? await admin.from("staff").update({ name, phone, email, auth_user_id: created.user.id, active: true, basic_salary: basicSalary, monthly_allowance: allowance, monthly_bonus: bonus }).eq("id", staffId).select().single()
      : await admin.from("staff").insert({ name, phone, email, auth_user_id: created.user.id, active: true, basic_salary: basicSalary, monthly_allowance: allowance, monthly_bonus: bonus }).select().single();

    if (result.error) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: result.error.message }, 400);
    }

    return json({ staff: result.data }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return json({ error: message }, 500);
  }
});
