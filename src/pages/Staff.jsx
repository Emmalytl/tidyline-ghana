import React, { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Clock3, LogIn, LogOut, Phone, RefreshCw, UserCheck, XCircle, MessageCircle, Star, Camera, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import "./operations.css";

const WA = import.meta.env.VITE_WHATSAPP_NUMBER || "233XXXXXXXXX";

function initials(name="") { return name.split(" ").filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase() || "TL"; }
function money(v){return `GH₵${Number(v||0).toLocaleString("en-GH",{minimumFractionDigits:0,maximumFractionDigits:2})}`;}
function fmtDate(v){return v ? new Date(`${v}T00:00:00`).toLocaleDateString("en-GH",{weekday:"short",day:"2-digit",month:"short",year:"numeric"}) : "—";}
function statusClass(s=""){return `status status-${s.toLowerCase().replace(/[^a-z]+/g,"-")}`;}

export default function Staff() {
  const [session,setSession]=useState(null), [checking,setChecking]=useState(true);
  useEffect(()=>{
    if(!supabase){setChecking(false);return;}
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setChecking(false)});
    const {data:listener}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return ()=>listener.subscription.unsubscribe();
  },[]);
  if(!supabase) return <div className="ops-screen"><div className="ops-message"><div className="ops-logo">T</div><h1>Staff portal unavailable</h1><p>Connect your Supabase keys in .env.local first.</p></div></div>;
  if(checking) return <div className="ops-screen"><div className="ops-loader"><div className="spinner"/>Loading staff portal…</div></div>;
  return session ? <StaffDashboard session={session}/> : <StaffLogin/>;
}

function StaffLogin(){
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function submit(e){e.preventDefault();setBusy(true);setError("");const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)setError(error.message);setBusy(false);}
  return <div className="ops-auth"><div className="ops-auth-card">
    <div className="ops-brand"><img className="ops-brand-logo" src="/Tidyline.png" alt="Tidyline" /><div><strong>Tidyline</strong><span>Staff Portal</span></div></div>
    <div className="ops-auth-heading"><span className="ops-kicker">Team access</span><h1>Staff sign in</h1><p>Use the staff email and password created by your Tidyline administrator.</p></div>
    <form className="ops-auth-form" onSubmit={submit}>{error&&<div className="ops-alert danger"><XCircle/>{error}</div>}
      <label>Email<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"/></label>
      <label>Password<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></label>
      <button className="ops-primary ops-full" disabled={busy}>{busy?<><div className="button-spinner"/>Signing in…</>:<><LogIn/>Sign in</>}</button>
    </form>
    <div className="ops-auth-foot">Only your assigned cleaning jobs will be visible after login.</div>
  </div></div>;
}

function payrollFor(staff){
  const basic=Number(staff?.basic_salary ?? 2000), allowance=Number(staff?.monthly_allowance ?? 0), bonus=Number(staff?.monthly_bonus ?? 0);
  const gross=basic+allowance+bonus, ssnit=basic*0.055, chargeable=Math.max(0,gross-ssnit);
  let rem=chargeable,paye=0;
  for(const [band,rate] of [[490,0],[110,.05],[130,.10],[3166.67,.175],[16000,.25],[30520,.30],[Infinity,.35]]){const taxable=Math.min(rem,band); if(taxable<=0) break; paye+=taxable*rate; rem-=taxable;}
  return {basic,allowance,bonus,gross,ssnit,paye,net:gross-ssnit-paye,employer:basic*.13};
}

