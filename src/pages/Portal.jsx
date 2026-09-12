import React, { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { supabase } from "../lib/supabase";
import { AdminDashboard } from "./Admin";
import { StaffDashboard } from "./Staff";
import "./operations.css";

export default function Portal() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isStaff, setIsStaff] = useState(null); // null = not yet determined

  useEffect(() => {
    if (!supabase) { setCheckingSession(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setIsStaff(null); // force a fresh role check whenever auth state changes
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    supabase.rpc("current_user_is_staff").then(({ data, error }) => {
      if (cancelled) return;
      setIsStaff(error ? false : !!data);
    });
    return () => { cancelled = true; };
  }, [session]);

  if (!supabase) {
    return (
      <div className="ops-login-shell">
        <div className="ops-login-card">
          <h1>Sign in</h1>
          <div className="ops-alert danger">Connect your Supabase keys in .env.local first.</div>
        </div>
      </div>
    );
  }

  if (checkingSession) {
    return <div className="ops-loader full"><div className="spinner" /> Loading…</div>;
  }

  if (!session) return <PortalLogin />;

  if (isStaff === null) {
    return <div className="ops-loader full"><div className="spinner" /> Checking access…</div>;
  }

  return isStaff ? <StaffDashboard session={session} /> : <AdminDashboard session={session} />;
}

function PortalLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) setError(signInError.message);
    setBusy(false);
  }

  return (
    <div className="ops-login-shell">
      <div className="ops-login-card">
        <h1>Sign in</h1>
        <p>Admins and staff both sign in here — you'll land on the right dashboard automatically.</p>
        <form className="ops-login-form" onSubmit={submit}>
          {error && <div className="ops-alert danger">{error}</div>}
          <label>Email
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label>Password
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          <button className="ops-primary" disabled={busy}><LogIn size={16} /> {busy ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="ops-login-fineprint">
          Accounts are created by an admin — in Supabase (for admins) or from the Staff tab (for staff). There's no public sign-up here.
        </p>
      </div>
    </div>
  );
}
