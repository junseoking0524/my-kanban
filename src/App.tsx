import NutritionDashboard from "./NutritionDashboard";
import JapaneseDashboard from "./JapaneseDashboard";
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

  /* ═══ Clean / flat layer ═══ */
  html, body { background:#f1f2f4; }
  .metal-nav { background:#fff; border-bottom:1px solid #e1e3e8; }
  .metal-side { background:#fff; border-right:1px solid #e1e3e8; }
  .logo-chrome { background:#18181b; }
  .brand-text { color:#18181b; }

  .btn-dark { color:#fff; background:#18181b; border:1px solid #18181b; transition:background .12s, transform .08s; }
  .btn-dark:hover { background:#3f3f46; }
  .btn-dark:active { transform:translateY(1px); }
  .btn-light { color:#3f3f46; background:#fff; border:1px solid #d4d4d8; transition:background .12s, border-color .12s; }
  .btn-light:hover { background:#f4f4f5; border-color:#a1a1aa; }

  .kcard { background:#fff; border:1px solid #27272a; border-radius:8px; padding:7px 10px 8px; margin-bottom:5px;
    box-shadow:none; position:relative; }
  .kcard:hover { box-shadow:0 2px 8px rgba(0,0,0,.08); }
  .kcard.selected { outline:2px solid #18181b; outline-offset:1px; box-shadow:none; }

  .pill-co  { background:#18181b; color:#fff; }
  .pill-biz { background:#d4d4d8; color:#27272a; }
  .pill-me  { background:#fff; color:#52525b; border:1px solid #a1a1aa; line-height:15px; }
  .pu-urgent, .pu-late { background:#18181b; color:#fff; }
  .pu-important { background:#fff; color:#18181b; border:1px solid #18181b; line-height:15px; }
  .pu-normal, .pu-date { background:#f4f4f5; color:#71717a; }
  .tag-pill { background:#f4f4f5; }

  .sec-col { background:#fafafb; border:1px solid #e1e3e8; border-radius:12px; padding:0 8px 5px; min-height:120px;
    transition:border-color .12s, box-shadow .12s; }
  .sec-col.over { border-color:#18181b; box-shadow:0 0 0 1px #18181b; }
  .sec-head { margin:0 -8px 8px; padding:9px 12px; border-radius:11px 11px 0 0; display:flex; align-items:center; gap:8px; }
  .sec-head.todo { background:#fff; color:#18181b; border-bottom:1px solid #e1e3e8; }
  .sec-head.wip  { background:#52525b; color:#fff; }
  .sec-head.done { background:#18181b; color:#fff; }
  .sec-title { font-size:12px; font-weight:700; letter-spacing:.14em; }
  .sec-count { min-width:20px; padding:0 6px; border-radius:999px; font-size:10.5px; font-weight:700; text-align:center;
    line-height:18px; background:rgba(0,0,0,.08); }
  .sec-head.wip .sec-count, .sec-head.done .sec-count { background:rgba(255,255,255,.2); }

  .plan-day { background:#fff; border:1px solid #e1e3e8; }
  .plan-day.has-content { background:#f4f4f5; border-color:#a1a1aa; }
  .plan-day.today { border-color:#18181b; box-shadow:0 0 0 1px #18181b; }

  /* 삭제 영역: 카드를 화면 아래쪽 1/3로 끌어갔을 때만 연한 붉은 음영으로 나타남 */
  .delete-zone { position:fixed; left:var(--dz-left,0px); right:0; bottom:0; height:33vh; z-index:400;
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;
    background:linear-gradient(to top,rgba(248,113,113,.50) 0%,rgba(248,113,113,.24) 60%,rgba(248,113,113,.04) 100%);
    border-top:1px solid rgba(220,38,38,.35); color:#b91c1c; font-weight:700; font-size:14px;
    animation:dzin .14s ease-out; }
  .delete-zone svg { opacity:.85; }
  @keyframes dzin { from { opacity:0; } to { opacity:1; } }
`;

const CAL_LABELS = [
  { id:"family",   ko:"가족",    color:"#18181b" },
  { id:"junseok",  ko:"준석",    color:"#3f3f46" },
  { id:"default",  ko:"기본",    color:"#ea580c" },
  { id:"business", ko:"대상업무", color:"#2563eb" },
  { id:"noupdate", ko:"미분류",  color:"#71717a" },
];
const PERSONAL_LABELS = ["family","default","noupdate"];

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
// 상태: TO-DO / WIP / DONE (예전 개인 보드의 확인·챙길 것·메모는 TO-DO로 취급)
function statusOf(card:Card):"todo"|"inprogress"|"done"{ return card.colId==="inprogress"||card.colId==="done"?card.colId:"todo"; }
function isDoneCard(card:Card){ return statusOf(card)==="done"; }
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
  }).then(httpJson);
}
// 서버가 보낸 오류 메시지를 그대로 보여주기 위함 (예: 시트 권한/탭 문제)
async function httpJson(r:Response){
  if(r.ok) return r.json();
  let msg=r.statusText||String(r.status);
  try{ const j=await r.json(); if(j?.error) msg=j.error; }catch{ /* ignore */ }
  return Promise.reject(msg);
}
async function mandalaFetch(method:string, body?:any) {
  return fetch("/api/mandala", {
    method,
    headers:{"Content-Type":"application/json"},
    body: body ? JSON.stringify(body) : undefined,
  }).then(httpJson);
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
    <div data-prog="1" title={prog>0?`${prog}%`:"드래그해서 진행률 설정"} draggable={false}
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
                onChange(o.id); // Enter는 패널에서 저장 처리
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
  onClose:()=>void; onSave:(c:Card,keepOpen?:boolean)=>void; onDelete:(id:string)=>void; allTags:string[];
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

  const doSave=(keepOpen=false)=>{
    const title=form.title.trim();
    if(!title){titleRef.current?.focus();return;}
    // 태그 입력창에 남은 글자도 함께 저장
    const pending=tagInput.trim().replace(/[,#]/g,"");
    const tags=pending&&!(form.tags||[]).includes(pending)?[...(form.tags||[]),pending]:form.tags;
    onSave({...form,title,tags,dueDate:displayToDueDate(dueDateDisplay)},keepOpen&&!form.id);
  };

  // 바깥을 눌러 닫을 때도 입력한 내용은 저장 (제목이 비어 있으면 그냥 닫기)
  const closeAndSave=()=>{ if(form.title.trim()) doSave(); else onClose(); };

  const inputStyle:React.CSSProperties={
    width:"100%", border:"1px solid #1a1a1a", borderRadius:8,
    padding:"8px 10px", fontSize:12.5, background:"#fff", color:"#1a1a1a",
    outline:"none", fontFamily:"inherit",
  };

  return (
    <div data-panel="1" style={{position:"fixed",inset:0,zIndex:300,display:"flex"}}
      onKeyDown={e=>{
        if(e.key==="Escape"){e.stopPropagation();onClose();}
        if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();doSave();return;}
        // 메모 칸 밖 어디서든 Enter → 저장 (메모는 줄바꿈)
        const t=e.target as HTMLElement;
        if(e.key==="Enter"&&!e.shiftKey&&!e.defaultPrevented&&!e.nativeEvent.isComposing
          &&!t.hasAttribute("data-note")&&!(t.tagName==="BUTTON"&&t.textContent?.trim()==="삭제")){
          e.preventDefault(); if(!e.repeat) doSave(true);
        }
      }}>
      <div onClick={closeAndSave} style={{flex:1,background:"rgba(24,24,27,.28)",backdropFilter:"blur(2px)"}}/>
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
          <PanelField label="제목" hint={form.id?"Enter로 저장 · Shift+Enter 줄바꿈":"Enter로 등록하고 계속 입력 · Esc로 끝내기"}>
            <textarea ref={titleRef} data-f="1" value={form.title}
              onChange={e=>setForm(f=>({...f,title:e.target.value}))}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(!e.repeat)doSave(true);}}}
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
              onKeyDown={e=>{if(e.key==="Enter"&&!e.ctrlKey&&!e.metaKey)commitDue();}}
              placeholder="06/17 또는 06/17 14:00"
              className="panel-field-input" style={{...inputStyle,fontSize:12}}/>
          </PanelField>

          <PanelField label="메모" hint="Tab으로 다음 항목">
            <textarea data-f="1" data-note="1" value={form.note||""} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={3}
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
                  if(!addTag()&&e.key==="Enter"){ doSave(true); }
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
              onClick={()=>doSave()}
              onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(!e.repeat)doSave();}}}
              className="panel-save btn-dark"
              style={{flex:1,padding:"9px",borderRadius:8,fontWeight:700,fontSize:12.5,cursor:"pointer"}}>
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
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(()=>{
    mandalaFetch("GET").then(d=>{setGrid(Array.from({length:9},(_,r)=>Array.from({length:9},(_,c)=>d.grid?.[r]?.[c]??"")));setLoading(false);})
      .catch(()=>setLoading(false));
  },[]);

  const getCellValue=(r:number,c:number)=>grid[r]?.[c]??"";
  const getCellCoord=(brow:number,bcol:number,cr:number,cc:number):[number,number]=>[brow*3+cr,bcol*3+cc];

  const startEdit=(r:number,c:number)=>{setEditingCell([r,c]);setCellInput(grid[r]?.[c]??"");};
  const commitEdit=async(r:number,c:number,val:string)=>{
    setGrid(prev=>{const g=prev.map(row=>[...row]);g[r][c]=val;return g;});
    setEditingCell(null);
    // 이전 저장이 진행 중이어도 건너뛰지 않고 순서대로 저장
    saveQueue.current=saveQueue.current
      .then(()=>mandalaFetch("POST",{row:r,col:c,value:val}))
      .catch(e=>{alert("만다라트 저장 실패: "+e);});
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
// 칸반 — 회사 + Biz + 개인을 TO-DO / WIP / DONE 3개 섹션으로
// ─────────────────────────────────────────────────────────────────────────────
type Item = { card:Card; boardId:string };
const itemKey = (i:Item) => `${i.boardId}:${i.card.id}`;
const STATUS_RANK:Record<string,number> = { todo:0, inprogress:1, done:2 };

function CardTile({it,selected,onSelect,onOpen,onProgressChange,onDelete}:{
  it:Item; selected:boolean; onSelect:(k:string)=>void;
  onOpen:(i:Item)=>void; onProgressChange:(cardId:string,boardId:string,v:number)=>void;
  onDelete?:(i:Item)=>void;
}) {
  const {card,boardId}=it;
  const k=itemKey(it);
  const done=isDoneCard(card);
  const prog=card.progress??0;
  // 모바일: 카드를 왼쪽으로 밀어서 삭제
  const [dx,setDx]=useState(0);
  const [gone,setGone]=useState(false);
  const sw=useRef<{x:number;y:number;mode:""|"h"|"v";w:number}|null>(null);
  const swiped=useRef(false);
  const THRESH=0.38;
  const onTS=(e:React.TouchEvent)=>{
    if((e.target as HTMLElement).closest("[data-prog]")) return; // 진행률 막대 조작과 충돌 방지
    const t=e.touches[0]; sw.current={x:t.clientX,y:t.clientY,mode:"",w:(e.currentTarget as HTMLElement).offsetWidth};
  };
  const onTM=(e:React.TouchEvent)=>{
    const s0=sw.current; if(!s0) return;
    const t=e.touches[0], mx=t.clientX-s0.x, my=t.clientY-s0.y;
    if(!s0.mode){
      if(Math.abs(mx)<8&&Math.abs(my)<8) return;
      s0.mode=Math.abs(mx)>Math.abs(my)*1.4&&mx<0?"h":"v";
    }
    if(s0.mode==="h"){ swiped.current=true; setDx(Math.max(mx,-s0.w)); }
  };
  const onTE=()=>{
    const s0=sw.current; sw.current=null;
    if(!s0||s0.mode!=="h"){ return; }
    if(-dx>s0.w*THRESH&&onDelete){ setGone(true); setDx(-s0.w); setTimeout(()=>onDelete(it),160); }
    else setDx(0);
    setTimeout(()=>{swiped.current=false;},350);
  };
  const swiping=dx!==0;
  return (
    <div data-swipe-wrap="1" style={{position:"relative",borderRadius:8,
      height:gone?0:undefined,opacity:gone?0:1,transition:gone?"opacity .16s":undefined}}>
      {swiping&&(
        <div style={{position:"absolute",inset:"0 0 5px 0",borderRadius:8,background:"#dc2626",
          display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:16,
          color:"#fff",fontSize:12,fontWeight:700,opacity:Math.min(1,-dx/60)}}>
          {-dx>(sw.current?.w||300)*THRESH?"놓으면 삭제":"← 삭제"}
        </div>
      )}
    <div data-key={k} data-card="1" tabIndex={-1}
      onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} onTouchCancel={()=>{sw.current=null;setDx(0);}}
      className={`kcard${selected?" selected":""}`}
      draggable
      onDragStart={e=>{gDrag={cardId:card.id,boardId,card};e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",card.id);}}
      onDragEnd={()=>{gDrag={cardId:null,boardId:null,card:null};}}
      onClick={()=>{ if(swiped.current) return; onSelect(k);onOpen(it);}}
      style={{position:"relative",overflow:"hidden",opacity:done?.62:1,touchAction:"pan-y",
        transform:dx?`translateX(${dx}px)`:undefined,transition:sw.current?"none":"transform .18s"}}>
      <ProgTopBar prog={prog} onChange={v=>onProgressChange(card.id,boardId,v)}/>
      <div style={{marginTop:3}}><CardHead card={card} boardId={boardId}/></div>
      <div style={{marginTop:4,fontSize:13,color:"#111",lineHeight:1.4,wordBreak:"break-word",fontWeight:500,
        textDecoration:done?"line-through":"none"}}>{card.title}</div>
      {((card.tags||[]).length>0||prog>0)&&(
        <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:4,marginTop:5}}>
          {(card.tags||[]).map(t=><span key={t} className="tag-pill">{t}</span>)}
          {prog>0&&<span style={{marginLeft:"auto",fontSize:10,color:"#71717a",fontWeight:700}}>{prog}%</span>}
        </div>
      )}
    </div>
    </div>
  );
}

// '+' 빠른 입력: 패널 없이 컬럼 위에서 바로 입력 → Enter로 계속 추가, Esc로 종료
// 빠른 입력 해석: 문장 어디에 있어도 날짜(10/28, 10/28(수)), 요일(수 / 수요일 → 가장 가까운 수요일),
// 오늘·내일·모레, 시간(14:00), 구분 ((회사)·(Biz)·(개인))을 뽑아 제목에서 빼고 속성으로 넣는다.
function parseQuick(raw:string,now=new Date()){
  let t=" "+raw.trim()+" ";
  let dueDate="", category:""|"company"|"biz"|"personal"="";
  const cm=t.match(/[(（\[]\s*(회사|biz|비즈|개인)\s*[)）\]]/i);
  if(cm){
    const k=cm[1].toLowerCase();
    category=k==="회사"?"company":k==="개인"?"personal":"biz";
    t=t.replace(cm[0]," ");
  }
  const ymd=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const DAYS="일월화수목금토";
  const dm=t.match(/\s(\d{1,2})\/(\d{1,2})(?:\s*[(（][월화수목금토일][)）])?(?=\s)/);
  if(dm){
    dueDate=displayToDueDate(`${dm[1]}/${dm[2]}`);
    t=t.replace(dm[0]," ");
  } else {
    const wm=t.match(/\s(오늘|내일|모레|([월화수목금토일])(?:요일)?)(?=\s)/);
    if(wm){
      const d=new Date(now.getFullYear(),now.getMonth(),now.getDate());
      if(wm[1]==="내일") d.setDate(d.getDate()+1);
      else if(wm[1]==="모레") d.setDate(d.getDate()+2);
      else if(wm[2]) d.setDate(d.getDate()+((DAYS.indexOf(wm[2])-d.getDay()+7)%7));
      dueDate=ymd(d);
      t=t.replace(wm[0]," ");
    }
  }
  if(dueDate){
    const tm=t.match(/\s(\d{1,2}:\d{2})(?=\s)/);
    if(tm){ dueDate=dueDate.slice(0,10)+"T"+tm[1].padStart(5,"0"); t=t.replace(tm[0]," "); }
  }
  const title=t.replace(/\s+/g," ").trim();
  if(!title) return {title:raw.replace(/[(（\[].*?[)）\]]/g," ").trim()||raw.trim(),dueDate,category}; // 제목이 남지 않으면 입력한 말(예: "수요일")을 제목으로
  return {title,dueDate,category};
}
function QuickBar({label,onAdd,onClose,isMobile}:{label:string;onAdd:(text:string)=>void;onClose:()=>void;isMobile:boolean}) {
  const [val,setVal]=useState("");
  const ref=useRef<HTMLInputElement>(null);
  useEffect(()=>{ref.current?.focus();},[]);
  return (
    <div style={{marginBottom:6}}>
      <input ref={ref} value={val} onChange={e=>setVal(e.target.value)}
        placeholder={`${label} · 입력 후 Enter`}
        onKeyDown={e=>{
          if(e.key==="Enter"&&!e.nativeEvent.isComposing){
            e.preventDefault();
            if(e.repeat) return;
            const t=val.trim();
            if(t){ onAdd(t); setVal(""); }
          } else if(e.key==="Escape"){ e.preventDefault(); e.stopPropagation(); onClose(); }
        }}
        onBlur={()=>{ if(!val.trim()) onClose(); }}
        style={{width:"100%",border:"1px dashed #8d929b",borderRadius:8,padding:"7px 10px",background:"#fff",
          fontSize:isMobile?16:13,color:"#18181b",outline:"none",fontFamily:"inherit"}}/>
      <div style={{fontSize:10,color:"#a1a1aa",margin:"3px 2px 0"}}>
        Enter 계속 추가 · Esc 닫기 · <span style={{color:"#71717a"}}>10/28 · 수요일 · 내일</span> 날짜 · <span style={{color:"#71717a"}}>(회사)(Biz)(개인)</span> 구분
      </div>
    </div>
  );
}

const SECTIONS = [
  { id:"todo",       cls:"todo", ko:"TO-DO", sub:"해야 할 일" },
  { id:"inprogress", cls:"wip",  ko:"WIP",   sub:"진행 중"   },
  { id:"done",       cls:"done", ko:"DONE",  sub:"완료"      },
] as const;

function KanbanView({items,selectedKey,onSelect,onOpen,onProgressChange,onMove,onAdd,isMobile,onCardDelete,
  quickStatus,quickLabel,onQuickAdd,onQuickClose}:{
  items:Item[]; selectedKey:string|null; onSelect:(k:string)=>void;
  onOpen:(i:Item)=>void; onProgressChange:(cardId:string,boardId:string,v:number)=>void;
  onMove:(status:string)=>void; onAdd:(status:string)=>void; isMobile:boolean; onCardDelete:(i:Item)=>void;
  quickStatus:string|null; quickLabel:string; onQuickAdd:(status:string,text:string)=>void; onQuickClose:()=>void;
}) {
  const [over,setOver]=useState<string|null>(null);
  return (
    <div style={{display:"grid",gap:12,alignItems:"start",
      gridTemplateColumns:isMobile?"1fr":"repeat(3,minmax(0,1fr))"}}>
      {SECTIONS.map(sec=>{
        const list=items.filter(i=>statusOf(i.card)===sec.id)
          .sort((a,b)=>urgencySortKey(a.card).localeCompare(urgencySortKey(b.card)));
        return (
          <div key={sec.id} className={`sec-col${over===sec.id?" over":""}`}
            onDragOver={e=>{e.preventDefault();setOver(sec.id);}}
            onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOver(null);}}
            onDrop={e=>{e.preventDefault();setOver(null);onMove(sec.id);}}>
            <div className={`sec-head ${sec.cls}`}>
              <span className="sec-title">{sec.ko}</span>
              <span style={{fontSize:11,opacity:.7,fontWeight:500}}>{sec.sub}</span>
              <span className="sec-count" style={{marginLeft:"auto"}}>{list.length}</span>
              <button onClick={()=>onAdd(sec.id)} title={`${sec.ko}에 카드 추가`}
                style={{width:22,height:22,borderRadius:7,fontSize:16,lineHeight:1,color:"inherit",
                  border:"1px solid currentColor",opacity:.75,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            </div>
            {quickStatus===sec.id&&(
              <QuickBar label={quickLabel} isMobile={isMobile}
                onAdd={t=>onQuickAdd(sec.id,t)} onClose={onQuickClose}/>
            )}
            {list.map(it=>(
              <CardTile key={itemKey(it)} it={it} selected={selectedKey===itemKey(it)}
                onSelect={onSelect} onOpen={onOpen} onProgressChange={onProgressChange}
                onDelete={isMobile?onCardDelete:undefined}/>
            ))}
            {!list.length&&(
              <div style={{textAlign:"center",color:"#a1a1aa",fontSize:11.5,padding:"18px 0"}}>
                {over===sec.id?"여기에 놓기":"비어 있음"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 개인 카드 정리 — 기본 루틴 등을 골라서 한 번에 삭제
// ─────────────────────────────────────────────────────────────────────────────
function CleanupModal({cards,onClose,onDelete}:{
  cards:Card[]; onClose:()=>void; onDelete:(ids:string[])=>void;
}) {
  const [sel,setSel]=useState<Set<string>>(new Set());
  const toggle=(id:string)=>setSel(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});
  const allOn=cards.length>0&&sel.size===cards.length;
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:500,background:"rgba(24,24,27,.4)",backdropFilter:"blur(3px)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();onClose();}}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",border:"1px solid #18181b",borderRadius:16,padding:"18px 20px",
        width:420,maxWidth:"100%",maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <span style={{fontWeight:700,fontSize:14}}>개인 카드 정리</span>
          <button onClick={onClose} style={{fontSize:18,color:"#71717a"}}>×</button>
        </div>
        <div style={{fontSize:11,color:"#71717a",marginBottom:10}}>삭제할 카드를 골라주세요. 구글 시트에서도 함께 삭제됩니다.</div>
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight:600,padding:"6px 0",borderBottom:"1px solid #e4e4e7",cursor:"pointer"}}>
          <input type="checkbox" checked={allOn} onChange={()=>setSel(allOn?new Set():new Set(cards.map(c=>c.id)))}/>
          전체 선택 ({cards.length})
        </label>
        <div style={{overflowY:"auto",flex:1,margin:"4px 0 12px"}}>
          {cards.map(c=>(
            <label key={c.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:12.5,padding:"6px 0",cursor:"pointer"}}>
              <input type="checkbox" checked={sel.has(c.id)} onChange={()=>toggle(c.id)}/>
              <span style={{flex:1,wordBreak:"break-word"}}>{c.title}</span>
            </label>
          ))}
          {!cards.length&&<div style={{padding:"24px 0",textAlign:"center",color:"#a1a1aa",fontSize:12}}>개인 카드가 없어요</div>}
        </div>
        <button disabled={!sel.size} onClick={()=>onDelete(Array.from(sel))} className="btn-dark"
          style={{padding:"9px",borderRadius:8,fontWeight:700,fontSize:12.5,opacity:sel.size?1:.4}}>
          {sel.size}개 삭제
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 단축키 도움말
// ─────────────────────────────────────────────────────────────────────────────
const SHORTCUTS:[string[],string][] = [
  [["+"],"빠른 추가 — 입력 후 Enter를 계속 누르면 연속 입력, Esc로 종료"],
  [["Tab"],"다음 항목  ·  Shift+Tab 이전 항목"],
  [["←","→"],"구분 / 긴급도 / 라벨 선택"],
  [["Enter"],"다음 항목으로 · 제목에서는 등록하고 다음 카드 계속 입력"],
  [["Ctrl","Enter"],"패널 어디서든 저장"],
  [["Esc"],"패널·창 닫고 원래 화면으로"],
  [["↑","↓"],"카드 선택 (j / k 도 가능)"],
  [["Enter"],"선택한 카드 편집"],
  [["Delete"],"선택한 카드 삭제"],
  [["Ctrl","Z"],"방금 삭제한 카드 되돌리기"],
  [["1","2","3","4"],"전체 / 회사 / Biz / 개인 보기"],
  [["?"],"이 도움말 열기·닫기"],
];
const MOBILE_GUIDE:[string,string][] = [
  ["+ 버튼","빠른 추가 — 입력 후 Enter(완료 키)를 계속 누르면 연속 입력"],
  ["날짜·요일","10/28 · 수요일 · 내일 처럼 쓰면 마감일이 자동 입력돼요"],
  ["구분","(회사) (Biz) (개인) 을 붙이면 그 탭에 저장돼요"],
  ["좌우로 밀기","빈 곳을 좌우로 밀면 칸반 ↔ 만다라트 ↔ 플래닝 ↔ 식단·운동"],
  ["카드 ← 밀기","카드를 왼쪽으로 끝까지 밀면 삭제 (아래 '되돌리기'로 복구)"],
  ["카드 탭","카드를 눌러 편집 · 바깥을 누르면 자동 저장"],
];
function HelpOverlay({onClose}:{onClose:()=>void}) {
  const isTouch=typeof window!=="undefined"&&(window.matchMedia?.("(pointer: coarse)").matches||window.innerWidth<700);
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:500,background:"rgba(24,24,27,.35)",
      backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",border:"1px solid #18181b",borderRadius:16,
        padding:"20px 24px",width:420,maxWidth:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{fontWeight:700,fontSize:14}}>키보드 단축키</span>
          <button onClick={onClose} style={{fontSize:18,color:"#71717a"}}>×</button>
        </div>
        {MOBILE_GUIDE.length>0&&isTouch&&(
          <div style={{marginBottom:12,paddingBottom:10,borderBottom:"1px solid #e4e4e7"}}>
            <div style={{fontWeight:700,fontSize:12.5,marginBottom:6}}>모바일 사용법</div>
            {MOBILE_GUIDE.map(([k,d])=>(
              <div key={k} style={{display:"flex",gap:10,padding:"4px 0",fontSize:12,color:"#3f3f46"}}>
                <span style={{width:92,flexShrink:0,fontWeight:600,color:"#18181b"}}>{k}</span><span>{d}</span>
              </div>
            ))}
          </div>
        )}
        {SHORTCUTS.map(([keys,desc],i)=>(
          <div key={i} style={{display:"flex",gap:12,padding:"6px 0",borderTop:i?"1px solid #f0f0f2":"none",alignItems:"center"}}>
            <div style={{width:118,flexShrink:0,display:"flex",gap:3,flexWrap:"wrap"}}>
              {keys.map(k=><span key={k} className="kbd">{k}</span>)}
            </div>
            <div style={{fontSize:12,color:"#3f3f46"}}>{desc}</div>
          </div>
        ))}
        <div style={{marginTop:12,fontSize:11,color:"#a1a1aa",lineHeight:1.6}}>
          카드를 끌어서 화면 맨 아래쪽에 잠시 머물면 연한 붉은 삭제 영역이 나타나요. 거기에 놓으면 삭제되고, 6초 안에 되돌릴 수 있어요.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PlanningView — 월간 플래닝. 날짜를 누르면 별도 입력창이 열리고, 입력한 내용은 TO-DO로 추가
// ─────────────────────────────────────────────────────────────────────────────
function PlanningView({onAddTasks,isMobile}:{
  onAddTasks:(lines:string[],date:string,category:"company"|"biz"|"personal")=>void; isMobile:boolean;
}) {
  const today = new Date();
  const [view,setView] = useState({y:today.getFullYear(),m:today.getMonth()});
  const [planData,setPlanData] = useState<Record<string,string>>(()=>{
    try { return JSON.parse(localStorage.getItem("planning_data")||"{}"); } catch { return {}; }
  });
  const [editingDay,setEditingDay] = useState<string|null>(null);
  const [editVal,setEditVal] = useState("");
  const [editCat,setEditCat] = useState<"company"|"biz"|"personal">("company");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const toKey=(y:number,m:number,d:number)=>`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const todayKey = toKey(today.getFullYear(),today.getMonth(),today.getDate());
  const firstDay = new Date(view.y,view.m,1).getDay();
  const daysInMonth = new Date(view.y,view.m+1,0).getDate();
  const cells:(number|null)[] = [...Array(firstDay).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)];
  while(cells.length%7!==0) cells.push(null);
  const WK=["일","월","화","수","목","금","토"];

  const openEdit=(key:string)=>{
    setEditingDay(key);
    setEditVal(planData[key]||"");
    setTimeout(()=>taRef.current?.focus(),60);
  };
  const splitLines=(t:string)=>t.split("\n").map(x=>x.trim()).filter(Boolean);
  const commit=()=>{
    if(!editingDay) return;
    const oldLines=new Set(splitLines(planData[editingDay]||""));
    const lines=splitLines(editVal);
    const added=lines.filter(l=>!oldLines.has(l));
    const text=lines.join("\n");
    setPlanData(prev=>{
      const next={...prev};
      if(text) next[editingDay]=text; else delete next[editingDay];
      localStorage.setItem("planning_data",JSON.stringify(next));
      return next;
    });
    if(added.length) onAddTasks(added,editingDay,editCat);
    setEditingDay(null);
  };

  const [ey,em,ed]=(editingDay||"0-0-0").split("-").map(Number);

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <button onClick={()=>setView(v=>v.m===0?{y:v.y-1,m:11}:{y:v.y,m:v.m-1})}
          style={{fontSize:18,color:"var(--text-sub)",padding:"2px 8px",borderRadius:4,lineHeight:1}}>‹</button>
        <span style={{fontSize:13,fontWeight:700,color:"var(--text)",minWidth:80,textAlign:"center"}}>
          {view.y}. {String(view.m+1).padStart(2,"0")}
        </span>
        <button onClick={()=>setView(v=>v.m===11?{y:v.y+1,m:0}:{y:v.y,m:v.m+1})}
          style={{fontSize:18,color:"var(--text-sub)",padding:"2px 8px",borderRadius:4,lineHeight:1}}>›</button>
        <button onClick={()=>setView({y:today.getFullYear(),m:today.getMonth()})} className="btn-light"
          style={{fontSize:10.5,padding:"3px 10px",borderRadius:999,marginLeft:2,fontWeight:600}}>오늘</button>
      </div>

      <div className="plan-cal-grid">
        {WK.map((d,i)=>(
          <div key={d} className="plan-cal-header"
            style={{color:i===0?"var(--red)":i===6?"#52525b":"var(--text-light)"}}>{d}</div>
        ))}
        {cells.map((day,i)=>{
          if(!day) return <div key={i} className="plan-day empty"/>;
          const key=toKey(view.y,view.m,day);
          const text=planData[key]||"";
          const dow=(firstDay+day-1)%7;
          const mmdd=`${String(view.m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isHol=!!HOLIDAYS[mmdd];
          const isToday=key===todayKey;
          return (
            <div key={i} className={`plan-day${isToday?" today":""}${text?" has-content":""}`}
              style={{minHeight:isMobile?58:72}}
              onClick={()=>openEdit(key)}>
              <div className="plan-day-num">
                <span style={{
                  color:isToday?"#fff":(isHol||dow===0)?"var(--red)":"var(--text-sub)",
                  fontWeight:isToday?700:500,
                  background:isToday?"#18181b":"transparent",
                  borderRadius:999,padding:isToday?"1px 6px":"0"}}>{day}</span>
                {isHol&&<span style={{fontSize:8,color:"var(--red)",maxWidth:30,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{HOLIDAYS[mmdd]}</span>}
              </div>
              {text&&<div className="plan-day-text">{text.split("\n").join(" · ")}</div>}
            </div>
          );
        })}
      </div>
      <div style={{marginTop:8,fontSize:10.5,color:"var(--text-light)"}}>
        날짜를 누르면 입력창이 열려요 · 한 줄에 하나씩 적으면 TO-DO 카드로 자동 추가돼요
      </div>

      {editingDay&&(
        <div data-panel="1" onClick={()=>setEditingDay(null)}
          onKeyDown={e=>{
            if(e.key==="Escape"){e.stopPropagation();setEditingDay(null);}
            if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();commit();}
          }}
          style={{position:"fixed",inset:0,zIndex:350,background:"rgba(24,24,27,.4)",backdropFilter:"blur(3px)",
            display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",width:isMobile?"100%":400,maxWidth:"100%",
            borderRadius:isMobile?"20px 20px 0 0":16,border:"1px solid #18181b",padding:"16px 18px calc(16px + env(safe-area-inset-bottom))",
            boxShadow:"0 -10px 50px rgba(0,0,0,.3)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontWeight:700,fontSize:14}}>
                {em}/{ed} ({WK[new Date(ey,em-1,ed).getDay()]}) 플래닝
              </span>
              <button tabIndex={-1} onClick={()=>setEditingDay(null)} style={{fontSize:20,color:"#71717a",lineHeight:1}}>×</button>
            </div>
            <textarea ref={taRef} data-f="1" value={editVal} onChange={e=>setEditVal(e.target.value)} rows={5}
              placeholder={"한 줄에 하나씩 입력\n예) 주간 보고 준비"}
              className="panel-field-input"
              style={{width:"100%",border:"1px solid #1a1a1a",borderRadius:10,padding:"10px 12px",
                fontSize:16,lineHeight:1.5,resize:"none",background:"#fff",color:"#1a1a1a",fontFamily:"inherit"}}/>
            <div style={{margin:"12px 0 6px",fontSize:10,fontWeight:600,color:"#71717a",letterSpacing:"0.07em"}}>
              새로 적은 줄은 이 구분의 TO-DO 카드로 추가돼요
            </div>
            <ChoiceGroup options={CATEGORIES.map(c=>({id:c.id,ko:c.ko}))} value={editCat}
              onChange={v=>v&&setEditCat(v)}/>
            <div style={{display:"flex",gap:8,marginTop:14}}>
              <button data-f="1" onClick={commit} className="btn-dark"
                style={{flex:1,padding:"11px",borderRadius:10,fontWeight:700,fontSize:13.5}}>
                저장 <span style={{opacity:.5,fontWeight:500,fontSize:10.5}}>Ctrl+Enter</span>
              </button>
              <button onClick={()=>setEditingDay(null)} className="btn-light"
                style={{padding:"11px 16px",borderRadius:10,fontWeight:600,fontSize:13.5}}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
type CatFilter = "all"|"company"|"biz"|"personal";
type ViewId = "kanban"|"mandala"|"planning"|"nutrition"|"japanese";
const CAT_FILTERS:{id:CatFilter;ko:string}[] = [
  {id:"all",ko:"전체"},{id:"company",ko:"회사"},{id:"biz",ko:"Biz"},{id:"personal",ko:"개인"},
];
const SIDEBAR_W = 214;

export default function App() {
  const isMobile = useIsMobile();
  const [boards,setBoards] = useState<Record<string,Card[]>>({work:[],personal:[]});
  const [loading,setLoading] = useState(true);
  const [sync,setSync] = useState<{state:"ok"|"syncing"|"error";at:string}>({state:"syncing",at:""});
  const [editCard,setEditCard] = useState<Card|null>(null);
  const [editBoardId,setEditBoardId] = useState("work");
  const [showPanel,setShowPanel] = useState(false);
  const [activeTagFilter,setActiveTagFilter] = useState<string|null>(null);
  const [view,setView] = useState<ViewId>(()=>{const v=new URLSearchParams(window.location.search).get("view");return v==="nutrition"||v==="japanese"?v:"kanban";});
  const [catFilter,setCatFilter] = useState<CatFilter>("all");
  const [selectedKey,setSelectedKey] = useState<string|null>(null);
  const [showHelp,setShowHelp] = useState(false);
  const [showCleanup,setShowCleanup] = useState(false);
  const [quickStatus,setQuickStatus] = useState<string|null>(null);
  const [dragging,setDragging] = useState(false);
  const [trashOver,setTrashOver] = useState(false);
  const [toast,setToast] = useState<{msg:string;undo?:()=>void}|null>(null);
  const [kanbanOpen,setKanbanOpen] = useState<boolean>(()=>{
    try { return JSON.parse(localStorage.getItem("kanban_nav_open")||"true"); } catch { return true; }
  });

  const inflight = useRef(0);
  const boardsRef = useRef(boards); boardsRef.current = boards;
  const progTimers = useRef<Record<string,ReturnType<typeof setTimeout>>>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  // 모든 저장(추가/수정/삭제)은 한 줄로 세워서 하나씩 실행 — 동시에 시트에 쓰다가 서로 덮어쓰는 것을 막음
  const mutSeq = useRef(0);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const mutate=<T,>(fn:()=>Promise<T>):Promise<T>=>{
    inflight.current++; mutSeq.current++;
    const p=queueRef.current.catch(()=>{}).then(fn);
    queueRef.current=p.catch(()=>{});
    return p.finally(()=>{inflight.current--; mutSeq.current++;});
  };
  const newCardId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const nowLabel=()=>new Date().toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",hour12:false});

  const loadAll=useCallback(async()=>{
    if(inflight.current>0) return;
    const seq=mutSeq.current;
    setSync(s=>({...s,state:"syncing"}));
    try{
      const [w,p]=await Promise.all([apiFetch("GET","work"),apiFetch("GET","personal")]);
      // 불러오는 사이에 저장이 있었다면 이 결과는 낡은 것 → 버리고 잠시 뒤 다시
      if(inflight.current>0||mutSeq.current!==seq){
        setTimeout(()=>loadAll(),1500);
        return;
      }
      setBoards({work:Array.isArray(w)?w:(w.cards||[]),personal:Array.isArray(p)?p:(p.cards||[])});
      setSync({state:"ok",at:nowLabel()});
    }catch{
      setSync(s=>({...s,state:"error"}));
    }finally{ setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{
    loadAll();
    const iv=setInterval(()=>{ if(document.visibilityState==="visible") loadAll(); },30000);
    const onVis=()=>{ if(document.visibilityState==="visible") loadAll(); };
    document.addEventListener("visibilitychange",onVis);
    return ()=>{clearInterval(iv);document.removeEventListener("visibilitychange",onVis);};
  },[loadAll]);

  // 드래그 중에만 삭제 영역 표시
  useEffect(()=>{
    // 삭제 영역은 카드를 화면 맨 아래쪽(하단 15%)에 잠시 머물게 했을 때만 나타남.
    // 일반적인 끌기·보드 간 이동에서는 절대 보이지 않음.
    let timer:ReturnType<typeof setTimeout>|null=null;
    let shown=false;
    const clear=()=>{ if(timer){clearTimeout(timer);timer=null;} };
    const start=()=>{ if(gDrag.cardId) setDragging(true); };
    const end=()=>{ clear(); shown=false; setDragging(false); setTrashOver(false); };
    const over=(e:DragEvent)=>{
      if(!gDrag.cardId) return;
      const left=window.innerWidth<900?0:SIDEBAR_W;
      const h=window.innerHeight;
      if(shown){
        // 이미 나타난 뒤에는 하단 1/3 안에 있는 동안 유지
        if(e.clientY<h*0.67||e.clientX<left){ shown=false; setTrashOver(false); }
        return;
      }
      const inEdge=e.clientY>=h*0.85&&e.clientX>=left;
      if(inEdge){
        if(!timer) timer=setTimeout(()=>{ timer=null; shown=true; setTrashOver(true); },350);
      } else clear();
    };
    window.addEventListener("dragstart",start);
    window.addEventListener("dragover",over);
    window.addEventListener("dragend",end);
    window.addEventListener("drop",end);
    return ()=>{
      clear();
      window.removeEventListener("dragstart",start);
      window.removeEventListener("dragover",over);
      window.removeEventListener("dragend",end);
      window.removeEventListener("drop",end);
    };
  },[]);

  const matchFilters=(card:Card,boardId:string)=>
    (catFilter==="all"||catOf(card,boardId)===catFilter) &&
    (!activeTagFilter||(card.tags||[]).includes(activeTagFilter));
  const items:Item[]=(["work","personal"] as const)
    .flatMap(b=>(boards[b]||[]).map(card=>({card,boardId:b as string})))
    .filter(i=>matchFilters(i.card,i.boardId));
  // 키보드 이동 순서: TO-DO → WIP → DONE, 각 섹션은 긴급도 순
  const orderedItems=[...items].sort((a,b)=>{
    const d=STATUS_RANK[statusOf(a.card)]-STATUS_RANK[statusOf(b.card)];
    return d||urgencySortKey(a.card).localeCompare(urgencySortKey(b.card));
  });

  const allTags=Array.from(new Set(Object.values(boards).flat().flatMap(c=>c.tags||[]))).sort();
  const allCards=Object.values(boards).flat();
  const countOf=(f:CatFilter)=>f==="all"?allCards.length
    :Object.entries(boards).flatMap(([b,cs])=>cs.map(c=>catOf(c,b))).filter(c=>c===f).length;

  const showToast=(msg:string,undo?:()=>void)=>{
    if(toastTimer.current) clearTimeout(toastTimer.current);
    setToast({msg,undo});
    toastTimer.current=setTimeout(()=>setToast(null),6000);
  };

  const openCard=(card:Card,boardId:string)=>{setEditCard(card);setEditBoardId(boardId);setShowPanel(true);};
  const openNew=(colId:string,boardId:string,extra?:Partial<Card>)=>{
    setEditCard({id:"",colId,title:"",...extra});setEditBoardId(boardId);setShowPanel(true);
  };
  const openNewCard=(status="todo")=>{
    const category=catFilter==="all"?"company":catFilter;
    openNew(status,category==="personal"?"personal":"work",{category,priority:"normal"});
  };

  // 새 카드: 화면에 먼저 반영하고 저장은 뒤에서 순서대로. 실패하면 카드를 되돌리고 알림
  const createCard=(card:Card,select=true)=>{
    const colId=statusOf(card);
    const target=card.category==="personal"?"personal":"work";
    const id=newCardId();
    const full={...card,id,colId};
    setBoards(prev=>({...prev,[target]:[...prev[target],full]}));
    if(select) setSelectedKey(`${target}:${id}`);
    mutate(()=>apiFetch("POST",target,full)).catch(e=>{
      setBoards(prev=>({...prev,[target]:prev[target].filter(c=>c.id!==id)}));
      alert("저장 실패 — 카드가 취소됐어요: "+e);
    });
    return {target,colId};
  };

  // '+' 빠른 입력
  const openQuick=(status="todo")=>{ setView("kanban"); setQuickStatus(status); };
  const handleQuickAdd=(status:string,text:string)=>{
    const q=parseQuick(text);
    const {title,dueDate}=q;
    if(!title) return;
    const category=q.category||(catFilter==="all"?"company":catFilter);
    createCard({id:"",colId:status,title,dueDate,category,priority:"normal"},false);
  };

  // 화면에 먼저 반영하고 저장은 뒤에서 순서대로 — Enter를 연달아 눌러도 빠르게 계속 입력 가능
  const handleSave=(card:Card,keepOpen=false)=>{
    const colId=statusOf(card);
    if(card.id){
      const bid=editBoardId;
      const full={...card,colId};
      setBoards(prev=>({...prev,[bid]:prev[bid].map(c=>c.id===card.id?{...c,...full}:c)}));
      setShowPanel(false);
      mutate(()=>apiFetch("PUT",bid,full,card.id)).catch(e=>{alert("저장 실패: "+e);loadAll();});
      return;
    }
    const {target}=createCard(card);
    if(keepOpen){
      // 연속 입력: 같은 구분/긴급도로 빈 입력창을 바로 다시 열기
      setEditCard({id:"",colId,title:"",category:card.category,priority:card.priority});
      setEditBoardId(target);
    } else setShowPanel(false);
  };

  // 플래닝에서 입력한 줄 → TO-DO 카드
  const addPlanTasks=(lines:string[],date:string,category:"company"|"biz"|"personal")=>{
    const target=category==="personal"?"personal":"work";
    const cards:Card[]=lines.map(title=>({id:newCardId(),colId:"todo",title,dueDate:date,category,priority:"normal"}));
    setBoards(prev=>({...prev,[target]:[...prev[target],...cards]}));
    showToast(`TO-DO에 ${cards.length}개 추가됨`);
    for(const c of cards){
      mutate(()=>apiFetch("POST",target,c)).catch(e=>{
        setBoards(prev=>({...prev,[target]:prev[target].filter(x=>x.id!==c.id)}));
        alert("TO-DO 추가 실패: "+e);
      });
    }
  };

  const deleting=useRef<Set<string>>(new Set());
  const deleteCard=async(cardId:string,boardId:string)=>{
    const dk=`${boardId}:${cardId}`;
    if(deleting.current.has(dk)) return; // 키 반복·중복 호출 방지
    const card=boardsRef.current[boardId]?.find(c=>c.id===cardId);
    if(!card) return;
    deleting.current.add(dk);
    const idx=orderedItems.findIndex(i=>i.card.id===cardId&&i.boardId===boardId);
    const neighbor=orderedItems[idx+1]||orderedItems[idx-1];
    setSelectedKey(neighbor?itemKey(neighbor):null);
    setBoards(prev=>({...prev,[boardId]:prev[boardId].filter(c=>c.id!==cardId)}));
    setShowPanel(false);
    try{
      await mutate(()=>apiFetch("DELETE",boardId,undefined,cardId));
      showToast(`"${card.title.slice(0,24)}" 삭제됨`,async()=>{
        try{
          const res=await mutate(()=>apiFetch("POST",boardId,card));
          setBoards(prev=>({...prev,[boardId]:[...prev[boardId],res.card]}));
          setSelectedKey(`${boardId}:${res.card.id}`);
          setToast(null);
        }catch(e){alert("되돌리기 실패: "+e);}
      });
    }catch(e){
      // 이미 시트에서 지워진 카드(Not Found)는 삭제된 것으로 처리
      if(String(e).includes("Not Found")){
        showToast(`"${card.title.slice(0,24)}" 삭제됨`);
      } else {
        setBoards(prev=>({...prev,[boardId]:[...prev[boardId],card]}));
        alert("삭제 실패: "+e);
      }
    }finally{ deleting.current.delete(dk); }
  };

  const cleanupDelete=async(ids:string[])=>{
    setShowCleanup(false);
    setBoards(prev=>({...prev,personal:prev.personal.filter(c=>!ids.includes(c.id))}));
    let fail=0;
    for(const id of ids){
      try{ await mutate(()=>apiFetch("DELETE","personal",undefined,id)); }catch{ fail++; }
    }
    showToast(fail?`${ids.length-fail}개 삭제, ${fail}개 실패`:`개인 카드 ${ids.length}개 삭제됨`);
    if(fail) loadAll();
  };

  const handleProgressChange=useCallback((cardId:string,boardId:string,v:number)=>{
    setBoards(prev=>({...prev,[boardId]:prev[boardId].map(c=>c.id===cardId?{...c,progress:v}:c)}));
    const k=`${boardId}:${cardId}`;
    clearTimeout(progTimers.current[k]);
    progTimers.current[k]=setTimeout(()=>{
      const card=boardsRef.current[boardId]?.find(c=>c.id===cardId);
      if(card) mutate(()=>apiFetch("PUT",boardId,card,cardId)).catch(()=>{});
    },400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // 섹션 사이로 카드 이동 (TO-DO ↔ WIP ↔ DONE)
  const handleMove=async(status:string)=>{
    const {cardId,boardId,card}=gDrag;
    gDrag={cardId:null,boardId:null,card:null};
    if(!cardId||!boardId||!card||statusOf(card)===status) return;
    const updated={...card,colId:status};
    setBoards(prev=>({...prev,[boardId]:prev[boardId].map(c=>c.id===cardId?updated:c)}));
    try{await mutate(()=>apiFetch("PUT",boardId,updated,cardId));}catch(e){console.error(e);}
  };

  const handleTrashDrop=(e:React.DragEvent)=>{
    e.preventDefault();
    setTrashOver(false); setDragging(false);
    const {cardId,boardId}=gDrag;
    gDrag={cardId:null,boardId:null,card:null};
    if(cardId&&boardId) deleteCard(cardId,boardId);
  };

  const goKanban=(f:CatFilter)=>{ setView("kanban"); setCatFilter(f); };

  // 모바일: 맨 위에서 아래로 당기면 새로고침
  const scrollerRef=useRef<HTMLDivElement>(null);
  const [pull,setPull]=useState(0);
  const [refreshing,setRefreshing]=useState(false);
  const pullStart=useRef<{y:number;x:number}|null>(null);
  const PULL_AT=80;
  const pullHandlers={
    onTouchStart:(e:React.TouchEvent)=>{
      const t=e.touches[0];
      pullStart.current=(scrollerRef.current?.scrollTop||0)<=0&&!showPanel?{y:t.clientY,x:t.clientX}:null;
    },
    onTouchMove:(e:React.TouchEvent)=>{
      const s0=pullStart.current; if(!s0||refreshing) return;
      const t=e.touches[0], dy=t.clientY-s0.y, dx=t.clientX-s0.x;
      if(dy<=0||Math.abs(dx)>dy*0.7||(scrollerRef.current?.scrollTop||0)>0){ if(pull) setPull(0); return; }
      setPull(Math.min(dy*0.5,110));
    },
    onTouchEnd:()=>{
      const was=pull; pullStart.current=null;
      if(was>=PULL_AT*0.5&&!refreshing){ setRefreshing(true); setPull(48); setTimeout(()=>window.location.reload(),250); }
      else setPull(0);
    },
  };

  // 모바일: 좌우로 밀어서 칸반 ↔ 만다라트 ↔ 플래닝 ↔ 식단·운동 ↔ 일본어 전환
  const VIEW_ORDER:ViewId[]=["kanban","mandala","planning","nutrition","japanese"];
  const swipeStart=useRef<{x:number;y:number;ok:boolean}|null>(null);
  const viewSwipe={
    onTouchStart:(e:React.TouchEvent)=>{
      const el=e.target as HTMLElement;
      let ok=!el.closest("[data-card],input,textarea,select,[data-noswipe],[data-prog]");
      // 가로로 스크롤되는 영역 안에서 시작한 제스처는 화면 전환에서 제외
      for(let n:HTMLElement|null=el;ok&&n&&n!==e.currentTarget;n=n.parentElement){
        if(n.scrollWidth>n.clientWidth+4&&/(auto|scroll)/.test(getComputedStyle(n).overflowX)) ok=false;
      }
      const t=e.touches[0]; swipeStart.current={x:t.clientX,y:t.clientY,ok};
    },
    onTouchEnd:(e:React.TouchEvent)=>{
      const s0=swipeStart.current; swipeStart.current=null;
      if(!s0||!s0.ok) return;
      const t=e.changedTouches[0], mx=t.clientX-s0.x, my=t.clientY-s0.y;
      if(Math.abs(mx)<70||Math.abs(mx)<Math.abs(my)*1.6) return;
      const i=VIEW_ORDER.indexOf(view);
      const n=mx<0?i+1:i-1;
      if(n<0||n>=VIEW_ORDER.length) return;
      setQuickStatus(null); setView(VIEW_ORDER[n]);
      window.scrollTo({top:0});
    },
  };
  const toggleKanbanNav=()=>{
    setKanbanOpen(o=>{ const n=!o; localStorage.setItem("kanban_nav_open",JSON.stringify(n)); return n; });
  };

  // ── 키보드 단축키 ──
  const kb=useRef<{[k:string]:any}>({});
  kb.current={showPanel,showHelp,showCleanup,view,orderedItems,selectedKey,toast,
    openNewCard,openQuick,deleteCard,openCard,setCatFilter,setView,setSelectedKey,setShowHelp,setShowPanel,setShowCleanup};
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      const k=kb.current;
      // ESC: 열려 있는 창을 닫고 원래 화면으로 (입력창에 포커스가 있어도 동작)
      if(e.key==="Escape"){
        if(k.showHelp){k.setShowHelp(false);return;}
        if(k.showCleanup){k.setShowCleanup(false);return;}
        if(k.showPanel){e.preventDefault();k.setShowPanel(false);return;}
      }
      const t=e.target as HTMLElement;
      if(t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement||t.isContentEditable) return;
      if(k.showPanel||k.showCleanup||k.view==="nutrition"||k.view==="japanese") return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){
        if(k.toast?.undo){e.preventDefault();k.toast.undo();}
        return;
      }
      if(e.ctrlKey||e.metaKey||e.altKey) return;
      if(k.showHelp){ if(e.key==="?"){e.preventDefault();k.setShowHelp(false);} return; }
      const list:Item[]=k.orderedItems;
      const idx=list.findIndex(i=>itemKey(i)===k.selectedKey);
      switch(e.key){
        case "+": case "=": e.preventDefault(); k.openQuick(); return;
        case "?": e.preventDefault(); k.setShowHelp(true); return;
        case "Escape": k.setSelectedKey(null); return;
        case "1": k.setView("kanban"); k.setCatFilter("all"); return;
        case "2": k.setView("kanban"); k.setCatFilter("company"); return;
        case "3": k.setView("kanban"); k.setCatFilter("biz"); return;
        case "4": k.setView("kanban"); k.setCatFilter("personal"); return;
      }
      if(e.code==="NumpadAdd"){e.preventDefault();k.openQuick();return;}
      if(k.view!=="kanban"||!list.length) return;
      if(["ArrowDown","ArrowRight","j","J"].includes(e.key)){
        e.preventDefault(); k.setSelectedKey(itemKey(list[Math.min(list.length-1,idx+1)]));
      } else if(["ArrowUp","ArrowLeft","k","K"].includes(e.key)){
        e.preventDefault(); k.setSelectedKey(itemKey(list[Math.max(0,idx<0?0:idx-1)]));
      } else if(e.key==="Enter"&&idx>=0){
        e.preventDefault(); k.openCard(list[idx].card,list[idx].boardId);
      } else if(e.key==="Delete"&&idx>=0){
        e.preventDefault(); if(e.repeat) return; k.deleteCard(list[idx].card.id,list[idx].boardId);
      }
    };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[]);

  useEffect(()=>{
    if(!selectedKey) return;
    document.querySelector(`[data-key="${selectedKey}"]`)?.scrollIntoView({block:"nearest"});
  },[selectedKey]);

  const syncLabel=sync.state==="error"?"동기화 실패":sync.state==="syncing"?"동기화 중…":`Drive 동기화 ${sync.at}`;
  const chipCls=(active:boolean)=>active?"btn-dark":"btn-light";
  const chipBase:React.CSSProperties={padding:"4px 13px",borderRadius:999,fontSize:11.5,fontWeight:600,whiteSpace:"nowrap"};

  const navItem=(active:boolean,indent=false):React.CSSProperties=>({
    padding:"6px 10px",paddingLeft:indent?26:10,borderRadius:8,marginBottom:2,fontSize:12,fontWeight:active?700:500,
    cursor:"pointer",display:"flex",alignItems:"center",gap:7,width:"100%",textAlign:"left",
    color:active?"#fff":"#52525b",
    background:active?"#18181b":"transparent",
  });

  return (
    <>
      <style>{STYLE}</style>

      {/* ── Top nav ── */}
      <div className="metal-nav" style={{
        height:48,display:"flex",alignItems:"center",padding:"0 16px",gap:10,
        position:"sticky",top:0,zIndex:100,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <div className="logo-chrome" style={{width:24,height:24,borderRadius:7,
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{fontSize:12,fontWeight:800,color:"#fff",letterSpacing:"-0.02em"}}>K</span>
          </div>
          <span className="brand-text" style={{fontWeight:800,fontSize:15,letterSpacing:"-0.02em"}}>Kanban</span>
        </div>

        {!isMobile
          ? <span style={{fontSize:11,fontStyle:"italic",color:"#8a8d96",fontWeight:300,
              whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1,minWidth:0,letterSpacing:"0.01em"}}>
              Manifesting aura; making the intangible tangible.
            </span>
          : <div style={{flex:1}}/>}

        <span title="구글 드라이브(Sheets)에 자동 저장·동기화" style={{fontSize:10.5,flexShrink:0,
          color:sync.state==="error"?"#18181b":"#8a8d96",fontWeight:sync.state==="error"?700:400,
          display:"flex",alignItems:"center",gap:5,cursor:sync.state==="error"?"pointer":"default"}}
          onClick={()=>{if(sync.state==="error")loadAll();}}>
          <span style={{width:6,height:6,borderRadius:"50%",display:"inline-block",
            background:sync.state==="ok"?"#18181b":sync.state==="syncing"?"#a1a1aa":"transparent",
            border:sync.state==="error"?"1.5px solid #18181b":"none"}}/>
          {isMobile?"":syncLabel}{sync.state==="error"&&" (다시 시도)"}
        </span>

        <button onClick={()=>setShowHelp(true)} title="키보드 단축키 (?)" className="btn-light"
          style={{width:28,height:28,borderRadius:8,fontSize:13,fontWeight:700,flexShrink:0}}>?</button>
        <button onClick={()=>openQuick()} title="새 카드 추가 (+)" className="btn-dark"
          style={{width:28,height:28,borderRadius:8,fontSize:18,fontWeight:300,lineHeight:1,flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
      </div>

      {/* ── Main layout ── */}
      <div style={{display:"flex",height:"calc(100vh - 48px)",overflow:"hidden"}}>

        {!isMobile&&(
          <div className="metal-side" style={{width:SIDEBAR_W,flexShrink:0,padding:"16px 12px",overflowY:"auto"}}>
            <MiniCalendar cards={allCards} onDayClick={d=>openNew("todo","work",{dueDate:d,category:"company",priority:"normal"})}/>
            <div style={{height:1,background:"#c4c7ce",margin:"16px 0"}}/>
            <div style={{fontSize:10,fontWeight:700,color:"#8a8d96",letterSpacing:"0.1em",textTransform:"uppercase",margin:"0 4px 8px"}}>보드</div>

            {/* 칸반보드 — 누르면 접힘/펼침 */}
            <button style={navItem(view==="kanban"&&!kanbanOpen)}
              onClick={()=>{ if(view!=="kanban"){setView("kanban");} toggleKanbanNav(); }}>
              <span style={{fontSize:9,transform:kanbanOpen?"rotate(0)":"rotate(-90deg)",transition:"transform .15s",display:"inline-block"}}>▾</span>
              칸반보드
            </button>
            {kanbanOpen&&CAT_FILTERS.map(f=>{
              const active=view==="kanban"&&catFilter===f.id;
              return (
                <button key={f.id} style={navItem(active,true)} onClick={()=>goKanban(f.id)}>
                  {f.ko}
                  <span style={{marginLeft:"auto",fontSize:10,opacity:.7}}>{countOf(f.id)}</span>
                </button>
              );
            })}
            <button style={navItem(view==="mandala")} onClick={()=>setView("mandala")}>
              <span style={{width:9}}/>만다라트
            </button>
            <button style={navItem(view==="nutrition")} onClick={()=>setView("nutrition")}><span style={{width:9}}/>식단·운동</button>
            <button style={navItem(view==="japanese")} onClick={()=>setView("japanese")}><span style={{width:9}}/>일본어</button>
            <button style={navItem(view==="planning")} onClick={()=>setView("planning")}>
              <span style={{width:9}}/>플래닝
            </button>

            <div style={{height:1,background:"#c4c7ce",margin:"14px 0 10px"}}/>
            <div style={{fontSize:11,color:"#8a8d96",margin:"0 4px"}}>총 {allCards.length}개 카드</div>
            <button onClick={()=>setShowCleanup(true)}
              style={{margin:"10px 4px 0",fontSize:10.5,color:"#8a8d96",textDecoration:"underline"}}>개인 카드 정리…</button>
          </div>
        )}

        <div ref={scrollerRef} style={{flex:1,minWidth:0,overflowY:"auto",display:"flex",flexDirection:"column",
          overscrollBehaviorY:"contain",position:"relative"}}
          {...(isMobile?pullHandlers:{})}>
          {isMobile&&(pull>0||refreshing)&&(
            <div style={{position:"fixed",top:52,left:0,right:0,zIndex:60,display:"flex",justifyContent:"center",pointerEvents:"none",
              transform:`translateY(${Math.min(pull,60)-30}px)`,opacity:Math.min(1,pull/40)}}>
              <div style={{background:"#18181b",color:"#fff",fontSize:11.5,fontWeight:600,padding:"6px 14px",borderRadius:999,
                boxShadow:"0 4px 14px rgba(0,0,0,.25)"}}>
                {refreshing?"새로고침 중…":pull>=PULL_AT*0.5?"↑ 놓으면 새로고침":"↓ 당겨서 새로고침"}
              </div>
            </div>
          )}
          {/* Toolbar */}
          <div style={{position:"sticky",top:0,zIndex:20,background:"rgba(241,242,244,.9)",backdropFilter:"blur(8px)",
            padding:isMobile?"10px 8px 8px":"14px 18px 10px",display:"flex",flexDirection:"column",gap:8}}>
            {isMobile&&(
              <div style={{display:"inline-flex",alignSelf:"flex-start",background:"#fff",border:"1px solid #18181b",borderRadius:999,padding:2}}>
                {([["kanban","칸반"],["mandala","만다라트"],["planning","플래닝"],["nutrition","식단·운동"],["japanese","일본어"]] as const).map(([id,ko])=>(
                  <button key={id} onClick={()=>{ setView(id); if(id==="kanban") setQuickStatus(null); }} className={view===id?"btn-dark":""}
                    style={{padding:"4px 14px",borderRadius:999,fontSize:11.5,fontWeight:600,color:view===id?"#fff":"#52525b"}}>{ko}</button>
                ))}
              </div>
            )}
            {view==="kanban"&&(
              <>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                  {CAT_FILTERS.map(f=>(
                    <button key={f.id} className={chipCls(catFilter===f.id)} style={chipBase}
                      onClick={()=>setCatFilter(f.id)}>{f.ko}</button>
                  ))}
                  {isMobile&&<button onClick={()=>setShowCleanup(true)} style={{marginLeft:"auto",fontSize:10.5,color:"#8a8d96",textDecoration:"underline"}}>개인 정리</button>}
                </div>
                {allTags.length>0&&(
                  <div style={{display:"flex",gap:5,overflowX:"auto",scrollbarWidth:"none"}}>
                    {allTags.map(t=>(
                      <button key={t} className={chipCls(activeTagFilter===t)}
                        style={{...chipBase,padding:"2px 10px",fontSize:10.5}}
                        onClick={()=>setActiveTagFilter(activeTagFilter===t?null:t)}>#{t}</button>
                    ))}
                  </div>
                )}
              </>
            )}
            {view!=="kanban"&&!isMobile&&(
              <div style={{fontSize:13,fontWeight:800,letterSpacing:"0.06em",color:"#18181b"}}>
                {view==="nutrition"?"식단·운동":view==="japanese"?"일본어":view==="mandala"?"만다라트":"플래닝"}
              </div>
            )}
          </div>

          <div style={{flex:1,padding:isMobile?"2px 8px 70px":"4px 18px 56px"}}
            {...(isMobile?viewSwipe:{})}>
            {isMobile&&view==="kanban"&&(
              <div style={{fontSize:10.5,color:"#a1a1aa",padding:"0 2px 8px",lineHeight:1.5}}>
                ← → 화면을 밀면 칸반·만다라트·플래닝·식단·일본어 이동 · 카드를 왼쪽으로 밀면 삭제 · + 로 빠른 추가
              </div>
            )}
            {view==="nutrition" ? <NutritionDashboard/> : view==="japanese" ? <JapaneseDashboard/> : loading
              ? <div style={{textAlign:"center",color:"var(--text-light)",paddingTop:60,fontSize:13}}>불러오는 중…</div>
              : view==="kanban"
              ? <KanbanView items={items} selectedKey={selectedKey} onSelect={setSelectedKey}
                  onOpen={it=>openCard(it.card,it.boardId)}
                  onProgressChange={handleProgressChange}
                  onMove={handleMove} onAdd={s=>openQuick(s)} isMobile={isMobile}
                  onCardDelete={it=>deleteCard(it.card.id,it.boardId)}
                  quickStatus={quickStatus}
                  quickLabel={`${CAT_FILTERS.find(f=>f.id===catFilter)?.ko==="전체"?"회사":CAT_FILTERS.find(f=>f.id===catFilter)?.ko}에 추가`}
                  onQuickAdd={handleQuickAdd} onQuickClose={()=>setQuickStatus(null)}/>
              : view==="mandala"
              ? <MandalaView/>
              : <PlanningView onAddTasks={addPlanTasks} isMobile={isMobile}/>
            }
          </div>
        </div>
      </div>

      {/* 하단 단축키 힌트 (데스크톱) */}
      {!isMobile&&!showPanel&&!dragging&&view==="kanban"&&(
        <div style={{position:"fixed",left:SIDEBAR_W,right:0,bottom:0,zIndex:90,padding:"7px 18px",
          background:"rgba(255,255,255,.92)",backdropFilter:"blur(8px)",borderTop:"1px solid #e1e3e8",
          fontSize:10.5,color:"#71717a",display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"}}>
          <span><span className="kbd">+</span> 추가</span>
          <span><span className="kbd">↑</span><span className="kbd" style={{marginLeft:2}}>↓</span> 선택</span>
          <span><span className="kbd">Enter</span> 편집</span>
          <span><span className="kbd">Delete</span> 삭제 (카드를 맨 아래로 끌어도 삭제)</span>
          <span><span className="kbd">Tab</span> 다음 항목</span>
          <span><span className="kbd">Esc</span> 닫기</span>
          <span><span className="kbd">?</span> 전체 단축키</span>
        </div>
      )}

      {/* 드래그 삭제 영역 — 화면 아래 1/3, 붉은 음영 */}
      {dragging&&trashOver&&(
        <div className="delete-zone"
          style={{["--dz-left" as any]:isMobile?"0px":`${SIDEBAR_W}px`}}
          onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="move";}}
          onDrop={handleTrashDrop}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v7M14 10v7"/>
          </svg>
          <span>여기에 놓으면 삭제돼요</span>
        </div>
      )}

      {toast&&(
        <div style={{position:"fixed",left:"50%",bottom:isMobile?18:48,transform:"translateX(-50%)",zIndex:450,
          background:"#18181b",color:"#fff",borderRadius:999,padding:"9px 18px",fontSize:12,
          display:"flex",alignItems:"center",gap:14,boxShadow:"0 6px 20px rgba(0,0,0,.2)",maxWidth:"92vw"}}>
          <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{toast.msg}</span>
          {toast.undo&&<button onClick={toast.undo} style={{color:"#fff",fontWeight:700,textDecoration:"underline",fontSize:12}}>되돌리기</button>}
        </div>
      )}

      {showHelp&&<HelpOverlay onClose={()=>setShowHelp(false)}/>}
      {showCleanup&&<CleanupModal cards={boards.personal||[]} onClose={()=>setShowCleanup(false)} onDelete={cleanupDelete}/>}

      {showPanel&&(
        <SidePanel card={editCard} boardId={editBoardId}
          onClose={()=>setShowPanel(false)} onSave={handleSave}
          onDelete={id=>deleteCard(id,editBoardId)}
          allTags={allTags}/>
      )}
    </>
  );
}