export function StaffDashboard({session}){
  const [me,setMe]=useState(null),[bookings,setBookings]=useState([]),[loading,setLoading]=useState(true),[toast,setToast]=useState(""),[error,setError]=useState("");
  useEffect(()=>{ document.title = "Staff Portal | Tidyline Ghana"; },[]);
  async function load(){
    setLoading(true);setError("");
    const {data:staff,error:sError}=await supabase.from("staff").select("*").eq("auth_user_id",session.user.id).eq("active",true).maybeSingle();
    if(sError){setError(sError.message);setLoading(false);return;}
    if(!staff){setError("Your login is valid, but no active Tidyline staff profile is linked to it. Ask the administrator to check your account.");setLoading(false);return;}
    const {data:b,error:bError}=await supabase.from("bookings").select("*").eq("staff_id",staff.id).order("date",{ascending:true}).order("start_time",{ascending:true});
    if(bError)setError(bError.message);
    setMe(staff);setBookings(b||[]);setLoading(false);
  }
  useEffect(()=>{load()},[session.user.id]);
  const today=new Date().toISOString().slice(0,10);
  const todayJobs=useMemo(()=>bookings.filter(b=>b.date===today&&b.status!=="Cancelled"),[bookings,today]);
  const upcoming=useMemo(()=>bookings.filter(b=>b.date>=today&&b.status!=="Cancelled"),[bookings,today]);
  const completed=useMemo(()=>bookings.filter(b=>b.status==="Completed"),[bookings]);
  async function updateStatus(id,status){
    const {error}=await supabase.from("bookings").update({status}).eq("id",id);
    if(error){setToast(`Error: ${error.message}`);return;}
    setBookings(prev=>prev.map(b=>b.id===id?{...b,status}:b));
    setToast(`Job marked ${status.toLowerCase()}`);setTimeout(()=>setToast(""),3000);
  }
  async function startJob(id,file){
    if(!file) return;
    setToast("Uploading photo…");
    const path=`${id}/${Date.now()}-${file.name}`.replace(/\s+/g,"-");
    const {error:upErr}=await supabase.storage.from("job-photos").upload(path,file,{upsert:true});
    if(upErr){setToast(`Photo upload failed: ${upErr.message}`);return;}
    const {data:pub}=supabase.storage.from("job-photos").getPublicUrl(path);
    const patch={status:"In Progress",started_at:new Date().toISOString(),job_photo_url:pub.publicUrl};
    const {error}=await supabase.from("bookings").update(patch).eq("id",id);
    if(error){setToast(`Error: ${error.message}`);return;}
    setBookings(prev=>prev.map(b=>b.id===id?{...b,...patch}:b));
    setToast("Job started — photo saved");setTimeout(()=>setToast(""),3000);
  }
  async function completeJob(id){
    const patch={status:"Completed",completed_at:new Date().toISOString()};
    const {error}=await supabase.from("bookings").update(patch).eq("id",id);
    if(error){setToast(`Error: ${error.message}`);return;}
    setBookings(prev=>prev.map(b=>b.id===id?{...b,...patch}:b));
    setToast("Job marked completed");setTimeout(()=>setToast(""),3000);
  }
  function openClientWhatsApp(b,staff){
    const phone=String(b.phone||"").replace(/\D/g,"");
    if(!phone) return;
    const base=window.location.origin;
    const link=`${base}/rate?ref=${encodeURIComponent(b.booking_ref)}&token=${encodeURIComponent(b.rating_token||"")}`;
    const message=`Hello ${b.name}, your Tidyline cleaning has been completed successfully. Thank you for choosing us. Please rate ${staff?.name||"your cleaner"} here: ${link}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");
  }
  function openAdminWhatsApp(b,staff){
    const message=`Job update: ${b.booking_ref} (${b.service_type} for ${b.name} in ${b.area}) has been completed by ${staff?.name||"a staff member"}.`;
    window.open(`https://wa.me/${WA.replace(/\D/g,"")}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");
  }
  async function signOut(){await supabase.auth.signOut();}

  return <div className="ops-shell staff-shell">
    <aside className="ops-sidebar">
      <div className="ops-sidebar-brand"><img className="ops-brand-logo" src="/Tidyline.png" alt="Tidyline" /><div><strong>Tidyline</strong><span>Staff Portal</span></div></div>
      <div className="ops-nav-title">My work</div>
      <div className="staff-side-person">{me?<><div className="ops-avatar large">{initials(me.name)}</div><strong>{me.name}</strong><span>{me.email || session.user.email}</span><span>{me.active?"Active team member":"Inactive"}</span></>:<><UserCheck/><strong>Loading profile…</strong></>}</div>
      <div className="ops-sidebar-bottom"><button onClick={signOut}><LogOut/> Sign out</button></div>
    </aside>
    <main className="ops-main">
      <header className="ops-header"><div className="ops-mobile-title"><img src="/Tidyline.png" alt="Tidyline" /><span>Tidyline</span></div><div className="ops-header-spacer"/><button className="ops-refresh" onClick={load}><RefreshCw/> Refresh</button><div className="ops-user"><div className="ops-avatar">{initials(me?.name || session.user.email)}</div><div><strong>{me?.name || session.user.email}</strong><span>Staff member</span></div></div></header>
      <div className="ops-content">
        {error&&<div className="ops-alert danger"><XCircle/>{error}</div>}
        {!error && <div className="ops-page">
          <div className="ops-page-head"><div><span className="ops-kicker">Staff workspace</span><h1>Hi, {me?.name?.split(" ")[0] || "there"}.</h1><p>Only bookings assigned to your staff account are shown here.</p></div></div>
          <div className="ops-stat-grid staff-stats"><Stat icon={CalendarCheck} label="Today's jobs" value={todayJobs.length} detail="Scheduled today"/><Stat icon={Clock3} label="Upcoming" value={upcoming.length} detail="Active scheduled jobs"/><Stat icon={CheckCircle2} label="Completed" value={completed.length} detail="Jobs completed"/></div>
          {me && <StaffPayCard staff={me}/>}
          <section className="ops-card"><div className="ops-card-head"><div><h2>My jobs</h2><p>Open a job for customer details and status actions.</p></div></div>
            {loading?<div className="ops-loader compact"><div className="spinner"/>Loading jobs…</div>:bookings.length?<div className="staff-jobs">{bookings.map(b=><StaffJob key={b.id} booking={b} me={me} onAccept={id=>updateStatus(id,"Confirmed")} onCancel={id=>updateStatus(id,"Cancelled")} onStart={startJob} onComplete={completeJob} onNotifyClient={openClientWhatsApp} onNotifyAdmin={openAdminWhatsApp}/>)}</div>:<div className="ops-empty"><CalendarCheck/><strong>No jobs assigned</strong><span>Your assigned bookings will appear here.</span></div>}
          </section>
        </div>}
      </div>
    </main>
    {toast&&<div className="ops-toast"><CheckCircle2/>{toast}</div>}
  </div>;
}

