import { useState, useEffect, useRef, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════
// THEME
// ══════════════════════════════════════════════════════════════════
const G="#C9A96E", D="#0A0A0A", DC="#111111", DC2="#1A1A1A", CR="#FAF6F0";

// ══════════════════════════════════════════════════════════════════
// SECURITY CONFIG  (never shown publicly — buried in state)
// ══════════════════════════════════════════════════════════════════
const SECRET_GESTURE = [1,2,3,4]; // corner tap sequence: TL,TR,BL,BR (indexes)

// ══════════════════════════════════════════════════════════════════
// INITIAL DATA
// ══════════════════════════════════════════════════════════════════
const INIT = {
  content: {
    heroSub:"Professional & Certified MUA", heroTitle1:"Creating",
    heroItalic:"Confidence", heroTitle2:"Not Just Contours",
    heroDesc:"Transforming your vision into reality with expert makeup artistry, hairstyling & a touch of magic for every occasion.",
    aboutName:"Mamta Salaria",
    aboutDesc:"A professional & certified makeup artist and hairstylist with a passion for making every client feel their most beautiful and confident. Specializing in bridal, party, and editorial looks — every face tells a unique story, and I'm here to make yours unforgettable.",
    footerTagline:"Professional & Certified Makeup Artist. Creating confidence, not just contours.",
    instagram:"@salaria_makeovers", youtube:"@Salaria_Makeovers",
    phone:"+91 99154 99034", gmail:"salaria.makeovers@gmail.com",
    bookingTitle:"Let's Create Your Dream Look",
    bookingDesc:"Fill in your details below and I'll get back to you within 24 hours.",
    whatsapp:"9915499034",
    upiId:"salaria@upi", upiName:"Salaria Makeovers",
    advancePct:25,
  },
  services:[
    {id:1,title:"Bridal Makeup",desc:"Your dream look for the most special day. HD airbrush, traditional, or contemporary — tailored to your vision.",price:"Starting ₹15,000",icon:"👰",popular:true},
    {id:2,title:"Party & Event",desc:"Glamorous looks for engagements, receptions, sangeet, cocktail nights & celebrations.",price:"Starting ₹5,000",icon:"✨",popular:false},
    {id:3,title:"Pre-Wedding Shoot",desc:"Camera-ready makeup that photographs beautifully for your pre-wedding & couple shoots.",price:"Starting ₹8,000",icon:"📸",popular:false},
    {id:4,title:"Hair Styling",desc:"Elegant updos, braids, floral buns & trendy styles for every occasion and outfit.",price:"Starting ₹3,000",icon:"💇",popular:false},
    {id:5,title:"Engagement Look",desc:"Soft glam or bold beauty — a custom look that makes you shine at your ring ceremony.",price:"Starting ₹10,000",icon:"💍",popular:true},
    {id:6,title:"Makeup Classes",desc:"Learn professional techniques — self-makeup workshops & certified MUA training programs.",price:"Starting ₹20,000",icon:"🎓",popular:false},
  ],
  portfolio:[
    {id:1,category:"Bridal",gradient:"linear-gradient(135deg,#C9A96E,#8B6914)",label:"Bridal Elegance"},
    {id:2,category:"Party",gradient:"linear-gradient(135deg,#E8D5B0,#C9A96E)",label:"Party Glam"},
    {id:3,category:"Editorial",gradient:"linear-gradient(135deg,#2C1810,#C9A96E)",label:"Editorial Look"},
    {id:4,category:"Bridal",gradient:"linear-gradient(135deg,#C9A96E,#F5E6CC)",label:"Royal Bride"},
    {id:5,category:"Engagement",gradient:"linear-gradient(135deg,#1a1a2e,#C9A96E)",label:"Ring Ceremony"},
    {id:6,category:"Hair",gradient:"linear-gradient(135deg,#C9A96E,#3D2B1F)",label:"Hair Art"},
  ],
  testimonials:[
    {id:1,name:"Priya Sharma",event:"Bridal Makeup",text:"Absolutely stunning work! She understood exactly what I wanted and made me feel like a queen on my wedding day. Every guest complimented my look!",rating:5},
    {id:2,name:"Neha Gupta",event:"Engagement Party",text:"The makeup lasted the entire event — through dancing, tears of joy, everything! Professional, punctual, and incredibly talented.",rating:5},
    {id:3,name:"Anita Verma",event:"Pre-Wedding Shoot",text:"My photos turned out absolutely gorgeous. She knew exactly what works on camera and created a look that was both natural and glamorous.",rating:5},
  ],
  stats:[
    {id:1,number:"270+",label:"Looks Created"},{id:2,number:"200+",label:"Happy Brides"},
    {id:3,number:"5+",label:"Years Experience"},{id:4,number:"1000+",label:"Happy Clients"},
  ],
  tags:["Certified MUA","HD Airbrush Expert","Freelance Artist","Bridal Specialist"],
  bookings:[
    {id:1001,name:"Priya Sharma",phone:"+91 98001 12345",email:"priya@gmail.com",
     date:(()=>{const d=new Date();d.setDate(d.getDate()+1);return d.toISOString().split("T")[0]})(),
     service:"Bridal Makeup",location:"Delhi",servicePrice:"15000",advanceAmt:"3750",
     inspiration:"Natural glam with gold tones",message:"",
     submittedAt:new Date(Date.now()-3600000).toISOString(),status:"new",paymentStatus:"pending"},
    {id:1002,name:"Neha Gupta",phone:"+91 97002 23456",email:"",
     date:(()=>{const d=new Date();d.setDate(d.getDate()+5);return d.toISOString().split("T")[0]})(),
     service:"Engagement Look",location:"Chandigarh",servicePrice:"10000",advanceAmt:"2500",
     inspiration:"",message:"Soft and natural please",
     submittedAt:new Date(Date.now()-86400000).toISOString(),status:"confirmed",paymentStatus:"paid"},
  ],
  adminPwd:"salaria2026",
  adminPhone:"9915499034",
  failedAttempts:0,
  lockUntil:null,
};

// ══════════════════════════════════════════════════════════════════
// SERVER-BACKED STATE
// Public site content loads for everyone; the full state (bookings,
// admin fields) only loads once a valid admin session token exists.
// Every admin edit PUTs the whole blob back, mirroring how this app's
// single setState() call always worked.
// ══════════════════════════════════════════════════════════════════
function useServerState() {
  const [state, setStateRaw] = useState(null); // null while the public site is loading
  const [token, setToken] = useState(() => {
    try { return sessionStorage.getItem("sm_token") || null; } catch { return null; }
  });

  useEffect(() => {
    fetch("/api/site").then(r => r.json()).then(site => {
      setStateRaw(prev => ({ ...(prev || {}), ...site }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/state", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(full => setStateRaw(full))
      .catch(() => {
        setToken(null);
        try { sessionStorage.removeItem("sm_token"); } catch {}
      });
  }, [token]);

  const setState = useCallback(fn => {
    setStateRaw(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      if (token) {
        fetch("/api/admin/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(next),
        }).catch(() => {});
      }
      return next;
    });
  }, [token]);

  const login = useCallback(tok => {
    try { sessionStorage.setItem("sm_token", tok); } catch {}
    setToken(tok);
  }, []);
  const logout = useCallback(() => {
    try { sessionStorage.removeItem("sm_token"); } catch {}
    setToken(null);
  }, []);

  return [state, setState, token, login, logout];
}

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════
function useInView(t=0.1){
  const r=useRef(null);const[v,sv]=useState(false);
  useEffect(()=>{const el=r.current;if(!el)return;
    const o=new IntersectionObserver(([e])=>{if(e.isIntersecting){sv(true);o.disconnect();}},{threshold:t});
    o.observe(el);return()=>o.disconnect();},[t]);
  return[r,v];
}
function Fade({children,delay=0}){
  const[r,v]=useInView();
  return<div ref={r} style={{opacity:v?1:0,transform:v?"none":"translateY(30px)",transition:`opacity 0.75s ${delay}s cubic-bezier(0.16,1,0.3,1),transform 0.75s ${delay}s cubic-bezier(0.16,1,0.3,1)`}}>{children}</div>;
}
function daysDiff(ds){
  if(!ds)return null;
  const d=new Date(ds),n=new Date();n.setHours(0,0,0,0);d.setHours(0,0,0,0);
  return Math.round((d-n)/86400000);
}
function urgency(diff){
  if(diff===null)return null;
  if(diff<0)return{label:"Past",c:"#555"};
  if(diff===0)return{label:"TODAY ⚡",c:"#e55"};
  if(diff<=2)return{label:"URGENT",c:"#e8a020"};
  if(diff<=7)return{label:"This Week",c:G};
  return{label:"Upcoming",c:"#6bc"};
}
function fmt(n){return new Intl.NumberFormat("en-IN").format(n);}

// ══════════════════════════════════════════════════════════════════
// LOGO
// ══════════════════════════════════════════════════════════════════
function Logo({size=42,light=true,onClick}){
  return(
    <div onClick={onClick} style={{cursor:onClick?"pointer":"default",display:"flex",alignItems:"center",gap:11,userSelect:"none"}}>
      <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
        <path d="M22 2L42 22L22 42L2 22Z" stroke={G} strokeWidth="1" fill="none" opacity=".55"/>
        <path d="M22 8L36 22L22 36L8 22Z" stroke={G} strokeWidth=".5" fill="none" opacity=".3"/>
        <path d="M22 13L31 22L22 31L13 22Z" fill={G} opacity=".95"/>
        <line x1="22" y1="2" x2="22" y2="13" stroke={G} strokeWidth="2" strokeLinecap="round"/>
        <line x1="22" y1="31" x2="22" y2="42" stroke={G} strokeWidth="2" strokeLinecap="round"/>
        <text x="22" y="25" textAnchor="middle" fill={D} fontSize="7.5" fontFamily="'Outfit',sans-serif" fontWeight="800">SM</text>
      </svg>
      <div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:size*0.43,fontWeight:600,letterSpacing:3,color:light?CR:"#111",lineHeight:1}}>SALARIA</div>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:size*0.17,letterSpacing:3.5,color:G,textTransform:"uppercase",marginTop:1}}>MAKEOVERS</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CUSTOM CURSOR (desktop only)
// ══════════════════════════════════════════════════════════════════
function Cursor(){
  const dot=useRef(null),ring=useRef(null),pos=useRef({x:0,y:0}),rp=useRef({x:0,y:0});
  const[isMobile]=useState(()=>/Mobi|Android/i.test(navigator.userAgent));
  useEffect(()=>{
    if(isMobile)return;
    const mv=e=>{pos.current={x:e.clientX,y:e.clientY};};
    window.addEventListener("mousemove",mv);
    let raf;const run=()=>{
      rp.current.x+=(pos.current.x-rp.current.x)*0.13;
      rp.current.y+=(pos.current.y-rp.current.y)*0.13;
      if(dot.current)dot.current.style.transform=`translate(${pos.current.x-4}px,${pos.current.y-4}px)`;
      if(ring.current)ring.current.style.transform=`translate(${rp.current.x-18}px,${rp.current.y-18}px)`;
      raf=requestAnimationFrame(run);};
    raf=requestAnimationFrame(run);
    return()=>{window.removeEventListener("mousemove",mv);cancelAnimationFrame(raf);};
  },[isMobile]);
  if(isMobile)return null;
  return<>
    <div ref={dot} style={{position:"fixed",top:0,left:0,width:8,height:8,borderRadius:"50%",background:G,zIndex:99999,pointerEvents:"none",willChange:"transform"}}/>
    <div ref={ring} style={{position:"fixed",top:0,left:0,width:36,height:36,borderRadius:"50%",border:`1px solid rgba(201,169,110,.5)`,zIndex:99998,pointerEvents:"none",willChange:"transform"}}/>
  </>;
}

// ══════════════════════════════════════════════════════════════════
// HIDDEN ADMIN ACCESS — Corner Tap Sequence
// User taps 4 corners in order: TL → TR → BL → BR (3 sec window each)
// No visible button anywhere on site
// ══════════════════════════════════════════════════════════════════
function HiddenAdminTrigger({onTriggered}){
  const seq=useRef([]);
  const timer=useRef(null);
  const corners=[
    {top:0,left:0,label:"TL"},{top:0,right:0,label:"TR"},
    {bottom:0,left:0,label:"BL"},{bottom:0,right:0,label:"BR"},
  ];
  const tap=(idx)=>{
    clearTimeout(timer.current);
    seq.current=[...seq.current,idx+1];
    if(seq.current.length===4){
      const match=SECRET_GESTURE.every((v,i)=>v===seq.current[i]);
      if(match)onTriggered();
      seq.current=[];
    } else {
      timer.current=setTimeout(()=>{seq.current=[];},3000);
    }
  };
  return(
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9990}}>
      {corners.map((c,i)=>(
        <div key={i} onClick={()=>tap(i)} style={{position:"fixed",...c,width:60,height:60,pointerEvents:"all",cursor:"default",userSelect:"none",WebkitTapHighlightColor:"transparent"}}/>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// UPI PAYMENT WIDGET
// ══════════════════════════════════════════════════════════════════
function UpiPayment({amount,bookingName,upiId,upiName,onPaid,onCancel}){
  const[timer,setTimer]=useState(300);// 5 min
  const[paid,setPaid]=useState(false);
  const[isMobile]=useState(()=>/Mobi|Android|iPhone/i.test(navigator.userAgent));
  const adv=Math.ceil(amount*0.25/10)*10;// round to nearest 10
  const upiStr=`upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${adv}&cu=INR&tn=Advance+for+${encodeURIComponent(bookingName)}`;
  // QR using free API
  const qrUrl=`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiStr)}`;

  useEffect(()=>{
    if(paid||timer<=0)return;
    const t=setTimeout(()=>setTimer(s=>s-1),1000);
    return()=>clearTimeout(t);
  },[timer,paid]);

  const mm=String(Math.floor(timer/60)).padStart(2,"0");
  const ss=String(timer%60).padStart(2,"0");
  const expired=timer<=0;

  const handlePay=()=>{
    if(isMobile){window.location.href=upiStr;}
    else{window.open(`https://wa.me/${upiId.replace(/[^0-9]/g,"")}`,"_blank");}
  };
  const confirmPaid=()=>{setPaid(true);setTimeout(()=>onPaid(),2000);};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",backdropFilter:"blur(12px)",zIndex:8000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:DC,border:`1px solid rgba(201,169,110,.15)`,maxWidth:420,width:"100%",padding:"32px 28px",position:"relative",borderRadius:2}}>
        {/* corner decor */}
        <div style={{position:"absolute",top:0,left:0,width:40,height:40,borderTop:`1px solid ${G}`,borderLeft:`1px solid ${G}`,pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:0,right:0,width:40,height:40,borderBottom:`1px solid ${G}`,borderRight:`1px solid ${G}`,pointerEvents:"none"}}/>

        {paid?(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:48,marginBottom:12}}>✅</div>
            <h3 style={{color:CR,fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:400,marginBottom:8}}>Payment Confirmed!</h3>
            <p style={{fontFamily:"'Outfit',sans-serif",fontSize:13,color:"rgba(250,246,240,.5)"}}>Your booking is secured. See you soon!</p>
          </div>
        ):(
          <>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:10,letterSpacing:3,textTransform:"uppercase",color:G,marginBottom:8}}>Advance Payment (25%)</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:44,fontWeight:300,color:CR,lineHeight:1}}>₹{fmt(adv)}</div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(250,246,240,.4)",marginTop:4}}>UPI ID: {upiId}</div>
            </div>

            {/* Timer */}
            {!expired&&(
              <div style={{textAlign:"center",marginBottom:16}}>
                <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(201,169,110,.06)",border:`1px solid rgba(201,169,110,.15)`,padding:"6px 18px",borderRadius:20}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:timer<60?"#e55":G,animation:"blink 1s infinite"}}/>
                  <span style={{fontFamily:"'Outfit',sans-serif",fontSize:14,color:timer<60?"#e55":G,letterSpacing:2}}>{mm}:{ss}</span>
                </div>
              </div>
            )}

            {expired?(
              <div style={{textAlign:"center",padding:"16px 0"}}>
                <p style={{fontFamily:"'Outfit',sans-serif",fontSize:13,color:"#e55",marginBottom:16}}>Payment window expired.</p>
                <button onClick={onCancel} style={{...btnStyle("outline")}}>Try Again</button>
              </div>
            ):(
              <>
                {/* QR for desktop */}
                {!isMobile&&(
                  <div style={{textAlign:"center",marginBottom:16}}>
                    <div style={{display:"inline-block",padding:10,background:"white",borderRadius:4}}>
                      <img src={qrUrl} alt="UPI QR" width={180} height={180} style={{display:"block"}}/>
                    </div>
                    <p style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:"rgba(250,246,240,.4)",marginTop:8}}>Scan with any UPI app</p>
                  </div>
                )}

                {/* Pay button for mobile */}
                {isMobile&&(
                  <button onClick={handlePay} style={{...btnStyle("gold"),width:"100%",marginBottom:12,fontSize:14,padding:"16px"}}>
                    📱 Pay ₹{fmt(adv)} via UPI App
                  </button>
                )}

                {/* UPI apps grid (mobile) */}
                {isMobile&&(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
                    {[["GPay","https://gpay.app.goo.gl/"],["PhonePe","https://phon.pe/"],["Paytm","https://paytm.com/"],["BHIM","https://www.bhimupi.org.in/"]].map(([n,u])=>(
                      <a key={n} href={upiStr} style={{textDecoration:"none",background:"rgba(201,169,110,.07)",border:"1px solid rgba(201,169,110,.15)",padding:"10px 4px",textAlign:"center",borderRadius:4}}>
                        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:CR}}>{n}</div>
                      </a>
                    ))}
                  </div>
                )}

                <button onClick={confirmPaid} style={{...btnStyle("outline"),width:"100%",marginBottom:10}}>
                  ✓ I've Paid — Confirm
                </button>
                <button onClick={onCancel} style={{background:"none",border:"none",fontFamily:"'Outfit',sans-serif",fontSize:11,color:"rgba(250,246,240,.35)",cursor:"pointer",width:"100%",textAlign:"center",letterSpacing:1}}>Cancel</button>
              </>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MULTI-STEP BOOKING FORM
