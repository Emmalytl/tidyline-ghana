import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertCircle, CalendarCheck, CheckCircle2, ChevronDown, Clock3,
  Download, LayoutDashboard, LogOut, Menu, MoreHorizontal, Plus, RefreshCw,
  Search, Settings as SettingsIcon, Trash2, UserCheck, Users, Wallet, X,
  XCircle, Calculator, Banknote
} from "lucide-react";
import { supabase } from "../lib/supabase";
import "./operations.css";

const STATUSES = ["Pending", "Confirmed", "In Progress", "Completed", "Cancelled"];
const PAYMENT_STATUSES = ["Unpaid", "Paid"];
const SERVICE_TYPES = [
  "Regular Cleaning", "Deep Cleaning", "Move In / Out",
  "Office Cleaning", "Post-Construction", "Laundry"
];

function money(value) {
  return `GH₵${Number(value || 0).toLocaleString("en-GH", {
    minimumFractionDigits: 0, maximumFractionDigits: 2
  })}`;
}
function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "TL";
}
function statusClass(status = "") {
  return `status status-${status.toLowerCase().replace(/[^a-z]+/g, "-")}`;
}
async function edgeFunctionErrorMessage(fnError) {
  if (!fnError) return "Unknown Edge Function error";
  try {
    const body = fnError.context && typeof fnError.context.json === "function" ? await fnError.context.json() : null;
    if (body?.error) return body.error;
    if (body?.message) return body.message;
  } catch {}
  return fnError.message || "Request could not be sent to the Edge Function";
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GH", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

export default function Admin() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!supabase) { setChecking(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!supabase) return <OperationsMessage title="Admin unavailable" text="Connect your Supabase keys in .env.local first." />;
  if (checking) return <OperationsLoading />;
  return session ? <AdminDashboard session={session} /> : <AdminLogin />;
}

function OperationsLoading() {
  return <div className="ops-screen"><div className="ops-loader"><div className="spinner" />Loading Tidyline Admin…</div></div>;
}

function OperationsMessage({ title, text }) {
  return <div className="ops-screen"><div className="ops-message"><div className="ops-logo">T</div><h1>{title}</h1><p>{text}</p></div></div>;
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) setError(signInError.message);
    setBusy(false);
  }

  return (
    <div className="ops-auth">
      <div className="ops-auth-card">
        <div className="ops-brand"><img className="ops-brand-logo" src="/Tidyline.png" alt="Tidyline" /><div><strong>Tidyline</strong><span>Operations</span></div></div>
        <div className="ops-auth-heading"><span className="ops-kicker">Private area</span><h1>Welcome back</h1><p>Sign in to manage bookings, staff, payments and operations.</p></div>
        <form onSubmit={submit} className="ops-auth-form">
          {error && <div className="ops-alert danger"><AlertCircle />{error}</div>}
          <label>Email<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@tidyline.com" /></label>
          <label>Password<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" /></label>
          <button className="ops-primary ops-full" disabled={busy}>{busy ? "Signing in…" : "Sign in to dashboard"}</button>
        </form>
        <div className="ops-auth-foot">Admin accounts are managed in Supabase Authentication.</div>
      </div>
    </div>
  );
}