function StaffPayCard({staff}){
  const p=payrollFor(staff);
  return <section className="ops-card staff-pay-card"><div className="ops-card-head"><div><span className="ops-kicker">Monthly payroll</span><h2>Your salary</h2><p>Your current salary, allowances, bonus and statutory deductions.</p></div></div><div className="detail-grid"><div className="detail"><span>Basic salary</span><b>{money(p.basic)}</b></div><div className="detail"><span>Allowances</span><b>{money(p.allowance)}</b></div><div className="detail"><span>Bonus</span><b>{money(p.bonus)}</b></div><div className="detail"><span>Gross pay</span><b>{money(p.gross)}</b></div><div className="detail"><span>Employee SSNIT (5.5%)</span><b>{money(p.ssnit)}</b></div><div className="detail"><span>Income tax / PAYE</span><b>{money(p.paye)}</b></div><div className="detail"><span>Employer contribution (13%)</span><b>{money(p.employer)}</b></div><div className="detail"><span>Take-home pay</span><b className="strong">{money(p.net)}</b></div></div><div className="accounting-note">SSNIT employee deduction is calculated on basic salary only. PAYE is calculated after the employee SSNIT deduction and includes taxable cash allowances/bonuses.</div></section>;
}

function Stat({icon:Icon,label,value,detail}){return <div className="ops-stat"><div className="ops-stat-icon"><Icon/></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;}

