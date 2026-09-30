import { useState, useEffect, useRef, useCallback } from "react";

// ── Apple Design Tokens ──────────────────────────────────────────────
const FONT = "-apple-system, 'SF Pro Display', 'SF Pro Text', 'Nanum Gothic', 'Apple SD Gothic Neo', BlinkMacSystemFont, sans-serif";

// Liquid Glass CSS Variables injected globally
const APPLE_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&display=swap');

  :root {
    --glass-bg: rgba(255,255,255,0.52);
    --glass-bg-dark: rgba(30,30,32,0.72);
    --glass-blur: blur(21.8px);
    --glass-shadow: 0 2px 12px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.06);
    --glass-border: rgba(255,255,255,0.72);
    --glass-hover: rgba(255,255,255,0.72);
    --col-radius: 12px;
    --card-radius: 8px;
    --color-label: rgba(100,100,100,0.55);
    --color-text: #1C1C1E;
    --color-secondary: #636366;
    --color-tertiary: #AEAEB2;
    --color-separator: rgba(60,60,67,0.12);
    --color-fill: rgba(120,120,128,0.08);
    --color-fill2: rgba(120,120,128,0.14);
    --surface-bg: rgba(242,242,247,1);
  }

  * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
  body { background: var(--surface-bg); margin: 0; }

  @media (prefers-color-scheme: dark) {
    :root {
      --glass-bg: rgba(28,28,30,0.72);
      --glass-border: rgba(255,255,255,0.10);
      --glass-hover: rgba(255,255,255,0.06);
      --glass-shadow: 0 2px 12px rgba(0,0,0,0.30), 0 0 0 0.5px rgba(255,255,255,0.08);
      --color-text: #F2F2F7;
      --color-secondary: #AEAEB2;
      --color-tertiary: #636366;
      --color-separator: rgba(255,255,255,0.10);
      --color-fill: rgba(120,120,128,0.14);
      --color-fill2: rgba(120,120,128,0.20);
      --surface-bg: rgba(0,0,0,1);
    }
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px; }

  /* Card hover effect */
  .kcard { transition: box-shadow 0.15s, transform 0.12s; }
  .kcard:hover { box-shadow: 0 4px 18px rgba(0,0,0,0.13), 0 0 0 0.5px rgba(0,0,0,0.07); transform: translateY(-1px); }

  /* Column hover */
  .kcol-add { transition: background 0.15s, opacity 0.15s; }
  .kcol-add:hover { opacity: 0.85; }

  @media (max-width: 767px) {
    :root {
      --col-radius: 10px;
      --card-radius: 7px;
    }
  }