function AdminDashboard({ session }) {
  const [tab, setTab] = useState("dashboard");
  const [bookings, setBookings] = useState([]);
  const [staff, setStaff] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  async function loadAll() {
    setLoading(true); setError("");
    const [b, s, cfg] = await Promise.all([
      supabase.from("bookings").select("*").order("date", { ascending: false }).order("start_time", { ascending: false }),
      supabase.from("staff").select("*").order("created_at", { ascending: true }),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle()
    ]);
    if (b.error || s.error || cfg.error) setError([b.error, s.error, cfg.error].filter(Boolean).map(x => x.message).join(" • "));
    setBookings(b.data || []);
    setStaff(s.data || []);
    setSettings(cfg.data || null);
    setLoading(false);
  }

  useEffect(() => { document.title = "Admin Dashboard | Tidyline Ghana"; loadAll(); }, []);

  function flash(message) {
    setToast(message);
    window.clearTimeout(window.__tidyToast);
    window.__tidyToast = window.setTimeout(() => setToast(""), 3000);
  }

  async function updateBooking(id, patch) {
    const { error: updateError } = await supabase.from("bookings").update(patch).eq("id", id);
    if (updateError) return flash(`Error: ${updateError.message}`);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
    flash("Booking updated");
  }

  async function addStaff(payload) {
    if (!payload.email?.trim() || !payload.password) {
      flash("Staff email and temporary password are required"); return false;
    }
    const { data, error: fnError } = await supabase.functions.invoke("create-staff-user", {
      body: {
        name: payload.name.trim(),
        phone: payload.phone.trim() || null,
        basicSalary: Number(payload.basicSalary) || 2000,
        allowance: Number(payload.allowance) || 0,
        bonus: Number(payload.bonus) || 0,
        email: payload.email.trim().toLowerCase(),
        password: payload.password
      }
    });
    if (fnError) { flash(`Staff login error: ${await edgeFunctionErrorMessage(fnError)}`); return false; }
    if (data?.error) { flash(`Staff login error: ${data.error}`); return false; }
    if (!data?.staff) { flash("Staff login error: the function returned no staff record."); return false; }
    setStaff(prev => [...prev, data.staff]);
    flash("Staff member and login created"); return true;
  }


  async function createStaffLogin(payload) {
    const { data, error: fnError } = await supabase.functions.invoke("create-staff-user", {
      body: { staffId: payload.staffId, name: payload.name.trim(), phone: payload.phone.trim() || null, basicSalary: Number(payload.basicSalary) || 2000, allowance: Number(payload.allowance) || 0, bonus: Number(payload.bonus) || 0, email: payload.email.trim().toLowerCase(), password: payload.password }
    });
    if (fnError) { flash(`Staff login error: ${await edgeFunctionErrorMessage(fnError)}`); return false; }
    if (data?.error) { flash(`Staff login error: ${data.error}`); return false; }
    if (!data?.staff) { flash("Staff login error: the function returned no staff record."); return false; }
    setStaff(prev => prev.map(s => s.id === payload.staffId ? data.staff : s));
    flash("Staff login created"); return true;
  }
  async function editStaff(id, payload) {
    const { error: updateError } = await supabase.from("staff").update(payload).eq("id", id);
    if (updateError) { flash(`Error: ${updateError.message}`); return false; }
    setStaff(prev => prev.map(s => s.id === id ? { ...s, ...payload } : s));
    flash("Staff details saved"); return true;
  }

  async function toggleStaff(id, active) {
    await editStaff(id, { active: !active });
  }

  async function removeStaff(id) {
    const { error: deleteError } = await supabase.from("staff").delete().eq("id", id);
    if (deleteError) return flash(`Error: ${deleteError.message}`);
    setStaff(prev => prev.filter(s => s.id !== id));
    flash("Staff member removed");
  }

  async function saveSettings(payload) {
    const { error: updateError } = await supabase.from("settings").update(payload).eq("id", 1);
    if (updateError) return flash(`Error: ${updateError.message}`);
    setSettings(prev => ({ ...prev, ...payload }));
    flash("Settings saved");
  }

  async function signOut() { await supabase.auth.signOut(); }

  function exportCSV() {
    if (!bookings.length) return flash("There are no bookings to export");
    const headers = ["Ref","Client","Phone","Email","Area","Address","Service","Date","Time","Staff","Status","Payment","Service Fee","Laundry Fee","Transport Fee","Total"];
    const rows = bookings.map(b => [
      b.booking_ref,b.name,b.phone,b.email || "",b.area,b.address,b.service_type,b.date,b.start_time,
      staff.find(s => s.id === b.staff_id)?.name || "",b.status,b.payment_status,b.service_fee,b.laundry_fee,b.transport_fee,b.total_fee
    ].map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(","));
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `tidyline-bookings-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url); flash("Bookings exported");
  }

  const nav = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "bookings", label: "Bookings", icon: CalendarCheck, badge: bookings.filter(b => b.status === "Pending").length },
    { id: "staff", label: "Staff", icon: Users },
    { id: "accounting", label: "Accounting", icon: Calculator },
    { id: "settings", label: "Settings", icon: SettingsIcon }
  ];

  return (
    <div className="ops-shell">
      <aside className={`ops-sidebar ${mobileNav ? "open" : ""}`}>
        <div className="ops-sidebar-brand"><img className="ops-brand-logo" src="/Tidyline.png" alt="Tidyline" /><div><strong>Tidyline</strong><span>Admin</span></div></div>
        <div className="ops-nav-title">Workspace</div>
        <nav>
          {nav.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} className={tab === id ? "selected" : ""} onClick={() => { setTab(id); setMobileNav(false); }}>
              <Icon /> <span>{label}</span>{badge > 0 && <b>{badge}</b>}
            </button>
          ))}
        </nav>
        <div className="ops-sidebar-bottom">
          <a href="/staff" className="ops-staff-link"><UserCheck /> Staff portal</a>
          <button onClick={signOut}><LogOut /> Sign out</button>
        </div>
      </aside>

      {mobileNav && <button className="ops-overlay" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}

      <main className="ops-main">
        <header className="ops-header">
          <div className="ops-mobile-title"><button className="ops-icon-btn" onClick={() => setMobileNav(true)}><Menu /></button><img src="/Tidyline.png" alt="Tidyline" /><span>Tidyline</span></div>
          <div className="ops-header-spacer" />
          <button className="ops-refresh" onClick={loadAll}><RefreshCw /> Refresh</button>
          <div className="ops-user"><div className="ops-avatar">{initials(session.user.email)}</div><div><strong>{session.user.email}</strong><span>Administrator</span></div></div>
        </header>

        <div className="ops-content">
          {error && <div className="ops-alert danger"><AlertCircle />{error}</div>}
          {tab === "dashboard" && <Overview bookings={bookings} staff={staff} setTab={setTab} />}
          {tab === "bookings" && <Bookings bookings={bookings} staff={staff} onUpdate={updateBooking} onExport={exportCSV} />}
          {tab === "staff" && <StaffManagement staff={staff} onAdd={addStaff} onCreateLogin={createStaffLogin} onEdit={editStaff} onToggle={toggleStaff} onRemove={removeStaff} />}
          {tab === "accounting" && <Accounting bookings={bookings} staff={staff} />}
          {tab === "settings" && <Settings settings={settings} onSave={saveSettings} />}
          {loading && <div className="ops-loading-bar"><span /></div>}
        </div>
      </main>
      {toast && <div className="ops-toast"><CheckCircle2 />{toast}</div>}
    </div>
  );
}

function Overview({ bookings, staff, setTab }) {
  const today = new Date().toISOString().slice(0,10);
  const todayBookings = bookings.filter(b => b.date === today);
  const pending = bookings.filter(b => b.status === "Pending");
  const completed = bookings.filter(b => b.status === "Completed");
  const paid = bookings.filter(b => b.payment_status === "Paid");
  const revenue = paid.reduce((sum,b) => sum + Number(b.total_fee || 0), 0);
  const upcoming = bookings.filter(b => b.status !== "Cancelled" && b.date >= today).sort((a,b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`)).slice(0,6);

  return (
    <div className="ops-page">
      <div className="ops-page-head">
        <div><span className="ops-kicker">Operations dashboard</span><h1>Good to see you.</h1><p>Here is what is happening with Tidyline today.</p></div>
        <button className="ops-primary" onClick={() => setTab("bookings")}><CalendarCheck /> Manage bookings</button>
      </div>

      <div className="ops-stat-grid">
        <Stat icon={CalendarCheck} label="Total bookings" value={bookings.length} detail={`${todayBookings.length} scheduled today`} />
        <Stat icon={Clock3} label="Pending requests" value={pending.length} detail="Need your attention" />
        <Stat icon={Wallet} label="Collected revenue" value={money(revenue)} detail={`${paid.length} paid bookings`} />
        <Stat icon={Users} label="Active staff" value={staff.filter(s => s.active).length} detail={`${staff.length} total staff`} />
      </div>

      <div className="ops-grid-2">
        <section className="ops-card">
          <div className="ops-card-head"><div><h2>Upcoming jobs</h2><p>Next scheduled cleaning jobs</p></div><button className="ops-text-btn" onClick={() => setTab("bookings")}>View all</button></div>
          {upcoming.length ? <div className="ops-job-list">{upcoming.map(b => <JobRow key={b.id} booking={b} staff={staff} />)}</div> : <Empty icon={CalendarCheck} title="No upcoming jobs" text="New bookings will appear here." />}
        </section>
        <section className="ops-card">
          <div className="ops-card-head"><div><h2>Booking health</h2><p>Current service pipeline</p></div></div>
          <div className="health-list">
            <Health label="Pending" value={pending.length} total={Math.max(bookings.length,1)} />
            <Health label="Confirmed" value={bookings.filter(b=>b.status==="Confirmed").length} total={Math.max(bookings.length,1)} />
            <Health label="Completed" value={completed.length} total={Math.max(bookings.length,1)} />
            <Health label="Cancelled" value={bookings.filter(b=>b.status==="Cancelled").length} total={Math.max(bookings.length,1)} />
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, detail }) {
  return <div className="ops-stat"><div className="ops-stat-icon"><Icon /></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;
}
function Health({ label, value, total }) {
  return <div className="health-item"><div><span>{label}</span><b>{value}</b></div><div className="health-track"><i style={{width:`${Math.min(100,(value/total)*100)}%`}} /></div></div>;
}
function JobRow({ booking, staff }) {
  const assigned = staff.find(s => s.id === booking.staff_id);
  return <div className="ops-job"><div className="job-date"><b>{new Date(`${booking.date}T00:00:00`).getDate()}</b><span>{new Date(`${booking.date}T00:00:00`).toLocaleDateString("en-GH",{month:"short"})}</span></div><div className="job-main"><strong>{booking.name}</strong><span>{booking.service_type} · {booking.start_time?.slice(0,5) || "—"}</span></div><div className="job-side"><span className={statusClass(booking.status)}>{booking.status}</span><small>{assigned?.name || "Unassigned"}</small></div></div>;
}
function Empty({ icon: Icon, title, text }) {
  return <div className="ops-empty"><Icon /><strong>{title}</strong><span>{text}</span></div>;
}