// ══════════════════════════════════════════════════════════════════
const STEPS=[{id:1,label:"You",icon:"👤"},{id:2,label:"Event",icon:"📅"},{id:3,label:"Vision",icon:"✨"},{id:4,label:"Payment",icon:"💳"}];
function BookingForm({services,content,onNewBooking}){
  const[step,setStep]=useState(1);
  const[done,setDone]=useState(false);
  const[showPay,setShowPay]=useState(false);
  const[savedBooking,setSavedBooking]=useState(null);
  const[f,sf]=useState({name:"",phone:"",email:"",date:"",service:"",location:"",price:"",inspiration:"",message:""});
  const u=(k,v)=>sf(p=>({...p,[k]:v}));
  const priceNum=parseInt((f.price||"").replace(/[^0-9]/g,""))||0;
  const advAmt=Math.ceil(priceNum*0.25/10)*10;

  const finish=(payLater=false)=>{
    const b={id:Date.now(),...f,servicePrice:String(priceNum),advanceAmt:String(advAmt),
      submittedAt:new Date().toISOString(),status:"new",paymentStatus:payLater?"pending":"paid"};
    onNewBooking(b);setSavedBooking(b);
    if(!payLater)setShowPay(true);
    else{setDone(true);setTimeout(()=>{setDone(false);setStep(1);sf({name:"",phone:"",email:"",date:"",service:"",location:"",price:"",inspiration:"",message:""});},5000);}
  };

  if(done)return(
    <div style={{textAlign:"center",padding:"56px 0"}}>
      <div style={{width:72,height:72,borderRadius:"50%",border:`1.5px solid ${G}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 20px",color:G}}>✓</div>
      <h3 style={{fontSize:26,fontWeight:400,color:CR,marginBottom:8}}>Booking Received!</h3>
      <p style={{fontFamily:"'Outfit',sans-serif",fontSize:13,color:"rgba(250,246,240,.5)",fontWeight:300}}>I'll reach out within 24 hours to confirm your slot.</p>
    </div>
  );

  return(
    <div>
      {showPay&&savedBooking&&(
        <UpiPayment amount={priceNum} bookingName={savedBooking.name}
          upiId={content.upiId} upiName={content.upiName||"Salaria Makeovers"}
          onPaid={()=>{setShowPay(false);setDone(true);}}
          onCancel={()=>setShowPay(false)}/>
      )}

      {/* Step bar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",marginBottom:40,gap:0,flexWrap:"wrap"}}>
        {STEPS.map((s,i)=>(
          <div key={s.id} style={{display:"flex",alignItems:"center"}}>
            <div onClick={()=>s.id<step&&setStep(s.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:7,cursor:s.id<step?"pointer":"default"}}>
              <div style={{width:46,height:46,borderRadius:"50%",background:step>=s.id?G:"transparent",border:`1px solid ${step>=s.id?G:"rgba(201,169,110,.2)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,transition:"all .4s",boxShadow:step===s.id?`0 0 22px rgba(201,169,110,.4)`:"none",transform:step===s.id?"scale(1.1)":"scale(1)"}}>
                {step>s.id?"✓":s.icon}
              </div>
              <span style={{fontFamily:"'Outfit',sans-serif",fontSize:9,letterSpacing:2,textTransform:"uppercase",color:step>=s.id?G:"rgba(250,246,240,.25)",transition:"color .3s"}}>{s.label}</span>
            </div>
            {i<STEPS.length-1&&<div style={{width:48,height:1,margin:"0 8px 22px",background:step>s.id?G:"rgba(201,169,110,.15)",transition:"background .4s"}}/>}
          </div>
        ))}
      </div>

      <div style={{minHeight:220}}>
        {step===1&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"22px 18px"}}>
          <BF l="Full Name *"><input className="bi" placeholder="Priya Sharma" value={f.name} onChange={e=>u("name",e.target.value)}/></BF>
          <BF l="Phone *"><input className="bi" placeholder="+91 XXXXX XXXXX" value={f.phone} onChange={e=>u("phone",e.target.value)}/></BF>
          <BF l="Email"><input className="bi" placeholder="your@email.com" value={f.email} onChange={e=>u("email",e.target.value)}/></BF>
        </div>}
        {step===2&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"22px 18px"}}>
          <BF l="Event Date"><input className="bi" type="date" value={f.date} onChange={e=>u("date",e.target.value)}/></BF>
          <BF l="Service">
            <select className="bi" value={f.service} onChange={e=>{u("service",e.target.value);const s=services.find(x=>x.title===e.target.value);if(s)u("price",s.price.replace("Starting ",""));}}>
              <option value="">Select service</option>
              {services.map((s,i)=><option key={i} value={s.title}>{s.title} — {s.price}</option>)}
            </select>
          </BF>
          <BF l="City / Venue"><input className="bi" placeholder="Delhi or venue" value={f.location} onChange={e=>u("location",e.target.value)}/></BF>
          <BF l="Estimated Budget (₹)"><input className="bi" placeholder="e.g. 15000" value={f.price} onChange={e=>u("price",e.target.value)}/></BF>
        </div>}
        {step===3&&<div style={{display:"grid",gap:"22px"}}>
          <BF l="Your Dream Look / Inspiration"><input className="bi" placeholder="Describe or share a reference" value={f.inspiration} onChange={e=>u("inspiration",e.target.value)}/></BF>
          <BF l="Special Requests"><textarea className="bi" rows={4} placeholder="Skin concerns, outfit details, allergies..." value={f.message} onChange={e=>u("message",e.target.value)} style={{resize:"vertical"}}/></BF>
        </div>}
        {step===4&&<div>
          <div style={{background:"rgba(201,169,110,.05)",border:"1px solid rgba(201,169,110,.15)",padding:"20px 22px",marginBottom:20}}>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:10,letterSpacing:3,textTransform:"uppercase",color:G,marginBottom:14}}>Booking Summary</div>
            {[["Name",f.name],["Phone",f.phone],["Service",f.service],["Date",f.date||"TBD"],["Location",f.location||"TBD"],["Total Price",`₹${fmt(priceNum)}`],["Advance (25%)",`₹${fmt(advAmt)}`]].map(([k,v])=>v&&(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(201,169,110,.07)"}}>
                <span style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(250,246,240,.45)"}}>{k}</span>
                <span style={{fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:k.includes("Advance")?"600":"400",color:k.includes("Advance")?G:CR}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(250,246,240,.45)",lineHeight:1.7,marginBottom:18}}>
            A 25% advance secures your booking date. Remaining balance on the day of service.
          </div>
          <div style={{display:"grid",gap:10}}>
            {priceNum>0&&<button className="gbtn" style={{width:"100%"}} onClick={()=>finish(false)}>Pay Advance ₹{fmt(advAmt)} Now →</button>}
            <button className="obtn" style={{width:"100%"}} onClick={()=>finish(true)}>Pay Later — Confirm Booking</button>
          </div>
        </div>}
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:32}}>
        {step>1?<button className="obtn" style={{padding:"12px 28px",fontSize:11}} onClick={()=>setStep(s=>s-1)}>← Back</button>:<div/>}
        {step<4&&<button className="gbtn" style={{padding:"12px 28px",fontSize:11,...(step===1&&(!f.name||!f.phone)?{opacity:.4,pointerEvents:"none"}:{})}} onClick={()=>setStep(s=>s+1)} disabled={step===1&&(!f.name||!f.phone)}>Continue →</button>}
      </div>
    </div>
  );
}
function BF({l,children}){return<div><label style={{fontFamily:"'Outfit',sans-serif",fontSize:10,letterSpacing:2.5,textTransform:"uppercase",color:G,display:"block",marginBottom:8}}>{l}</label>{children}</div>;}

