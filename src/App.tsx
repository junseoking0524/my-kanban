import { useState, useEffect, useRef, useCallback } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Nanum+Barun+Gothic:wght@400;700&family=Inter:wght@300;400;500;600;700&display=swap');

  :root {
    --font: 'Inter', 'Nanum Barun Gothic', 'Apple SD Gothic Neo', sans-serif;
    /* Neutral scale */
    --n0:  #ffffff;
    --n50: #fafafa;
    --n100:#f4f4f5;
    --n150:#ececee;
    --n200:#e4e4e7;
    --n300:#d1d1d6;
    --n400:#a1a1aa;
    --n500:#71717a;
    --n600:#52525b;
    --n700:#3f3f46;
    --n800:#27272a;
    --n900:#18181b;
    /* Accent — one blue */
    --blue:     #18181b;
    --blue-lt:  #e4e4e7;
    --blue-mid: #52525b;
    /* Status */
    --green:  #16a34a;
    --orange: #ea580c;
    --purple: #7c3aed;
    --red:    #dc2626;
    --teal:   #0891b2;
    --yellow: #ca8a04;
    /* Semantic */
    --bg:        #eceef1;
    --surface:   var(--n0);
    --sidebar-bg:var(--n0);
    --col-bg:    #f3f4f6;
    --border:    var(--n200);
    --border-lt: var(--n150);
    --text:      var(--n800);
    --text-sub:  var(--n500);
    --text-light:var(--n400);
    --accent:    var(--blue);
    --accent-lt: var(--blue-lt);
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 14px;
  }
  *, *::before, *::after { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  html, body { margin:0; padding:0; height:100%; font-family:var(--font); font-size:13px;
    background:var(--bg); color:var(--text); -webkit-font-smoothing:antialiased; }
  input,textarea,button,select { font-family:var(--font); }
  button { cursor:pointer; border:none; background:none; }
  ::-webkit-scrollbar { width:3px; height:3px; }
  ::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }

  /* Card */
  .kcard {
    background:#fff;
    border:1px solid #1a1a1a;
    border-radius:10px;
    padding:9px 11px;
    margin-bottom:6px;
    cursor:grab;
    user-select:none;
    transition:box-shadow .15s ease, transform .1s ease;
  }
  .kcard:hover { box-shadow:0 6px 18px rgba(0,0,0,.10); }
  .kcard.selected { outline:2px solid #18181b; outline-offset:2px; }
  .pill { display:inline-flex; align-items:center; white-space:nowrap; line-height:17px;
    border-radius:999px; padding:0 8px; font-size:10px; font-weight:600; letter-spacing:.01em; }
  .pill-co  { background:#18181b; color:#fff; }
  .pill-biz { background:#d4d4d8; color:#27272a; }
  .pill-me  { background:#fff; color:#3f3f46; border:1px solid #a1a1aa; line-height:15px; }
  .pu-urgent    { background:#18181b; color:#fff; }
  .pu-important { background:#e4e4e7; color:#18181b; border:1px solid #18181b; line-height:15px; }
  .pu-normal    { background:#f4f4f5; color:#71717a; }
  .pu-date      { background:#f4f4f5; color:#3f3f46; }
  .pu-late      { background:#18181b; color:#fff; }
  .list-row { display:flex; align-items:center; gap:10px; background:#fff; border:1px solid #1a1a1a;
    border-radius:12px; padding:10px 14px; margin-bottom:7px; cursor:grab; user-select:none;
    transition:box-shadow .15s; }
  .list-row:hover { box-shadow:0 6px 18px rgba(0,0,0,.10); }
  .list-row.selected { outline:2px solid #18181b; outline-offset:2px; }
  .list-row.dragging { opacity:.3; }
  .kbd { display:inline-block; min-width:18px; padding:1px 6px; border:1px solid #a1a1aa; border-bottom-width:2px;
    border-radius:5px; background:#fff; color:#18181b; font-size:10.5px; font-weight:600; text-align:center; font-family:var(--font); }
  .trash-zone { position:fixed; left:50%; bottom:22px; transform:translateX(-50%); z-index:400;
    padding:14px 34px; border-radius:999px; border:2px dashed #71717a; background:rgba(255,255,255,.95);
    color:#3f3f46; font-size:13px; font-weight:600; box-shadow:0 8px 28px rgba(0,0,0,.15); transition:all .12s; }
  .trash-zone.over { background:#18181b; color:#fff; border-color:#18181b; transform:translateX(-50%) scale(1.06); }
  .kcard.dragging { opacity:.3; transform:scale(.97); }
  .kcard.drag-over { border-top:2px solid #1a1a1a; }

  /* Inputs */
  .k-input {
    width:100%; border:1px solid var(--border); border-radius:var(--radius-sm);
    padding:7px 10px; font-size:12.5px; background:var(--surface); color:var(--text);
    outline:none; transition:border-color .15s, box-shadow .15s;
  }
  .k-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-lt); }
  /* Panel field inputs — black border, subtle focus ring */
  .panel-field-input { font-family:inherit; }
  .panel-field-input:focus { outline:none; border-color:#111 !important; box-shadow:0 0 0 3px rgba(0,0,0,.10); }
  .panel-choice:focus-visible, .panel-save:focus-visible { outline:2px solid #18181b; outline-offset:2px; }
  .quick-input { width:100%; border:1px solid var(--border); border-radius:var(--radius-sm);
    padding:6px 9px; font-size:12px; background:var(--surface); color:var(--text); outline:none; margin-top:4px; }
  .quick-input:focus { border-color:var(--accent); box-shadow:0 0 0 2px var(--accent-lt); }

  /* Tag */
  .tag-pill {
    display:inline-flex; align-items:center; gap:2px;
    background:var(--n100); border:1px solid var(--border);
    border-radius:4px; padding:0 5px; font-size:10px; font-weight:600;
    color:var(--text-sub); white-space:nowrap; line-height:17px;
  }

  /* Nav button */
  .nav-btn {
    padding:3px 9px; border-radius:5px; font-size:11.5px; font-weight:500;
    color:var(--text-sub); transition:background .1s, color .1s;
  }
  .nav-btn:hover { background:var(--col-bg); color:var(--text); }
  .nav-btn.active { background:var(--accent); color:#fff; }

  /* Progress track */
  .prog-track {
    width:100%; height:6px; background:var(--border); border-radius:10px;
    overflow:hidden; position:relative; cursor:pointer;
  }
  .prog-fill { height:100%; border-radius:10px; transition:width .25s ease; }

  /* Mandala */
  .mandala-grid {
    display:grid; grid-template-columns:repeat(3,1fr); gap:4px;
  }
  .mandala-block {
    display:grid; grid-template-columns:repeat(3,1fr); gap:2px;
    background:var(--border); border-radius:var(--radius-sm); overflow:hidden; padding:2px;
  }
  .mandala-cell {
    background:var(--surface); border-radius:4px;
    aspect-ratio:1/1;
    display:flex; align-items:center; justify-content:center;
    text-align:center; cursor:pointer; overflow:hidden;
    word-break:break-all; border:1px solid transparent;
    transition:border-color .12s, background .12s;
    padding:4px;
  }
  .mandala-cell:hover { border-color:var(--accent); }
  .mandala-cell.center { background:var(--n800); color:#fff; font-weight:700; }
  .mandala-cell.center-block { background:var(--blue-lt); font-weight:600; border-color:var(--accent); }
  .mandala-cell.editing { border-color:var(--accent); background:var(--accent-lt); }
  .mandala-cell input {
    width:100%; height:100%; border:none; background:transparent; font-size:10.5px;
    text-align:center; color:inherit; outline:none; font-family:var(--font);
  }

  /* Planning Calendar */
  .plan-cal-grid {
    display:grid; grid-template-columns:repeat(7,1fr); gap:2px;
  }
  .plan-cal-header {
    font-size:9.5px; font-weight:600; text-align:center; padding:3px 0 5px;
    letter-spacing:0.02em;
  }
  .plan-day {
    background:var(--surface); border:1px solid var(--border-lt);
    border-radius:5px; min-height:52px; padding:4px 5px;
    cursor:pointer; transition:border-color .12s, box-shadow .12s;
    overflow:hidden; position:relative;
  }
  .plan-day:hover { border-color:var(--border); box-shadow:0 1px 4px rgba(0,0,0,.05); }
  .plan-day.today { border-color:var(--accent); }
  .plan-day.empty { background:transparent; border-color:transparent; cursor:default; }
  .plan-day.has-content { background:var(--col-bg); }
  .plan-day-num {
    font-size:10px; font-weight:600; line-height:1; margin-bottom:3px;
    display:flex; align-items:center; justify-content:space-between;
  }
  .plan-day-text {
    font-size:10px; color:var(--text-sub); line-height:1.4;
    overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
  }
  .plan-day-editing {
    position:absolute; inset:0; z-index:10;
    background:var(--surface);
    border:1.5px solid var(--accent);
    border-radius:5px; padding:4px 5px;
    display:flex; flex-direction:column; gap:3px;
    box-shadow:0 4px 16px rgba(0,0,0,.12);
  }
  .plan-day-editing textarea {
    flex:1; border:none; background:transparent; resize:none; outline:none;
    font-size:10.5px; line-height:1.45; color:var(--text); font-family:var(--font);
  }
`;

// ── Column metadata ────────────────────────────────────────────────────────────
const COL_META: Record<string, { dot:string; progress:string }> = {
  todo:       { dot:"#a1a1aa", progress:"#71717a" },
  inprogress: { dot:"#52525b", progress:"#52525b" },
  done:       { dot:"#18181b", progress:"#18181b" },
  check:      { dot:"#a1a1aa", progress:"#71717a" },
  carry:      { dot:"#52525b", progress:"#52525b" },
  memo:       { dot:"#d4d4d8", progress:"#a1a1aa" },
};

const CAL_LABELS = [
  { id:"family",   ko:"가족",    color:"#18181b" },
  { id:"junseok",  ko:"준석",    color:"#3f3f46" },
  { id:"default",  ko:"기본",    color:"#ea580c" },
  { id:"business", ko:"대상업무", color:"#2563eb" },
  { id:"noupdate", ko:"미분류",  color:"#71717a" },
];
const PERSONAL_LABELS = ["family","default","noupdate"];

const BOARDS_DEF = [
  { id:"work", title:"업무 칸반보드",
    cols:[
      { id:"todo",       ko:"할 일"   },
      { id:"inprogress", ko:"진행 중"  },
      { id:"done",       ko:"완료"    },
    ]},
  { id:"personal", title:"개인 주요사항",
    cols:[
      { id:"check", ko:"확인"    },
      { id:"carry", ko:"챙길 것"  },
      { id:"memo",  ko:"메모"    },
    ]},
];

const HOLIDAYS: Record<string,string> = {
  "01-01":"신정","03-01":"삼일절","05-05":"어린이날","06-06":"현충일",
  "08-15":"광복절","10-03":"개천절","10-09":"한글날","12-25":"크리스마스",
};

type Card = {
  id:string; colId:string; title:string; note?:string;
  dueDate?:string; labelId?:string; calEventId?:string; tags?:string[];
  progress?: number; // 0-100 manual override
  category?: "company"|"biz"|"personal";
  priority?: "urgent"|"important"|"normal";
};

const CATEGORIES = [
  { id:"company",  ko:"회사", cls:"pill-co"  },
  { id:"biz",      ko:"Biz",  cls:"pill-biz" },
  { id:"personal", ko:"개인", cls:"pill-me"  },
] as const;
const PRIORITIES = [
  { id:"urgent",    ko:"긴급", cls:"pu-urgent"    },
  { id:"important", ko:"중요", cls:"pu-important" },
  { id:"normal",    ko:"기본", cls:"pu-normal"    },
] as const;
const PRIO_RANK:Record<string,number> = { urgent:0, important:1, normal:2 };

function catOf(card:Card, boardId:string){ return card.category || (boardId==="personal"?"personal":"company"); }
function localToday(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function isDoneCard(card:Card, boardId:string){ return boardId==="work" && card.colId==="done"; }
// 긴급도 칩: 날짜가 있으면 날짜, 없으면 긴급/중요/기본
function urgencyChip(card:Card){
  const KO=["일","월","화","수","목","금","토"];
  if(card.dueDate){
    const raw=card.dueDate, dp=raw.slice(0,10), tp=raw.length>10?raw.slice(11,16):"";
    const [y,mo,d]=dp.split("-").map(Number);
    const t=localToday();
    const text=`${String(mo).padStart(2,"0")}/${String(d).padStart(2,"0")} (${KO[new Date(y,mo-1,d).getDay()]})${tp?" "+tp:""}`;
    return { text, cls: dp<=t ? "pu-late" : "pu-date" };
  }
  const p=PRIORITIES.find(x=>x.id===(card.priority||"normal"))!;
  return { text:p.ko, cls:p.cls };
}
// 정렬 키: 날짜 있는 것 → 날짜순, 그 다음 긴급/중요/기본
function urgencySortKey(card:Card){
  return card.dueDate ? `0${card.dueDate}` : `1${PRIO_RANK[card.priority||"normal"]}`;
}
function CardHead({card,boardId}:{card:Card;boardId:string}) {
  const cat=CATEGORIES.find(c=>c.id===catOf(card,boardId))!;
  const u=urgencyChip(card);
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}>
      <span className={`pill ${cat.cls}`}>{cat.ko}</span>
      <span className={`pill ${u.cls}`}>{u.text}</span>
    </div>
  );
}

let gDrag: { cardId:string|null; boardId:string|null; card:Card|null } =
  { cardId:null, boardId:null, card:null };

function apiFetch(method:string, boardId:string, body?:any, cardId?:string) {
  const url = cardId
    ? `/api/cards?boardId=${boardId}&id=${cardId}`
    : `/api/cards?boardId=${boardId}`;
  return fetch(url, {
    method,
    headers:{"Content-Type":"application/json"},
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.ok ? r.json() : Promise.reject(r.statusText));
}
async function mandalaFetch(method:string, body?:any) {
  return fetch("/api/mandala", {
    method,
    headers:{"Content-Type":"application/json"},
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.ok ? r.json() : Promise.reject(r.statusText));
}

function useIsMobile() {
  const [m,setM] = useState(window.innerWidth < 900);
  useEffect(()=>{
    const h=()=>setM(window.innerWidth<900);
    window.addEventListener("resize",h);
    return ()=>window.removeEventListener("resize",h);
  },[]);
  return m;
}

// ─────────────────────────────────────────────────────────────────────────────
// ProgressBar — colored segment (read-only display per board)
// ─────────────────────────────────────────────────────────────────────────────
function BoardProgressBar({cards,cols}:{cards:Card[];cols:{id:string;ko:string}[]}) {
  const counts = cols.map(c=>({...c, n:cards.filter(k=>k.colId===c.id).length}));
  const total = counts.reduce((s,c)=>s+c.n,0);
  if (!total) return null;
  return (
    <div style={{display:"flex",height:4,borderRadius:3,overflow:"hidden",gap:1}}>
      {counts.map(c=>{
        const pct=(c.n/total)*100;
        if(!pct) return null;
        return <div key={c.id} title={`${c.ko}: ${c.n}`}
          style={{flex:pct,background:COL_META[c.id]?.progress||"#a1a1aa",minWidth:2}}/>;
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CardProgressBar — draggable slider on a single card
// ─────────────────────────────────────────────────────────────────────────────
function CardProgressBar({value, onChange}:{value:number; onChange:(v:number)=>void}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const getVal=(clientX:number)=>{
    const rect=trackRef.current!.getBoundingClientRect();
    const pct=Math.max(0,Math.min(1,(clientX-rect.left)/rect.width));
    return Math.round(pct*100);
  };

  const onMouseDown=(e:React.MouseEvent)=>{
    e.stopPropagation(); dragging.current=true;
    onChange(getVal(e.clientX));
    const move=(ev:MouseEvent)=>{ if(dragging.current) onChange(getVal(ev.clientX)); };
    const up=()=>{ dragging.current=false; window.removeEventListener("mousemove",move); window.removeEventListener("mouseup",up); };
    window.addEventListener("mousemove",move); window.addEventListener("mouseup",up);
  };
  const onTouchStart=(e:React.TouchEvent)=>{
    e.stopPropagation();
    const move=(ev:TouchEvent)=>onChange(getVal(ev.touches[0].clientX));
    const up=()=>{ window.removeEventListener("touchmove",move); window.removeEventListener("touchend",up); };
    window.addEventListener("touchmove",move); window.addEventListener("touchend",up);
    onChange(getVal(e.touches[0].clientX));
  };

  const color = value>=100?"#16a34a":value>=50?"#3b82f6":"#6366f1";
  return (
    <div style={{marginTop:6}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
        <span style={{fontSize:9.5,fontWeight:600,color:"var(--text-light)",letterSpacing:"0.04em"}}>PROGRESS</span>
        <span style={{fontSize:10,fontWeight:700,color}}>{value}%</span>
      </div>
      <div ref={trackRef} className="prog-track"
        onMouseDown={onMouseDown} onTouchStart={onTouchStart}
        style={{cursor:"col-resize"}}>
        <div className="prog-fill" style={{width:`${value}%`,background:color}}/>
      </div>
    </div>
  );
}

// 카드 상단 진행률 바 — 마우스로 직접 드래그
function ProgTopBar({prog,onChange}:{prog:number;onChange:(v:number)=>void}) {
  const color=prog>=100?"#18181b":prog>=50?"#52525b":"#a1a1aa";
  const down=(e:React.MouseEvent<HTMLDivElement>)=>{
    e.stopPropagation(); e.preventDefault();
    const el=e.currentTarget.closest("[data-card]") as HTMLElement;
    const rect=el.getBoundingClientRect();
    const calc=(cx:number)=>Math.round(Math.max(0,Math.min(1,(cx-rect.left)/rect.width))*100);
    onChange(calc(e.clientX));
    const move=(mv:MouseEvent)=>{mv.preventDefault();onChange(calc(mv.clientX));};
    const up=()=>{window.removeEventListener("mousemove",move);window.removeEventListener("mouseup",up);};
    window.addEventListener("mousemove",move);
    window.addEventListener("mouseup",up);
  };
  return (
    <div title={prog>0?`${prog}%`:"드래그해서 진행률 설정"} draggable={false}
      onMouseDown={down} onClick={e=>e.stopPropagation()}
      style={{position:"absolute",top:0,left:0,right:0,height:5,background:"#e4e4e7",cursor:"col-resize",zIndex:2}}>
      {prog>0&&<div style={{position:"absolute",top:0,left:0,height:"100%",width:`${prog}%`,background:color,transition:"width .15s"}}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MiniCalendar
// ─────────────────────────────────────────────────────────────────────────────
function MiniCalendar({cards, onDayClick}:{cards:Card[];onDayClick:(d:string)=>void}) {
  const [view,setView] = useState(()=>{const d=new Date();return{y:d.getFullYear(),m:d.getMonth()};});
  const today = new Date();
  const toKey=(y:number,m:number,d:number)=>`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const dueDays = new Set(cards.filter(c=>c.dueDate).map(c=>c.dueDate!.slice(0,10)));
  const firstDay = new Date(view.y,view.m,1).getDay();
  const daysInMonth = new Date(view.y,view.m+1,0).getDate();
  const cells:(number|null)[] = [...Array(firstDay).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)];
  while(cells.length%7!==0) cells.push(null);
  const WK=["일","월","화","수","목","금","토"];
  const todayKey=toKey(today.getFullYear(),today.getMonth(),today.getDate());

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <button onClick={()=>setView(v=>v.m===0?{y:v.y-1,m:11}:{y:v.y,m:v.m-1})}
          style={{fontSize:16,color:"var(--text-sub)",padding:"2px 5px",borderRadius:4,lineHeight:1}}>‹</button>
        <span style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>
          {view.y}. {String(view.m+1).padStart(2,"0")}
        </span>
        <button onClick={()=>setView(v=>v.m===11?{y:v.y+1,m:0}:{y:v.y,m:v.m+1})}
          style={{fontSize:16,color:"var(--text-sub)",padding:"2px 5px",borderRadius:4,lineHeight:1}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"1px 0",textAlign:"center"}}>
        {WK.map((d,i)=>(
          <div key={d} style={{fontSize:9.5,fontWeight:600,paddingBottom:5,letterSpacing:"0.02em",
            color:i===0?"var(--red)":i===6?"var(--blue)":"var(--text-light)"}}>
            {d}
          </div>
        ))}
        {cells.map((day,i)=>{
          if(!day) return <div key={i}/>;
          const key=toKey(view.y,view.m,day);
          const mmdd=`${String(view.m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isToday=key===todayKey;
          const hasCard=dueDays.has(key);
          const dow=(firstDay+day-1)%7;
          const isSun=dow===0, isSat=dow===6, isHol=!!HOLIDAYS[mmdd];
          return (
            <div key={i} onClick={()=>onDayClick(key)}
              title={isHol?HOLIDAYS[mmdd]:undefined}
              style={{
                position:"relative",cursor:"pointer",borderRadius:5,
                padding:"4px 0",fontSize:11,margin:"1px 0",
                background:isToday?"var(--accent)":"transparent",
                color:isToday?"#fff":(isHol||isSun)?"var(--red)":isSat?"var(--blue)":"var(--text)",
                fontWeight:isToday?700:400,
                transition:"background .1s",
              }}>
              {day}
              {hasCard&&!isToday&&(
                <span style={{position:"absolute",bottom:1,left:"50%",transform:"translateX(-50%)",
                  width:3,height:3,borderRadius:"50%",background:"var(--accent)",display:"block"}}/>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SidePanel
// ─────────────────────────────────────────────────────────────────────────────
// Parse stored YYYY-MM-DD[THH:mm] → display "MM/DD HH:mm" or "MM/DD"
function dueDateToDisplay(stored:string):string {
  if(!stored) return "";
  const datePart=stored.slice(0,10);
  const timePart=stored.length>10?stored.slice(11,16):"";
  const [,mo,d]=datePart.split("-");
  return timePart?`${mo}/${d} ${timePart}`:`${mo}/${d}`;
}
// Parse user input "MM/DD" or "MM/DD HH:mm" → "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm"
function displayToDueDate(raw:string):string {
  const s=raw.trim();
  if(!s) return "";
  // Match MM/DD or MM/DD HH:mm
  const m=s.match(/^(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if(!m) return s; // return as-is if unrecognized
  const year=new Date().getFullYear();
  const mo=String(m[1]).padStart(2,"0");
  const day=String(m[2]).padStart(2,"0");
  if(m[3]&&m[4]){
    const hh=String(m[3]).padStart(2,"0");
    const mm=String(m[4]).padStart(2,"0");
    return `${year}-${mo}-${day}T${hh}:${mm}`;
  }
  return `${year}-${mo}-${day}`;
}

function PanelField({label,children,hint}:{label:string;children:React.ReactNode;hint?:string}) {
  return (
    <div>
      <div style={{fontSize:10,fontWeight:600,color:"#71717a",letterSpacing:"0.07em",
        textTransform:"uppercase",marginBottom:5,display:"flex",alignItems:"center",gap:6}}>
        {label}
        {hint&&<span style={{fontWeight:400,fontSize:9.5,color:"#a1a1aa",textTransform:"none",letterSpacing:0}}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// 포커스 이동: 패널 안의 [data-f] 요소를 순서대로
function focusNextField(from:HTMLElement) {
  const root=from.closest("[data-panel]");
  if(!root) return;
  const list=Array.from(root.querySelectorAll<HTMLElement>("[data-f]")).filter(el=>el.tabIndex>=0);
  const i=list.indexOf(from);
  (list[i+1]||list[list.length-1])?.focus();
}

// 라디오형 버튼 그룹 — Tab은 그룹 단위, ←→로 선택, Enter는 선택 후 다음 항목
function ChoiceGroup<T extends string>({options,value,onChange,allowClear}:{
  options:{id:T;ko:string}[]; value:T|undefined; onChange:(v:T|undefined)=>void; allowClear?:boolean;
}) {
  const tabbableIdx=Math.max(0,options.findIndex(o=>o.id===value));
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:5}} role="radiogroup">
      {options.map((o,i)=>{
        const on=value===o.id;
        return (
          <button key={o.id} data-f="1" role="radio" aria-checked={on}
            tabIndex={i===tabbableIdx?0:-1}
            onClick={()=>onChange(on&&allowClear?undefined:o.id)}
            onKeyDown={e=>{
              const sib=e.currentTarget.parentElement!.children;
              if(e.key==="ArrowRight"||e.key==="ArrowLeft"){
                e.preventDefault();
                const n=(i+(e.key==="ArrowRight"?1:-1)+options.length)%options.length;
                (sib[n] as HTMLElement).focus(); onChange(options[n].id);
              } else if(e.key===" "){
                e.preventDefault(); onChange(on&&allowClear?undefined:o.id);
              } else if(e.key==="Enter"){
                e.preventDefault(); onChange(o.id); focusNextField(e.currentTarget);
              }
            }}
            style={{padding:"5px 12px",borderRadius:999,fontSize:11.5,fontWeight:600,outline:"none",
              border:on?"1px solid #18181b":"1px solid #a1a1aa",
              background:on?"#18181b":"#fff",color:on?"#fff":"#52525b",cursor:"pointer",
              transition:"all .1s"}}
            className="panel-choice">
            {o.ko}
          </button>
        );
      })}
    </div>
  );
}

function SidePanel({card,boardId,onClose,onSave,onDelete,allTags}:{
  card:Card|null; boardId:string;
  onClose:()=>void; onSave:(c:Card)=>void; onDelete:(id:string)=>void; allTags:string[];
}) {
  const init=(c:Card|null):Card=>({category:catOf(c||{id:"",colId:"",title:""},boardId),priority:"normal",...(c||{id:"",colId:"",title:""})});
  const [form,setForm] = useState<Card>(()=>init(card));
  const [tagInput,setTagInput] = useState("");
  const [dueDateDisplay,setDueDateDisplay] = useState(()=>dueDateToDisplay(card?.dueDate||""));
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(()=>{
    const c=init(card);
    setForm(c);
    setTagInput("");
    setDueDateDisplay(dueDateToDisplay(c.dueDate||""));
    setTimeout(()=>titleRef.current?.focus(),60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[card]);

  if(!card) return null;

  const isPersonal = boardId==="personal";
  const labels = isPersonal
    ? CAL_LABELS.filter(l=>PERSONAL_LABELS.includes(l.id))
    : CAL_LABELS.filter(l=>!PERSONAL_LABELS.includes(l.id));

  const addTag=()=>{
    const t=tagInput.trim().replace(/[,#]/g,"");
    if(!t) return false;
    const cur=form.tags||[];
    if(!cur.includes(t)) setForm(f=>({...f,tags:[...cur,t]}));
    setTagInput("");
    return true;
  };
  const removeTag=(t:string)=>setForm(f=>({...f,tags:(f.tags||[]).filter(x=>x!==t)}));
  const commitDue=()=>setForm(f=>({...f,dueDate:displayToDueDate(dueDateDisplay)}));

  const doSave=()=>{
    const title=form.title.trim();
    if(!title){titleRef.current?.focus();return;}
    // 태그 입력창에 남은 글자도 함께 저장
    const pending=tagInput.trim().replace(/[,#]/g,"");
    const tags=pending&&!(form.tags||[]).includes(pending)?[...(form.tags||[]),pending]:form.tags;
    onSave({...form,title,tags,dueDate:displayToDueDate(dueDateDisplay)});
  };

  const inputStyle:React.CSSProperties={
    width:"100%", border:"1px solid #1a1a1a", borderRadius:8,
    padding:"8px 10px", fontSize:12.5, background:"#fff", color:"#1a1a1a",
    outline:"none", fontFamily:"inherit",
  };

  return (
    <div data-panel="1" style={{position:"fixed",inset:0,zIndex:300,display:"flex"}}
      onKeyDown={e=>{
        if(e.key==="Escape"){e.stopPropagation();onClose();}
        if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();doSave();}
      }}>
      <div onClick={onClose} style={{flex:1,background:"rgba(24,24,27,.28)",backdropFilter:"blur(2px)"}}/>
      <div style={{width:320,maxWidth:"100vw",background:"#fff",borderLeft:"1px solid #d4d4d8",
        display:"flex",flexDirection:"column",overflowY:"auto",
        boxShadow:"-10px 0 32px rgba(0,0,0,.10)"}}>
        <div style={{padding:"14px 18px 12px",borderBottom:"1px solid #e4e4e7",
          display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fafafa"}}>
          <span style={{fontWeight:700,fontSize:13.5,color:"#18181b",letterSpacing:"-0.01em"}}>
            {form.id?"카드 편집":"새 카드"}
          </span>
          <button tabIndex={-1} onClick={onClose} style={{fontSize:18,color:"#71717a",lineHeight:1,width:26,height:26,
            display:"flex",alignItems:"center",justifyContent:"center",borderRadius:7,
            border:"1px solid #d4d4d8",background:"#fff"}}>×</button>
        </div>

        <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:14,flex:1}}>
          <PanelField label="제목" hint="Enter로 등록 · Shift+Enter 줄바꿈">
            <textarea ref={titleRef} data-f="1" value={form.title}
              onChange={e=>setForm(f=>({...f,title:e.target.value}))}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();doSave();}}}
              rows={2} placeholder="무엇을 해야 하나요?"
              className="panel-field-input" style={{...inputStyle,resize:"none",lineHeight:1.5}}/>
          </PanelField>

          <PanelField label="구분" hint="←→ 선택 · Enter 다음">
            <ChoiceGroup options={CATEGORIES.map(c=>({id:c.id,ko:c.ko}))}
              value={form.category} onChange={v=>v&&setForm(f=>({...f,category:v}))}/>
          </PanelField>

          <PanelField label="긴급도" hint="마감일이 있으면 날짜가 표시돼요">
            <ChoiceGroup options={PRIORITIES.map(c=>({id:c.id,ko:c.ko}))}
              value={form.priority} onChange={v=>v&&setForm(f=>({...f,priority:v}))}/>
          </PanelField>

          <PanelField label="마감일" hint="MM/DD 또는 MM/DD HH:mm">
            <input data-f="1" value={dueDateDisplay}
              onChange={e=>setDueDateDisplay(e.target.value)}
              onBlur={commitDue}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.ctrlKey&&!e.metaKey){e.preventDefault();commitDue();focusNextField(e.currentTarget);}}}
              placeholder="06/17 또는 06/17 14:00"
              className="panel-field-input" style={{...inputStyle,fontSize:12}}/>
          </PanelField>

          <PanelField label="메모" hint="Tab으로 다음 항목">
            <textarea data-f="1" value={form.note||""} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={3}
              className="panel-field-input" style={{...inputStyle,resize:"none",fontSize:12,lineHeight:1.5}}/>
          </PanelField>

          <PanelField label="캘린더 라벨" hint="←→ 선택 · Space 해제">
            <ChoiceGroup options={labels.map(l=>({id:l.id,ko:l.ko}))}
              value={form.labelId} allowClear
              onChange={v=>setForm(f=>({...f,labelId:v}))}/>
          </PanelField>

          <PanelField label="태그" hint="입력 후 Enter · 비우고 Enter 다음">
            <input data-f="1" value={tagInput} onChange={e=>setTagInput(e.target.value)}
              onKeyDown={e=>{
                if((e.key==="Enter"||e.key===",")&&!e.ctrlKey&&!e.metaKey&&!e.nativeEvent.isComposing){
                  e.preventDefault();
                  if(!addTag()&&e.key==="Enter") focusNextField(e.currentTarget);
                }
                if(e.key==="Backspace"&&!tagInput&&(form.tags||[]).length){
                  setForm(f=>({...f,tags:(f.tags||[]).slice(0,-1)}));
                }
              }}
              placeholder="태그 입력"
              className="panel-field-input" style={{...inputStyle,fontSize:12,marginBottom:6}}/>
            {allTags.filter(t=>!(form.tags||[]).includes(t)).slice(0,8).map(t=>(
              <span key={t} onClick={()=>setForm(f=>({...f,tags:[...(f.tags||[]),t]}))}
                style={{cursor:"pointer",fontSize:10,padding:"2px 8px",borderRadius:999,
                  marginRight:3,marginBottom:3,display:"inline-block",
                  border:"1px dashed #a1a1aa",color:"#71717a"}}>+{t}</span>
            ))}
            <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:4}}>
              {(form.tags||[]).map(t=>(
                <span key={t} className="tag-pill">
                  {t}
                  <span onClick={()=>removeTag(t)}
                    style={{cursor:"pointer",opacity:.5,marginLeft:2,fontSize:12,lineHeight:1}}>×</span>
                </span>
              ))}
            </div>
          </PanelField>
        </div>

        <div style={{padding:"10px 18px 14px",borderTop:"1px solid #e4e4e7",background:"#fafafa"}}>
          <div style={{display:"flex",gap:6}}>
            <button data-f="1"
              onClick={doSave}
              onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();doSave();}}}
              className="panel-save"
              style={{flex:1,padding:"9px",background:"#18181b",color:"#fff",borderRadius:8,
                fontWeight:700,fontSize:12.5,border:"2px solid #18181b",cursor:"pointer"}}>
              {form.id?"저장":"등록"} <span style={{opacity:.5,fontWeight:500,fontSize:10.5,marginLeft:4}}>Enter</span>
            </button>
            {form.id&&(
              <button onClick={()=>onDelete(form.id)}
                style={{padding:"9px 14px",background:"#fff",color:"#18181b",borderRadius:8,
                  fontWeight:600,fontSize:12.5,border:"1px solid #18181b",cursor:"pointer"}}>삭제</button>
            )}
          </div>
          <div style={{marginTop:8,fontSize:10,color:"#a1a1aa",lineHeight:1.6}}>
            <span className="kbd">Tab</span> 다음 · <span className="kbd">Ctrl</span>+<span className="kbd">Enter</span> 어디서든 저장 · <span className="kbd">Esc</span> 닫기
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuickAdd
// ─────────────────────────────────────────────────────────────────────────────
function QuickAdd({onAdd,onCancel}:{onAdd:(t:string)=>void;onCancel:()=>void}) {
  const [val,setVal]=useState("");
  const ref=useRef<HTMLInputElement>(null);
  useEffect(()=>ref.current?.focus(),[]);
  return (
    <div style={{marginTop:4}}>
      <input ref={ref} value={val} onChange={e=>setVal(e.target.value)}
        placeholder="카드 제목 입력..."
        className="quick-input"
        onKeyDown={e=>{
          if(e.key==="Enter"){e.preventDefault();if(val.trim())onAdd(val.trim());}
          if(e.key==="Escape")onCancel();
        }}/>
      <div style={{display:"flex",gap:4,marginTop:5}}>
        <button onClick={()=>{if(val.trim())onAdd(val.trim());}}
          style={{padding:"4px 12px",background:"var(--n900)",color:"#fff",borderRadius:5,fontSize:11,fontWeight:600}}>추가</button>
        <button onClick={onCancel} style={{padding:"4px 8px",color:"var(--text-sub)",fontSize:11}}>취소</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Board
// ─────────────────────────────────────────────────────────────────────────────
function Board({def,cards,collapsed,onToggleCollapse,onCardClick,onQuickAdd,onDrop,
  activeTagFilter,doneSearch,setDoneSearch,onProgressChange}:{
  def:typeof BOARDS_DEF[0]; cards:Card[]; collapsed:boolean;
  onToggleCollapse:()=>void;
  onCardClick:(c:Card)=>void; onQuickAdd:(colId:string,title:string,boardId:string)=>void;
  onDrop:(targetColId:string,afterCardId:string|null,boardId:string)=>void;
  activeTagFilter:string|null; doneSearch:string; setDoneSearch:(s:string)=>void;
  onProgressChange:(cardId:string,boardId:string,v:number)=>void;
}) {
  const [dragOverCol,setDragOverCol]=useState<string|null>(null);
  const [dragOverCard,setDragOverCard]=useState<string|null>(null);
  const [quickAddCol,setQuickAddCol]=useState<string|null>(null);

  const getCards=(colId:string)=>{
    let f=cards.filter(c=>c.colId===colId);
    if(activeTagFilter) f=f.filter(c=>(c.tags||[]).includes(activeTagFilter));
    if(def.id==="work"&&colId==="done"&&doneSearch){
      const q=doneSearch.toLowerCase();
      f=f.filter(c=>c.title.toLowerCase().includes(q)||(c.note||"").toLowerCase().includes(q)||(c.tags||[]).some(t=>t.toLowerCase().includes(q)));
    }
    return f;
  };

  const onDragStart=(e:React.DragEvent,card:Card)=>{gDrag={cardId:card.id,boardId:def.id,card};e.dataTransfer.effectAllowed="move";};
  const onDragEnd=()=>{gDrag={cardId:null,boardId:null,card:null};setDragOverCol(null);setDragOverCard(null);};
  const onDragOver=(e:React.DragEvent,colId:string,cardId?:string)=>{e.preventDefault();e.stopPropagation();setDragOverCol(colId);setDragOverCard(cardId||null);};
  const onDropH=(e:React.DragEvent,colId:string,afterCardId:string|null=null)=>{
    e.preventDefault();e.stopPropagation();setDragOverCol(null);setDragOverCard(null);
    if(!gDrag.cardId) return;
    onDrop(colId,afterCardId,def.id);
  };
  return (
    <div style={{marginBottom:0}}>
      {/* Board header — clickable to collapse */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:collapsed?0:8,cursor:"pointer",userSelect:"none"}}
        onClick={onToggleCollapse}>
        <button style={{
          width:18,height:18,borderRadius:4,border:"1px solid var(--border)",
          display:"flex",alignItems:"center",justifyContent:"center",
          background:"var(--surface)",fontSize:10,color:"var(--text-sub)",
          transform:collapsed?"rotate(-90deg)":"rotate(0deg)",transition:"transform .15s",flexShrink:0,
        }}>▾</button>
        <span style={{fontSize:11,fontWeight:600,color:"var(--text-sub)",letterSpacing:"0.05em",textTransform:"uppercase"}}>
          {def.title}
        </span>
        <div style={{flex:1,maxWidth:100}}><BoardProgressBar cards={cards} cols={def.cols}/></div>
        <span style={{fontSize:10,color:"var(--text-light)",fontWeight:500}}>{cards.length}개</span>
      </div>

      {/* Columns — hidden when collapsed */}
      {!collapsed&&(
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
          {def.cols.map(col=>{
            const colCards=getCards(col.id);
            const meta=COL_META[col.id];
            const isDone=def.id==="work"&&col.id==="done";
            const isOver=dragOverCol===col.id;
            return (
              <div key={col.id}
                onDragOver={e=>onDragOver(e,col.id)} onDrop={e=>onDropH(e,col.id)}
                style={{
                  flex:"1 1 0",minWidth:165,maxWidth:290,
                  background:"#f5f5f5",
                  borderRadius:6,
                  padding:"9px 8px 7px",
                  border:`1.5px solid ${isOver?"#111":"#d1d1d1"}`,
                  transition:"border-color .1s",
                }}>
                {/* Col header */}
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:7}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:meta?.dot||"#a1a1aa",flexShrink:0,display:"inline-block"}}/>
                  <span style={{fontSize:12,fontWeight:600,color:"var(--text)",flex:1,letterSpacing:"-0.01em"}}>{col.ko}</span>
                  <span style={{fontSize:10,color:"var(--text-light)",fontWeight:500,minWidth:14,textAlign:"right"}}>{colCards.length}</span>
                  <button onClick={e=>{e.stopPropagation();setQuickAddCol(quickAddCol===col.id?null:col.id);}}
                    title="카드 추가 (+)"
                    style={{marginLeft:2,fontSize:16,lineHeight:1,color:"var(--text-light)",padding:"0 2px",
                      fontWeight:400,borderRadius:4,transition:"color .1s"}}
                    onMouseOver={e=>(e.currentTarget.style.color="var(--accent)")}
                    onMouseOut={e=>(e.currentTarget.style.color="var(--text-light)")}>
                    +
                  </button>
                </div>
                {/* Done search */}
                {isDone&&(
                  <input value={doneSearch} onChange={e=>setDoneSearch(e.target.value)}
                    placeholder="완료 검색…"
                    style={{width:"100%",border:"1px solid var(--border)",borderRadius:5,padding:"3px 8px",
                      background:"var(--surface)",color:"var(--text)",fontSize:11,outline:"none",marginBottom:6}}/>
                )}
                {/* Cards */}
                {colCards.map(card=>{
                  const prog=card.progress??0;
                  return (
                    <div key={card.id} data-card="1"
                      className={`kcard${gDrag.cardId===card.id?" dragging":""}${dragOverCard===card.id?" drag-over":""}`}
                      draggable
                      onDragStart={e=>onDragStart(e,card)} onDragEnd={onDragEnd}
                      onDragOver={e=>onDragOver(e,col.id,card.id)} onDrop={e=>onDropH(e,col.id,card.id)}
                      onClick={()=>onCardClick(card)}
                      style={{position:"relative",overflow:"hidden",opacity:isDone?.65:1}}>
                      <ProgTopBar prog={prog} onChange={v=>onProgressChange(card.id,def.id,v)}/>
                      <div style={{marginTop:5}}><CardHead card={card} boardId={def.id}/></div>
                      <div style={{marginTop:7,fontSize:12.5,color:"#111",lineHeight:1.45,wordBreak:"break-word",
                        fontWeight:500,textDecoration:isDone?"line-through":"none"}}>{card.title}</div>
                      {(card.tags||[]).length>0&&(
                        <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:6}}>
                          {(card.tags||[]).map(t=><span key={t} className="tag-pill">{t}</span>)}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Drop zone */}
                <div onDragOver={e=>onDragOver(e,col.id)} onDrop={e=>onDropH(e,col.id,null)}
                  style={{minHeight:10,borderRadius:4,background:isOver&&!dragOverCard?"rgba(0,0,0,.06)":"transparent"}}/>
                {/* Quick add */}
                {quickAddCol===col.id
                  ? <QuickAdd onAdd={title=>{onQuickAdd(col.id,title,def.id);setQuickAddCol(null);}}
                      onCancel={()=>setQuickAddCol(null)}/>
                  : <button onClick={e=>{e.stopPropagation();setQuickAddCol(col.id);}}
                      style={{display:"flex",alignItems:"center",gap:4,marginTop:5,padding:"3px 4px",
                        borderRadius:5,color:"var(--text-light)",fontSize:11,width:"100%",transition:"color .1s"}}
                      onMouseOver={e=>{e.currentTarget.style.color="var(--text)";}}
                      onMouseOut={e=>{e.currentTarget.style.color="var(--text-light)";}}>
                      <span style={{fontSize:14,fontWeight:300,lineHeight:1}}>+</span> 새 카드
                    </button>
                }
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Helper to use CSS vars in inline styles
function var_(name:string) { return `var(${name})`; }

// ─────────────────────────────────────────────────────────────────────────────
// Mandala — 9×9 grid (3×3 blocks of 3×3 cells)
// ─────────────────────────────────────────────────────────────────────────────
// Block layout (0-indexed):
//   [0,0][0,1][0,2]
//   [1,0][1,1][1,2]
//   [2,0][2,1][2,2]
// Center block = [1,1], center cell within each block = cell[1][1]
// The 8 outer blocks' center cells mirror the 8 cells of the center block

const BLOCK_POSITIONS = [
  [0,0],[0,1],[0,2],
  [1,0],[1,1],[1,2],
  [2,0],[2,1],[2,2],
];

function MandalaView() {
  // grid[9][9] of strings
  const [grid,setGrid] = useState<string[][]>(()=>Array.from({length:9},()=>Array(9).fill("")));
  const [loading,setLoading] = useState(true);
  const [editingCell,setEditingCell] = useState<[number,number]|null>(null);
  const [cellInput,setCellInput] = useState("");
  const isSaving = useRef(false);

  useEffect(()=>{
    mandalaFetch("GET").then(d=>{setGrid(d.grid||Array.from({length:9},()=>Array(9).fill("")));setLoading(false);})
      .catch(()=>setLoading(false));
  },[]);

  const getCellValue=(r:number,c:number)=>grid[r]?.[c]??"";
  const getCellCoord=(brow:number,bcol:number,cr:number,cc:number):[number,number]=>[brow*3+cr,bcol*3+cc];

  const startEdit=(r:number,c:number)=>{setEditingCell([r,c]);setCellInput(grid[r]?.[c]??"");};
  const commitEdit=async(r:number,c:number,val:string)=>{
    setGrid(prev=>{const g=prev.map(row=>[...row]);g[r][c]=val;return g;});
    setEditingCell(null);
    if(!isSaving.current){
      isSaving.current=true;
      mandalaFetch("POST",{row:r,col:c,value:val}).finally(()=>{isSaving.current=false;});
    }
  };

  if(loading) return <div style={{textAlign:"center",color:"var(--text-light)",padding:"30px 0",fontSize:12}}>만다라트 불러오는 중…</div>;

  // Block (brow, bcol): renders a 3×3 sub-grid
  const renderBlock=(brow:number,bcol:number)=>{
    const isCenterBlock=brow===1&&bcol===1;
    return (
      <div key={`${brow}-${bcol}`} className="mandala-block">
        {[0,1,2].map(cr=>[0,1,2].map(cc=>{
          const [r,c]=getCellCoord(brow,bcol,cr,cc);
          const isCenterCell=cr===1&&cc===1;
          const val=getCellValue(r,c);
          const isEditing=editingCell?.[0]===r&&editingCell?.[1]===c;
          // Mirror: center of outer block = corresponding cell in center block
          const isMirrored=!isCenterBlock&&isCenterCell;
          // Center of center block = main goal
          const isMainGoal=isCenterBlock&&isCenterCell;

          let cls="mandala-cell";
          if(isMainGoal) cls+=" center";
          else if(isCenterBlock&&isCenterCell===false&&false) cls+=""; // no-op
          else if(isMirrored) cls+=" center-block";
          if(isEditing) cls+=" editing";

          return (
            <div key={`${r}-${c}`} className={cls}
              onClick={()=>{if(!isEditing)startEdit(r,c);}}>
              {isEditing
                ? <input autoFocus value={cellInput} onChange={e=>setCellInput(e.target.value)}
                    onClick={e=>e.stopPropagation()}
                    onKeyDown={e=>{
                      if(e.key==="Enter"){e.preventDefault();commitEdit(r,c,cellInput);}
                      if(e.key==="Escape"){setEditingCell(null);}
                    }}
                    onBlur={()=>commitEdit(r,c,cellInput)}/>
                : <span style={{fontSize:isMainGoal?12:isMirrored?11:10.5,
                    fontWeight:isMainGoal?700:isMirrored?600:400,
                    color:isMainGoal?"#fff":isMirrored?"var(--accent)":"var(--text)"}}>{val||<span style={{color:"var(--border)",fontSize:9}}>···</span>}</span>
              }
            </div>
          );
        }))}
      </div>
    );
  };

  return (
    <div>
      <div className="mandala-grid" style={{maxWidth:660}}>
        {BLOCK_POSITIONS.map(([br,bc])=>renderBlock(br,bc))}
      </div>
      <div style={{marginTop:8,fontSize:10,color:"var(--text-light)"}}>
        셀 클릭 → 편집 · Enter 저장 · ESC 취소 · Google Sheets "Mandala" 탭과 자동 동기화
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PlanningView — monthly content planning calendar
// ─────────────────────────────────────────────────────────────────────────────
function PlanningView() {
  const today = new Date();
  const [view,setView] = useState({y:today.getFullYear(),m:today.getMonth()});
  // planData: { "YYYY-MM-DD": "text" }
  const [planData,setPlanData] = useState<Record<string,string>>(()=>{
    try { return JSON.parse(localStorage.getItem("planning_data")||"{}"); } catch { return {}; }
  });
  const [editingDay,setEditingDay] = useState<string|null>(null);
  const [editVal,setEditVal] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toKey=(y:number,m:number,d:number)=>
    `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  const todayKey = toKey(today.getFullYear(),today.getMonth(),today.getDate());
  const firstDay = new Date(view.y,view.m,1).getDay();
  const daysInMonth = new Date(view.y,view.m+1,0).getDate();
  const cells:(number|null)[] = [...Array(firstDay).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)];
  while(cells.length%7!==0) cells.push(null);

  const WK=["일","월","화","수","목","금","토"];

  const openEdit=(key:string)=>{
    setEditingDay(key);
    setEditVal(planData[key]||"");
    setTimeout(()=>{textareaRef.current?.focus();},60);
  };
  const commitEdit=()=>{
    if(!editingDay) return;
    const trimmed=editVal.trim();
    setPlanData(prev=>{
      const next={...prev};
      if(trimmed) next[editingDay]=trimmed; else delete next[editingDay];
      localStorage.setItem("planning_data",JSON.stringify(next));
      return next;
    });
    setEditingDay(null);
  };

  return (
    <div>
      {/* Month nav */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <button onClick={()=>setView(v=>v.m===0?{y:v.y-1,m:11}:{y:v.y,m:v.m-1})}
          style={{fontSize:15,color:"var(--text-sub)",padding:"2px 6px",borderRadius:4,lineHeight:1}}>‹</button>
        <span style={{fontSize:12,fontWeight:600,color:"var(--text)",minWidth:70,textAlign:"center"}}>
          {view.y}. {String(view.m+1).padStart(2,"0")}
        </span>
        <button onClick={()=>setView(v=>v.m===11?{y:v.y+1,m:0}:{y:v.y,m:v.m+1})}
          style={{fontSize:15,color:"var(--text-sub)",padding:"2px 6px",borderRadius:4,lineHeight:1}}>›</button>
        <button onClick={()=>setView({y:today.getFullYear(),m:today.getMonth()})}
          style={{fontSize:10,color:"var(--text-light)",padding:"2px 7px",borderRadius:4,
            border:"1px solid var(--border)",marginLeft:2,fontWeight:500}}>오늘</button>
      </div>

      <div className="plan-cal-grid">
        {/* Day-of-week headers */}
        {WK.map((d,i)=>(
          <div key={d} className="plan-cal-header"
            style={{color:i===0?"var(--red)":i===6?"var(--blue)":"var(--text-light)"}}>
            {d}
          </div>
        ))}

        {/* Day cells */}
        {cells.map((day,i)=>{
          if(!day) return <div key={i} className="plan-day empty"/>;
          const key=toKey(view.y,view.m,day);
          const text=planData[key]||"";
          const dow=(firstDay+day-1)%7;
          const isSun=dow===0, isSat=dow===6;
          const mmdd=`${String(view.m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isHol=!!HOLIDAYS[mmdd];
          const isToday=key===todayKey;
          const isEditing=editingDay===key;

          return (
            <div key={i}
              className={`plan-day${isToday?" today":""}${text?" has-content":""}`}
              onClick={()=>{ if(!isEditing) openEdit(key); }}>
              {/* Day number */}
              <div className="plan-day-num">
                <span style={{
                  color: isToday?"var(--accent)":(isHol||isSun)?"var(--red)":isSat?"var(--blue)":"var(--text-light)",
                  fontWeight: isToday?700:500,
                  background: isToday?"var(--accent-lt)":"transparent",
                  borderRadius:3, padding:isToday?"0 3px":"0",
                }}>{day}</span>
                {isHol&&<span style={{fontSize:8,color:"var(--red)",maxWidth:30,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{HOLIDAYS[mmdd]}</span>}
              </div>

              {/* Content text (display mode) */}
              {!isEditing&&text&&(
                <div className="plan-day-text">{text}</div>
              )}

              {/* Inline editor */}
              {isEditing&&(
                <div className="plan-day-editing" onClick={e=>e.stopPropagation()}>
                  <div style={{fontSize:10,fontWeight:600,color:"var(--accent)",letterSpacing:"-0.01em"}}>
                    {view.m+1}/{day}
                  </div>
                  <textarea ref={textareaRef} value={editVal} onChange={e=>setEditVal(e.target.value)}
                    placeholder="플래닝 메모…"
                    rows={3}
                    onKeyDown={e=>{
                      if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();commitEdit();}
                      if(e.key==="Escape"){setEditingDay(null);}
                    }}
                    onBlur={commitEdit}/>
                  <div style={{display:"flex",gap:3,justifyContent:"flex-end"}}>
                    <button onClick={commitEdit}
                      style={{fontSize:9,padding:"2px 7px",background:"var(--n900)",color:"#fff",borderRadius:4,fontWeight:600}}>저장</button>
                    <button onClick={e=>{e.stopPropagation();setEditingDay(null);}}
                      style={{fontSize:9,padding:"2px 6px",color:"var(--text-light)",borderRadius:4}}>취소</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{marginTop:6,fontSize:10,color:"var(--text-light)"}}>
        날짜 클릭 → 메모 입력 · Enter 저장 · Shift+Enter 줄바꿈 · ESC 취소
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ListView — 업무 + 개인 전체 리스트 (기본 화면)
// ─────────────────────────────────────────────────────────────────────────────
type Item = { card:Card; boardId:string };
const itemKey = (i:Item) => `${i.boardId}:${i.card.id}`;

function colName(boardId:string,colId:string){
  return BOARDS_DEF.find(b=>b.id===boardId)?.cols.find(c=>c.id===colId)?.ko||"";
}

function ListView({items,selectedKey,onSelect,onOpen,onProgressChange,isMobile}:{
  items:Item[]; selectedKey:string|null; onSelect:(k:string)=>void;
  onOpen:(i:Item)=>void; onProgressChange:(cardId:string,boardId:string,v:number)=>void; isMobile:boolean;
}) {
  if(!items.length) return (
    <div style={{textAlign:"center",color:"var(--text-light)",padding:"70px 0",fontSize:13,lineHeight:1.9}}>
      카드가 없어요<br/>
      <span className="kbd">+</span> 키를 눌러 새 카드를 추가해보세요
    </div>
  );
  return (
    <div style={{display:"grid",gap:"0 12px",
      gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",alignItems:"start"}}>
      {items.map(it=>{
        const {card,boardId}=it;
        const k=itemKey(it);
        const done=isDoneCard(card,boardId);
        const prog=card.progress??0;
        return (
          <div key={k} data-key={k} data-card="1" tabIndex={-1}
            className={`kcard${selectedKey===k?" selected":""}${gDrag.cardId===card.id?" dragging":""}`}
            draggable
            onDragStart={e=>{gDrag={cardId:card.id,boardId,card};e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",card.id);}}
            onDragEnd={()=>{gDrag={cardId:null,boardId:null,card:null};}}
            onClick={()=>{onSelect(k);onOpen(it);}}
            style={{position:"relative",overflow:"hidden",opacity:done?.6:1}}>
            <ProgTopBar prog={prog} onChange={v=>onProgressChange(card.id,boardId,v)}/>
            <div style={{marginTop:5}}><CardHead card={card} boardId={boardId}/></div>
            <div style={{marginTop:8,fontSize:13,color:"#111",lineHeight:1.45,wordBreak:"break-word",fontWeight:500,
              textDecoration:done?"line-through":"none"}}>{card.title}</div>
            <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:4,marginTop:8}}>
              <span style={{fontSize:10,color:"#71717a",fontWeight:500}}>{colName(boardId,card.colId)}</span>
              {(card.tags||[]).map(t=><span key={t} className="tag-pill">{t}</span>)}
              {prog>0&&<span style={{marginLeft:"auto",fontSize:10,color:"#71717a",fontWeight:600}}>{prog}%</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 단축키 도움말
// ─────────────────────────────────────────────────────────────────────────────
const SHORTCUTS:[string[],string][] = [
  [["+"],"새 카드 추가 (패널 열림)"],
  [["Tab"],"다음 항목  ·  Shift+Tab 이전 항목"],
  [["←","→"],"구분 / 긴급도 / 라벨 선택"],
  [["Enter"],"다음 항목으로 · 제목에서는 바로 등록"],
  [["Ctrl","Enter"],"패널 어디서든 저장"],
  [["Esc"],"패널 닫기 · 선택 해제"],
  [["↑","↓"],"리스트에서 카드 선택 (j / k 도 가능)"],
  [["Enter"],"선택한 카드 편집"],
  [["Delete"],"선택한 카드 삭제 (Backspace 도 가능)"],
  [["Ctrl","Z"],"방금 삭제한 카드 되돌리기"],
  [["1","2","3","4"],"전체 / 회사 / Biz / 개인 보기"],
  [["B"],"전체 리스트 ↔ 보드 전환"],
  [["?"],"이 도움말 열기·닫기"],
];
function HelpOverlay({onClose}:{onClose:()=>void}) {
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:500,background:"rgba(24,24,27,.35)",
      backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",border:"1px solid #18181b",borderRadius:16,
        padding:"20px 24px",width:420,maxWidth:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{fontWeight:700,fontSize:14}}>키보드 단축키</span>
          <button onClick={onClose} style={{fontSize:18,color:"#71717a"}}>×</button>
        </div>
        {SHORTCUTS.map(([keys,desc],i)=>(
          <div key={i} style={{display:"flex",gap:12,padding:"6px 0",borderTop:i?"1px solid #f0f0f2":"none",alignItems:"center"}}>
            <div style={{width:118,flexShrink:0,display:"flex",gap:3,flexWrap:"wrap"}}>
              {keys.map(k=><span key={k} className="kbd">{k}</span>)}
            </div>
            <div style={{fontSize:12,color:"#3f3f46"}}>{desc}</div>
          </div>
        ))}
        <div style={{marginTop:12,fontSize:11,color:"#a1a1aa",lineHeight:1.6}}>
          카드를 마우스로 끌어 화면 아래 <b>삭제</b> 영역에 놓아도 삭제돼요. 삭제 후 6초 안에 되돌릴 수 있어요.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
type CatFilter = "all"|"company"|"biz"|"personal";
const CAT_FILTERS:{id:CatFilter;ko:string}[] = [
  {id:"all",ko:"전체"},{id:"company",ko:"회사"},{id:"biz",ko:"Biz"},{id:"personal",ko:"개인"},
];

export default function App() {
  const isMobile = useIsMobile();
  const [boards,setBoards] = useState<Record<string,Card[]>>({work:[],personal:[]});
  const [loading,setLoading] = useState(true);
  const [sync,setSync] = useState<{state:"ok"|"syncing"|"error";at:string}>({state:"syncing",at:""});
  const [editCard,setEditCard] = useState<Card|null>(null);
  const [editBoardId,setEditBoardId] = useState("work");
  const [showPanel,setShowPanel] = useState(false);
  const [doneSearch,setDoneSearch] = useState("");
  const [activeTagFilter,setActiveTagFilter] = useState<string|null>(null);
  const [view,setView] = useState<"list"|"board">("list");
  const [catFilter,setCatFilter] = useState<CatFilter>("all");
  const [selectedKey,setSelectedKey] = useState<string|null>(null);
  const [showHelp,setShowHelp] = useState(false);
  const [dragging,setDragging] = useState(false);
  const [trashOver,setTrashOver] = useState(false);
  const [toast,setToast] = useState<{msg:string;undo?:()=>void}|null>(null);
  const [collapsedBoards,setCollapsedBoards] = useState<Record<string,boolean>>(()=>{
    try { return JSON.parse(localStorage.getItem("board_collapsed")||"{}"); } catch { return {}; }
  });
  const [collapsedMandala,setCollapsedMandala] = useState<boolean>(()=>{
    try { return JSON.parse(localStorage.getItem("mandala_collapsed")||"false"); } catch { return false; }
  });
  const [collapsedPlanning,setCollapsedPlanning] = useState<boolean>(()=>{
    try { return JSON.parse(localStorage.getItem("planning_collapsed")||"true"); } catch { return true; }
  });

  const inflight = useRef(0);
  const boardsRef = useRef(boards); boardsRef.current = boards;
  const progTimers = useRef<Record<string,ReturnType<typeof setTimeout>>>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const toggleBoardCollapse=(id:string)=>{
    setCollapsedBoards(prev=>{
      const next={...prev,[id]:!prev[id]};
      localStorage.setItem("board_collapsed",JSON.stringify(next));
      return next;
    });
  };
  const toggleMandalaCollapse=()=>{
    setCollapsedMandala(prev=>{ const next=!prev; localStorage.setItem("mandala_collapsed",JSON.stringify(next)); return next; });
  };
  const togglePlanningCollapse=()=>{
    setCollapsedPlanning(prev=>{ const next=!prev; localStorage.setItem("planning_collapsed",JSON.stringify(next)); return next; });
  };

  // ── 서버 호출 추적 (동기화 중 낙관적 업데이트가 덮어써지지 않도록) ──
  const track=<T,>(p:Promise<T>):Promise<T>=>{
    inflight.current++;
    return p.finally(()=>{inflight.current--;});
  };
  const nowLabel=()=>new Date().toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",hour12:false});

  // ── Google Drive(Sheets)에서 불러오기 + 주기적 동기화 ──
  const loadAll=useCallback(async()=>{
    if(inflight.current>0) return;
    setSync(s=>({...s,state:"syncing"}));
    try{
      const [w,p]=await Promise.all([apiFetch("GET","work"),apiFetch("GET","personal")]);
      if(inflight.current>0) return;
      setBoards({work:Array.isArray(w)?w:(w.cards||[]),personal:Array.isArray(p)?p:(p.cards||[])});
      setSync({state:"ok",at:nowLabel()});
    }catch{
      setSync(s=>({...s,state:"error"}));
    }finally{ setLoading(false); }
  },[]);

  useEffect(()=>{
    loadAll();
    const iv=setInterval(()=>{ if(document.visibilityState==="visible") loadAll(); },30000);
    const onVis=()=>{ if(document.visibilityState==="visible") loadAll(); };
    document.addEventListener("visibilitychange",onVis);
    return ()=>{clearInterval(iv);document.removeEventListener("visibilitychange",onVis);};
  },[loadAll]);

  // ── 드래그 중에만 삭제 영역 표시 ──
  useEffect(()=>{
    const start=()=>{ if(gDrag.cardId) setDragging(true); };
    const end=()=>{ setDragging(false); setTrashOver(false); };
    window.addEventListener("dragstart",start);
    window.addEventListener("dragend",end);
    window.addEventListener("drop",end);
    return ()=>{
      window.removeEventListener("dragstart",start);
      window.removeEventListener("dragend",end);
      window.removeEventListener("drop",end);
    };
  },[]);

  // ── 현재 보이는 카드 (구분·태그 필터 적용, 리스트 정렬) ──
  const matchFilters=(card:Card,boardId:string)=>
    (catFilter==="all"||catOf(card,boardId)===catFilter) &&
    (!activeTagFilter||(card.tags||[]).includes(activeTagFilter));
  const listItems:Item[]=(["work","personal"] as const)
    .flatMap(b=>(boards[b]||[]).map(card=>({card,boardId:b as string})))
    .filter(i=>matchFilters(i.card,i.boardId))
    .sort((a,b)=>{
      const da=Number(isDoneCard(a.card,a.boardId)), db=Number(isDoneCard(b.card,b.boardId));
      if(da!==db) return da-db;
      return urgencySortKey(a.card).localeCompare(urgencySortKey(b.card));
    });

  const allTags=Array.from(new Set(Object.values(boards).flat().flatMap(c=>c.tags||[]))).sort();
  const allCards=Object.values(boards).flat();

  // ── 토스트 ──
  const showToast=(msg:string,undo?:()=>void)=>{
    if(toastTimer.current) clearTimeout(toastTimer.current);
    setToast({msg,undo});
    toastTimer.current=setTimeout(()=>setToast(null),6000);
  };

  // ── 패널 열기 ──
  const openCard=(card:Card,boardId:string)=>{setEditCard(card);setEditBoardId(boardId);setShowPanel(true);};
  const openNew=(colId:string,boardId:string,extra?:Partial<Card>)=>{
    setEditCard({id:"",colId,title:"",...extra});setEditBoardId(boardId);setShowPanel(true);
  };
  const openNewCard=()=>{
    const category=catFilter==="all"?"company":catFilter;
    const boardId=category==="personal"?"personal":"work";
    openNew(BOARDS_DEF.find(b=>b.id===boardId)!.cols[0].id,boardId,{category,priority:"normal"});
  };

  // ── CRUD ──
  const handleQuickAdd=async(colId:string,title:string,boardId:string)=>{
    const card:Card={id:"",colId,title,category:boardId==="personal"?"personal":"company",priority:"normal"};
    try{
      const res=await track(apiFetch("POST",boardId,card));
      setBoards(prev=>({...prev,[boardId]:[...prev[boardId],res.card]}));
    }catch(e){alert("저장 실패: "+e);}
  };

  const handleSave=async(card:Card)=>{
    try{
      if(card.id){
        const res=await track(apiFetch("PUT",editBoardId,card,card.id));
        const updated=res.card||card;
        setBoards(prev=>({...prev,[editBoardId]:prev[editBoardId].map(c=>c.id===card.id?updated:c)}));
      } else {
        // 새 카드: 구분이 '개인'이면 개인 보드, 아니면 업무 보드에 등록
        const target=card.category==="personal"?"personal":"work";
        const def=BOARDS_DEF.find(b=>b.id===target)!;
        const colId=def.cols.some(c=>c.id===card.colId)?card.colId:def.cols[0].id;
        const res=await track(apiFetch("POST",target,{...card,colId}));
        setBoards(prev=>({...prev,[target]:[...prev[target],res.card]}));
        setSelectedKey(`${target}:${res.card.id}`);
      }
      setShowPanel(false);
    }catch(e){alert("저장 실패: "+e);}
  };

  const deleteCard=async(cardId:string,boardId:string)=>{
    const card=boardsRef.current[boardId]?.find(c=>c.id===cardId);
    if(!card) return;
    // 삭제 후 선택을 이웃 카드로 이동
    const idx=listItems.findIndex(i=>i.card.id===cardId&&i.boardId===boardId);
    const neighbor=listItems[idx+1]||listItems[idx-1];
    setSelectedKey(neighbor?itemKey(neighbor):null);
    setBoards(prev=>({...prev,[boardId]:prev[boardId].filter(c=>c.id!==cardId)}));
    setShowPanel(false);
    try{
      await track(apiFetch("DELETE",boardId,undefined,cardId));
      showToast(`"${card.title.slice(0,24)}" 삭제됨`,async()=>{
        try{
          const res=await track(apiFetch("POST",boardId,card));
          setBoards(prev=>({...prev,[boardId]:[...prev[boardId],res.card]}));
          setSelectedKey(`${boardId}:${res.card.id}`);
          setToast(null);
        }catch(e){alert("되돌리기 실패: "+e);}
      });
    }catch(e){
      setBoards(prev=>({...prev,[boardId]:[...prev[boardId],card]}));
      alert("삭제 실패: "+e);
    }
  };

  const handleProgressChange=useCallback((cardId:string,boardId:string,v:number)=>{
    setBoards(prev=>({...prev,[boardId]:prev[boardId].map(c=>c.id===cardId?{...c,progress:v}:c)}));
    // 드래그 중에는 화면만 갱신하고, 멈춘 뒤 한 번만 저장
    const k=`${boardId}:${cardId}`;
    clearTimeout(progTimers.current[k]);
    progTimers.current[k]=setTimeout(()=>{
      const card=boardsRef.current[boardId]?.find(c=>c.id===cardId);
      if(card) track(apiFetch("PUT",boardId,card,cardId)).catch(()=>{});
    },400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const handleDrop=async(targetColId:string,afterCardId:string|null,boardId:string)=>{
    const{cardId,boardId:srcBoardId,card}=gDrag;
    if(!cardId||!card) return;
    const srcBoard=srcBoardId||boardId;
    const updatedCard={...card,colId:targetColId};
    if(srcBoard===boardId){
      setBoards(prev=>{
        const cols=[...prev[boardId]];
        const idx=cols.findIndex(c=>c.id===cardId);
        if(idx>=0) cols.splice(idx,1);
        const afterIdx=afterCardId?cols.findIndex(c=>c.id===afterCardId):-1;
        if(afterIdx>=0) cols.splice(afterIdx,0,updatedCard); else cols.push(updatedCard);
        return{...prev,[boardId]:cols};
      });
    } else {
      setBoards(prev=>({
        ...prev,
        [srcBoard]:prev[srcBoard].filter(c=>c.id!==cardId),
        [boardId]:[...prev[boardId],updatedCard],
      }));
    }
    gDrag={cardId:null,boardId:null,card:null};
    try{await track(apiFetch("PUT",boardId,updatedCard,cardId));}catch(e){console.error(e);}
  };

  const handleTrashDrop=(e:React.DragEvent)=>{
    e.preventDefault();
    setTrashOver(false); setDragging(false);
    const {cardId,boardId}=gDrag;
    gDrag={cardId:null,boardId:null,card:null};
    if(cardId&&boardId) deleteCard(cardId,boardId);
  };

  // ── 키보드 단축키 (최신 상태를 ref로 참조) ──
  const kb=useRef<{[k:string]:any}>({});
  kb.current={showPanel,showHelp,view,listItems,selectedKey,toast,
    openNewCard,deleteCard,openCard,setCatFilter,setView,setSelectedKey,setShowHelp};
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      const k=kb.current;
      const t=e.target as HTMLElement;
      if(t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement||t.isContentEditable) return;
      if(k.showPanel) return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){
        if(k.toast?.undo){e.preventDefault();k.toast.undo();}
        return;
      }
      if(e.ctrlKey||e.metaKey||e.altKey) return;
      if(k.showHelp){ if(e.key==="Escape"||e.key==="?"){e.preventDefault();k.setShowHelp(false);} return; }
      const items:Item[]=k.listItems;
      const idx=items.findIndex(i=>itemKey(i)===k.selectedKey);
      switch(e.key){
        case "+": case "=": e.preventDefault(); k.openNewCard(); return;
        case "?": e.preventDefault(); k.setShowHelp(true); return;
        case "Escape": k.setSelectedKey(null); return;
        case "1": k.setCatFilter("all"); return;
        case "2": k.setCatFilter("company"); return;
        case "3": k.setCatFilter("biz"); return;
        case "4": k.setCatFilter("personal"); return;
        case "b": case "B": k.setView((v:string)=>v==="list"?"board":"list"); return;
      }
      if(e.code==="NumpadAdd"){e.preventDefault();k.openNewCard();return;}
      if(k.view!=="list"||!items.length) return;
      if(["ArrowDown","ArrowRight","j","J"].includes(e.key)){
        e.preventDefault(); k.setSelectedKey(itemKey(items[Math.min(items.length-1,idx+1)]));
      } else if(["ArrowUp","ArrowLeft","k","K"].includes(e.key)){
        e.preventDefault(); k.setSelectedKey(itemKey(items[Math.max(0,idx<0?0:idx-1)]));
      } else if(e.key==="Enter"&&idx>=0){
        e.preventDefault(); k.openCard(items[idx].card,items[idx].boardId);
      } else if((e.key==="Delete"||e.key==="Backspace")&&idx>=0){
        e.preventDefault(); k.deleteCard(items[idx].card.id,items[idx].boardId);
      }
    };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[]);

  // 선택된 카드를 화면 안으로
  useEffect(()=>{
    if(!selectedKey) return;
    document.querySelector(`[data-key="${selectedKey}"]`)?.scrollIntoView({block:"nearest"});
  },[selectedKey]);

  const syncLabel=sync.state==="error"?"동기화 실패":sync.state==="syncing"?"동기화 중…":`Drive 동기화 ${sync.at}`;

  const chip=(active:boolean):React.CSSProperties=>({
    padding:"4px 12px",borderRadius:999,fontSize:11.5,fontWeight:600,whiteSpace:"nowrap",
    border:active?"1px solid #18181b":"1px solid #c4c4cc",
    background:active?"#18181b":"#fff",color:active?"#fff":"#52525b",
  });

  return (
    <>
      <style>{STYLE}</style>

      {/* ── Top nav ── */}
      <div style={{
        background:"var(--surface)",borderBottom:"1px solid var(--border)",
        height:46,display:"flex",alignItems:"center",padding:"0 16px",gap:10,
        position:"sticky",top:0,zIndex:100,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <div style={{width:22,height:22,background:"var(--n900)",borderRadius:6,
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{fontSize:11.5,fontWeight:700,color:"#fff",letterSpacing:"-0.02em"}}>K</span>
          </div>
          <span style={{fontWeight:700,fontSize:14,letterSpacing:"-0.02em",color:"var(--text)"}}>Kanban</span>
        </div>

        {!isMobile
          ? <span style={{fontSize:11,fontStyle:"italic",color:"var(--text-light)",fontWeight:300,
              whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1,minWidth:0,letterSpacing:"0.01em"}}>
              Manifesting aura; making the intangible tangible.
            </span>
          : <div style={{flex:1}}/>}

        <span title="구글 드라이브(Sheets)에 자동 저장·동기화" style={{fontSize:10.5,flexShrink:0,
          color:sync.state==="error"?"#18181b":"var(--text-light)",fontWeight:sync.state==="error"?700:400,
          display:"flex",alignItems:"center",gap:5,cursor:sync.state==="error"?"pointer":"default"}}
          onClick={()=>{if(sync.state==="error")loadAll();}}>
          <span style={{width:6,height:6,borderRadius:"50%",display:"inline-block",
            background:sync.state==="ok"?"#18181b":sync.state==="syncing"?"#a1a1aa":"transparent",
            border:sync.state==="error"?"1.5px solid #18181b":"none"}}/>
          {isMobile?"":syncLabel}{sync.state==="error"&&" (다시 시도)"}
        </span>

        <button onClick={()=>setShowHelp(true)} title="키보드 단축키 (?)"
          style={{width:28,height:28,borderRadius:7,border:"1px solid #c4c4cc",background:"#fff",
            color:"#52525b",fontSize:13,fontWeight:600,flexShrink:0}}>?</button>
        <button onClick={openNewCard} title="새 카드 추가 (+)"
          style={{width:28,height:28,borderRadius:7,background:"var(--n900)",color:"#fff",
            fontSize:18,fontWeight:300,lineHeight:1,flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
      </div>

      {/* ── Main layout ── */}
      <div style={{display:"flex",height:"calc(100vh - 46px)",overflow:"hidden"}}>

        {!isMobile&&(
          <div style={{width:214,flexShrink:0,borderRight:"1px solid var(--border)",
            background:"var(--sidebar-bg)",padding:"16px 14px",overflowY:"auto"}}>
            <MiniCalendar cards={allCards} onDayClick={d=>openNew("todo","work",{dueDate:d,category:"company",priority:"normal"})}/>
            <div style={{height:1,background:"var(--border-lt)",margin:"16px 0"}}/>
            <div style={{fontSize:10,fontWeight:600,color:"var(--text-light)",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:8}}>보드</div>
            {BOARDS_DEF.map(b=>(
              <div key={b.id}
                onClick={()=>{setView("board");toggleBoardCollapse(b.id);}}
                style={{padding:"5px 8px",borderRadius:6,marginBottom:2,
                  fontSize:12,color:collapsedBoards[b.id]?"var(--text-light)":"var(--text-sub)",
                  cursor:"pointer",display:"flex",alignItems:"center",gap:6}}
                onMouseOver={e=>e.currentTarget.style.background="var(--col-bg)"}
                onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                <div style={{width:6,height:6,borderRadius:"50%",flexShrink:0,
                  background:collapsedBoards[b.id]?"var(--border)":"var(--accent)"}}/>
                {b.title}
                <span style={{marginLeft:"auto",fontSize:9,color:"var(--text-light)"}}>{collapsedBoards[b.id]?"▸":"▾"}</span>
              </div>
            ))}
            <div style={{height:1,background:"var(--border-lt)",margin:"12px 0"}}/>
            <div style={{fontSize:11,color:"var(--text-light)"}}>총 {allCards.length}개 카드</div>
          </div>
        )}

        <div style={{flex:1,minWidth:0,overflowY:"auto",display:"flex",flexDirection:"column"}}>
          {/* Toolbar */}
          <div style={{position:"sticky",top:0,zIndex:20,background:"var(--bg)",
            padding:isMobile?"10px 8px 8px":"14px 18px 10px",display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <div style={{display:"inline-flex",background:"#fff",border:"1px solid #18181b",borderRadius:999,padding:2}}>
                {([["list","전체 리스트"],["board","보드"]] as const).map(([id,ko])=>(
                  <button key={id} onClick={()=>setView(id)}
                    style={{padding:"4px 14px",borderRadius:999,fontSize:11.5,fontWeight:600,
                      background:view===id?"#18181b":"transparent",color:view===id?"#fff":"#52525b"}}>{ko}</button>
                ))}
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {CAT_FILTERS.map(f=>(
                  <button key={f.id} style={chip(catFilter===f.id)} onClick={()=>setCatFilter(f.id)}>{f.ko}</button>
                ))}
              </div>
            </div>
            {allTags.length>0&&(
              <div style={{display:"flex",gap:5,overflowX:"auto",scrollbarWidth:"none"}}>
                {allTags.map(t=>(
                  <button key={t} style={{...chip(activeTagFilter===t),padding:"2px 10px",fontSize:10.5}}
                    onClick={()=>setActiveTagFilter(activeTagFilter===t?null:t)}>#{t}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{flex:1,padding:isMobile?"2px 8px 70px":"4px 18px 56px",display:"flex",flexDirection:"column",gap:18}}>
            {loading
              ? <div style={{textAlign:"center",color:"var(--text-light)",paddingTop:60,fontSize:13}}>불러오는 중…</div>
              : view==="list"
              ? <ListView items={listItems} selectedKey={selectedKey} onSelect={setSelectedKey}
                  onOpen={it=>openCard(it.card,it.boardId)}
                  onProgressChange={handleProgressChange} isMobile={isMobile}/>
              : <>
                  {BOARDS_DEF.map(def=>(
                    <Board key={def.id} def={def}
                      cards={(boards[def.id]||[]).filter(c=>catFilter==="all"||catOf(c,def.id)===catFilter)}
                      collapsed={!!collapsedBoards[def.id]}
                      onToggleCollapse={()=>toggleBoardCollapse(def.id)}
                      onCardClick={c=>openCard(c,def.id)}
                      onQuickAdd={handleQuickAdd}
                      onDrop={handleDrop}
                      activeTagFilter={activeTagFilter}
                      doneSearch={doneSearch} setDoneSearch={setDoneSearch}
                      onProgressChange={handleProgressChange}/>
                  ))}
                  {!collapsedBoards["personal"]&&(
                    <>
                      <div style={{height:1,background:"var(--border)",margin:"2px 0"}}/>
                      <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none"}}
                        onClick={toggleMandalaCollapse}>
                        <button style={{
                          width:18,height:18,borderRadius:4,border:"1px solid var(--border)",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          background:"var(--surface)",fontSize:10,color:"var(--text-sub)",
                          transform:collapsedMandala?"rotate(-90deg)":"rotate(0deg)",transition:"transform .15s",flexShrink:0,
                        }}>▾</button>
                        <span style={{fontSize:11,fontWeight:600,color:"var(--text-sub)",letterSpacing:"0.05em",textTransform:"uppercase"}}>만다라트</span>
                        <span style={{fontSize:10,color:"var(--text-light)"}}>— 중앙 목표를 중심으로 8×8 세부 목표 설정</span>
                      </div>
                      {!collapsedMandala&&<MandalaView/>}
                    </>
                  )}
                  <div style={{height:1,background:"var(--border)",margin:"2px 0"}}/>
                  <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none"}}
                    onClick={togglePlanningCollapse}>
                    <button style={{
                      width:18,height:18,borderRadius:4,border:"1px solid var(--border)",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      background:"var(--surface)",fontSize:10,color:"var(--text-sub)",
                      transform:collapsedPlanning?"rotate(-90deg)":"rotate(0deg)",transition:"transform .15s",flexShrink:0,
                    }}>▾</button>
                    <span style={{fontSize:11,fontWeight:600,color:"var(--text-sub)",letterSpacing:"0.05em",textTransform:"uppercase"}}>플래닝</span>
                    <span style={{fontSize:10,color:"var(--text-light)"}}>— 콘텐츠 월간 플래닝</span>
                  </div>
                  {!collapsedPlanning&&<PlanningView/>}
                  <div style={{height:20}}/>
                </>
            }
          </div>
        </div>
      </div>

      {/* 하단 단축키 힌트 (데스크톱) */}
      {!isMobile&&!showPanel&&!dragging&&(
        <div style={{position:"fixed",left:214,right:0,bottom:0,zIndex:90,padding:"7px 18px",
          background:"rgba(255,255,255,.92)",backdropFilter:"blur(6px)",borderTop:"1px solid var(--border)",
          fontSize:10.5,color:"#71717a",display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"}}>
          <span><span className="kbd">+</span> 추가</span>
          <span><span className="kbd">↑</span><span className="kbd" style={{marginLeft:2}}>↓</span> 선택</span>
          <span><span className="kbd">Enter</span> 편집</span>
          <span><span className="kbd">Delete</span> 삭제</span>
          <span><span className="kbd">Tab</span> 다음 항목</span>
          <span><span className="kbd">?</span> 전체 단축키</span>
        </div>
      )}

      {/* 드래그 삭제 영역 */}
      {dragging&&(
        <div className={`trash-zone${trashOver?" over":""}`}
          onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="move";setTrashOver(true);}}
          onDragLeave={()=>setTrashOver(false)}
          onDrop={handleTrashDrop}>
          여기에 놓으면 삭제
        </div>
      )}

      {/* 토스트 */}
      {toast&&(
        <div style={{position:"fixed",left:"50%",bottom:isMobile?18:48,transform:"translateX(-50%)",zIndex:450,
          background:"#18181b",color:"#fff",borderRadius:999,padding:"9px 18px",fontSize:12,
          display:"flex",alignItems:"center",gap:14,boxShadow:"0 8px 28px rgba(0,0,0,.25)",maxWidth:"92vw"}}>
          <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{toast.msg}</span>
          {toast.undo&&<button onClick={toast.undo} style={{color:"#fff",fontWeight:700,textDecoration:"underline",fontSize:12}}>되돌리기</button>}
        </div>
      )}

      {showHelp&&<HelpOverlay onClose={()=>setShowHelp(false)}/>}

      {showPanel&&(
        <SidePanel card={editCard} boardId={editBoardId}
          onClose={()=>setShowPanel(false)} onSave={handleSave}
          onDelete={id=>deleteCard(id,editBoardId)}
          allTags={allTags}/>
      )}
    </>
  );
}