function calculatePayroll(staffMember) {
  const basic = Number(staffMember?.basic_salary ?? 2000);
  const allowance = Number(staffMember?.monthly_allowance ?? 0);
  const bonus = Number(staffMember?.monthly_bonus ?? 0);
  const gross = basic + allowance + bonus;
  const employeeSsnit = basic * 0.055;
  const employerContribution = basic * 0.13;
  const chargeable = Math.max(0, gross - employeeSsnit);
  // Ghana resident monthly PAYE bands published by GRA.
  let remaining = chargeable;
  let paye = 0;
  const bands = [[490,0],[110,0.05],[130,0.10],[3166.67,0.175],[16000,0.25],[30520,0.30],[Infinity,0.35]];
  for (const [band, rate] of bands) { const taxable = Math.min(remaining, band); if (taxable <= 0) break; paye += taxable * rate; remaining -= taxable; }
  const net = gross - employeeSsnit - paye;
  return { basic, allowance, bonus, gross, employeeSsnit, employerContribution, paye, net, totalSocial: employeeSsnit + employerContribution };
}

function Accounting({ bookings, staff }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const activeBookings = bookings.filter(b => b.status !== "Cancelled" && String(b.date || "").startsWith(month));
  const serviceRevenue = activeBookings.reduce((sum,b)=>sum+Number(b.service_fee||0)+Number(b.laundry_fee||0),0);
  const laundryRevenue = activeBookings.reduce((sum,b)=>sum+Number(b.laundry_fee||0),0);
  const transportRevenue = activeBookings.reduce((sum,b)=>sum+Number(b.transport_fee||0),0);
  const totalRevenue = activeBookings.reduce((sum,b)=>sum+Number(b.total_fee||0),0);
  const adminFee = serviceRevenue * 0.40;
  const payroll = staff.filter(s=>s.active).map(s=>({s,p:calculatePayroll(s)}));
  const employeeSsnit = payroll.reduce((x,r)=>x+r.p.employeeSsnit,0);
  const employerSsnit = payroll.reduce((x,r)=>x+r.p.employerContribution,0);
  const paye = payroll.reduce((x,r)=>x+r.p.paye,0);
  const grossPayroll = payroll.reduce((x,r)=>x+r.p.gross,0);
  const netPayroll = payroll.reduce((x,r)=>x+r.p.net,0);
  const totalPayrollCost = grossPayroll + employerSsnit;
  const businessAfterAdminAndPayroll = totalRevenue - adminFee - totalPayrollCost;
  const staffRevenue = staff.map(s => ({s, revenue: activeBookings.filter(b=>b.staff_id===s.id).reduce((x,b)=>x+Number(b.service_fee||0)+Number(b.laundry_fee||0),0)}));
  return <div className="ops-page">
    <div className="ops-page-head compact"><div><span className="ops-kicker">Finance & payroll</span><h1>Accounting</h1><p>Track service revenue, staff production, payroll, statutory deductions and the 40% administrative fee.</p></div><label className="month-picker">Month<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label></div>
    <div className="ops-stat-grid">
      <Stat icon={Wallet} label="Total revenue" value={money(totalRevenue)} detail={`${activeBookings.length} non-cancelled bookings`} />
      <Stat icon={Banknote} label="Service revenue" value={money(serviceRevenue)} detail="Before admin fee" />
      <Stat icon={Calculator} label="Admin fee (40%)" value={money(adminFee)} detail="Of exact service amount" />
      <Stat icon={Users} label="Payroll cost" value={money(totalPayrollCost)} detail="Gross payroll + 13% employer contribution" />
    </div>
    <div className="ops-grid-2">
      <section className="ops-card"><div className="ops-card-head"><div><h2>Staff revenue</h2><p>Service revenue generated by assigned staff.</p></div></div><div className="accounting-list">{staffRevenue.map(({s,revenue})=><div className="accounting-row" key={s.id}><div className="client-cell"><div className="ops-avatar small">{initials(s.name)}</div><div><strong>{s.name}</strong><small>{s.active?"Active":"Inactive"}</small></div></div><strong className="money">{money(revenue)}</strong></div>)}{!staff.length&&<Empty icon={Users} title="No staff" text="Add staff to see production revenue."/>}</div></section>
      <section className="ops-card"><div className="ops-card-head"><div><h2>Statutory deductions</h2><p>Calculated monthly from each employee's payroll.</p></div></div><div className="health-list"><Health label="Employee SSNIT 5.5%" value={money(employeeSsnit)} total={Math.max(grossPayroll,1)}/><Health label="Employer contribution 13%" value={money(employerSsnit)} total={Math.max(grossPayroll,1)}/><Health label="PAYE / income tax" value={money(paye)} total={Math.max(grossPayroll,1)}/></div><div className="accounting-note">Employee SSNIT is 5.5% of basic salary only. Employer contribution is 13%, making 18.5% total mandatory social security contribution. Cash allowances are included in PAYE chargeable income according to GRA guidance.</div></section>
    </div>
    <section className="ops-card"><div className="ops-card-head"><div><h2>Payroll</h2><p>Basic salary, allowances, bonuses, employee deductions and take-home pay.</p></div></div><div className="ops-booking-table payroll-table"><div className="ops-table-head"><span>Staff</span><span>Basic</span><span>Allowances</span><span>Bonus</span><span>SSNIT 5.5%</span><span>PAYE</span><span>Net pay</span></div>{payroll.map(({s,p})=><div className="ops-table-row static" key={s.id}><div className="client-cell"><div className="ops-avatar small">{initials(s.name)}</div><div><strong>{s.name}</strong><small>{s.email||"No login email"}</small></div></div><div>{money(p.basic)}</div><div>{money(p.allowance)}</div><div>{money(p.bonus)}</div><div>{money(p.employeeSsnit)}</div><div>{money(p.paye)}</div><div className="money">{money(p.net)}</div></div>)}{!payroll.length&&<Empty icon={Users} title="No active staff" text="Activate staff to include them in payroll."/>}</div></section>
    <section className="ops-card"><div className="ops-card-head"><div><h2>Revenue summary</h2><p>Business view for the selected month.</p></div></div><div className="detail-grid"><Detail label="Service revenue" value={money(serviceRevenue)}/><Detail label="Laundry revenue" value={money(laundryRevenue)}/><Detail label="Transport revenue" value={money(transportRevenue)}/><Detail label="Administrative fee (40%)" value={money(adminFee)}/><Detail label="Gross payroll" value={money(grossPayroll)}/><Detail label="Employer contribution" value={money(employerSsnit)}/><Detail label="Net payroll paid" value={money(netPayroll)} strong/><Detail label="After admin fee + payroll" value={money(businessAfterAdminAndPayroll)} strong/></div></section>
  </div>;
}