// ══════════════════════════════════════════════════════════════════
// BUTTON STYLES
// ══════════════════════════════════════════════════════════════════
function btnStyle(t){
  if(t==="gold")return{fontFamily:"'Outfit',sans-serif",fontSize:11,letterSpacing:2.5,textTransform:"uppercase",padding:"14px 36px",background:G,color:D,border:`1px solid ${G}`,cursor:"pointer",fontWeight:600,transition:"all .35s"};
  return{fontFamily:"'Outfit',sans-serif",fontSize:11,letterSpacing:2.5,textTransform:"uppercase",padding:"14px 36px",background:"transparent",color:G,border:`1px solid ${G}`,cursor:"pointer",transition:"all .35s"};
}

// ══════════════════════════════════════════════════════════════════
// ADMIN — PASSWORD RESET VIA OTP
// ══════════════════════════════════════════════════════════════════
function OtpReset({adminPhone,onSuccess,onCancel}){
  const[stage,setStage]=useState("enter"); // enter | verify | newpwd
  const[ph,setPh]=useState("");
  const[otp,setOtp]=useState("");
  const[generatedOtp,setGOtp]=useState("");
  const[newPwd,setNP]=useState("");
  const[err,setErr]=useState("");

  const send=()=>{
    if(ph.replace(/\D/g,"")!==adminPhone.replace(/\D/g,""))return setErr("Phone number doesn't match the registered owner number.");
    const code=String(Math.floor(100000+Math.random()*900000));
    setGOtp(code);
    setStage("verify");
    setErr("");
    alert(`[DEMO] Your OTP is: ${code}\n\nIn production, this would be sent to WhatsApp ${ph}`);
  };
  const verify=()=>{
    if(otp===generatedOtp){setStage("newpwd");setErr("");}
    else setErr("Incorrect OTP. Try again.");
  };
  return(
    <div style={{textAlign:"center",maxWidth:380,margin:"0 auto",padding:"0 20px"}}>
      <div style={{fontSize:32,marginBottom:16}}>🔑</div>
      <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:400,color:CR,marginBottom:6}}>Reset Password</h3>
      <p style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(250,246,240,.4)",marginBottom:28,lineHeight:1.6}}>
        {stage==="enter"&&"Enter your registered WhatsApp number to receive an OTP."}
        {stage==="verify"&&"Enter the 6-digit OTP sent to your WhatsApp."}
        {stage==="newpwd"&&"Set your new admin password."}
      </p>
      {err&&<p style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"#e77",marginBottom:16}}>{err}</p>}
      {stage==="enter"&&<>
        <input style={{...inputStyle,marginBottom:14}} placeholder="WhatsApp number (e.g. 9915499034)" value={ph} onChange={e=>setPh(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/>
        <button style={{...btnStyle("gold"),width:"100%",marginBottom:10}} onClick={send}>Send OTP →</button>
        <button style={{background:"none",border:"none",color:"rgba(250,246,240,.35)",fontFamily:"'Outfit',sans-serif",fontSize:12,cursor:"pointer"}} onClick={onCancel}>← Back to Login</button>
      </>}
      {stage==="verify"&&<>
        <input style={{...inputStyle,marginBottom:14,letterSpacing:6,textAlign:"center"}} placeholder="000000" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&verify()}/>
        <button style={{...btnStyle("gold"),width:"100%",marginBottom:10}} onClick={verify}>Verify OTP</button>
        <button style={{background:"none",border:"none",color:"rgba(250,246,240,.35)",fontFamily:"'Outfit',sans-serif",fontSize:12,cursor:"pointer"}} onClick={()=>setStage("enter")}>← Re-enter number</button>
      </>}
      {stage==="newpwd"&&<>
        <input type="password" style={{...inputStyle,marginBottom:14}} placeholder="New password" value={newPwd} onChange={e=>setNP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&newPwd.length>=6&&onSuccess(newPwd)}/>
        <button style={{...btnStyle("gold"),width:"100%",...(newPwd.length<6?{opacity:.4,pointerEvents:"none"}:{})}} onClick={()=>onSuccess(newPwd)}>Set New Password</button>
        <p style={{fontFamily:"'Outfit',sans-serif",fontSize:11,color:"rgba(250,246,240,.3)",marginTop:12}}>Minimum 6 characters</p>
      </>}
    </div>
  );
}
const inputStyle={fontFamily:"'Outfit',sans-serif",width:"100%",padding:"14px 18px",background:"rgba(201,169,110,.06)",border:"1px solid rgba(201,169,110,.2)",color:CR,fontSize:14,outline:"none",boxSizing:"border-box",transition:"border-color .3s"};