function StaffJob({booking:b,me,onAccept,onCancel,onStart,onComplete,onNotifyClient,onNotifyAdmin}){
  const [open,setOpen]=useState(false);
  const [uploading,setUploading]=useState(false);
  async function handlePhoto(e){
    const file=e.target.files?.[0];
    e.target.value="";
    if(!file) return;
    setUploading(true);
    await onStart(b.id,file);
    setUploading(false);
  }
  return <article className={`staff-job ${open?"expanded":""}`}>
    <button className="staff-job-summary" onClick={()=>setOpen(!open)}>
      <div className="job-date"><b>{new Date(`${b.date}T00:00:00`).getDate()}</b><span>{new Date(`${b.date}T00:00:00`).toLocaleDateString("en-GH",{month:"short"})}</span></div>
      <div className="job-main"><strong>{b.name}</strong><span>{b.service_type} · {b.start_time?.slice(0,5)||"—"}</span></div>
      <div className="job-side"><span className={statusClass(b.status)}>{b.status}</span><small>{b.area}</small></div>
    </button>
    {open&&<div className="staff-job-details">
      <div className="detail-grid"><div className="detail"><span>Date</span><b>{fmtDate(b.date)}</b></div><div className="detail"><span>Time</span><b>{b.start_time?.slice(0,5)||"—"}</b></div><div className="detail"><span>Service</span><b>{b.service_type}</b></div><div className="detail"><span>Total</span><b>{money(b.total_fee)}</b></div><div className="detail full"><span>Address</span><b>{b.address||"—"}</b></div></div>
      <div className="staff-contact"><div className="ops-avatar">{initials(b.name)}</div><div><strong>{b.name}</strong><span>{b.phone}</span></div><a href={`tel:${b.phone}`}><Phone/>Call</a><a className="whatsapp" target="_blank" rel="noreferrer" href={`https://wa.me/${String(b.phone||"").replace(/\D/g,"")}`}><MessageCircle/>WhatsApp</a></div>

      {b.status==="Pending" && <div className="staff-status-actions"><button className="ops-primary" onClick={()=>onAccept(b.id)}><CheckCircle2/> Accept job</button><button className="ops-secondary danger-text" onClick={()=>onCancel(b.id)}><XCircle/> Cancel</button></div>}

      {b.status==="Confirmed" && <div className="staff-status-actions">
        <label className="ops-primary staff-photo-btn">{uploading?<><Loader2 className="spin"/> Uploading…</>:<><Camera/> Start job (add photo)</>}<input type="file" accept="image/*" capture="environment" hidden disabled={uploading} onChange={handlePhoto}/></label>
        <button className="ops-secondary danger-text" onClick={()=>onCancel(b.id)}><XCircle/> Cancel</button>
      </div>}

      {b.status==="In Progress" && <div className="staff-status-actions in-progress">
        {b.job_photo_url && <a className="job-photo-preview" href={b.job_photo_url} target="_blank" rel="noreferrer"><img src={b.job_photo_url} alt="Area before cleaning"/><span>View start photo</span></a>}
        <button className="ops-primary" onClick={()=>onComplete(b.id)}><CheckCircle2/> Mark job complete</button>
      </div>}

      {b.status==="Completed" && <div className="staff-status-actions completed-actions">
        <button className="ops-secondary" onClick={()=>onNotifyClient(b,me)}><MessageCircle/> Notify client on WhatsApp</button>
        <button className="ops-secondary" onClick={()=>onNotifyAdmin(b,me)}><MessageCircle/> Notify admin on WhatsApp</button>
      </div>}

      {b.status==="Completed"&&<div className="completion-note"><CheckCircle2/><span><strong>Completed</strong><small>Use the buttons above to notify the client and admin on WhatsApp — sending is manual, so nothing goes out until you tap it.</small></span></div>}
    </div>}
  </article>;
}