function Bookings({ bookings, staff, onUpdate, onExport }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Upcoming");
  const [service, setService] = useState("All");
  const [selected, setSelected] = useState(null);
  const searchInput = React.useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === searchInput.current) {
        setQuery("");
        searchInput.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = useMemo(() => bookings.filter(b => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || [b.name,b.phone,b.booking_ref,b.area,b.email,b.service_type].some(v => String(v || "").toLowerCase().includes(q));
    const matchesStatus = status === "All" ? true : status === "Upcoming" ? (b.status !== "Completed" && b.status !== "Cancelled") : b.status === status;
    return matchesQuery && matchesStatus && (service === "All" || b.service_type === service);
  }), [bookings, query, status, service]);

  return (
    <div className="ops-page">
      <div className="ops-page-head compact"><div><span className="ops-kicker">Operations</span><h1>Bookings</h1><p>Review, assign and update every cleaning request.</p></div><button className="ops-secondary" onClick={onExport}><Download /> Export CSV</button></div>
      <div className="ops-toolbar">
        <div className={`ops-search ${query ? "has-value" : ""}`}>
          <div className="ops-search-icon"><Search /></div>
          <div className="ops-search-main">
            <input ref={searchInput} aria-label="Search bookings" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search bookings…" />
            {query && <span className="ops-search-hint">Searching client, phone, reference, area or service</span>}
          </div>
          {query && <button type="button" className="ops-search-clear" onClick={() => setQuery("")} aria-label="Clear search"><X /></button>}
          <kbd className="ops-search-kbd">⌘ K</kbd>
        </div>
        <select aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value)}><option>Upcoming</option><option>All</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
        <select aria-label="Filter by service" value={service} onChange={e => setService(e.target.value)}><option>All</option>{SERVICE_TYPES.map(s=><option key={s}>{s}</option>)}</select>
        <div className="ops-search-result"><strong>{filtered.length}</strong> booking{filtered.length === 1 ? "" : "s"}{status !== "All" ? ` · ${status}` : ""}</div>
      </div>

      <div className="ops-booking-table">
        <div className="ops-table-head"><span>Client</span><span>Service</span><span>Schedule</span><span>Staff</span><span>Status</span><span>Payment</span><span>Total</span><span /></div>
        {filtered.map(b => <BookingRow key={b.id} booking={b} staff={staff} onUpdate={onUpdate} onOpen={() => setSelected(b)} />)}
        {!filtered.length && <Empty icon={Search} title="No bookings found" text="Try changing your search or filters." />}
      </div>
      {selected && <BookingDrawer booking={bookings.find(b => b.id === selected.id) || selected} staff={staff} onUpdate={onUpdate} onClose={() => setSelected(null)} />}
    </div>
  );
}