// ══════════════════════════════════════════════════════════════════
// ADMIN LOGIN
// ══════════════════════════════════════════════════════════════════
function AdminLogin({adminPwd,adminPhone,failedAttempts,lockUntil,onSuccess,onChangePwd,onFail}){
  const[pwd,setPwd]=useState("");
  const[err,setErr]=useState("");
  const[shake,setShake]=useState(false);
  const[otp,setOtp]=useState(false);
  const now=Date.now();
  const locked=lockUntil&&now<lockUntil;
  const remaining=locked?Math.ceil((lockUntil-now)/1000):0;

  const attempt=async()=>{
    if(locked)return;
    try{
      const res=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pwd})});
      const data=await res.json();
      if(res.ok){onSuccess(data.token);return;}
      setShake(true);setTimeout(()=>setShake(false),500);setPwd("");
      onFail(data.failedAttempts,data.lockUntil||null);
      const fa=data.failedAttempts||0;
      setErr(data.lockUntil?"Too many attempts. Locked for 10 minutes.":`Incorrect password. ${5-fa} attempt${5-fa===1?"":"s"} left.`);
    }catch{
      setErr("Couldn't reach the server. Is the backend running?");
    }
  };

  if(otp)return<div style={{minHeight:"100vh",background:D,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Outfit',sans-serif"}}><div style={{maxWidth:420,width:"100%",padding:"0 24px"}}><OtpReset adminPhone={adminPhone} onSuccess={async np=>{await onChangePwd(np);setOtp(false);setErr("Password changed! Please login with new password.");}} onCancel={()=>setOtp(false)}/></div></div>;

  return(
    <div style={{minHeight:"100vh",background:D,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Outfit',sans-serif",cursor:"none"}}>
      <Cursor/>
      <div style={{textAlign:"center",maxWidth:400,width:"100%",padding:"0 24px"}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:36}}><Logo size={52}/></div>
        <div style={{fontSize:10,letterSpacing:4,textTransform:"uppercase",color:G,marginBottom:10}}>Owner Portal</div>
        <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:30,fontWeight:300,color:CR,marginBottom:6}}>Admin Access</h2>
        <p style={{fontSize:12,color:"rgba(250,246,240,.3)",marginBottom:36,lineHeight:1.6}}>This dashboard is private and accessible to the owner only.</p>

        {err&&<p style={{fontSize:12,color:err.includes("changed")?"#6c6":"#e77",marginBottom:16,padding:"10px",background:err.includes("changed")?"rgba(100,200,100,.1)":"rgba(230,80,80,.1)",border:`1px solid ${err.includes("changed")?"rgba(100,200,100,.2)":"rgba(230,80,80,.2)"}`}}>{err}</p>}

        <div style={{animation:shake?"shake 0.5s":undefined}}>
          {locked?(
            <div style={{padding:"20px",background:"rgba(230,80,80,.08)",border:"1px solid rgba(230,80,80,.2)",marginBottom:16}}>
              <p style={{fontSize:13,color:"#e77"}}>Account locked for {Math.floor(remaining/60)}m {remaining%60}s</p>
              <p style={{fontSize:11,color:"rgba(250,246,240,.3)",marginTop:6}}>Use "Forgot Password" to reset via WhatsApp OTP</p>
            </div>
          ):(
            <>
              <input type="password" placeholder="Owner password" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&attempt()} style={{...inputStyle,marginBottom:14,borderColor:shake?"#e55":"rgba(201,169,110,.2)"}}/>
              <button onClick={attempt} style={{...btnStyle("gold"),width:"100%",marginBottom:12}}>Access Dashboard</button>
            </>
          )}
          <button onClick={()=>setOtp(true)} style={{background:"none",border:"none",fontFamily:"'Outfit',sans-serif",fontSize:11,color:"rgba(250,246,240,.3)",cursor:"pointer",letterSpacing:1,transition:"color .3s"}} onMouseEnter={e=>e.target.style.color=G} onMouseLeave={e=>e.target.style.color="rgba(250,246,240,.3)"}>
            Forgot Password? Reset via WhatsApp OTP
          </button>
        </div>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// BACKUP / RESTORE
// ══════════════════════════════════════════════════════════════════
function BackupRestore({state,onRestore}){
  const[msg,setMsg]=useState("");
  const dl=()=>{
    const data=JSON.stringify({...state,backupDate:new Date().toISOString(),version:"v4"},null,2);
    const b=new Blob([data],{type:"application/json"});
    const u=URL.createObjectURL(b);const a=document.createElement("a");
    a.href=u;a.download=`salaria-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();URL.revokeObjectURL(u);
    setMsg("✅ Backup downloaded!");setTimeout(()=>setMsg(""),3000);
  };
  const ul=e=>{
    const file=e.target.files[0];if(!file)return;
    const r=new FileReader();r.onload=ev=>{
      try{const d=JSON.parse(ev.target.result);onRestore(d);setMsg("✅ Backup restored successfully!");}
      catch{setMsg("❌ Invalid backup file.");}
      setTimeout(()=>setMsg(""),4000);
    };r.readAsText(file);
    e.target.value="";
  };
  return(
    <div style={{maxWidth:560}}>
      <h2 style={{fontSize:22,fontWeight:300,color:CR,marginBottom:6}}>Backup & Restore</h2>
      <p style={{fontFamily:"'Outfit',sans-serif",fontSize:13,color:"rgba(250,246,240,.4)",marginBottom:28,lineHeight:1.7}}>
        Download a full backup of all your site data — bookings, content, services, portfolio, testimonials — as a JSON file. Store it safely. Restore anytime.
      </p>
      {msg&&<div style={{fontFamily:"'Outfit',sans-serif",fontSize:13,color:msg.includes("✅")?"#6c6":"#e77",padding:"12px 16px",background:msg.includes("✅")?"rgba(100,200,100,.1)":"rgba(230,80,80,.1)",border:`1px solid ${msg.includes("✅")?"rgba(100,200,100,.2)":"rgba(230,80,80,.2)"}`,marginBottom:20}}>{msg}</div>}
      <div style={{display:"grid",gap:14}}>
        <div style={{background:DC2,border:"1px solid rgba(201,169,110,.1)",padding:"22px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:14}}>
          <div>
            <div style={{fontSize:15,color:CR,marginBottom:4}}>📦 Download Backup</div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(250,246,240,.35)"}}>All data · JSON format · {new Date().toLocaleDateString("en-IN")}</div>
          </div>
          <button onClick={dl} style={{...btnStyle("gold"),padding:"10px 24px"}}>Download Now</button>
        </div>
        <div style={{background:DC2,border:"1px solid rgba(201,169,110,.1)",padding:"22px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:14}}>
          <div>
            <div style={{fontSize:15,color:CR,marginBottom:4}}>⬆️ Restore from Backup</div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(250,246,240,.35)"}}>Upload a previously downloaded .json file</div>
          </div>
          <label style={{...btnStyle("outline"),padding:"10px 24px",cursor:"pointer"}}>
            Choose File
            <input type="file" accept=".json" onChange={ul} style={{display:"none"}}/>
          </label>
        </div>
        <div style={{background:"rgba(230,130,30,.06)",border:"1px solid rgba(230,130,30,.15)",padding:"16px 20px"}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(230,180,80,.7)",lineHeight:1.7}}>
            ⚠️ <strong>Important:</strong> Restoring a backup will replace ALL current data. Download a current backup first if you have recent bookings you want to keep.
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// STATUS BADGE
// ══════════════════════════════════════════════════════════════════
function StatusSelect({val,onChange,opts,colors}){
  return(
    <select value={val} onChange={e=>onChange(e.target.value)} style={{background:"rgba(0,0,0,.5)",border:`1px solid ${colors[val]||G}`,color:colors[val]||G,fontFamily:"'Outfit',sans-serif",fontSize:10,letterSpacing:1.5,textTransform:"uppercase",padding:"4px 10px",cursor:"pointer",outline:"none"}}>
      {opts.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ══════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════
function AdminDashboard({state,setState,onLogout}){
  const[tab,setTab]=useState("dashboard");
  const[editSvc,setES]=useState(null);
  const[editTest,setET]=useState(null);
  const[editPort,setEP]=useState(null);
  const[selB,setSelB]=useState(null);
  const[fStatus,setFS]=useState("all");
  const[newImgUrl,setNI]=useState("");
  const[pwdForm,setPF]=useState({cur:"",n1:"",n2:""});
  const[pwdMsg,setPM]=useState("");
  const{content,services,portfolio,testimonials,stats,tags,bookings,adminPwd,adminPhone}=state;
  const upS=fn=>setState(s=>({...s,...fn(s)}));
  const upC=k=>e=>upS(s=>({content:{...s.content,[k]:e.target.value}}));

  // Auto-logout after 10 minutes of inactivity (matches GenrikTail admin's security policy).
  useEffect(()=>{
    let timerId;
    const reset=()=>{clearTimeout(timerId);timerId=setTimeout(onLogout,600000);};
    reset();
    const events=["mousemove","mousedown","keypress","scroll","touchstart"];
    events.forEach(e=>window.addEventListener(e,reset));
    return()=>{clearTimeout(timerId);events.forEach(e=>window.removeEventListener(e,reset));};
  },[onLogout]);

  const sorted=[...bookings].sort((a,b)=>{
    const da=daysDiff(a.date),db=daysDiff(b.date);
    if(da===null&&db===null)return new Date(b.submittedAt)-new Date(a.submittedAt);
    if(da===null)return 1;if(db===null)return -1;
    if(da<0&&db>=0)return 1;if(da>=0&&db<0)return -1;
    return da-db;
  });
  const filtered=fStatus==="all"?sorted:sorted.filter(b=>b.status===fStatus);
  const upcoming=bookings.filter(b=>{const d=daysDiff(b.date);return d!==null&&d>=0&&b.status!=="cancelled";});
  const urgent=upcoming.filter(b=>{const d=daysDiff(b.date);return d!==null&&d<=2;});
  const todayB=bookings.filter(b=>daysDiff(b.date)===0&&b.status!=="cancelled");
  const newCnt=bookings.filter(b=>b.status==="new").length;
  const totalRevenue=bookings.filter(b=>b.paymentStatus==="paid").reduce((a,b)=>a+parseInt(b.advanceAmt||0),0);

  const TABS=[
    {id:"dashboard",l:"📊 Dashboard"},
    {id:"bookings",l:"📋 Bookings",badge:newCnt},
    {id:"payment",l:"💳 Payment Settings"},
    {id:"content",l:"✏️ Text & Content"},
    {id:"services",l:"💄 Services"},
    {id:"portfolio",l:"🖼️ Portfolio"},
    {id:"testimonials",l:"⭐ Testimonials"},
    {id:"stats",l:"📈 Stats"},
    {id:"tags",l:"🏷️ Tags"},
    {id:"security",l:"🔐 Security"},
    {id:"backup",l:"💾 Backup & Restore"},
  ];

  return(
    <div style={{minHeight:"100vh",background:D,fontFamily:"'Outfit',sans-serif",color:CR}}>
      <style>{`
        .ai{font-family:'Outfit',sans-serif;width:100%;padding:10px 14px;background:rgba(201,169,110,.06);border:1px solid rgba(201,169,110,.18);color:${CR};font-size:13px;outline:none;border-radius:2px;transition:border-color .3s;box-sizing:border-box;}
        .ai:focus{border-color:${G};}
        .ai::placeholder{color:rgba(250,246,240,.2);}
        select.ai option{background:#111;}
        .at{font-family:'Outfit',sans-serif;font-size:11.5px;letter-spacing:1px;text-transform:uppercase;padding:10px 16px;margin:0 10px;background:transparent;border:none;border-radius:10px;color:rgba(250,246,240,.45);cursor:pointer;transition:all .25s;text-align:left;width:calc(100% - 20px);white-space:nowrap;}
        .at:hover{color:${CR};background:rgba(201,169,110,.08);}
        .at.on{color:${D};background:${G};font-weight:600;}
        .ac{background:${DC};border:1px solid rgba(201,169,110,.08);padding:18px;margin-bottom:10px;border-radius:2px;}
        .ac:hover{border-color:rgba(201,169,110,.18);}
        .al{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${G};display:block;margin-bottom:6px;}
        .asec{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(250,246,240,.25);margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid rgba(201,169,110,.06);margin-top:26px;}
        .db{font-size:11px;padding:6px 14px;background:rgba(220,60,60,.1);border:1px solid rgba(220,60,60,.22);color:#e88;cursor:pointer;border-radius:2px;transition:all .25s;}
        .db:hover{background:rgba(220,60,60,.3);}
        .sb{font-size:11px;padding:6px 14px;background:rgba(201,169,110,.1);border:1px solid rgba(201,169,110,.28);color:${G};cursor:pointer;border-radius:2px;transition:all .25s;}
        .sb:hover{background:${G};color:${D};}
        .ab{font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:10px 20px;background:transparent;border:1px solid rgba(201,169,110,.22);color:${G};cursor:pointer;transition:all .25s;}
        .ab:hover{background:rgba(201,169,110,.08);border-color:${G};}
        .kpi{background:${DC2};border:1px solid rgba(201,169,110,.09);padding:18px 20px;border-radius:2px;transition:border-color .3s;}
        .kpi:hover{border-color:rgba(201,169,110,.28);}
        .br{background:${DC};border:1px solid rgba(201,169,110,.07);padding:14px 18px;margin-bottom:7px;border-radius:2px;cursor:pointer;transition:all .25s;}
        .br:hover{border-color:rgba(201,169,110,.28);background:rgba(201,169,110,.03);}
        @media(max-width:640px){.sidebar{display:flex;overflow-x:auto;width:100%;flex-direction:row!important;border-right:none!important;border-bottom:1px solid rgba(201,169,110,.08)!important;padding:8px!important;}.at{margin:0 4px;white-space:nowrap;}.main-area{padding:20px 16px!important;}}
      `}</style>

      {/* Top nav */}
      <div style={{background:"#0d0d0d",borderBottom:"1px solid rgba(201,169,110,.09)",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,zIndex:100}}>
        <Logo size={34}/>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <a href="/" target="_blank" rel="noreferrer" style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",color:"rgba(250,246,240,.5)",border:"1px solid rgba(201,169,110,.18)",borderRadius:20,padding:"6px 14px",textDecoration:"none",transition:"all .25s"}} onMouseEnter={e=>{e.target.style.borderColor=G;e.target.style.color=G;}} onMouseLeave={e=>{e.target.style.borderColor="rgba(201,169,110,.18)";e.target.style.color="rgba(250,246,240,.5)";}}>
            View Website
          </a>
          <span style={{fontSize:10,letterSpacing:3,textTransform:"uppercase",color:"rgba(201,169,110,.5)"}}>Admin</span>
          <button onClick={onLogout} style={{background:"none",border:"1px solid rgba(201,169,110,.18)",color:"rgba(250,246,240,.4)",fontSize:10,letterSpacing:2,padding:"7px 16px",cursor:"pointer",transition:"all .25s",textTransform:"uppercase"}} onMouseEnter={e=>{e.target.style.borderColor=G;e.target.style.color=G;}} onMouseLeave={e=>{e.target.style.borderColor="rgba(201,169,110,.18)";e.target.style.color="rgba(250,246,240,.4)";}}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{display:"flex",minHeight:"calc(100vh - 56px)",flexDirection:"row"}}>
        {/* Sidebar */}
        <div className="sidebar" style={{width:210,flexShrink:0,background:"#0d0d0d",borderRight:"1px solid rgba(201,169,110,.07)",padding:"16px 0",display:"flex",flexDirection:"column",gap:2,overflowY:"auto"}}>
          {TABS.map(t=>(
            <button key={t.id} className={`at ${tab===t.id?"on":""}`} onClick={()=>setTab(t.id)}>
              {t.l}{t.badge>0&&<span style={{marginLeft:7,background:"#e55",color:"white",fontSize:9,padding:"2px 6px",borderRadius:10,fontWeight:700}}>{t.badge}</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="main-area" style={{flex:1,padding:"28px 32px",overflowY:"auto"}}>

          {/* ─── DASHBOARD ─── */}
          {tab==="dashboard"&&(
            <div>
              <h2 style={{fontSize:24,fontWeight:300,color:CR,marginBottom:4}}>Dashboard</h2>
              <p style={{fontSize:12,color:"rgba(250,246,240,.35)",marginBottom:28}}>Business overview · {new Date().toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:14,marginBottom:32}}>
                {[
                  {l:"Total Bookings",v:bookings.length,icon:"📋",c:G},
                  {l:"New / Pending",v:newCnt,icon:"🔔",c:newCnt>0?"#e8a020":G},
                  {l:"Today",v:todayB.length,icon:"📅",c:todayB.length>0?"#e55":G},
                  {l:"Urgent ≤ 2d",v:urgent.length,icon:"⚡",c:urgent.length>0?"#e8a020":G},
                  {l:"Upcoming",v:upcoming.length,icon:"✨",c:"#6bc"},
                  {l:"Advance Collected",v:`₹${fmt(totalRevenue)}`,icon:"💰",c:"#6c6"},
                ].map((k,i)=>(
                  <div key={i} className="kpi">
                    <div style={{fontSize:20,marginBottom:8}}>{k.icon}</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:400,color:k.c,lineHeight:1}}>{k.v}</div>
                    <div style={{fontSize:10,letterSpacing:1.5,textTransform:"uppercase",color:"rgba(250,246,240,.35)",marginTop:5}}>{k.l}</div>
                  </div>
                ))}
              </div>

              <div className="asec" style={{marginTop:0}}>Upcoming Events</div>
              {upcoming.length===0&&<p style={{color:"rgba(250,246,240,.3)",fontSize:13}}>No upcoming bookings.</p>}
              {upcoming.slice(0,8).map(b=>{const diff=daysDiff(b.date);const ug=urgency(diff);return(
                <div key={b.id} className="br" onClick={()=>{setSelB(b);setTab("bookings");}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:3}}>
                        <span style={{fontSize:14,color:CR}}>{b.name}</span>
                        {ug&&<span style={{fontSize:9,letterSpacing:1.5,textTransform:"uppercase",color:ug.c,border:`1px solid ${ug.c}`,padding:"2px 7px"}}>{ug.label}</span>}
                        {b.paymentStatus==="paid"&&<span style={{fontSize:9,letterSpacing:1,background:"rgba(100,200,100,.15)",color:"#6c6",border:"1px solid rgba(100,200,100,.2)",padding:"2px 7px"}}>PAID</span>}
                      </div>
                      <div style={{fontSize:11,color:"rgba(250,246,240,.35)"}}>{b.service} · {b.date}{b.location&&` · ${b.location}`}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:ug?.c||G,fontWeight:300}}>{diff===0?"Today":diff===1?"Tomorrow":`${diff}d`}</div>
                      {b.advanceAmt&&<div style={{fontSize:10,color:"rgba(250,246,240,.3)"}}>₹{fmt(b.advanceAmt)} adv</div>}
                    </div>
                  </div>
                </div>
              );})}

              <div className="asec">Latest Received</div>
              {[...bookings].sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt)).slice(0,5).map(b=>(
                <div key={b.id} className="br" onClick={()=>{setSelB(b);setTab("bookings");}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><span style={{fontSize:14,color:CR}}>{b.name}</span><span style={{fontSize:11,color:"rgba(250,246,240,.35)",marginLeft:10}}>{b.phone}</span></div>
                    <div style={{fontSize:11,color:"rgba(250,246,240,.28)"}}>{new Date(b.submittedAt).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                  <div style={{fontSize:11,color:G,marginTop:3}}>{b.service}{b.date&&` · ${b.date}`}</div>
                </div>
              ))}
            </div>
          )}

          {/* ─── BOOKINGS ─── */}
          {tab==="bookings"&&(
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22,flexWrap:"wrap",gap:10}}>
                <h2 style={{fontSize:22,fontWeight:300,color:CR}}>Bookings <span style={{color:"rgba(250,246,240,.3)",fontSize:16}}>({bookings.length})</span></h2>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {["all","new","confirmed","completed","cancelled"].map(s=>(
                    <button key={s} className={`at ${fStatus===s?"on":""}`} style={{padding:"6px 14px",border:"1px solid rgba(201,169,110,.15)",borderRadius:2,borderLeft:"none"}} onClick={()=>setFS(s)}>{s==="all"?"All":s}</button>
                  ))}
                </div>
              </div>
              {filtered.length===0&&<p style={{color:"rgba(250,246,240,.3)",fontSize:13}}>No bookings{fStatus!=="all"&&` with status "${fStatus}"`}.</p>}
              {filtered.map(b=>{
                const diff=daysDiff(b.date);const ug=urgency(diff);const open=selB?.id===b.id;
                return(
                  <div key={b.id} style={{background:DC,border:`1px solid rgba(201,169,110,.07)`,borderLeft:`3px solid ${ug?.c||"rgba(201,169,110,.2)"}`,marginBottom:8,borderRadius:2}}>
                    <div className="br" style={{margin:0,border:"none",borderRadius:0}} onClick={()=>setSelB(open?null:b)}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:12}}>
                          <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${G},rgba(201,169,110,.4))`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:D,fontWeight:700,flexShrink:0}}>{b.name[0]}</div>
                          <div>
                            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                              <span style={{fontSize:14,color:CR}}>{b.name}</span>
                              {ug&&<span style={{fontSize:9,color:ug.c,border:`1px solid ${ug.c}`,padding:"2px 7px",letterSpacing:1.5,textTransform:"uppercase"}}>{ug.label}</span>}
                              {b.status==="new"&&<span style={{fontSize:9,background:"#e55",color:"white",padding:"2px 7px",letterSpacing:1}}>NEW</span>}
                              {b.paymentStatus==="paid"&&<span style={{fontSize:9,background:"rgba(100,200,100,.15)",color:"#6c6",border:"1px solid rgba(100,200,100,.2)",padding:"2px 7px"}}>💰 PAID</span>}
                            </div>
                            <div style={{fontSize:11,color:"rgba(250,246,240,.35)",marginTop:2}}>{b.service}{b.date&&` · ${b.date}`}{b.location&&` · ${b.location}`}</div>
                          </div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                          <StatusSelect val={b.status} onChange={v=>upS(s=>({bookings:s.bookings.map(x=>x.id===b.id?{...x,status:v}:x)}))} opts={["new","confirmed","completed","cancelled"]} colors={{new:"#6bc",confirmed:G,completed:"#6c6",cancelled:"#e55"}}/>
                          <StatusSelect val={b.paymentStatus||"pending"} onChange={v=>upS(s=>({bookings:s.bookings.map(x=>x.id===b.id?{...x,paymentStatus:v}:x)}))} opts={["pending","paid","refunded"]} colors={{pending:"#e8a020",paid:"#6c6",refunded:"#e55"}}/>
                          <button className="db" onClick={e=>{e.stopPropagation();upS(s=>({bookings:s.bookings.filter(x=>x.id!==b.id)}));if(selB?.id===b.id)setSelB(null);}}>✕</button>
                        </div>
                      </div>
                    </div>
                    {open&&(
                      <div style={{padding:"16px 20px",borderTop:"1px solid rgba(201,169,110,.06)",background:"rgba(201,169,110,.02)"}}>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"10px 20px"}}>
                          {[["Phone",b.phone],["Email",b.email||"—"],["Date",b.date||"—"],["Location",b.location||"—"],["Service Price",b.servicePrice?`₹${fmt(b.servicePrice)}`:"—"],["Advance Due",b.advanceAmt?`₹${fmt(b.advanceAmt)}`:"—"],["Payment",b.paymentStatus||"—"],["Submitted",new Date(b.submittedAt).toLocaleString("en-IN")]].map(([k,v])=>(
                            <div key={k}><div style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:G,marginBottom:3}}>{k}</div><div style={{fontSize:12,color:CR}}>{v}</div></div>
                          ))}
                        </div>
                        {b.inspiration&&<div style={{marginTop:12}}><div style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:G,marginBottom:4}}>Inspiration</div><div style={{fontSize:12,color:"rgba(250,246,240,.6)"}}>{b.inspiration}</div></div>}
                        {b.message&&<div style={{marginTop:10}}><div style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:G,marginBottom:4}}>Message</div><div style={{fontSize:12,color:"rgba(250,246,240,.6)"}}>{b.message}</div></div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── PAYMENT SETTINGS ─── */}
          {tab==="payment"&&(
            <div style={{maxWidth:580}}>
              <h2 style={{fontSize:22,fontWeight:300,color:CR,marginBottom:6}}>Payment Settings</h2>
              <p style={{fontSize:12,color:"rgba(250,246,240,.4)",marginBottom:28}}>Configure UPI details and advance percentage shown to clients.</p>
              {[["upiId","UPI ID (e.g. yourname@upi)"],["upiName","Account Name / Display Name"],["gmail","Gmail / Contact Email"]].map(([k,l])=>(
                <div key={k} style={{marginBottom:16}}>
                  <label className="al">{l}</label>
                  <input className="ai" value={content[k]||""} onChange={upC(k)}/>
                </div>
              ))}
              <div style={{marginBottom:16}}>
                <label className="al">Advance Payment % (currently {content.advancePct||25}%)</label>
                <input className="ai" type="number" min={10} max={100} value={content.advancePct||25} onChange={upC("advancePct")}/>
              </div>
              <div style={{marginBottom:16}}>
                <label className="al">WhatsApp Number (for client contact)</label>
                <input className="ai" value={content.whatsapp||""} onChange={upC("whatsapp")}/>
              </div>
              {/* QR preview */}
              {content.upiId&&(
                <div style={{marginTop:24,padding:"20px",background:DC2,border:"1px solid rgba(201,169,110,.1)",textAlign:"center"}}>
                  <div style={{fontSize:10,letterSpacing:3,textTransform:"uppercase",color:G,marginBottom:14}}>Your UPI QR Code Preview</div>
                  <div style={{display:"inline-block",padding:10,background:"white",borderRadius:4}}>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=${content.upiId}&pn=${encodeURIComponent(content.upiName||"")}&cu=INR`)}`} alt="QR" width={160} height={160} style={{display:"block"}}/>
                  </div>
                  <div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:"rgba(250,246,240,.4)",marginTop:10}}>Scan to pay · {content.upiId}</div>
                </div>
              )}
            </div>
          )}

          {/* ─── CONTENT ─── */}
          {tab==="content"&&(
            <div style={{maxWidth:660}}>
              <h2 style={{fontSize:22,fontWeight:300,color:CR,marginBottom:24}}>Text & Content</h2>
              {[
                ["Hero",["heroSub","Subtitle","heroTitle1","Title Part 1","heroItalic","Title Gold Word","heroTitle2","Title Part 2","heroDesc","Hero Description"]],
                ["About",["aboutName","Artist Name","aboutDesc","About Bio"]],
                ["Booking Section",["bookingTitle","Booking Title","bookingDesc","Booking Description"]],
                ["Contact & Social",["phone","Phone","gmail","Email","instagram","Instagram Handle","youtube","YouTube Handle","footerTagline","Footer Tagline"]],
              ].map(([sec,fields])=>(
                <div key={sec}>
                  <div className="asec">{sec}</div>
                  {Array.from({length:fields.length/2},(_,i)=>[fields[i*2],fields[i*2+1]]).map(([key,label])=>(
                    <div key={key} style={{marginBottom:14}}>
                      <label className="al">{label}</label>
                      {["aboutDesc","bookingDesc","footerTagline"].includes(key)
                        ?<textarea className="ai" rows={3} value={content[key]||""} onChange={upC(key)} style={{resize:"vertical"}}/>
                        :<input className="ai" value={content[key]||""} onChange={upC(key)}/>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ─── SERVICES ─── */}
          {tab==="services"&&(
            <div style={{maxWidth:700}}>
              <h2 style={{fontSize:22,fontWeight:300,color:CR,marginBottom:22}}>Services ({services.length})</h2>
              {services.map(s=>(
                <div key={s.id} className="ac">
                  {editSvc===s.id?(
                    <div style={{display:"grid",gap:12}}>
                      {[["title","Title"],["price","Price"],["icon","Icon (emoji)"]].map(([k,l])=>(
                        <div key={k}><label className="al">{l}</label><input className="ai" value={s[k]} onChange={e=>upS(st=>({services:st.services.map(x=>x.id===s.id?{...x,[k]:e.target.value}:x)}))}/></div>
                      ))}
                      <div><label className="al">Description</label><textarea className="ai" rows={3} value={s.desc} onChange={e=>upS(st=>({services:st.services.map(x=>x.id===s.id?{...x,desc:e.target.value}:x)}))} style={{resize:"vertical"}}/></div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}><input type="checkbox" checked={s.popular} onChange={e=>upS(st=>({services:st.services.map(x=>x.id===s.id?{...x,popular:e.target.checked}:x)}))} style={{accentColor:G}}/><span style={{fontSize:12,color:"rgba(250,246,240,.55)"}}>Show Popular badge</span></div>
                      <button className="sb" style={{alignSelf:"flex-start"}} onClick={()=>setES(null)}>✓ Done</button>
                    </div>
                  ):(
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <span style={{fontSize:26}}>{s.icon}</span>
                        <div><div style={{color:CR,fontSize:14}}>{s.title}</div><div style={{fontSize:12,color:G,marginTop:2}}>{s.price}</div></div>
                        {s.popular&&<span style={{fontSize:9,background:G,color:D,padding:"3px 8px",letterSpacing:1.5}}>POPULAR</span>}
                      </div>
                      <div style={{display:"flex",gap:8}}><button className="sb" onClick={()=>setES(s.id)}>Edit</button><button className="db" onClick={()=>upS(st=>({services:st.services.filter(x=>x.id!==s.id)}))}>Delete</button></div>
                    </div>
                  )}
                </div>
              ))}
              <button className="ab" onClick={()=>{const id=Date.now();upS(s=>({services:[...s.services,{id,title:"New Service",desc:"Description",price:"Starting ₹0",icon:"💄",popular:false}]}));setES(id);}}>+ Add Service</button>
            </div>
          )}

          {/* ─── PORTFOLIO ─── */}
          {tab==="portfolio"&&(
            <div>
              <h2 style={{fontSize:22,fontWeight:300,color:CR,marginBottom:22}}>Portfolio ({portfolio.length})</h2>
              <div style={{background:"rgba(201,169,110,.04)",border:"1px dashed rgba(201,169,110,.18)",padding:"18px 20px",marginBottom:22}}>
                <div style={{fontSize:11,color:"rgba(250,246,240,.32)",marginBottom:10}}>Add image by URL</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <input className="ai" placeholder="https://image-url.com/bridal.jpg" value={newImgUrl} onChange={e=>setNI(e.target.value)} style={{flex:1,minWidth:180}}/>
                  <select className="ai" id="ncat" style={{width:130}} defaultValue="Bridal">{["Bridal","Party","Engagement","Hair","Editorial"].map(c=><option key={c}>{c}</option>)}</select>
                  <button className="sb" onClick={()=>{if(!newImgUrl.trim())return;const cat=document.getElementById("ncat").value;upS(s=>({portfolio:[...s.portfolio,{id:Date.now(),category:cat,imageUrl:newImgUrl.trim(),label:`${cat} Look`,gradient:"linear-gradient(135deg,#C9A96E,#8B6914)"}]}));setNI("");}}>Add</button>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:14}}>
                {portfolio.map(item=>(
                  <div key={item.id} className="ac" style={{padding:0,overflow:"hidden"}}>
                    <div style={{height:120,background:item.imageUrl?`url(${item.imageUrl}) center/cover`:item.gradient,position:"relative"}}>
                      <button className="db" onClick={()=>upS(s=>({portfolio:s.portfolio.filter(x=>x.id!==item.id)}))} style={{position:"absolute",top:8,right:8,fontSize:10,padding:"4px 10px"}}>✕</button>
                    </div>
                    <div style={{padding:"10px 12px"}}>
                      {editPort===item.id?(
                        <div style={{display:"grid",gap:7}}>
                          <input className="ai" value={item.label} onChange={e=>upS(s=>({portfolio:s.portfolio.map(x=>x.id===item.id?{...x,label:e.target.value}:x)}))} style={{padding:"7px 10px",fontSize:12}}/>
                          <select className="ai" value={item.category} onChange={e=>upS(s=>({portfolio:s.portfolio.map(x=>x.id===item.id?{...x,category:e.target.value}:x)}))} style={{padding:"7px 10px",fontSize:12}}>{["Bridal","Party","Engagement","Hair","Editorial"].map(c=><option key={c}>{c}</option>)}</select>
                          <button className="sb" style={{fontSize:11,padding:"5px"}} onClick={()=>setEP(null)}>✓ Done</button>
                        </div>
                      ):(
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div><div style={{fontSize:9,letterSpacing:1.5,textTransform:"uppercase",color:G}}>{item.category}</div><div style={{fontSize:12,color:CR,marginTop:2}}>{item.label}</div></div>
                          <button className="sb" style={{padding:"4px 10px",fontSize:10}} onClick={()=>setEP(item.id)}>Edit</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── TESTIMONIALS ─── */}
          {tab==="testimonials"&&(
            <div style={{maxWidth:700}}>
              <h2 style={{fontSize:22,fontWeight:300,color:CR,marginBottom:22}}>Testimonials ({testimonials.length})</h2>
              {testimonials.map(t=>(
                <div key={t.id} className="ac">
                  {editTest===t.id?(
                    <div style={{display:"grid",gap:12}}>
                      {[["name","Client Name"],["event","Event Type"]].map(([k,l])=>(
                        <div key={k}><label className="al">{l}</label><input className="ai" value={t[k]} onChange={e=>upS(s=>({testimonials:s.testimonials.map(x=>x.id===t.id?{...x,[k]:e.target.value}:x)}))}/></div>
                      ))}
                      <div><label className="al">Review</label><textarea className="ai" rows={3} value={t.text} onChange={e=>upS(s=>({testimonials:s.testimonials.map(x=>x.id===t.id?{...x,text:e.target.value}:x)}))} style={{resize:"vertical"}}/></div>
                      <div><label className="al">Rating (1-5)</label><input className="ai" type="number" min={1} max={5} value={t.rating} onChange={e=>upS(s=>({testimonials:s.testimonials.map(x=>x.id===t.id?{...x,rating:Number(e.target.value)}:x)}))} style={{width:70}}/></div>
                      <button className="sb" style={{alignSelf:"flex-start"}} onClick={()=>setET(null)}>✓ Done</button>
                    </div>
                  ):(
                    <div style={{display:"flex",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
                      <div style={{flex:1,minWidth:200}}>
                        <div style={{color:G,fontSize:12,marginBottom:4}}>{"★".repeat(t.rating)}</div>
                        <div style={{fontSize:12,color:"rgba(250,246,240,.5)",lineHeight:1.6,marginBottom:7}}>{t.text.slice(0,90)}...</div>
                        <div style={{color:CR,fontSize:13}}>{t.name}<span style={{color:G,fontSize:10,marginLeft:8}}>· {t.event}</span></div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:7,flexShrink:0}}><button className="sb" onClick={()=>setET(t.id)}>Edit</button><button className="db" onClick={()=>upS(s=>({testimonials:s.testimonials.filter(x=>x.id!==t.id)}))}>Delete</button></div>
                    </div>
                  )}
                </div>
              ))}
              <button className="ab" onClick={()=>{const id=Date.now();upS(s=>({testimonials:[...s.testimonials,{id,name:"New Client",event:"Bridal Makeup",text:"Amazing experience...",rating:5}]}));setET(id);}}>+ Add Testimonial</button>
            </div>
          )}

          {/* ─── STATS ─── */}
          {tab==="stats"&&(
            <div style={{maxWidth:560}}>
              <h2 style={{fontSize:22,fontWeight:300,color:CR,marginBottom:22}}>Stats</h2>
              {stats.map(s=>(
                <div key={s.id} className="ac" style={{display:"grid",gridTemplateColumns:"1fr 2fr auto",gap:14,alignItems:"center"}}>
                  <div><label className="al">Number</label><input className="ai" value={s.number} onChange={e=>upS(st=>({stats:st.stats.map(x=>x.id===s.id?{...x,number:e.target.value}:x)}))}/></div>
                  <div><label className="al">Label</label><input className="ai" value={s.label} onChange={e=>upS(st=>({stats:st.stats.map(x=>x.id===s.id?{...x,label:e.target.value}:x)}))}/></div>
                  <button className="db" style={{marginTop:20}} onClick={()=>upS(s=>({stats:s.stats.filter(x=>x.id!==s.id)}))}>✕</button>
                </div>
              ))}
              <button className="ab" style={{marginTop:8}} onClick={()=>upS(s=>({stats:[...s.stats,{id:Date.now(),number:"0+",label:"New Stat"}]}))}>+ Add Stat</button>
            </div>
          )}

          {/* ─── TAGS ─── */}
          {tab==="tags"&&(
            <div style={{maxWidth:480}}>
              <h2 style={{fontSize:22,fontWeight:300,color:CR,marginBottom:22}}>About Tags</h2>
              {tags.map((tag,i)=>(
                <div key={i} className="ac" style={{display:"flex",alignItems:"center",gap:10}}>
                  <input className="ai" value={tag} onChange={e=>upS(s=>({tags:s.tags.map((x,j)=>j===i?e.target.value:x)}))} style={{flex:1}}/>
                  <button className="db" onClick={()=>upS(s=>({tags:s.tags.filter((_,j)=>j!==i)}))}>✕</button>
                </div>
              ))}
              <button className="ab" style={{marginTop:8}} onClick={()=>upS(s=>({tags:[...s.tags,"New Tag"]}))}>+ Add Tag</button>
            </div>
          )}

          {/* ─── SECURITY ─── */}
          {tab==="security"&&(
            <div style={{maxWidth:520}}>
              <h2 style={{fontSize:22,fontWeight:300,color:CR,marginBottom:6}}>Security Settings</h2>
              <p style={{fontSize:12,color:"rgba(250,246,240,.4)",marginBottom:28,lineHeight:1.7}}>Change your admin password. You can always reset it via WhatsApp OTP if forgotten.</p>
              <div className="asec" style={{marginTop:0}}>Change Admin Password</div>
              {pwdMsg&&<div style={{fontFamily:"'Outfit',sans-serif",fontSize:12,color:pwdMsg.includes("✅")?"#6c6":"#e77",padding:"10px 14px",background:pwdMsg.includes("✅")?"rgba(100,200,100,.1)":"rgba(230,80,80,.1)",border:`1px solid ${pwdMsg.includes("✅")?"rgba(100,200,100,.2)":"rgba(230,80,80,.2)"}`,marginBottom:16}}>{pwdMsg}</div>}
              {[["cur","Current Password","password"],["n1","New Password","password"],["n2","Confirm New Password","password"]].map(([k,l,t])=>(
                <div key={k} style={{marginBottom:14}}>
                  <label className="al">{l}</label>
                  <input className="ai" type={t} value={pwdForm[k]} onChange={e=>setPF(f=>({...f,[k]:e.target.value}))}/>
                </div>
              ))}
              <button style={{...btnStyle("gold"),marginTop:4}} onClick={()=>{
                if(pwdForm.cur!==adminPwd)return setPM("❌ Current password incorrect.");
                if(pwdForm.n1.length<6)return setPM("❌ New password must be at least 6 characters.");
                if(pwdForm.n1!==pwdForm.n2)return setPM("❌ Passwords do not match.");
                upS(()=>({adminPwd:pwdForm.n1}));setPF({cur:"",n1:"",n2:""});setPM("✅ Password changed successfully!");
              }}>Update Password</button>

              <div className="asec">Registered Recovery Phone</div>
              <div style={{marginBottom:14}}>
                <label className="al">WhatsApp Number (for OTP reset)</label>
                <input className="ai" value={adminPhone} onChange={e=>upS(()=>({adminPhone:e.target.value}))}/>
                <div style={{fontSize:11,color:"rgba(250,246,240,.3)",marginTop:6}}>This number receives your OTP when you forget your password.</div>
              </div>

              <div className="asec">Access Method</div>
              <div style={{background:"rgba(201,169,110,.05)",border:"1px solid rgba(201,169,110,.12)",padding:"16px 18px",fontSize:12,color:"rgba(250,246,240,.55)",lineHeight:1.75}}>
                <strong style={{color:CR}}>How to access admin:</strong><br/>
                Tap the 4 corners of the screen in order: <span style={{color:G}}>Top-Left → Top-Right → Bottom-Left → Bottom-Right</span>.<br/>
                Each tap must be within 3 seconds of the previous. No button is visible to clients.
              </div>
            </div>
          )}

          {/* ─── BACKUP ─── */}
          {tab==="backup"&&(
            <BackupRestore state={state} onRestore={d=>setState({...INIT,...d,adminPwd:state.adminPwd,adminPhone:state.adminPhone,failedAttempts:0,lockUntil:null})}/>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════
export default function App(){
  const[appState,setAppState,,login,logout]=useServerState();
  const[view,setView]=useState("site"); // site | login | admin

  const showLogin=()=>{setView("login");};

  const handleLogin=(tok)=>{
    login(tok);
    setAppState(s=>({...s,failedAttempts:0,lockUntil:null}));
    setView("admin");
  };
  const handleFail=(fa,lu)=>setAppState(s=>({...s,failedAttempts:fa,lockUntil:lu}));
  const handleLogout=()=>{logout();setView("site");};
  const changePwd=async np=>{
    await fetch("/api/admin/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({newPassword:np})});
  };

  if(!appState)return<div style={{minHeight:"100vh",background:D}}/>; // loading the public site

  if(view==="login")return(
    <AdminLogin
      adminPwd={appState.adminPwd} adminPhone={appState.adminPhone}
      failedAttempts={appState.failedAttempts} lockUntil={appState.lockUntil}
      onSuccess={handleLogin} onFail={handleFail}
      onChangePwd={changePwd}
    />
  );
  if(view==="admin"){
    if(!appState.bookings)return<div style={{minHeight:"100vh",background:D}}/>; // loading full admin state
    return<AdminDashboard state={appState} setState={setAppState} onLogout={handleLogout}/>;
  }

  return(
    <>
      <HiddenAdminTrigger onTriggered={showLogin}/>
      <Website
        state={appState}
        onNewBooking={b=>{
          fetch("/api/bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).catch(()=>{});
        }}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// PUBLIC WEBSITE
// ══════════════════════════════════════════════════════════════════
function Website({state,onNewBooking}){
  const{content,services,portfolio,testimonials,stats,tags}=state;
  const[activeNav,setAN]=useState("home");
  const[menuOpen,setMO]=useState(false);
  const[filter,setFilter]=useState("All");
  const[scrolled,setSc]=useState(false);

  useEffect(()=>{
    const h=()=>setSc(window.scrollY>50);
    window.addEventListener("scroll",h,{passive:true});
    return()=>window.removeEventListener("scroll",h);
  },[]);

  const goTo=id=>{document.getElementById(id)?.scrollIntoView({behavior:"smooth"});setMO(false);setAN(id);};
  const NAV=["home","services","portfolio","testimonials","booking"];
  const cats=["All",...Array.from(new Set(portfolio.map(p=>p.category)))];
  const fp=filter==="All"?portfolio:portfolio.filter(p=>p.category===filter);

  return(
    <div style={{fontFamily:"'Cormorant Garamond',serif",background:D,color:CR,minHeight:"100vh",overflowX:"hidden"}}>
      <Cursor/>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Outfit:wght@200;300;400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}html{scroll-behavior:smooth;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:${D};}::-webkit-scrollbar-thumb{background:${G};border-radius:2px;}

        /* NAV */
        .nl{position:relative;cursor:pointer;font-family:'Outfit',sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${CR};background:none;border:none;padding:8px 2px;transition:color .3s;}
        .nl::after{content:'';position:absolute;bottom:0;left:50%;right:50%;height:1px;background:${G};transition:left .35s cubic-bezier(.16,1,.3,1),right .35s cubic-bezier(.16,1,.3,1);}
        .nl:hover::after,.nl.on::after{left:0;right:0;}
        .nl:hover,.nl.on{color:${G};}

        /* BUTTONS */
        .gbtn{font-family:'Outfit',sans-serif;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;padding:14px 34px;background:${G};color:${D};border:1px solid ${G};cursor:pointer;transition:all .4s cubic-bezier(.16,1,.3,1);font-weight:600;position:relative;overflow:hidden;}
        .gbtn::after{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent);transition:left .5s;}
        .gbtn:hover::after{left:110%;}
        .gbtn:hover{background:${CR};border-color:${CR};transform:translateY(-2px);box-shadow:0 14px 36px rgba(201,169,110,.28);}
        .gbtn:disabled{opacity:.4;pointer-events:none;}
        .obtn{font-family:'Outfit',sans-serif;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;padding:14px 34px;background:transparent;color:${G};border:1px solid ${G};cursor:pointer;transition:all .4s;position:relative;overflow:hidden;z-index:0;}
        .obtn::before{content:'';position:absolute;inset:0;background:${G};transform:scaleX(0);transform-origin:left;transition:transform .4s cubic-bezier(.16,1,.3,1);z-index:-1;}
        .obtn:hover::before{transform:scaleX(1);}
        .obtn:hover{color:${D};}

        /* BOOKING INPUT */
        .bi{font-family:'Outfit',sans-serif;width:100%;padding:12px 14px;background:rgba(201,169,110,.05);border:1px solid rgba(201,169,110,.15);color:${CR};font-size:14px;outline:none;transition:all .3s;border-radius:1px;}
        .bi:focus{border-color:${G};background:rgba(201,169,110,.08);box-shadow:0 0 0 3px rgba(201,169,110,.07);}
        .bi::placeholder{color:rgba(250,246,240,.22);}
        select.bi option{background:${DC};}
        textarea.bi{resize:vertical;}

        /* SERVICE CARDS */
        .sc{background:${DC};border:1px solid rgba(201,169,110,.08);padding:30px 24px;position:relative;overflow:hidden;transition:all .5s cubic-bezier(.16,1,.3,1);}
        .sc::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${G},transparent);opacity:0;transition:opacity .5s;}
        .sc:hover{border-color:${G};transform:translateY(-8px);box-shadow:0 28px 64px rgba(0,0,0,.5);}
        .sc:hover::before{opacity:1;}
        .sc .si{transition:transform .4s cubic-bezier(.16,1,.3,1);display:inline-block;}
        .sc:hover .si{transform:scale(1.25) rotate(-8deg);}
        .sc .gi{position:absolute;bottom:-10px;right:-8px;font-size:80px;opacity:0;transform:scale(.7) rotate(15deg);transition:all .5s cubic-bezier(.16,1,.3,1);pointer-events:none;}
        .sc:hover .gi{opacity:.07;transform:scale(1) rotate(5deg);}

        /* PORTFOLIO */
        .pi{position:relative;aspect-ratio:3/4;overflow:hidden;cursor:pointer;}
        .pi>*:first-child{width:100%;height:100%;object-fit:cover;transition:transform .7s cubic-bezier(.16,1,.3,1);}
        .pi:hover>*:first-child{transform:scale(1.07);}
        .pcircle{position:absolute;top:50%;left:50%;width:62px;height:62px;border-radius:50%;background:${G};transform:translate(-50%,-50%) scale(0);transition:transform .45s cubic-bezier(.16,1,.3,1);display:flex;align-items:center;justify-content:center;font-size:20px;color:${D};}
        .pi:hover .pcircle{transform:translate(-50%,-50%) scale(1);}

        /* TESTIMONIALS */
        .tc{background:${DC};border:1px solid rgba(201,169,110,.07);padding:34px 28px;position:relative;overflow:hidden;transition:border-color .4s,transform .4s;}
        .tc::before{content:'"';position:absolute;top:4px;left:16px;font-size:100px;color:rgba(201,169,110,.06);font-family:'Cormorant Garamond',serif;line-height:1;pointer-events:none;}
        .tc:hover{border-color:rgba(201,169,110,.3);transform:translateY(-5px);}

        /* FILTER */
        .fb{font-family:'Outfit',sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;padding:8px 18px;background:transparent;color:rgba(250,246,240,.4);border:1px solid rgba(201,169,110,.14);cursor:pointer;transition:all .3s;}
        .fb.on,.fb:hover{background:${G};color:${D};border-color:${G};}

        /* MISC */
        .sn{font-size:clamp(32px,5vw,52px);font-weight:300;color:${G};line-height:1;}
        .sl{font-family:'Outfit',sans-serif;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(250,246,240,.4);margin-top:8px;}
        .badge{position:absolute;background:${G};color:${D};font-family:'Outfit',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 11px;top:14px;right:14px;}
        .secl{font-family:'Outfit',sans-serif;font-size:10px;letter-spacing:4.5px;text-transform:uppercase;color:${G};margin-bottom:12px;}
        .sect{font-size:clamp(26px,4.5vw,48px);font-weight:300;line-height:1.15;margin-bottom:16px;}
        .div{width:50px;height:1px;background:linear-gradient(90deg,transparent,${G},transparent);margin:0 auto;}
        .ham{display:none;background:none;border:none;cursor:pointer;padding:8px;}
        .ham span{display:block;width:24px;height:1.5px;background:${CR};margin:5px 0;transition:all .3s;}
        .tp{font-family:'Outfit',sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${G};padding:7px 16px;border:1px solid rgba(201,169,110,.2);transition:all .3s;cursor:default;}
        .tp:hover{background:rgba(201,169,110,.08);border-color:${G};}
        .mq{display:inline-block;animation:sl 22s linear infinite;}
        .wa{position:fixed;bottom:20px;right:20px;width:52px;height:52px;background:#25D366;border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:996;box-shadow:0 4px 20px rgba(37,211,102,.4);transition:transform .3s;font-size:24px;text-decoration:none;}
        .wa:hover{transform:scale(1.12);}

        @media(max-width:768px){
          .ham{display:block;}
          .navl{display:none;}
          .navl.open{display:flex;flex-direction:column;position:absolute;top:100%;left:0;right:0;background:rgba(10,10,10,.98);backdrop-filter:blur(24px);padding:22px;gap:18px;border-bottom:1px solid rgba(201,169,110,.1);}
        }
        @keyframes fu{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sh{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes sl{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes popIn{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes bnc{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}
        .shim{background:linear-gradient(90deg,${G} 0%,${CR} 25%,${G} 50%,${CR} 75%,${G} 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:sh 4s linear infinite;}
      `}</style>

      {/* NAV */}
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:1000,padding:scrolled?"12px 5vw":"20px 5vw",background:scrolled?"rgba(10,10,10,.96)":"transparent",backdropFilter:scrolled?"blur(24px)":"none",borderBottom:scrolled?"1px solid rgba(201,169,110,.1)":"none",transition:"all .4s",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <Logo size={38} onClick={()=>goTo("home")}/>
        <div className={`navl ${menuOpen?"open":""}`} style={{display:"flex",gap:28,alignItems:"center"}}>
          {NAV.map(n=><button key={n} className={`nl ${activeNav===n?"on":""}`} onClick={()=>goTo(n)}>{n}</button>)}
          <button className="gbtn" style={{padding:"9px 20px",fontSize:10}} onClick={()=>goTo("booking")}>Book Now</button>
        </div>
        <button className="ham" onClick={()=>setMO(!menuOpen)}>
          <span style={{transform:menuOpen?"rotate(45deg) translate(5px,5px)":"none"}}/>
          <span style={{opacity:menuOpen?0:1}}/>
          <span style={{transform:menuOpen?"rotate(-45deg) translate(5px,-5px)":"none"}}/>
        </button>
      </nav>

      {/* HERO */}
      <section id="home" style={{minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",textAlign:"center",padding:"110px 5vw 80px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"8%",left:"5%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(201,169,110,.07),transparent 70%)",filter:"blur(60px)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:"12%",right:"5%",width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(201,169,110,.05),transparent 70%)",filter:"blur(40px)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:90,left:"5vw",width:64,height:64,borderTop:`1px solid rgba(201,169,110,.2)`,borderLeft:`1px solid rgba(201,169,110,.2)`,pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:55,right:"5vw",width:64,height:64,borderBottom:`1px solid rgba(201,169,110,.2)`,borderRight:`1px solid rgba(201,169,110,.2)`,pointerEvents:"none"}}/>

        {[{delay:.2,content:<div style={{display:"flex",alignItems:"center",gap:14,justifyContent:"center",marginBottom:18}}><div style={{width:32,height:1,background:`linear-gradient(to right,transparent,${G})`}}/><p style={{fontFamily:"'Outfit',sans-serif",fontSize:10,letterSpacing:5,textTransform:"uppercase",color:G}}>{content.heroSub}</p><div style={{width:32,height:1,background:`linear-gradient(to left,transparent,${G})`}}/></div>},{delay:.45,content:<h1 style={{fontSize:"clamp(38px,8vw,90px)",fontWeight:300,lineHeight:1.05,letterSpacing:"-1px"}}>{content.heroTitle1} <em style={{fontStyle:"italic",color:G}}>{content.heroItalic}</em>,<br/>{content.heroTitle2}</h1>},{delay:.75,content:<p style={{fontFamily:"'Outfit',sans-serif",fontSize:15,color:"rgba(250,246,240,.55)",maxWidth:440,margin:"22px auto",lineHeight:1.85,fontWeight:300}}>{content.heroDesc}</p>},{delay:1,content:<div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}><button className="gbtn" onClick={()=>goTo("booking")}>Book Your Look</button><button className="obtn" onClick={()=>goTo("portfolio")}>View Portfolio</button></div>}].map((x,i)=>(
          <div key={i} style={{animation:`fu 1s ease forwards`,animationDelay:`${x.delay}s`,opacity:0}}>{x.content}</div>
        ))}
        <div style={{position:"absolute",bottom:34,left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:8,animation:"fu 1s ease forwards",animationDelay:"1.3s",opacity:0}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:8,letterSpacing:4,textTransform:"uppercase",color:"rgba(250,246,240,.2)"}}>Scroll</div>
          <div style={{width:1,height:32,background:`linear-gradient(to bottom,${G},transparent)`,animation:"bnc 2s ease infinite"}}/>
        </div>
      </section>

      {/* MARQUEE */}
      <div style={{borderTop:"1px solid rgba(201,169,110,.08)",borderBottom:"1px solid rgba(201,169,110,.08)",padding:"14px 0",overflow:"hidden"}}>
        <div style={{overflow:"hidden",whiteSpace:"nowrap"}}><span className="mq" style={{fontFamily:"'Outfit',sans-serif",fontSize:10,letterSpacing:4,textTransform:"uppercase",color:"rgba(250,246,240,.18)"}}>{"BRIDAL MAKEUP  ✦  PARTY GLAM  ✦  HAIRSTYLING  ✦  PRE-WEDDING  ✦  ENGAGEMENT  ✦  MAKEUP CLASSES  ✦  HD AIRBRUSH  ✦  ".repeat(4)}</span></div>
      </div>

      {/* STATS */}
      <section style={{padding:"72px 5vw"}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:36,textAlign:"center"}}>
          {stats.map((s,i)=><Fade key={s.id} delay={i*.1}><div className="sn">{s.number}</div><div className="sl">{s.label}</div></Fade>)}
        </div>
      </section>

      {/* ABOUT */}
      <section style={{padding:"56px 5vw 90px"}}>
        <div style={{maxWidth:860,margin:"0 auto",textAlign:"center"}}>
          <Fade><div className="secl">About</div><h2 className="sect">Meet <span style={{color:G,fontStyle:"italic"}}>{content.aboutName}</span></h2><div className="div" style={{margin:"20px auto"}}/><p style={{fontFamily:"'Outfit',sans-serif",fontSize:15,lineHeight:1.88,color:"rgba(250,246,240,.58)",maxWidth:600,margin:"0 auto",fontWeight:300}}>{content.aboutDesc}</p><div style={{display:"flex",gap:10,justifyContent:"center",marginTop:32,flexWrap:"wrap"}}>{tags.map((t,i)=><span key={i} className="tp">{t}</span>)}</div></Fade>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" style={{padding:"90px 5vw",background:"linear-gradient(180deg,rgba(20,20,20,.5),#0A0A0A)"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <Fade><div style={{textAlign:"center",marginBottom:52}}><div className="secl">Services</div><h2 className="sect">What I <span style={{color:G,fontStyle:"italic"}}>Offer</span></h2><div className="div" style={{margin:"16px auto"}}/></div></Fade>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:20}}>
            {services.map((s,i)=>(
              <Fade key={s.id} delay={i*.08}>
                <div className="sc">{s.popular&&<div className="badge">Popular</div>}<div style={{fontSize:36,marginBottom:12}}><span className="si">{s.icon}</span></div><div className="gi">{s.icon}</div><h3 style={{fontSize:21,fontWeight:400,marginBottom:10,color:CR}}>{s.title}</h3><p style={{fontFamily:"'Outfit',sans-serif",fontSize:13,lineHeight:1.78,color:"rgba(250,246,240,.48)",marginBottom:16,fontWeight:300}}>{s.desc}</p><div style={{fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:500,color:G,letterSpacing:1}}>{s.price}</div></div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* PORTFOLIO */}
      <section id="portfolio" style={{padding:"90px 5vw"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <Fade><div style={{textAlign:"center",marginBottom:36}}><div className="secl">Portfolio</div><h2 className="sect">My <span style={{color:G,fontStyle:"italic"}}>Work</span></h2><div className="div" style={{margin:"16px auto 30px"}}/></div></Fade>
          <Fade delay={.1}><div style={{display:"flex",gap:7,justifyContent:"center",marginBottom:32,flexWrap:"wrap"}}>{cats.map(f=><button key={f} className={`fb ${filter===f?"on":""}`} onClick={()=>setFilter(f)}>{f}</button>)}</div></Fade>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:13}}>
            {fp.map((item,i)=>(
              <Fade key={item.id} delay={i*.06}>
                <div className="pi">
                  {item.imageUrl?<img src={item.imageUrl} alt={item.label}/>:<div style={{width:"100%",height:"100%",background:item.gradient}}/>}
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(10,10,10,.85),transparent 55%)"}}/>
                  <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"14px 18px"}}><div style={{fontFamily:"'Outfit',sans-serif",fontSize:9,letterSpacing:2,textTransform:"uppercase",color:G}}>{item.category}</div><div style={{fontSize:17,fontWeight:400,marginTop:3}}>{item.label}</div></div>
                  <div className="pcircle">↗</div>
                </div>
              </Fade>
            ))}
          </div>
          <Fade delay={.3}><div style={{textAlign:"center",marginTop:40}}><a href={`https://www.instagram.com/${content.instagram?.replace("@","")}`} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}><button className="obtn">See More on Instagram →</button></a></div></Fade>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" style={{padding:"90px 5vw",background:"linear-gradient(180deg,#0A0A0A,rgba(20,20,20,.7) 50%,#0A0A0A)"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <Fade><div style={{textAlign:"center",marginBottom:50}}><div className="secl">Testimonials</div><h2 className="sect">Client <span style={{color:G,fontStyle:"italic"}}>Love</span></h2><div className="div" style={{margin:"16px auto"}}/></div></Fade>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:20}}>
            {testimonials.map((t,i)=>(
              <Fade key={t.id} delay={i*.14}>
                <div className="tc"><div style={{color:G,fontSize:13,marginBottom:13,letterSpacing:2}}>{"★".repeat(t.rating)}</div><p style={{fontFamily:"'Outfit',sans-serif",fontSize:14,lineHeight:1.85,color:"rgba(250,246,240,.58)",fontWeight:300,marginBottom:20}}>{t.text}</p><div style={{display:"flex",alignItems:"center",gap:11}}><div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${G},rgba(201,169,110,.4))`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:D,fontWeight:700}}>{t.name[0]}</div><div><div style={{fontSize:15,fontWeight:500,color:CR}}>{t.name}</div><div style={{fontFamily:"'Outfit',sans-serif",fontSize:9,letterSpacing:2,textTransform:"uppercase",color:G,marginTop:2}}>{t.event}</div></div></div></div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* BOOKING */}
      <section id="booking" style={{padding:"90px 5vw"}}>
        <div style={{maxWidth:800,margin:"0 auto"}}>
          <Fade><div style={{textAlign:"center",marginBottom:50}}><div className="secl">Book Now</div><h2 className="sect"><span className="shim">{content.bookingTitle}</span></h2><div className="div" style={{margin:"16px auto"}}/><p style={{fontFamily:"'Outfit',sans-serif",fontSize:13,color:"rgba(250,246,240,.42)",maxWidth:380,margin:"12px auto 0",fontWeight:300,lineHeight:1.8}}>{content.bookingDesc}</p></div></Fade>
          <Fade delay={.2}>
            <div style={{background:DC,border:"1px solid rgba(201,169,110,.1)",padding:"clamp(24px,5vw,44px) clamp(20px,4vw,38px)",position:"relative"}}>
              <div style={{position:"absolute",top:0,left:0,width:44,height:44,borderTop:`1px solid rgba(201,169,110,.35)`,borderLeft:`1px solid rgba(201,169,110,.35)`,pointerEvents:"none"}}/>
              <div style={{position:"absolute",bottom:0,right:0,width:44,height:44,borderBottom:`1px solid rgba(201,169,110,.35)`,borderRight:`1px solid rgba(201,169,110,.35)`,pointerEvents:"none"}}/>
              <BookingForm services={services} content={content} onNewBooking={onNewBooking}/>
            </div>
          </Fade>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{borderTop:"1px solid rgba(201,169,110,.07)",padding:"50px 5vw 32px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:36}}>
          <div><div style={{marginBottom:16}}><Logo size={36}/></div><p style={{fontFamily:"'Outfit',sans-serif",fontSize:13,lineHeight:1.75,color:"rgba(250,246,240,.35)",fontWeight:300}}>{content.footerTagline}</p></div>
          <div>
            <h4 style={{fontFamily:"'Outfit',sans-serif",fontSize:9,letterSpacing:3,textTransform:"uppercase",color:G,marginBottom:16}}>Quick Links</h4>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {NAV.map(n=><button key={n} onClick={()=>goTo(n)} style={{background:"none",border:"none",color:"rgba(250,246,240,.38)",fontFamily:"'Outfit',sans-serif",fontSize:13,cursor:"pointer",textAlign:"left",padding:0,textTransform:"capitalize",letterSpacing:1,transition:"color .3s"}} onMouseEnter={e=>e.target.style.color=G} onMouseLeave={e=>e.target.style.color="rgba(250,246,240,.38)"}>{n}</button>)}
            </div>
          </div>
          <div>
            <h4 style={{fontFamily:"'Outfit',sans-serif",fontSize:9,letterSpacing:3,textTransform:"uppercase",color:G,marginBottom:16}}>Connect</h4>
            <div style={{display:"flex",flexDirection:"column",gap:10,fontFamily:"'Outfit',sans-serif",fontSize:13,color:"rgba(250,246,240,.38)",fontWeight:300,lineHeight:1.7}}>
              {content.instagram&&<span>Instagram: {content.instagram}</span>}
              {content.youtube&&<span>YouTube: {content.youtube}</span>}
              {content.phone&&<span>Phone: {content.phone}</span>}
              {content.gmail&&<span>{content.gmail}</span>}
            </div>
          </div>
        </div>
        <div style={{maxWidth:1100,margin:"32px auto 0",paddingTop:20,borderTop:"1px solid rgba(201,169,110,.05)",textAlign:"center",fontFamily:"'Outfit',sans-serif",fontSize:11,letterSpacing:1,color:"rgba(250,246,240,.15)"}}>
          © 2026 Salaria Makeovers. All rights reserved.
        </div>
      </footer>

      {/* WhatsApp */}
      <a className="wa" href={`https://wa.me/${content.whatsapp||"9915499034"}`} target="_blank" rel="noopener noreferrer" title="Chat on WhatsApp">💬</a>
    </div>
  );
}