`;

const iStyle: any = {
  width:"100%", fontSize:13, padding:"7px 10px",
  borderRadius:8, border:"1px solid var(--color-separator)",
  outline:"none", boxSizing:"border-box", fontFamily:FONT,
  background:"var(--color-fill)", color:"var(--color-text)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};
const lStyle: any = {
  fontSize:10, color:"var(--color-tertiary)", display:"block",
  marginBottom:3, fontWeight:600, letterSpacing:0.3, textTransform:"uppercase",
};

// ── Column color tokens (Apple palette) ─────────────────────────────
const COL_COLORS: any = {
  todo:       { bg:"rgba(0,122,255,0.07)",   bar:"rgba(0,122,255,0.55)" },
  inprogress: { bg:"rgba(255,59,48,0.06)",   bar:"rgba(255,59,48,0.50)" },
  done:       { bg:"rgba(142,142,147,0.08)", bar:"rgba(142,142,147,0.40)" },
  check:      { bg:"rgba(52,199,89,0.07)",   bar:"rgba(52,199,89,0.55)" },
  carry:      { bg:"rgba(255,149,0,0.07)",   bar:"rgba(255,149,0,0.55)" },
  done2:      { bg:"rgba(175,82,222,0.07)",  bar:"rgba(175,82,222,0.55)" },
};

const CAL_LABELS = [
  { id:"family",   ko:"가족",   color:"#FF3B30", text:"#fff" },
  { id:"junseok",  ko:"준석",   color:"#48484A", text:"#fff" },
  { id:"default",  ko:"기본",   color:"#FF9500", text:"#fff" },
  { id:"business", ko:"대상업무", color:"#007AFF", text:"#fff" },
  { id:"noupdate", ko:"미분류",  color:"#1C1C1E", text:"#fff" },
];
const PERSONAL_LABELS = ["family","default","noupdate"];
const getLbl = (id: string) => CAL_LABELS.find(l => l.id === id) || CAL_LABELS[2];

const HOLIDAYS: any = {
  "01-01":"신정","03-01":"삼일절","05-05":"어린이날",
  "06-06":"현충일","08-15":"광복절","10-03":"개천절",
  "10-09":"한글날","12-25":"크리스마스",
  "01-27":"설날연휴","01-28":"설날","01-29":"설날연휴",
  "05-06":"어린이날대체","06-01":"석가탄신일",
  "09-24":"추석연휴","09-25":"추석","09-26":"추석연휴",
};
const isHoliday = (m: number, d: number) =>
  HOLIDAYS[`${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`] || null;

// ── Routine utils ───────────────────────────────────────────────────
const isRoutineCol = (boardId: string, colId: string) =>
  boardId === "personal" && colId === "done2";

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function getRoutineChecks(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem("routine_checks") || "{}"); } catch { return {}; }
}
function saveRoutineChecks(data: Record<string, string[]>) {
  try { localStorage.setItem("routine_checks", JSON.stringify(data)); } catch {}
}
function toggleRoutineCheck(cardId: string) {
  const data = getRoutineChecks();
  const today = getTodayStr();
  if (!data[cardId]) data[cardId] = [];
  if (data[cardId].includes(today)) {
    data[cardId] = data[cardId].filter((d: string) => d !== today);
  } else {
    data[cardId] = [...data[cardId], today];
  }
  saveRoutineChecks(data);
}
function isCheckedToday(cardId: string): boolean {
  const data = getRoutineChecks();
  return (data[cardId] || []).includes(getTodayStr());
}
function getMissedDays(cardId: string): number {
  const data = getRoutineChecks();
  const checks: string[] = data[cardId] || [];
  if (checks.length === 0) return 0;
  const today = new Date();
  let missed = 0;
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const str = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (checks.includes(str)) break;
    missed++;
  }
  return missed;
}
function getRoutineStyle(cardId: string, checkedToday: boolean): any {
  if (checkedToday) return { bg:"rgba(52,199,89,0.10)", border:"rgba(52,199,89,0.55)" };
  const missed = getMissedDays(cardId);
  if (missed >= 7) return { bg:"rgba(255,59,48,0.10)", border:"rgba(255,59,48,0.60)" };
  if (missed >= 5) return { bg:"rgba(255,59,48,0.07)", border:"rgba(255,59,48,0.40)" };
  if (missed >= 3) return { bg:"rgba(255,149,0,0.07)", border:"rgba(255,149,0,0.45)" };
  return { bg:"transparent", border:"var(--color-separator)" };
}

// ── Board definition ────────────────────────────────────────────────
const BOARDS_DEF = [
  { id:"work", title:"업무 칸반보드", titleEn:"WORK BOARD",
    cols:[
      { id:"todo", ko:"할 일", en:"TO DO", ja:"やること" },
      { id:"inprogress", ko:"진행 중", en:"IN PROGRESS", ja:"進行中" },
      { id:"done", ko:"완료", en:"DONE", ja:"完了" },
    ]},
  { id:"personal", title:"개인 주요사항", titleEn:"PERSONAL",
    cols:[
      { id:"check", ko:"확인", en:"CHECK", ja:"確認" },
      { id:"carry", ko:"챙길 것", en:"TO BRING", ja:"持ち物" },
      { id:"done2", ko:"루틴", en:"ROUTINE", ja:"ルーティン" },
    ]},
];

function parseDate(raw: string) {
  if (!raw) return "";
  const s = raw.trim().replace(/[.\s]/g,"");
  const y = new Date().getFullYear();
  if (/^\d{8}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();
  const md = raw.trim().match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (md) return `${y}-${md[1].padStart(2,"0")}-${md[2].padStart(2,"0")}`;
  if (/^\d{4}$/.test(s)) { const m=s.slice(0,2),d=s.slice(2,4); if(+m>=1&&+m<=12&&+d>=1&&+d<=31) return `${y}-${m}-${d}`; }
  return raw.trim();
}

async function apiFetch(method: string, boardId: string, body?: any, cardId?: string) {
  const url = cardId ? `/api/cards?boardId=${boardId}&id=${cardId}` : `/api/cards?boardId=${boardId}`;
  const res = await fetch(url, { method, headers:{"Content-Type":"application/json"}, body:body?JSON.stringify(body):undefined });
  if (method==="GET") return res.json();
  return res.ok;
}

function useIsMobile() {
  const [v,setV] = useState(window.innerWidth<768);
  useEffect(()=>{ const h=()=>setV(window.innerWidth<768); window.addEventListener('resize',h); return ()=>window.removeEventListener('resize',h); },[]);
  return v;
}

const gDrag: any = { cardId:null, boardId:null, card:null };

// ── Date Slider ─────────────────────────────────────────────────────
function DateSlider({ value, onChange }: any) {
  const today = new Date();
  const days = Array.from({length:60},(_,i)=>{ const d=new Date(today); d.setDate(today.getDate()+i); return d; });
  const pad = (n: number) => String(n).padStart(2,"0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const dayNames = ["일","월","화","수","목","금","토"];
  const slRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const dg = useRef({on:false,x:0,sl:0,moved:false});

  useEffect(()=>{
    const el=slRef.current; if(!el)return;
    const upd=()=>{ if(!barRef.current)return; const r=el.clientWidth/el.scrollWidth; const p=el.scrollLeft/(el.scrollWidth-el.clientWidth)||0; barRef.current.style.width=(r*100)+"%"; barRef.current.style.marginLeft=(p*(1-r)*100)+"%"; };
    el.addEventListener('scroll',upd); upd(); return ()=>el.removeEventListener('scroll',upd);
  },[]);

  const onMD=(e: any)=>{ dg.current={on:true,x:e.pageX-slRef.current!.offsetLeft,sl:slRef.current!.scrollLeft,moved:false}; slRef.current!.style.cursor="grabbing"; };
  const onMM=(e: any)=>{ if(!dg.current.on)return; e.preventDefault(); const w=(e.pageX-slRef.current!.offsetLeft-dg.current.x)*1.5; if(Math.abs(w)>3)dg.current.moved=true; slRef.current!.scrollLeft=dg.current.sl-w; };
  const onMU=()=>{ dg.current.on=false; if(slRef.current)slRef.current.style.cursor="grab"; };

  return (
    <div>
      <div ref={slRef} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
        style={{ overflowX:"scroll", WebkitOverflowScrolling:"touch", cursor:"grab", userSelect:"none" } as any}>
        <div style={{ display:"flex", gap:4, padding:"3px 1px 5px", width:"max-content" }}>
          {days.map((d,i)=>{
            const str=fmt(d),isSel=value===str,isT=i===0,dow=d.getDay();
            return (
              <div key={str} onClick={()=>{ if(!dg.current.moved) onChange(isSel?"":str); }}
                style={{ width:36,height:46,borderRadius:9,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,cursor:"pointer",flexShrink:0,
                  background:isSel?"#1C1C1E":isT?"var(--color-fill2)":"var(--color-fill)",
                  border:isSel?"none":isT?"1px solid var(--color-separator)":"1px solid transparent",
                  backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }}>
                <span style={{ fontSize:8,fontWeight:600,color:isSel?"rgba(255,255,255,0.55)":dow===0?"#FF3B30":dow===6?"#007AFF":"var(--color-tertiary)" }}>{dayNames[dow]}</span>
                <span style={{ fontSize:14,fontWeight:700,lineHeight:1,color:isSel?"#fff":isT?"var(--color-text)":dow===0?"#FF3B30":dow===6?"#007AFF":"var(--color-text)" }}>{d.getDate()}</span>
                {isT&&!isSel&&<span style={{ width:3,height:3,borderRadius:"50%",background:"var(--color-text)" }}/>}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ height:2,borderRadius:2,background:"var(--color-fill2)",marginBottom:5,overflow:"hidden" }}>
        <div ref={barRef} style={{ height:"100%",borderRadius:2,background:"var(--color-tertiary)" }}/>
      </div>
      <input value={value||""} onChange={(e: any)=>onChange(e.target.value)} onBlur={(e: any)=>onChange(parseDate(e.target.value))}
        placeholder="직접 입력 (예) 0530 / 5/30" style={{ ...iStyle,fontSize:12 }}/>
      {value&&<div style={{ fontSize:11,color:"var(--color-secondary)",marginTop:3,display:"flex",justifyContent:"space-between" }}>
        <span>선택: {value}</span>
        <button onClick={()=>onChange("")} style={{ background:"none",border:"none",fontSize:11,color:"var(--color-tertiary)",cursor:"pointer",padding:0 }}>지우기</button>
      </div>}
    </div>
  );
}

// ── Side Panel (Apple Sheet style) ─────────────────────────────────
function SidePanel({ form, setForm, cols, mode, onSave, onDelete, onClose, isMobile }: any) {
  const lbl = getLbl(form.labelId);
  const panelBase: any = {
    background: "var(--glass-bg)",
    backdropFilter: "var(--glass-blur)",
    WebkitBackdropFilter: "var(--glass-blur)",
    zIndex: 500,
    display: "flex",
    flexDirection: "column",
  };
  return (
    <div style={isMobile
      ? { ...panelBase, position:"fixed",left:0,right:0,bottom:0,maxHeight:"90vh",borderTop:"0.5px solid var(--glass-border)",borderRadius:"16px 16px 0 0",boxShadow:"0 -8px 32px rgba(0,0,0,0.18)" } as any
      : { ...panelBase, position:"fixed",top:0,right:0,bottom:0,width:280,borderLeft:"0.5px solid var(--glass-border)",boxShadow:"-8px 0 32px rgba(0,0,0,0.10)" } as any}>
      {isMobile&&<div style={{ width:36,height:4,borderRadius:2,background:"var(--color-separator)",margin:"10px auto 0" }}/>}
      <div style={{ padding:"11px 14px 10px",borderBottom:"0.5px solid var(--color-separator)",display:"flex",alignItems:"center",gap:7 }}>
        <div style={{ width:7,height:7,borderRadius:"50%",background:lbl.color }}/>
        <span style={{ fontSize:12,fontWeight:700,color:"var(--color-text)",flex:1,letterSpacing:-0.2 }}>{mode==="add"?"새 카드 추가":"카드 편집"}</span>
        <button onClick={onClose} style={{ background:"none",border:"none",fontSize:16,color:"var(--color-tertiary)",cursor:"pointer",padding:0,lineHeight:1 }}>✕</button>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10 }}>
        <div><label style={lStyle}>캘린더 분류</label>
          <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
            {CAL_LABELS.map(l=>(
              <button key={l.id} onClick={()=>setForm((f: any)=>({...f,labelId:l.id}))}
                style={{ fontSize:isMobile?11:10,padding:isMobile?"5px 10px":"2px 8px",borderRadius:14,cursor:"pointer",fontFamily:FONT,fontWeight:700,transition:"all 0.12s",
                  background:form.labelId===l.id?l.color:"var(--color-fill)",
                  color:form.labelId===l.id?l.text:"var(--color-secondary)",
                  border:form.labelId===l.id?`1.5px solid ${l.color}`:"1.5px solid transparent" }}>{l.ko}</button>
            ))}
          </div>
        </div>
        <div><label style={lStyle}>상태</label>
          <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
            {cols.map((c: any)=>(
              <button key={c.id} onClick={()=>setForm((f: any)=>({...f,colId:c.id}))}
                style={{ fontSize:isMobile?11:10,padding:isMobile?"5px 12px":"3px 9px",borderRadius:5,cursor:"pointer",fontFamily:FONT,transition:"all 0.12s",
                  background:form.colId===c.id?"var(--color-text)":"var(--color-fill)",
                  color:form.colId===c.id?"var(--surface-bg)":"var(--color-secondary)",
                  border:"none",fontWeight:form.colId===c.id?700:400 }}>{c.ko}</button>
            ))}
          </div>
        </div>
        <div><label style={lStyle}>제목</label>
          <input value={form.title} onChange={(e: any)=>setForm((f: any)=>({...f,title:e.target.value}))} placeholder="카드 제목" autoFocus style={{ ...iStyle,fontSize:isMobile?14:13 }}/>
        </div>
        <div><label style={lStyle}>메모</label>
          <textarea value={form.note} onChange={(e: any)=>setForm((f: any)=>({...f,note:e.target.value}))} placeholder="메모 (선택)" rows={3} style={{ ...iStyle,resize:"vertical",lineHeight:1.55,fontSize:isMobile?13:12 }}/>
        </div>
        <div><label style={lStyle}>마감일</label>
          <DateSlider value={form.dueDate} onChange={(v: string)=>setForm((f: any)=>({...f,dueDate:v}))}/>
        </div>
      </div>
      <div style={{ padding:"9px 14px",borderTop:"0.5px solid var(--color-separator)",display:"flex",gap:6,paddingBottom:isMobile?"22px":"9px" }}>
        <button onClick={onSave} style={{ flex:1,padding:isMobile?"11px 0":"7px 0",borderRadius:9,border:"none",background:"var(--color-text)",color:"var(--surface-bg)",fontWeight:700,fontSize:isMobile?14:12,cursor:"pointer",fontFamily:FONT,letterSpacing:-0.2 }}>저장</button>
        <button onClick={onClose} style={{ padding:isMobile?"11px 14px":"7px 10px",borderRadius:9,border:"0.5px solid var(--color-separator)",background:"var(--color-fill)",color:"var(--color-secondary)",fontSize:isMobile?13:12,cursor:"pointer",fontFamily:FONT }}>취소</button>
        {mode==="edit"&&<button onClick={onDelete} style={{ padding:isMobile?"11px 14px":"7px 12px",borderRadius:9,border:"none",background:"rgba(255,59,48,0.10)",color:"#FF3B30",fontSize:isMobile?12:11,fontWeight:700,cursor:"pointer",fontFamily:FONT }}>삭제</button>}
      </div>
    </div>
  );
}

// ── Mini Calendar ────────────────────────────────────────────────────
function MiniCalendar({ allCards, onDateClick }: any) {
  const today=new Date();
  const [vy,setVy]=useState(today.getFullYear());
  const [vm,setVm]=useState(today.getMonth());
  const fd=new Date(vy,vm,1).getDay(),dim=new Date(vy,vm+1,0).getDate();
  const weeks: number[][]=[];let day=1-fd;
  for(let w=0;w<6;w++){const wk: number[]=[];for(let d=0;d<7;d++,day++)wk.push(day);weeks.push(wk);if(day>dim)break;}
  const cbd: any={};allCards.forEach((c: any)=>{if(c.dueDate){if(!cbd[c.dueDate])cbd[c.dueDate]=[];cbd[c.dueDate].push(c);}});
  const pad=(n: number)=>String(n).padStart(2,"0");
  const mn=["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
  const dn=["일","월","화","수","목","금","토"];
  return (
    <div style={{ background:"var(--glass-bg)",backdropFilter:"var(--glass-blur)",WebkitBackdropFilter:"var(--glass-blur)",border:"0.5px solid var(--glass-border)",borderRadius:12,padding:"11px 11px 9px",fontFamily:FONT,boxShadow:"var(--glass-shadow)" }}>
      <div style={{ display:"flex",alignItems:"center",marginBottom:9 }}>
        <button onClick={()=>{if(vm===0){setVm(11);setVy((y: number)=>y-1);}else setVm((m: number)=>m-1);}} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--color-tertiary)",fontSize:15,padding:"0 6px",lineHeight:1 }}>‹</button>
        <span style={{ flex:1,textAlign:"center",fontSize:12,fontWeight:700,color:"var(--color-text)",letterSpacing:-0.3 }}>{vy}년 {mn[vm]}</span>
        <button onClick={()=>{if(vm===11){setVm(0);setVy((y: number)=>y+1);}else setVm((m: number)=>m+1);}} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--color-tertiary)",fontSize:15,padding:"0 6px",lineHeight:1 }}>›</button>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:2 }}>
        {dn.map((d,i)=><div key={d} style={{ textAlign:"center",fontSize:9,fontWeight:600,color:i===0?"#FF3B30":i===6?"#007AFF":"var(--color-tertiary)",padding:"1px 0" }}>{d}</div>)}
      </div>
      {weeks.map((week,wi)=>(
        <div key={wi} style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:1 }}>
          {week.map((d,di)=>{
            if(d<1||d>dim)return <div key={di}/>;
            const ds=`${vy}-${pad(vm+1)}-${pad(d)}`,dots=cbd[ds]||[],isT=d===today.getDate()&&vm===today.getMonth()&&vy===today.getFullYear();
            const holiday=isHoliday(vm+1,d);
            const isRed=di===0||!!holiday;
            const isBlue=di===6&&!holiday;
            return (
              <div key={di} onClick={()=>onDateClick(ds)} style={{ textAlign:"center",padding:"2px 1px",cursor:"pointer",borderRadius:5 }}
                onMouseEnter={(e: any)=>e.currentTarget.style.background="var(--color-fill)"}
                onMouseLeave={(e: any)=>e.currentTarget.style.background="transparent"}
                title={holiday||""}>
                <span style={{ fontSize:11,fontWeight:isT?700:400,color:isT?"#fff":isRed?"#FF3B30":isBlue?"#007AFF":"var(--color-text)",background:isT?"#1C1C1E":"transparent",borderRadius:"50%",width:20,height:20,display:"inline-flex",alignItems:"center",justifyContent:"center" }}>{d}</span>
                {dots.length>0&&<div style={{ display:"flex",justifyContent:"center",gap:1,marginTop:1 }}>{dots.slice(0,3).map((c: any,i: number)=><div key={i} style={{ width:4,height:4,borderRadius:"50%",background:getLbl(c.labelId).color }}/>)}</div>}
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ borderTop:"0.5px solid var(--color-separator)",marginTop:8,paddingTop:6,display:"flex",flexWrap:"wrap",gap:"4px 8px" }}>
        {CAL_LABELS.map(l=><div key={l.id} style={{ display:"flex",alignItems:"center",gap:3 }}><div style={{ width:5,height:5,borderRadius:"50%",background:l.color }}/><span style={{ fontSize:9,color:"var(--color-tertiary)" }}>{l.ko}</span></div>)}
      </div>
    </div>
  );
}

// ── Board ────────────────────────────────────────────────────────────
function Board({ boardDef, panelState, setPanelState, hidePersonal, allCardsRef, isMobile }: any) {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOverCol, setDragOverCol] = useState<string|null>(null);
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState(boardDef.cols[0].id);
  const cloneRef = useRef<HTMLElement|null>(null);

  useEffect(()=>{
    apiFetch("GET",boardDef.id).then((d: any)=>{setCards(Array.isArray(d)?d:[]);setLoading(false);}).catch(()=>setLoading(false));
  },[boardDef.id]);

  allCardsRef[boardDef.id] = { cards, setCards };

  const byCol=(colId: string)=>{
    let f=cards.filter((c: any)=>c.colId===colId);
    if(hidePersonal&&boardDef.id==="work") f=f.filter((c: any)=>!PERSONAL_LABELS.includes(c.labelId));
    return f;
  };

  const isMyPanel=panelState?.boardId===boardDef.id;
  const openAdd=(colId: string)=>setPanelState({boardId:boardDef.id,mode:"add",form:{colId,title:"",note:"",dueDate:"",labelId:"default"}});
  const openEdit=(card: any)=>setPanelState({boardId:boardDef.id,mode:"edit",form:{...card}});

  const handleSave=async()=>{
    if(!panelState?.form?.title?.trim())return;
    const f={...panelState.form,dueDate:parseDate(panelState.form.dueDate)};
    if(panelState.mode==="add"){const nc={id:"c"+Date.now(),...f};setCards((p: any)=>[...p,nc]);await apiFetch("POST",boardDef.id,nc);}
    else{setCards((p: any)=>p.map((c: any)=>c.id===f.id?{...c,...f}:c));await apiFetch("PUT",boardDef.id,f);}
    setPanelState(null);
  };
  const handleDelete=async()=>{ const id=panelState.form.id; setCards((p: any)=>p.filter((c: any)=>c.id!==id)); setPanelState(null); await apiFetch("DELETE",boardDef.id,null,id); };
  const delCard=async(id: string)=>{ setCards((p: any)=>p.filter((c: any)=>c.id!==id)); if(panelState?.form?.id===id)setPanelState(null); await apiFetch("DELETE",boardDef.id,null,id); };
  const setForm=useCallback((u: any)=>setPanelState((p: any)=>p?{...p,form:typeof u==="function"?u(p.form):u}:p),[setPanelState]);

  const handleDrop=async(e: any,colId: string)=>{
    e.preventDefault();e.stopPropagation();setDragOverCol(null);
    if(!gDrag.card)return;
    const updatedCard={...gDrag.card,colId};
    const fromBoardId=gDrag.boardId;
    gDrag.cardId=null;gDrag.boardId=null;gDrag.card=null;
    setTick((n: number)=>n+1);
    if(fromBoardId===boardDef.id)setCards((p: any)=>p.map((c: any)=>c.id===updatedCard.id?updatedCard:c));
    else setCards((p: any)=>[...p,updatedCard]);
    await apiFetch("PUT",fromBoardId,updatedCard);
  };

  const onTouchStart=(e: any,card: any)=>{
    gDrag.cardId=card.id;gDrag.boardId=boardDef.id;gDrag.card=card;
    const t=e.touches[0];const el=e.currentTarget;
    const c=el.cloneNode(true) as HTMLElement;
    c.style.cssText=`position:fixed;opacity:0.88;pointer-events:none;z-index:9999;width:${el.offsetWidth}px;left:${t.clientX-el.offsetWidth/2}px;top:${t.clientY-el.offsetHeight/2}px;border-radius:8px;box-shadow:0 12px 32px rgba(0,0,0,0.22);transform:scale(1.04);backdrop-filter:blur(21.8px);-webkit-backdrop-filter:blur(21.8px);`;
    document.body.appendChild(c);cloneRef.current=c;setTick((n: number)=>n+1);
  };
  const onTouchMove=(e: any)=>{
    if(!gDrag.card)return;e.preventDefault();
    const t=e.touches[0];
    if(cloneRef.current){cloneRef.current.style.left=(t.clientX-parseInt(cloneRef.current.style.width)/2)+"px";cloneRef.current.style.top=(t.clientY-cloneRef.current.offsetHeight/2)+"px";}
    const el=document.elementFromPoint(t.clientX,t.clientY);
    const tabEl=el?.closest("[data-tabid]");
    if(tabEl)setActiveTab((tabEl as HTMLElement).dataset.tabid!);
    const colEl=el?.closest("[data-colid]");
    setDragOverCol((colEl as HTMLElement)?.dataset?.colid||null);
  };
  const onTouchEnd=async(e: any)=>{
    if(cloneRef.current){cloneRef.current.remove();cloneRef.current=null;}
    setDragOverCol(null);
    if(!gDrag.card)return;
    const t=e.changedTouches[0];
    const el=document.elementFromPoint(t.clientX,t.clientY);
    const colEl=el?.closest("[data-colid]");
    const targetBoardEl=el?.closest("[data-boardid]");
    if(colEl){
      const colId=(colEl as HTMLElement).dataset.colid!;
      const updatedCard={...gDrag.card,colId};
      const fromBoardId=gDrag.boardId;
      gDrag.cardId=null;gDrag.boardId=null;gDrag.card=null;
      if(fromBoardId===boardDef.id)setCards((p: any)=>p.map((c: any)=>c.id===updatedCard.id?updatedCard:c));
      else if((targetBoardEl as HTMLElement)?.dataset?.boardid===boardDef.id)setCards((p: any)=>[...p,updatedCard]);
      await apiFetch("PUT",fromBoardId,updatedCard);
    } else {gDrag.cardId=null;gDrag.boardId=null;gDrag.card=null;}
    setTick((n: number)=>n+1);
  };

  const renderCard=(card: any)=>{
    const lbl=getLbl(card.labelId);
    const isDragging=gDrag.cardId===card.id;
    const isRoutine=isRoutineCol(boardDef.id,card.colId);
    const checkedToday=isRoutine?isCheckedToday(card.id):false;
    const rs=isRoutine?getRoutineStyle(card.id,checkedToday):null;
    const missed=isRoutine?getMissedDays(card.id):0;

    return (
      <div key={card.id}
        className="kcard"
        draggable
        onDragStart={(e: any)=>{e.dataTransfer.effectAllowed="move";gDrag.cardId=card.id;gDrag.boardId=boardDef.id;gDrag.card=card;setTick((n: number)=>n+1);}}
        onDragEnd={()=>{gDrag.cardId=null;gDrag.boardId=null;gDrag.card=null;setDragOverCol(null);setTick((n: number)=>n+1);}}
        onTouchStart={(e: any)=>onTouchStart(e,card)}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={(e: any)=>{if((e.target as HTMLElement).closest('button'))return;if(!isRoutine)openEdit(card);}}
        style={{
          background: isRoutine?(rs?.bg||"var(--glass-bg)"):"var(--glass-bg)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          border: `0.5px solid ${isRoutine?(rs?.border||"var(--glass-border)"):"var(--glass-border)"}`,
          borderLeft: `2.5px solid ${isRoutine?(checkedToday?"#34C759":rs?.border||"rgba(175,82,222,0.55)"):lbl.color}`,
          borderRadius: "var(--card-radius)",
          padding: "7px 9px",
          marginBottom: 4,
          cursor: isRoutine?"default":"grab",
          opacity: isDragging?0.3:1,
          position: "relative",
          boxShadow: "var(--glass-shadow)",
          touchAction: "none",
          userSelect: "none",
        } as any}>

        {/* 삭제 버튼 */}
        <button onMouseDown={(e: any)=>e.stopPropagation()} onClick={(e: any)=>{e.stopPropagation();delCard(card.id);}}
          style={{ position:"absolute",top:6,right:6,background:"none",border:"none",padding:"1px 3px",cursor:"pointer",fontSize:10,color:"rgba(0,0,0,0.15)",lineHeight:1 }}
          onMouseEnter={(e: any)=>e.currentTarget.style.color="#FF3B30"}
          onMouseLeave={(e: any)=>e.currentTarget.style.color="rgba(0,0,0,0.15)"}>✕</button>

        {isRoutine ? (
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <button
              onMouseDown={(e: any)=>e.stopPropagation()}
              onClick={(e: any)=>{e.stopPropagation();toggleRoutineCheck(card.id);setTick((n: number)=>n+1);}}
              style={{
                width:24,height:24,borderRadius:"50%",
                border:`1.5px solid ${checkedToday?"#34C759":"var(--color-tertiary)"}`,
                background:checkedToday?"#34C759":"transparent",
                cursor:"pointer",flexShrink:0,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,
                transition:"all 0.15s",color:"#fff"
              }}>
              {checkedToday?"✓":""}
            </button>
            <div style={{ flex:1,minWidth:0 }}>
              <p style={{ margin:"0 0 1px",fontSize:12,fontWeight:600,color:checkedToday?"var(--color-secondary)":"var(--color-text)",lineHeight:1.35,paddingRight:18,
                textDecoration:checkedToday?"line-through":"none" }}>{card.title}</p>
              {card.note&&<p style={{ margin:0,fontSize:10,color:"var(--color-tertiary)",lineHeight:1.3 }}>{card.note}</p>}
              <div style={{ display:"flex",alignItems:"center",gap:6,marginTop:3 }}>
                {checkedToday
                  ? <span style={{ fontSize:9,color:"#34C759",fontWeight:600 }}>오늘 완료 ✓</span>
                  : missed>=3
                    ? <span style={{ fontSize:9,fontWeight:700,color:missed>=7?"#FF3B30":missed>=5?"#FF453A":"#FF9500" }}>{missed}일째 미체크 🔥</span>
                    : <span style={{ fontSize:9,color:"var(--color-tertiary)" }}>오늘 체크하세요</span>
                }
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display:"flex",alignItems:"center",gap:4,marginBottom:3 }}>
              <span style={{ fontSize:8,padding:"1px 5px",borderRadius:6,background:lbl.color,color:lbl.text,fontWeight:700,letterSpacing:0.2 }}>{lbl.ko}</span>
            </div>
            <p style={{ margin:"0 0 2px",fontSize:12,fontWeight:600,color:"var(--color-text)",lineHeight:1.35,paddingRight:18 }}>{card.title}</p>
            {card.note&&<p style={{ margin:0,fontSize:10,color:"var(--color-secondary)",lineHeight:1.3 }}>{card.note}</p>}
            {card.dueDate&&<span style={{ fontSize:9,color:"var(--color-tertiary)",display:"flex",alignItems:"center",gap:2,marginTop:3 }}>⏰ {card.dueDate}</span>}
          </>
        )}
      </div>
    );
  };

  return (
    <div data-boardid={boardDef.id} style={{ marginBottom:16 }}>
      <div style={{ display:"flex",alignItems:"baseline",gap:10,marginBottom:8,paddingBottom:6,borderBottom:"0.5px solid var(--color-separator)" }}>
        <span style={{ fontSize:13,fontWeight:700,color:"var(--color-text)",letterSpacing:-0.3 }}>{boardDef.title}</span>
        <span style={{ fontSize:9,fontWeight:600,color:"var(--color-tertiary)",letterSpacing:1.5 }}>{boardDef.titleEn}</span>
      </div>
      {loading?<div style={{ fontSize:11,color:"var(--color-tertiary)",padding:"14px 0",textAlign:"center" }}>불러오는 중...</div>
      :isMobile?(
        <div>
          {/* Mobile: Tab bar */}
          <div style={{ display:"flex",borderBottom:"0.5px solid var(--color-separator)",marginBottom:8 }}>
            {boardDef.cols.map((col: any)=>{const cc=COL_COLORS[col.id]||{bg:"var(--color-fill)",bar:"var(--color-tertiary)"};return(
              <button key={col.id} onClick={()=>setActiveTab(col.id)}
                data-tabid={col.id} data-colid={col.id} data-boardid={boardDef.id}
                style={{ flex:1,padding:"8px 3px",fontSize:11,fontWeight:activeTab===col.id?700:400,
                  color:activeTab===col.id?"var(--color-text)":"var(--color-tertiary)",
                  background:activeTab===col.id?"var(--color-fill2)":"transparent",
                  border:"none",borderBottom:activeTab===col.id?`2px solid ${cc.bar}`:"2px solid transparent",
                  cursor:"pointer",fontFamily:FONT,transition:"all 0.15s" }}>
                {col.ko} <span style={{ fontSize:9,color:"var(--color-tertiary)" }}>{byCol(col.id).length}</span>
              </button>
            );})}
          </div>
          <div data-colid={activeTab} data-boardid={boardDef.id} style={{ minHeight:40 }}>
            {byCol(activeTab).map((card: any)=>renderCard(card))}
          </div>
          <button className="kcol-add" onClick={()=>openAdd(activeTab)}
            style={{ width:"100%",padding:"9px",borderRadius:8,border:"0.5px dashed var(--color-separator)",background:"transparent",cursor:"pointer",color:"var(--color-tertiary)",fontSize:12,fontFamily:FONT }}>+ 추가</button>
        </div>
      ):(
        <div style={{ display:"flex",gap:6 }}>
          {boardDef.cols.map((col: any)=>{
            const cc=COL_COLORS[col.id]||{bg:"var(--color-fill)",bar:"var(--color-tertiary)"};
            const isOver=dragOverCol===col.id;
            return(
              <div key={col.id} data-colid={col.id} data-boardid={boardDef.id}
                style={{ flex:1,minWidth:0,
                  background: isOver?`rgba(255,255,255,0.72)`:cc.bg,
                  backdropFilter: "var(--glass-blur)",
                  WebkitBackdropFilter: "var(--glass-blur)",
                  borderRadius:"var(--col-radius)",
                  padding:"8px 7px 7px",
                  border:`0.5px solid ${isOver?cc.bar:"var(--glass-border)"}`,
                  boxShadow: isOver?"0 0 0 2px "+cc.bar+", var(--glass-shadow)":"var(--glass-shadow)",
                  transition:"all 0.15s" }}
                onDragOver={(e: any)=>{e.preventDefault();setDragOverCol(col.id);}}
                onDragLeave={(e: any)=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDragOverCol(null);}}
                onDrop={(e: any)=>handleDrop(e,col.id)}>
                <div style={{ marginBottom:6 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                    <div style={{ width:6,height:6,borderRadius:"50%",background:cc.bar,opacity:0.8 }}/>
                    <span style={{ fontSize:11,fontWeight:700,color:"var(--color-text)",letterSpacing:-0.2 }}>{col.ko}</span>
                    <span style={{ fontSize:8,color:"var(--color-tertiary)",letterSpacing:0.5 }}>{col.en}</span>
                    <span style={{ marginLeft:"auto",fontSize:10,color:"var(--color-secondary)",fontWeight:600,background:"var(--color-fill2)",borderRadius:6,padding:"1px 5px" }}>{byCol(col.id).length}</span>
                  </div>
                  <div style={{ height:1.5,borderRadius:2,marginTop:5,background:cc.bar,opacity:0.4 }}/>
                </div>
                {byCol(col.id).map((card: any)=>renderCard(card))}
                <button className="kcol-add" onClick={()=>openAdd(col.id)}
                  style={{ width:"100%",textAlign:"left",fontSize:10,padding:"5px 6px",borderRadius:6,border:`0.5px dashed ${cc.bar}`,background:"rgba(255,255,255,0.35)",cursor:"pointer",color:"var(--color-tertiary)",display:"flex",alignItems:"center",gap:3,fontFamily:FONT }}>
                  + 추가
                </button>
              </div>
            );
          })}
        </div>
      )}
      {isMyPanel&&<SidePanel form={panelState.form} setForm={setForm} cols={boardDef.cols} mode={panelState.mode} onSave={handleSave} onDelete={handleDelete} onClose={()=>setPanelState(null)} isMobile={isMobile}/>}
    </div>
  );
}

// ── App root ─────────────────────────────────────────────────────────
export default function App() {
  const [panelState,setPanelState]=useState<any>(null);
  const [hidePersonal,setHidePersonal]=useState(false);
  const [showCalendar,setShowCalendar]=useState(false);
  const isMobile=useIsMobile();
  const allCardsRef=useRef<any>({});

  const handleDateClick=(ds: string)=>{setPanelState({boardId:"work",mode:"add",form:{colId:"todo",title:"",note:"",dueDate:ds,labelId:"default"}});if(isMobile)setShowCalendar(false);};
  const allCards=Object.values(allCardsRef.current).flatMap((b: any)=>b.cards||[]);

  return (
    <div style={{ fontFamily:FONT,background:"var(--surface-bg)",minHeight:"100vh" }}>
      <style>{APPLE_STYLE}</style>

      {/* Top nav bar — Apple translucent */}
      <div style={{
        padding: isMobile?"10px 14px":"11px 18px 10px",
        borderBottom: "0.5px solid var(--color-separator)",
        display: "flex", alignItems: "center",
        background: "var(--glass-bg)",
        backdropFilter: "var(--glass-blur)",
        WebkitBackdropFilter: "var(--glass-blur)",
        position: "sticky", top: 0, zIndex: 100,
      } as any}>
        <p style={{ margin:0,fontSize:isMobile?10:12,color:"var(--color-tertiary)",fontStyle:"italic",letterSpacing:0.2 }}>Manifesting aura; making the intangible tangible.</p>
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:8 }}>
          {isMobile&&(
            <button onClick={()=>setShowCalendar((v: boolean)=>!v)}
              style={{ background:showCalendar?"var(--color-fill2)":"none",border:"none",fontSize:17,cursor:"pointer",
                color:showCalendar?"var(--color-text)":"var(--color-tertiary)",padding:"4px 6px",borderRadius:8 }}>📅</button>
          )}
          <label style={{ display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:isMobile?10:11,color:"var(--color-secondary)",userSelect:"none" }}>
            <div onClick={()=>setHidePersonal((v: boolean)=>!v)}
              style={{ width:30,height:17,borderRadius:9,background:hidePersonal?"#1C1C1E":"var(--color-fill2)",position:"relative",transition:"background 0.2s",cursor:"pointer",flexShrink:0 }}>
              <div style={{ width:13,height:13,borderRadius:"50%",background:hidePersonal?"#fff":"var(--color-tertiary)",position:"absolute",top:2,left:hidePersonal?15:2,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}/>
            </div>
            {!isMobile&&<span style={{ fontSize:11 }}>개인일정 숨기기</span>}
          </label>
        </div>
      </div>

      {/* Mobile calendar dropdown */}
      {isMobile&&showCalendar&&(
        <div style={{ padding:"12px 14px 10px",background:"var(--glass-bg)",backdropFilter:"var(--glass-blur)",WebkitBackdropFilter:"var(--glass-blur)",borderBottom:"0.5px solid var(--color-separator)" }}>
          <MiniCalendar allCards={allCards} onDateClick={handleDateClick}/>
        </div>
      )}

      {/* Main layout */}
      <div style={{ display:"flex",alignItems:"flex-start" }}>
        {!isMobile&&(
          <div style={{ width:220,flexShrink:0,padding:"14px 10px",position:"sticky",top:44 }}>
            <MiniCalendar allCards={allCards} onDateClick={handleDateClick}/>
          </div>
        )}
        <div style={{ flex:1,padding:isMobile?"12px 12px":"14px 16px 14px 4px",marginRight:(!isMobile&&panelState)?288:0,transition:"margin-right 0.22s ease",minWidth:0 }}>
          {BOARDS_DEF.filter(b=>!(hidePersonal&&b.id==="personal")).map(b=>(
            <Board key={b.id} boardDef={b} panelState={panelState} setPanelState={setPanelState}
              hidePersonal={hidePersonal} allCardsRef={allCardsRef.current} isMobile={isMobile}/>
          ))}
        </div>
      </div>

      {/* Backdrop for panel */}
      {panelState&&(
        <div onClick={()=>setPanelState(null)}
          style={{ position:"fixed",inset:0,zIndex:499,background:isMobile?"rgba(0,0,0,0.25)":"transparent" }}/>
      )}
    </div>
  );
}