function BookingRow({ booking:b, staff, onUpdate, onOpen }) {
  const assigned = staff.find(s => s.id === b.staff_id);
  return <button className="ops-table-row" onClick={onOpen}>
    <div className="client-cell"><div className="ops-avatar small">{initials(b.name)}</div><div><strong>{b.name}</strong><small>{b.phone} · {b.booking_ref}</small></div></div>
    <div><strong>{b.service_type}</strong><small>{b.area}{b.laundry_addon ? " · Laundry added" : ""}</small></div>
    <div><strong>{formatDate(b.date)}</strong><small>{b.start_time?.slice(0,5) || "—"}</small></div>
    <div className="staff-mini">{assigned ? <><span className="mini-dot">{initials(assigned.name)}</span>{assigned.name}</> : <span className="muted">Unassigned</span>}</div>
    <div><span className={statusClass(b.status)}>{b.status}</span></div>
    <div><span className={`payment ${b.payment_status === "Paid" ? "paid" : ""}`}>{b.payment_status}</span></div>
    <div className="money">{money(b.total_fee)}</div>
    <div><MoreHorizontal /></div>
  </button>;
}

function BookingDrawer({ booking:b, staff, onUpdate, onClose }) {
  const [saving, setSaving] = useState(false);
  async function change(patch) {
    setSaving(true); await onUpdate(b.id, patch); setSaving(false);
  }
  return <div className="ops-drawer-wrap" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <aside className="ops-drawer">
      <div className="ops-drawer-head"><div><span className="ops-kicker">Booking {b.booking_ref}</span><h2>{b.name}</h2></div><button className="ops-icon-btn" onClick={onClose}><X /></button></div>
      <div className="drawer-client"><div className="ops-avatar large">{initials(b.name)}</div><div><strong>{b.phone}</strong><a href={`mailto:${b.email || ""}`}>{b.email || "No email provided"}</a></div></div>
      <div className="drawer-section"><h3>Booking details</h3><div className="detail-grid"><Detail label="Service" value={b.service_type}/><Detail label="Date" value={formatDate(b.date)}/><Detail label="Start time" value={b.start_time?.slice(0,5)}/><Detail label="Area" value={b.area}/><Detail label="Address" value={b.address}/><Detail label="Service fee" value={money(b.service_fee)}/>{b.laundry_addon && <Detail label="Laundry" value={money(b.laundry_fee)}/>}<Detail label="Transport fee" value={money(b.transport_fee)}/><Detail label="Total" value={money(b.total_fee)} strong/></div></div>
      {(b.job_photo_url || b.started_at || b.completed_at) && <div className="drawer-section"><h3>Job progress</h3><div className="detail-grid">{b.started_at && <Detail label="Started" value={new Date(b.started_at).toLocaleString("en-GH")}/>}{b.completed_at && <Detail label="Completed" value={new Date(b.completed_at).toLocaleString("en-GH")}/>}</div>{b.job_photo_url && <a className="job-photo-preview" style={{marginTop:12}} href={b.job_photo_url} target="_blank" rel="noreferrer"><img src={b.job_photo_url} alt="Area at job start"/><span>View start photo</span></a>}</div>}
      <div className="drawer-section"><h3>Assignment & status</h3>
        <label className="drawer-field">Assigned staff<select value={b.staff_id || ""} disabled={saving} onChange={e => change({staff_id:e.target.value || null})}><option value="">Unassigned</option>{staff.map(s=><option key={s.id} value={s.id}>{s.name}{s.active ? "" : " (inactive)"}</option>)}</select></label>
        <label className="drawer-field">Booking status<select value={b.status} disabled={saving} onChange={e => change({status:e.target.value})}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></label>
        <label className="drawer-field">Payment status<select value={b.payment_status} disabled={saving} onChange={e => change({payment_status:e.target.value})}>{PAYMENT_STATUSES.map(s=><option key={s}>{s}</option>)}</select></label>
      </div>
      <div className="drawer-actions"><a className="ops-secondary" href={`tel:${b.phone}`}><Activity /> Call client</a><a className="ops-primary" href={`https://wa.me/${String(b.phone||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer">WhatsApp</a></div>
    </aside>
  </div>;
}
function Detail({label,value,strong}) { return <div className="detail"><span>{label}</span><b className={strong?"strong":""}>{value || "—"}</b></div>; }

function StaffManagement({ staff, onAdd, onCreateLogin, onEdit, onToggle, onRemove }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name,setName]=useState(""); const [phone,setPhone]=useState("");
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [basicSalary,setBasicSalary]=useState(2000); const [allowance,setAllowance]=useState(0); const [bonus,setBonus]=useState(0); const [loginOnly,setLoginOnly]=useState(false);
  function reset(){setName("");setPhone("");setEmail("");setPassword("");setBasicSalary(2000);setAllowance(0);setBonus(0);setEditing(null);setShowAdd(false);setLoginOnly(false)}
  function startEdit(s){ setEditing(s.id); setName(s.name); setPhone(s.phone || ""); setEmail(s.email || ""); setPassword(""); setBasicSalary(Number(s.basic_salary ?? 2000)); setAllowance(Number(s.monthly_allowance ?? 0)); setBonus(Number(s.monthly_bonus ?? 0)); setShowAdd(false); setLoginOnly(false); }
  function startLogin(s){ setEditing(s.id); setName(s.name); setPhone(s.phone || ""); setEmail(s.email || ""); setPassword(""); setBasicSalary(Number(s.basic_salary ?? 2000)); setAllowance(Number(s.monthly_allowance ?? 0)); setBonus(Number(s.monthly_bonus ?? 0)); setShowAdd(false); setLoginOnly(true); }
  async function submit(e){
    e.preventDefault();
    if(!name.trim()) return;
    let ok = true;
    if(editing && loginOnly) ok = await onCreateLogin({staffId:editing,name,phone,email,password,basicSalary:Number(basicSalary)||2000,allowance:Number(allowance)||0,bonus:Number(bonus)||0});
    else if(editing) ok = await onEdit(editing,{name:name.trim(),phone:phone.trim()||null,basic_salary:Number(basicSalary)||2000,monthly_allowance:Number(allowance)||0,monthly_bonus:Number(bonus)||0});
    else ok = await onAdd({name,phone,email,password,basicSalary:Number(basicSalary)||2000,allowance:Number(allowance)||0,bonus:Number(bonus)||0});
    if (ok !== false) reset();
  }
  return <div className="ops-page">
    <div className="ops-page-head compact"><div><span className="ops-kicker">Team management</span><h1>Staff</h1><p>Create staff accounts, manage cleaners and assign them to customer bookings.</p></div><button className="ops-primary" onClick={()=>{setShowAdd(true);setEditing(null);setName("");setPhone("");setEmail("");setPassword("");setBasicSalary(2000);setAllowance(0);setBonus(0)}}><Plus /> Add staff</button></div>
    {(showAdd || editing) && <form className="ops-card staff-form" onSubmit={submit}>
      <div><h2>{loginOnly ? "Create staff login" : editing ? "Edit staff member" : "Add staff member"}</h2><p>{loginOnly ? "Link this existing staff member to a Supabase login." : editing ? "Update this cleaner's contact details." : "Create the cleaner's Tidyline login. Give them the temporary password securely."}</p></div>
      <div className="form-grid">
        <label>Full name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Ama Mensah"/></label>
        <label>Phone / WhatsApp<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="024 000 0000"/></label>
        {(!editing || loginOnly) && <label>Email / Login<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ama@tidyline.com"/></label>}
        {(!editing || loginOnly) && <label>Temporary password<input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>}
        <label>Basic salary (GH₵)<input type="number" min="0" value={basicSalary} onChange={e=>setBasicSalary(e.target.value)} /></label>
        <label>Monthly allowance (GH₵)<input type="number" min="0" value={allowance} onChange={e=>setAllowance(e.target.value)} /></label>
        <label>Monthly bonus (GH₵)<input type="number" min="0" value={bonus} onChange={e=>setBonus(e.target.value)} /></label>
      </div>
      <div className="form-actions"><button type="button" className="ops-secondary" onClick={reset}>Cancel</button><button className="ops-primary">{loginOnly?"Create login":editing?"Save changes":"Create staff login"}</button></div>
    </form>}
    <div className="ops-team-grid">{staff.map(s=><div className="staff-card" key={s.id}><div className="staff-card-top"><div className="ops-avatar large">{initials(s.name)}</div><span className={`team-state ${s.active?"active":"inactive"}`}>{s.active?"Active":"Inactive"}</span></div><h2>{s.name}</h2><p>{s.email || "Login email not set"}</p><p>{s.phone || "No phone on file"}</p><div className="staff-pay-preview"><span>Basic salary</span><b>{money(s.basic_salary ?? 2000)}</b><span>Allowance + bonus</span><b>{money(Number(s.monthly_allowance||0)+Number(s.monthly_bonus||0))}</b></div><div className="staff-meta"><span><CalendarCheck /> {s.active ? "Available for assignment" : "Not available"}</span></div><div className="staff-actions"><button className="ops-secondary" onClick={()=>startEdit(s)}>Edit</button>{!s.auth_user_id&&<button className="ops-secondary" onClick={()=>startLogin(s)}>Create login</button>}<button className={`ops-secondary ${s.active?"":"success"}`} onClick={()=>onToggle(s.id,s.active)}>{s.active?"Deactivate":"Activate"}</button><button className="ops-danger-icon" title="Remove staff" onClick={()=>window.confirm(`Remove ${s.name}?`) && onRemove(s.id)}><Trash2 /></button></div></div>)}</div>
    {!staff.length && <div className="ops-card"><Empty icon={Users} title="No staff yet" text="Add your first cleaner to start assigning bookings." /></div>}
  </div>;
}

function Settings({ settings, onSave }) {
  const [form,setForm]=useState(settings || {});
  useEffect(()=>setForm(settings || {}),[settings]);
  if(!settings) return <div className="ops-page"><div className="ops-card"><Empty icon={SettingsIcon} title="Settings not available" text="Create the settings row in Supabase first." /></div></div>;
  const field=(key,label,type="text",help="")=><label>{label}<input type={type} value={form[key] ?? ""} onChange={e=>setForm({...form,[key]:type==="number"?Number(e.target.value):e.target.value})}/>{help&&<small>{help}</small>}</label>;
  return <div className="ops-page">
    <div className="ops-page-head compact"><div><span className="ops-kicker">Configuration</span><h1>Settings</h1><p>Keep business contact details and public service pricing up to date.</p></div></div>
    <form className="ops-card settings-form" onSubmit={e=>{e.preventDefault();onSave(form)}}><section><h2>Business profile</h2><div className="form-grid">{field("company_name","Company name")}{field("whatsapp_number","WhatsApp number","text","Use country code, e.g. 233240000000.")}</div></section><section><h2>Service pricing</h2><div className="price-grid">{field("price_regular","Regular Cleaning","number")}{field("price_deep","Deep Cleaning","number")}{field("price_moveinout","Move In / Out","number")}{field("price_office","Office Cleaning","number")}{field("price_post_construction","Post-Construction","number")}</div></section><div className="form-actions"><button className="ops-primary">Save settings</button></div></form>
  </div>;
}
