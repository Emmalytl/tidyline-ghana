import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  useNavigate,
  Routes,
  Route,
  Link,
} from "react-router-dom";
import {
  Menu,
  X,
  ArrowRight,
  MessageCircle,
  CheckCircle2,
  Star,
  CalendarDays,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import Portal from "./pages/Portal";
import "./styles/app.css";
import "./styles/logo.css";
const WA = import.meta.env.VITE_WHATSAPP_NUMBER || "233XXXXXXXXX";
function Header() {
  const [o, s] = useState(false);
  return (
    <header>
      <div className="nav">
        <Link to="/" className="brand">
          <img src="/Tidyline.png" alt="Tidyline Ghana logo" />
          <span>
            Tidyline<small>Ghana</small>
          </span>
        </Link>
        <button className="menu" onClick={() => s(!o)}>
          {o ? <X /> : <Menu />}
        </button>
        <nav className={o ? "open" : ""}>
          <a href="/#services" onClick={() => s(false)}>Services</a>
          <a href="/#why" onClick={() => s(false)}>Why us</a>
          <a href="/#areas" onClick={() => s(false)}>Areas</a>
          <a href="/#how" onClick={() => s(false)}>How it works</a>
          <Link to="/check" onClick={() => s(false)}>Check booking</Link>
          <Link className="book" to="/book" onClick={() => s(false)}>
            Book now
          </Link>
        </nav>
      </div>
    </header>
  );
}
const services = [
  [
    "Regular Cleaning",
    "A reliable fresh clean for everyday spaces.",
    350,
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=85",
  ],
  [
    "Deep Cleaning",
    "A detailed reset when your space needs extra attention.",
    550,
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=900&q=85",
  ],
  [
    "Move In / Out",
    "Leave your old or new place fresh and ready.",
    650,
    "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=900&q=85",
  ],
  [
    "Office Cleaning",
    "A clean, professional workspace for your team.",
    500,
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=85",
  ],
  [
    "Post-Construction",
    "Detailed cleanup after building or renovation work.",
    800,
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=85",
  ],
  [
    "Laundry",
    "Laundry washing, drying and folding service.",
    250,
    "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=900&q=85",
  ],
];
function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-grid">
          <div>
            <span className="eyebrow">✦ Clean spaces. Better days.</span>
            <h1>
              A cleaner space,
              <br />
              <em>without the stress.</em>
            </h1>
            <p>
              Professional cleaning for homes, offices, moves and
              post-construction spaces across Accra.
            </p>
            <div className="actions">
              <Link className="primary" to="/book">
                Book a cleaning <ArrowRight />
              </Link>
              <a
                className="soft"
                href={"https://wa.me/" + WA.replace(/\D/g, "")}
              >
                <MessageCircle /> WhatsApp us
              </a>
            </div>
            <div className="trust">
              <span>
                <CheckCircle2 /> Transport included
              </span>
              <span>
                <CheckCircle2 /> MoMo & cash
              </span>
              <span>
                <CheckCircle2 /> Accra service areas
              </span>
            </div>
          </div>
          <div className="hero-img">
            <img
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=90"
              alt="Black cleaning professional cleaning a home"
            />
            <div className="rating">
              <Star fill="currentColor" /> <b>4.6</b> customer rating
            </div>
            <div className="price">
              <small>Starting from</small>
              <b>GH₵350</b>
              <small>Transport included</small>
            </div>
          </div>
        </div>
      </section>
      <section id="services" className="section">
        <div className="heading">
          <div>
            <span className="eyebrow">Our services</span>
            <h2>Start with one choice.</h2>
          </div>
          <p>
            Pick the service that fits your space and let us handle the rest.
          </p>
        </div>
        <div className="cards">
          {services.map(([t, d, p, img]) => (
            <Link className="card" to="/book" key={t}>
              <div className="cardimg">
                <img src={img} alt={"Black cleaning professionals - " + t} />
                <b>GH₵{p}</b>
              </div>
              <div className="cardbody">
                <h3>{t}</h3>
                <p>{d}</p>
                <span>
                  Book service <ArrowRight />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section id="why" className="blue section">
        <div className="why">
          <div>
            <span className="eyebrow light">Why Tidyline</span>
            <h2>Simple booking. Professional service. No drama.</h2>
            <p>
              Clear pricing, reliable coordination, easy communication and a
              mobile-first experience.
            </p>
            <Link className="white" to="/book">
              Book now <ArrowRight />
            </Link>
          </div>
          <div className="features">
            <div>
              <ShieldCheck />
              <span>
                <b>Reliable</b>
                <small>Professional service coordination.</small>
              </span>
            </div>
            <div>
              <CalendarDays />
              <span>
                <b>Flexible</b>
                <small>Choose a convenient date and time.</small>
              </span>
            </div>
            <div>
              <MessageCircle />
              <span>
                <b>Easy communication</b>
                <small>WhatsApp support when you need us.</small>
              </span>
            </div>
          </div>
        </div>
      </section>
      <section id="areas" className="section">
        <span className="eyebrow">Service areas</span>
        <h2>Serving Accra and nearby areas.</h2>
        <div className="areas">
          {[
            "East Legon",
            "Airport",
            "Cantonments",
            "Spintex",
            "Tema",
            "Adenta",
            "Madina",
            "Weija",
            "Kasoa",
          ].map((x) => (
            <span key={x}>⌖ {x}</span>
          ))}
        </div>
      </section>
      <section id="how" className="section pale">
        <div className="center">
          <span className="eyebrow">How it works</span>
          <h2>Clean in three easy steps.</h2>
        </div>
        <div className="steps">
          <div>
            <b>1</b>
            <h3>Choose your service</h3>
            <p>Tell us what needs cleaning.</p>
          </div>
          <div>
            <b>2</b>
            <h3>Pick your time</h3>
            <p>Choose a convenient schedule.</p>
          </div>
          <div>
            <b>3</b>
            <h3>Relax</h3>
            <p>We coordinate the cleaning.</p>
          </div>
        </div>
      </section>
      <a className="fab" href={"https://wa.me/" + WA.replace(/\D/g, "")}>
        <MessageCircle />
      </a>
    </>
  );
}
function Book() {
  useEffect(() => { document.title = "Book a Cleaning | Tidyline Ghana"; }, []);
  const [f, setF] = useState({
    name: "", phone: "", email: "", area: "", address: "",
    service: "Regular Cleaning", date: "", time: "", laundry_addon: false,
  });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const basePrice = services.find((x) => x[0] === f.service)?.[2] || 350;
  const laundryFee = f.service !== "Laundry" && f.laundry_addon ? 250 : 0;
  const price = basePrice + laundryFee;

  const today = new Date().toISOString().slice(0, 10);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (!supabase) { setMsg("Connect your Supabase keys in .env.local first."); return; }
    if (!f.date) { setMsg("Please choose a booking date."); return; }
    if (f.date < today) {
      setMsg("You cannot book a date that has already passed. Please choose today or a future date.");
      return;
    }
    if (!f.time) { setMsg("Please choose a start time."); return; }
    setBusy(true);
    const ref = "TDL-" + Date.now().toString().slice(-8);
    const { service, time, ...booking } = f;
    const payload = {
      ...booking,
      booking_ref: ref,
      service_type: service,
      start_time: time,
      service_fee: basePrice,
      laundry_addon: f.service !== "Laundry" && !!f.laundry_addon,
      laundry_fee: laundryFee,
      transport_fee: 0,
      total_fee: price,
      status: "Pending",
      payment_status: "Unpaid",
    };
    const { data, error } = await supabase.from("bookings").insert(payload).select().single();
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setInvoice(data || payload);
  }

  if (invoice) {
    return (
      <section className="page booking-success-page">
        <div className="narrow">
          <div className="invoice-card">
            <div className="invoice-success"><CheckCircle2 /></div>
            <span className="eyebrow">Booking received</span>
            <h1>Your cleaning is booked.</h1>
            <p className="invoice-ref">Reference <b>{invoice.booking_ref}</b></p>
            <div className="invoice-grid">
              <div><span>Customer</span><b>{invoice.name}</b></div>
              <div><span>Phone / WhatsApp</span><b>{invoice.phone}</b></div>
              <div><span>Service</span><b>{invoice.service_type}</b></div>
              <div><span>Area</span><b>{invoice.area}</b></div>
              <div><span>Date</span><b>{invoice.date}</b></div>
              <div><span>Start time</span><b>{invoice.start_time?.slice(0,5)}</b></div>
              <div className="full"><span>Address</span><b>{invoice.address}</b></div>
            </div>
            <div className="invoice-total-grid">
              <div><span>Service fee</span><b>GH₵{Number(invoice.service_fee || 0).toLocaleString()}</b></div>
              {invoice.laundry_addon && <div><span>Laundry</span><b>GH₵{Number(invoice.laundry_fee || 0).toLocaleString()}</b></div>}
              <div><span>Transport</span><b>GH₵{Number(invoice.transport_fee || 0).toLocaleString()}</b></div>
            </div>
            <div className="invoice-total"><span>Total</span><strong>GH₵{Number(invoice.total_fee || 0).toLocaleString()}</strong></div>
            <div className="invoice-status"><CheckCircle2 /> Request status: <b>Pending confirmation</b></div>
            <p className="invoice-note">Keep your booking reference. You can use it with your email to check the booking status anytime.</p>
            <Link className="primary invoice-home" to="/">Back to landing page <ArrowRight /></Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="narrow">
        <Link to="/">← Back home</Link>
        <h1>Book a cleaning.</h1>
        <p>Complete your details and send your request.</p>
        <form className="form" onSubmit={submit}>
          {msg && <div className="notice">{msg}</div>}
          <label>Name<input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label>Phone / WhatsApp<input required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
          <label>Email<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
          <label>Area<select required value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })}><option value="">Choose area</option>{["East Legon","Airport","Cantonments","Spintex","Tema","Adenta","Madina","Weija","Other"].map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>Address<textarea required value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></label>
          <label>Service<select value={f.service} onChange={(e) => setF({ ...f, service: e.target.value, laundry_addon: false })}>{services.map((x) => <option key={x[0]}>{x[0]}</option>)}</select></label>
          {f.service !== "Laundry" && <label className="check-field"><input type="checkbox" checked={!!f.laundry_addon} onChange={(e) => setF({ ...f, laundry_addon: e.target.checked })} /><span>Add laundry service <small>GH₵250</small></span></label>}
          <label>Date<input required type="date" min={today} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
          <label>Start time<input required type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></label>
          <div className="estimate"><span>Estimated total</span><b>GH₵{price}</b></div>
          <button className="primary" disabled={busy}>{busy ? "Submitting booking…" : <>Send booking request <ArrowRight /></>}</button>
        </form>
      </div>
    </section>
  );
}
function Check() {
  const [ref, sr] = useState(""), [email, se] = useState(""), [r, setR] = useState(null), [e, setE] = useState(""), [busy, setBusy] = useState(false);
  async function go(x) {
    x.preventDefault(); setE(""); setR(null); setBusy(true);
    if (!supabase) { setE("Connect Supabase first."); setBusy(false); return; }
    const { data, error } = await supabase.rpc("check_booking", { p_ref: ref.trim(), p_email: email.trim() });
    setBusy(false);
    if (error || !data || data.length === 0) { setE(error?.message || "Booking not found. Check the reference and email used when booking."); return; }
    setR(Array.isArray(data) ? data[0] : data);
  }
  return (
    <section className="page">
      <div className="narrow">
        <Link to="/">← Back home</Link>
        <h1>Check booking.</h1>
        <p>Enter the booking reference and the email used for the booking.</p>
        <form className="form" onSubmit={go}>
          {e && <div className="notice">{e}</div>}
          <label>Booking reference<input required value={ref} onChange={(x) => sr(x.target.value)} placeholder="TDL-12345678" /></label>
          <label>Email<input required type="email" value={email} onChange={(x) => se(x.target.value)} /></label>
          <button className="primary" disabled={busy}>{busy ? "Checking…" : "Check booking"}</button>
        </form>
        {r && <div className="result booking-check-result">
          <div className="result-head"><CheckCircle2/><div><span className="eyebrow">Booking {r.booking_ref}</span><h2>{r.service_type}</h2></div></div>
          <div className="check-grid">
            <div><span>Customer</span><b>{r.name}</b></div>
            <div><span>Phone / WhatsApp</span><b>{r.phone || "—"}</b></div>
            <div><span>Service</span><b>{r.service_type}</b></div>
            <div><span>Area</span><b>{r.area || "—"}</b></div>
            <div className="full"><span>Address</span><b>{r.address || "—"}</b></div>
            <div><span>Date</span><b>{formatDisplayDate(r.date)}</b></div>
            <div><span>Start time</span><b>{String(r.start_time || "").slice(0,5)}</b></div>
            <div><span>Status</span><b className={statusPillClass(r.status)}>{r.status}</b></div>
            <div><span>Payment</span><b>{r.payment_status}</b></div>
            <div><span>Service fee</span><b>GH₵{Number(r.service_fee || 0).toLocaleString()}</b></div>
            {r.laundry_addon && <div><span>Laundry</span><b>GH₵{Number(r.laundry_fee || 0).toLocaleString()}</b></div>}
            <div><span>Transport</span><b>GH₵{Number(r.transport_fee || 0).toLocaleString()}</b></div>
            <div><span>Total</span><strong>GH₵{Number(r.total_fee || 0).toLocaleString()}</strong></div>
          </div>
        </div>}
      </div>
    </section>
  );
}
function formatDisplayDate(value) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GH", { day:"2-digit", month:"long", year:"numeric" }) : "—"; }
function statusPillClass(status="") { return `status-pill status-${status.toLowerCase().replace(/[^a-z]+/g,"-")}`; }
function Rate() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref") || "";
  const token = params.get("token") || "";
  const [booking,setBooking]=useState(null),[rating,setRating]=useState(0),[comment,setComment]=useState(""),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[done,setDone]=useState(false),[error,setError]=useState("");
  useEffect(()=>{
    async function load(){
      if(!ref||!token){setError("This rating link is incomplete.");setLoading(false);return;}
      const {data,error}=await supabase.rpc("get_booking_for_rating",{p_ref:ref,p_token:token});
      if(error||!data?.length){setError(error?.message||"This rating link is invalid or has expired.");setLoading(false);return;}
      setBooking(data[0]);setRating(data[0].staff_rating||0);setComment(data[0].staff_rating_comment||"");setLoading(false);
    }
    load();
  },[ref,token]);
  async function submit(e){
    e.preventDefault(); if(!rating)return setError("Please choose a rating first."); setSaving(true);setError("");
    const {error}=await supabase.rpc("submit_booking_rating",{p_ref:ref,p_token:token,p_rating:rating,p_comment:comment.trim()||null});
    if(error)setError(error.message); else setDone(true); setSaving(false);
  }
  if(loading)return <section className="page"><div className="narrow result"><p>Loading rating page…</p></div></section>;
  if(error&&!booking)return <section className="page"><div className="narrow result"><XCircle/><h2>Rating link unavailable</h2><p>{error}</p></div></section>;
  return <section className="page"><div className="narrow"><div className="result">
    {done?<><CheckCircle2/><h2>Thank you!</h2><p>Your rating has been submitted. We appreciate your feedback.</p></>:<>
      <span className="eyebrow">Tidyline</span><h1>How was your cleaning?</h1><p>Thank you, {booking.name}. Please rate <b>{booking.staff_name}</b>.</p>
      <form className="rating-form" onSubmit={submit}>
        <div className="stars" aria-label="Choose a rating">{[1,2,3,4,5].map(n=><button type="button" key={n} className={rating>=n?"active":""} onClick={()=>setRating(n)} aria-label={`${n} star${n>1?"s":""}`}><Star fill="currentColor"/></button>)}</div>
        <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Tell us about your experience (optional)" />
        {error&&<div className="notice">{error}</div>}
        <button className="primary" disabled={saving}>{saving?"Submitting…":"Submit rating"}</button>
      </form>
    </>}
  </div></div></section>;
}

function LegacyAdmin() {
  return (
    <section className="page">
      <div className="narrow">
        <span className="eyebrow">Private area</span>
        <h1>Tidyline Admin</h1>
        <p>
          This starter includes the Admin route. The full Ghana operations
          dashboard will be connected to Supabase next.
        </p>
        <div className="result">
          <h2>Operations dashboard</h2>
          <p>
            Bookings · Clients · Staff · Transport · Payroll · Reports ·
            Invoices · WhatsApp schedules
          </p>
        </div>
      </div>
    </section>
  );
}
function App() {
  const location = window.location.pathname;
  const operations = location === "/admin" || location === "/staff";
  return (
    <>
      {!operations && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/book" element={<Book />} />
        <Route path="/check" element={<Check />} />
        <Route path="/rate" element={<Rate />} />
        <Route path="/admin" element={<Portal />} />
        <Route path="/staff" element={<Portal />} />
      </Routes>
      {!operations && <footer>
        <b>Tidyline Ghana</b>
        <p>Professional cleaning made simple.</p>
        <small>© {new Date().getFullYear()} Tidyline Ghana</small>
      </footer>}
    </>
  );
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);