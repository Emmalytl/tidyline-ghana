import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LogOut, Users, CalendarCheck, Wallet, Settings as SettingsIcon,
  Download, CheckCircle2, XCircle, Plus, Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const SERVICE_TYPES = [
  'Regular Cleaning',
  'Deep Cleaning',
  'Move In / Out',
  'Office Cleaning',
  'Post-Construction',
];
const STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
const PAYMENT_STATUSES = ['Unpaid', 'Paid'];

export default function Admin() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!supabase) { setCheckingSession(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!supabase) {
    return (
      <section className="page">
        <div className="narrow">
          <Link to="/">← Back home</Link>
          <h1>Admin</h1>
          <div className="notice">Connect your Supabase keys in .env.local first.</div>
        </div>
      </section>
    );
  }

  if (checkingSession) {
    return <section className="page"><div className="narrow"><p>Loading…</p></div></section>;
  }

  return session ? <Dashboard /> : <AdminLogin />;
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr(error.message);
  }

  return (
    <section className="page">
      <div className="narrow">
        <Link to="/">← Back home</Link>
        <h1>Admin sign in</h1>
        <p>Manage bookings, staff, and settings.</p>
        <form className="form" onSubmit={submit}>
          {err && <div className="notice">{err}</div>}
          <label>Email
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label>Password
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="admin-fineprint">
          Admin accounts are created in Supabase under Authentication → Users. There's no public sign-up here.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
function Dashboard() {
  const [tab, setTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [staff, setStaff] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState('');

  useEffect(() => { loadAll(); }, []);

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function loadAll() {
    setLoading(true);
    const [b, s, cfg] = await Promise.all([
      supabase.from('bookings').select('*').order('date', { ascending: false }),
      supabase.from('staff').select('*').order('created_at', { ascending: true }),
      supabase.from('settings').select('*').eq('id', 1).single(),
    ]);
    setBookings(b.data || []);
    setStaff(s.data || []);
    setSettings(cfg.data || null);
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // --- Bookings actions ---
  async function updateBooking(id, patch) {
    const { error } = await supabase.from('bookings').update(patch).eq('id', id);
    if (error) { flash('Error: ' + error.message); return; }
    setBookings(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)));
    flash('Booking updated');
  }

  function exportCSV() {
    if (bookings.length === 0) { flash('No bookings to export'); return; }
    const headers = ['Ref', 'Name', 'Phone', 'Email', 'Area', 'Address', 'Service', 'Date', 'Time', 'Status', 'Payment', 'Total (GHS)'];
    const rows = bookings.map(b => [
      b.booking_ref, b.name, b.phone, b.email || '', b.area, b.address,
      b.service_type, b.date, b.start_time, b.status, b.payment_status, b.total_fee,
    ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tidyline-ghana-bookings-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Staff actions ---
  async function addStaff(name, phone) {
    if (!name.trim()) return;
    const { data, error } = await supabase.from('staff').insert({ name: name.trim(), phone: phone.trim() || null }).select().single();
    if (error) { flash('Error: ' + error.message); return; }
    setStaff(prev => [...prev, data]);
    flash('Staff added');
  }
  async function toggleStaff(id, active) {
    const { error } = await supabase.from('staff').update({ active: !active }).eq('id', id);
    if (error) { flash('Error: ' + error.message); return; }
    setStaff(prev => prev.map(s => (s.id === id ? { ...s, active: !active } : s)));
  }
  async function removeStaff(id) {
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) { flash('Error: ' + error.message); return; }
    setStaff(prev => prev.filter(s => s.id !== id));
    flash('Staff removed');
  }

  // --- Settings actions ---
  async function saveSettings(next) {
    const { error } = await supabase.from('settings').update(next).eq('id', 1);
    if (error) { flash('Error: ' + error.message); return; }
    setSettings(prev => ({ ...prev, ...next }));
    flash('Settings saved');
  }

  const filteredBookings = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
  const revenue = bookings.filter(b => b.payment_status === 'Paid').reduce((sum, b) => sum + Number(b.total_fee || 0), 0);
  const pendingCount = bookings.filter(b => b.status === 'Pending').length;
  const activeStaffCount = staff.filter(s => s.active).length;

  return (
    <section className="page admin-page">
      <div className="admin-wrap">
        <div className="admin-top">
          <div>
            <span className="eyebrow">Private area</span>
            <h1>Tidyline Admin</h1>
          </div>
          <button className="soft" onClick={signOut}><LogOut /> Sign out</button>
        </div>

        <div className="admin-stats">
          <div className="stat"><CalendarCheck /><div><strong>{bookings.length}</strong><small>Total bookings</small></div></div>
          <div className="stat"><XCircle /><div><strong>{pendingCount}</strong><small>Pending</small></div></div>
          <div className="stat"><Wallet /><div><strong>GH₵{revenue.toLocaleString()}</strong><small>Revenue collected</small></div></div>
          <div className="stat"><Users /><div><strong>{activeStaffCount}</strong><small>Active staff</small></div></div>
        </div>

        <div className="admin-tabs">
          <button className={tab === 'bookings' ? 'active' : ''} onClick={() => setTab('bookings')}><CalendarCheck /> Bookings</button>
          <button className={tab === 'staff' ? 'active' : ''} onClick={() => setTab('staff')}><Users /> Staff</button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><SettingsIcon /> Settings</button>
        </div>

        {loading ? <p>Loading…</p> : (
          <>
            {tab === 'bookings' && (
              <BookingsTab
                bookings={filteredBookings}
                staff={staff}
                filter={filter}
                setFilter={setFilter}
                onUpdate={updateBooking}
                onExport={exportCSV}
              />
            )}
            {tab === 'staff' && (
              <StaffTab staff={staff} onAdd={addStaff} onToggle={toggleStaff} onRemove={removeStaff} />
            )}
            {tab === 'settings' && settings && (
              <SettingsTab settings={settings} onSave={saveSettings} />
            )}
          </>
        )}

        {toast && <div className="admin-toast">{toast}</div>}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Bookings tab
// ---------------------------------------------------------------------------
function BookingsTab({ bookings, staff, filter, setFilter, onUpdate, onExport }) {
  return (
    <div className="admin-panel">
      <div className="admin-panel-head">
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="soft" onClick={onExport}><Download /> Export CSV</button>
      </div>

      {bookings.length === 0 ? (
        <div className="result"><p>No bookings in this view.</p></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Client</th><th>Service</th><th>When</th><th>Staff</th>
                <th>Status</th><th>Payment</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id}>
                  <td>
                    <div className="admin-cell-main">{b.name}</div>
                    <div className="admin-cell-sub">{b.phone} · {b.area}</div>
                    <div className="admin-cell-sub mono">{b.booking_ref}</div>
                  </td>
                  <td>{b.service_type}</td>
                  <td>
                    <div className="admin-cell-main">{b.date}</div>
                    <div className="admin-cell-sub">{b.start_time}</div>
                  </td>
                  <td>
                    <select value={b.staff_id || ''} onChange={e => onUpdate(b.id, { staff_id: e.target.value || null })}>
                      <option value="">— unassigned —</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.name}{s.active ? '' : ' (inactive)'}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={b.status} onChange={e => onUpdate(b.id, { status: e.target.value })}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={b.payment_status} onChange={e => onUpdate(b.id, { payment_status: e.target.value })}>
                      {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="mono">GH₵{Number(b.total_fee || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Staff tab
// ---------------------------------------------------------------------------
function StaffTab({ staff, onAdd, onToggle, onRemove }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <div className="admin-panel">
      {staff.length === 0 ? (
        <div className="result"><p>No staff added yet.</p></div>
      ) : (
        <div className="staff-list">
          {staff.map(s => (
            <div className="staff-row" key={s.id}>
              <div>
                <div className="admin-cell-main">{s.name}</div>
                <div className="admin-cell-sub">{s.phone || 'No phone on file'}</div>
              </div>
              <div className="staff-row-actions">
                <button className={s.active ? 'pill on' : 'pill'} onClick={() => onToggle(s.id, s.active)}>
                  {s.active ? <CheckCircle2 /> : <XCircle />} {s.active ? 'Active' : 'Inactive'}
                </button>
                <button className="icon-btn" onClick={() => onRemove(s.id)}><Trash2 /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <form
        className="staff-add"
        onSubmit={e => { e.preventDefault(); onAdd(name, phone); setName(''); setPhone(''); }}
      >
        <input placeholder="Staff name" value={name} onChange={e => setName(e.target.value)} />
        <input placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} />
        <button className="primary" type="submit"><Plus /> Add</button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings tab
// ---------------------------------------------------------------------------
function SettingsTab({ settings, onSave }) {
  const [form, setForm] = useState(settings);

  function field(key, label, type = 'text') {
    return (
      <label>{label}
        <input
          type={type}
          value={form[key] ?? ''}
          onChange={e => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
        />
      </label>
    );
  }

  return (
    <div className="admin-panel">
      <form className="form" onSubmit={e => { e.preventDefault(); onSave(form); }}>
        {field('company_name', 'Company name')}
        {field('whatsapp_number', 'WhatsApp number (digits, country code first)')}
        {field('price_regular', `Regular Cleaning — GH₵/job`, 'number')}
        {field('price_deep', `Deep Cleaning — GH₵/job`, 'number')}
        {field('price_moveinout', `Move In / Out — GH₵/job`, 'number')}
        {field('price_office', `Office Cleaning — GH₵/job`, 'number')}
        {field('price_post_construction', `Post-Construction — GH₵/job`, 'number')}
        <button className="primary" type="submit">Save settings</button>
      </form>
    </div>
  );
}
