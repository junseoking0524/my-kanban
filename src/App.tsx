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
    --blue:     #2563eb;
    --blue-lt:  #dbeafe;
    --blue-mid: #3b82f6;
    /* Status */
    --green:  #16a34a;
    --orange: #ea580c;
    --purple: #7c3aed;
    --red:    #dc2626;
    --teal:   #0891b2;
    --yellow: #ca8a04;
    /* Semantic */
    --bg:        var(--n50);
    --surface:   var(--n0);
    --sidebar-bg:var(--n0);
    --col-bg:    var(--n100);
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
  @media (prefers-color-scheme: dark) {
    :root {
      --bg:        #0a0a0b;
      --surface:   #111113;
      --sidebar-bg:#111113;
      --col-bg:    #1c1c1f;
      --border:    #2a2a2e;
      --border-lt: #222226;
      --text:      #f4f4f5;
      --text-sub:  #a1a1aa;
      --text-light:#71717a;
      --blue:      #3b82f6;
      --blue-lt:   #1e3a5f;
    }
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
    background:var(--surface);
    border:1px solid var(--border-lt);
    border-radius:var(--radius-sm);
    padding:8px 10px;
    margin-bottom:4px;
    cursor:grab;
    user-select:none;
    transition:box-shadow .15s ease, transform .1s ease;
  }
  .kcard:hover { box-shadow:0 2px 12px rgba(0,0,0,.07), 0 1px 3px rgba(0,0,0,.05); border-color:var(--border); }
  .kcard.dragging { opacity:.35; transform:scale(.97); }
  .kcard.drag-over { border-top:2px solid var(--accent); }

  /* Inputs */
  .k-input {
    width:100%; border:1px solid var(--border); border-radius:var(--radius-sm);
    padding:7px 10px; font-size:12.5px; background:var(--surface); color:var(--text);
    outline:none; transition:border-color .15s, box-shadow .15s;
  }
  .k-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-lt); }
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
`;

// ── Column metadata ────────────────────────────────────────────────────────────
const COL_META: Record<string, { dot:string; progress:string }> = {
  todo:       { dot:"#a1a1aa", progress:"#6366f1" },
  inprogress: { dot:"#3b82f6", progress:"#3b82f6" },
  done:       { dot:"#16a34a", progress:"#16a34a" },
  check:      { dot:"#7c3aed", progress:"#7c3aed" },
  carry:      { dot:"#ea580c", progress:"#ea580c" },
  memo:       { dot:"#0891b2", progress:"#0891b2" },
};

const CAL_LABELS = [
  { id:"family",   ko:"가족",    color:"#dc2626" },
  { id:"junseok",  ko:"준석",    color:"#374151" },
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
};

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
function SidePanel({card,boardId,onClose,onSave,onDelete,allTags}:{
  card:Card|null; boardId:string;
  onClose:()=>void; onSave:(c:Card)=>void; onDelete:(id:string)=>void; allTags:string[];
}) {
  const [form,setForm] = useState<Card>(card||{id:"",colId:"",title:""});
  const [tagInput,setTagInput] = useState("");
  const titleRef = useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{setForm(card||{id:"",colId:"",title:""});setTagInput("");setTimeout(()=>titleRef.current?.focus(),80);},[card]);
  if(!card) return null;

  const isPersonal = boardId==="personal";
  const labels = isPersonal
    ? CAL_LABELS.filter(l=>PERSONAL_LABELS.includes(l.id))
    : CAL_LABELS.filter(l=>!PERSONAL_LABELS.includes(l.id));

  const addTag=()=>{
    const t=tagInput.trim().replace(/[,#]/g,"");
    if(!t) return;
    const cur=form.tags||[];
    if(!cur.includes(t)) setForm(f=>({...f,tags:[...cur,t]}));
    setTagInput("");
  };
  const removeTag=(t:string)=>setForm(f=>({...f,tags:(f.tags||[]).filter(x=>x!==t)}));

  const Field=({label,children}:{label:string;children:React.ReactNode})=>(
    <div>
      <div style={{fontSize:10,fontWeight:600,color:"var(--text-light)",letterSpacing:"0.07em",
        textTransform:"uppercase",marginBottom:5}}>{label}</div>
      {children}
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex"}} onKeyDown={e=>{if(e.key==="Escape")onClose();}}>
      <div onClick={onClose} style={{flex:1,background:"rgba(0,0,0,.3)",backdropFilter:"blur(2px)"}}/>
      <div style={{width:320,background:"var(--surface)",borderLeft:"1px solid var(--border)",
        display:"flex",flexDirection:"column",overflowY:"auto",boxShadow:"-8px 0 32px rgba(0,0,0,.1)"}}>
        <div style={{padding:"15px 18px 13px",borderBottom:"1px solid var(--border-lt)",
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:600,fontSize:13.5,letterSpacing:"-0.01em"}}>{form.id?"카드 편집":"새 카드"}</span>
          <button onClick={onClose} style={{fontSize:22,color:"var(--text-light)",lineHeight:1,width:28,height:28,
            display:"flex",alignItems:"center",justifyContent:"center",borderRadius:6}}>×</button>
        </div>
        <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:14,flex:1}}>
          <Field label="제목">
            <textarea ref={titleRef} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} rows={2}
              className="k-input" style={{resize:"vertical"}}/>
          </Field>
          <Field label="진행률">
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1}}>
                <CardProgressBar value={form.progress??0} onChange={v=>setForm(f=>({...f,progress:v}))}/>
              </div>
              <input type="number" min={0} max={100} value={form.progress??0}
                onChange={e=>setForm(f=>({...f,progress:Math.min(100,Math.max(0,Number(e.target.value)))}))}
                style={{width:46,border:"1px solid var(--border)",borderRadius:5,padding:"3px 5px",
                  fontSize:11,textAlign:"center",background:"var(--bg)",color:"var(--text)",outline:"none"}}/>
            </div>
          </Field>
          <Field label="메모">
            <textarea value={form.note||""} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={3}
              className="k-input" style={{resize:"vertical",fontSize:12}}/>
          </Field>
          <Field label="마감일">
            <input type="date" value={form.dueDate||""} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}
              className="k-input" style={{fontSize:12}}/>
          </Field>
          <Field label="라벨">
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {labels.map(l=>(
                <button key={l.id} onClick={()=>setForm(f=>({...f,labelId:f.labelId===l.id?undefined:l.id}))}
                  style={{padding:"4px 11px",borderRadius:6,border:`1.5px solid ${l.color}`,
                    background:form.labelId===l.id?l.color:"transparent",
                    color:form.labelId===l.id?"#fff":l.color,fontSize:11,fontWeight:600,
                    transition:"background .12s, color .12s"}}>
                  {l.ko}
                </button>
              ))}
            </div>
          </Field>
          <Field label="태그">
            <div style={{display:"flex",gap:5,marginBottom:5}}>
              <input value={tagInput} onChange={e=>setTagInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"||e.key===","){ e.preventDefault();addTag();}}}
                placeholder="입력 후 Enter" className="k-input" style={{fontSize:12}}/>
              <button onClick={addTag}
                style={{padding:"0 12px",background:"var(--n800)",color:"#fff",borderRadius:6,fontSize:12,fontWeight:600,flexShrink:0}}>+</button>
            </div>
            {allTags.filter(t=>!(form.tags||[]).includes(t)).slice(0,8).map(t=>(
              <span key={t} onClick={()=>setForm(f=>({...f,tags:[...(f.tags||[]),t]}))}
                style={{cursor:"pointer",fontSize:10,padding:"1px 7px",borderRadius:4,marginRight:3,marginBottom:3,display:"inline-block",
                  border:"1px dashed var(--border)",color:"var(--text-sub)"}}>+{t}</span>
            ))}
            <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:3}}>
              {(form.tags||[]).map(t=>(
                <span key={t} className="tag-pill">
                  {t}
                  <span onClick={()=>removeTag(t)} style={{cursor:"pointer",opacity:.5,marginLeft:2,fontSize:12,lineHeight:1}}>×</span>
                </span>
              ))}
            </div>
          </Field>
        </div>
        <div style={{padding:"12px 18px",borderTop:"1px solid var(--border-lt)",display:"flex",gap:6}}>
          <button onClick={()=>onSave(form)}
            style={{flex:1,padding:"8px",background:"var(--n900)",color:"#fff",borderRadius:7,
              fontWeight:600,fontSize:13,letterSpacing:"-0.01em"}}>저장</button>
          {form.id&&(
            <button onClick={()=>onDelete(form.id)}
              style={{padding:"8px 14px",background:"var(--red)",color:"#fff",borderRadius:7,fontWeight:600,fontSize:13}}>삭제</button>
          )}
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
  activeTagFilter,doneSearch,setDoneSearch}:{
  def:typeof BOARDS_DEF[0]; cards:Card[]; collapsed:boolean;
  onToggleCollapse:()=>void;
  onCardClick:(c:Card)=>void; onQuickAdd:(colId:string,title:string,boardId:string)=>void;
  onDrop:(targetColId:string,afterCardId:string|null,boardId:string)=>void;
  activeTagFilter:string|null; doneSearch:string; setDoneSearch:(s:string)=>void;
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
  const today=new Date().toISOString().slice(0,10);

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
                  background:"var(--col-bg)",
                  borderRadius:var_("--radius-md"),
                  padding:"9px 8px 7px",
                  border:`1.5px solid ${isOver?"var(--accent)":"transparent"}`,
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
                  const isDue=card.dueDate&&card.dueDate<today;
                  const isDueToday=card.dueDate===today;
                  const label=CAL_LABELS.find(l=>l.id===card.labelId);
                  const prog=card.progress??0;
                  const progColor=prog>=100?"#16a34a":prog>=50?"#3b82f6":"#6366f1";
                  return (
                    <div key={card.id}
                      className={`kcard${gDrag.cardId===card.id?" dragging":""}${dragOverCard===card.id?" drag-over":""}`}
                      draggable
                      onDragStart={e=>onDragStart(e,card)} onDragEnd={onDragEnd}
                      onDragOver={e=>onDragOver(e,col.id,card.id)} onDrop={e=>onDropH(e,col.id,card.id)}
                      onClick={()=>onCardClick(card)}
                      style={{position:"relative",overflow:"hidden"}}>
                      {/* Progress top bar (background track + colored fill) */}
                      {prog>0&&(
                        <>
                          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"var(--border-lt)"}}/>
                          <div style={{position:"absolute",top:0,left:0,width:`${prog}%`,height:3,
                            background:progColor,transition:"width .3s ease",
                            borderTopLeftRadius:5,borderTopRightRadius:prog>=100?5:0}}/>
                        </>
                      )}
                      {/* Label color stripe (below progress bar) */}
                      {label&&(
                        <div style={{height:2.5,borderRadius:2,background:label.color,
                          margin:`${prog>0?3:-8}px -10px 7px`,borderTopLeftRadius:5,borderTopRightRadius:5}}/>
                      )}
                      <div style={{display:"flex",alignItems:"flex-start",gap:6}}>
                        <span style={{flex:1,fontSize:12.5,color:"var(--text)",lineHeight:1.45,
                          wordBreak:"break-word",fontWeight:500}}>
                          {card.title}
                        </span>
                        {prog>0&&(
                          <span style={{fontSize:9.5,fontWeight:700,
                            color:prog>=100?"var(--green)":prog>=50?"var(--blue)":"var(--text-light)",
                            flexShrink:0,marginTop:1}}>{prog}%</span>
                        )}
                      </div>
                      {card.dueDate&&(
                        <div style={{marginTop:4,fontSize:10,
                          color:isDue?"var(--red)":isDueToday?"var(--orange)":"var(--text-light)",
                          fontWeight:(isDue||isDueToday)?600:400}}>
                          {card.dueDate}
                        </div>
                      )}
                      {(card.tags||[]).length>0&&(
                        <div style={{display:"flex",flexWrap:"wrap",gap:2,marginTop:5}}>
                          {(card.tags||[]).map(t=><span key={t} className="tag-pill">{t}</span>)}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Drop zone */}
                <div onDragOver={e=>onDragOver(e,col.id)} onDrop={e=>onDropH(e,col.id,null)}
                  style={{minHeight:10,borderRadius:4,background:isOver&&!dragOverCard?"rgba(37,99,235,.06)":"transparent"}}/>
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
// App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile();
  const [boards,setBoards] = useState<Record<string,Card[]>>({work:[],personal:[]});
  const [loading,setLoading] = useState(true);
  const [editCard,setEditCard] = useState<Card|null>(null);
  const [editBoardId,setEditBoardId] = useState("work");
  const [showPanel,setShowPanel] = useState(false);
  const [doneSearch,setDoneSearch] = useState("");
  const [activeTagFilter,setActiveTagFilter] = useState<string|null>(null);
  const [collapsedBoards,setCollapsedBoards] = useState<Record<string,boolean>>(()=>{
    try { return JSON.parse(localStorage.getItem("board_collapsed")||"{}"); } catch { return {}; }
  });
  const [collapsedMandala,setCollapsedMandala] = useState<boolean>(()=>{
    try { return JSON.parse(localStorage.getItem("mandala_collapsed")||"false"); } catch { return false; }
  });

  const toggleBoardCollapse=(id:string)=>{
    setCollapsedBoards(prev=>{
      const next={...prev,[id]:!prev[id]};
      localStorage.setItem("board_collapsed",JSON.stringify(next));
      return next;
    });
  };
  const toggleMandalaCollapse=()=>{
    setCollapsedMandala(prev=>{
      const next=!prev;
      localStorage.setItem("mandala_collapsed",JSON.stringify(next));
      return next;
    });
  };

  // Keyboard shortcut: + key
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement) return;
      if(e.key==="+"||e.key==="="&&e.shiftKey){
        e.preventDefault();
        setEditCard({id:"",colId:"todo",title:""});
        setEditBoardId("work");
        setShowPanel(true);
      }
    };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[]);

  useEffect(()=>{
    Promise.all([
      apiFetch("GET","work").catch(()=>({cards:[]})),
      apiFetch("GET","personal").catch(()=>({cards:[]})),
    ]).then(([w,p])=>{
      // cards API returns bare arrays sometimes
      const wCards = Array.isArray(w) ? w : (w.cards||[]);
      const pCards = Array.isArray(p) ? p : (p.cards||[]);
      setBoards({work:wCards,personal:pCards});
      setLoading(false);
    });
  },[]);

  const handleProgressChange=useCallback(async(cardId:string,boardId:string,v:number)=>{
    setBoards(prev=>{
      const updated=prev[boardId].map(c=>c.id===cardId?{...c,progress:v}:c);
      const card=updated.find(c=>c.id===cardId);
      if(card) apiFetch("PUT",boardId,card,cardId).catch(()=>{});
      return{...prev,[boardId]:updated};
    });
  },[]);

  const allTags=Array.from(new Set(Object.values(boards).flat().flatMap(c=>c.tags||[]))).sort();
  const allCards=Object.values(boards).flat();

  const openCard=(card:Card,boardId:string)=>{setEditCard(card);setEditBoardId(boardId);setShowPanel(true);};
  const openNew=(colId:string,boardId:string,extra?:Partial<Card>)=>{
    setEditCard({id:"",colId,title:"",...extra});setEditBoardId(boardId);setShowPanel(true);
  };

  const handleQuickAdd=async(colId:string,title:string,boardId:string)=>{
    const card:Card={id:"",colId,title};
    try{
      const res=await apiFetch("POST",boardId,card);
      const created=res.card||{...card,id:Date.now().toString()};
      setBoards(prev=>({...prev,[boardId]:[...prev[boardId],created]}));
    }catch(e){alert("저장 실패: "+e);}
  };

  const handleSave=async(card:Card)=>{
    try{
      if(card.id){
        const res=await apiFetch("PUT",editBoardId,card,card.id);
        const updated=res.card||card;
        setBoards(prev=>({...prev,[editBoardId]:prev[editBoardId].map(c=>c.id===card.id?updated:c)}));
      } else {
        const res=await apiFetch("POST",editBoardId,card);
        const created=res.card||{...card,id:Date.now().toString()};
        setBoards(prev=>({...prev,[editBoardId]:[...prev[editBoardId],created]}));
      }
      setShowPanel(false);
    }catch(e){alert("저장 실패: "+e);}
  };

  const handleDelete=async(cardId:string)=>{
    if(!confirm("삭제할까요?")) return;
    try{
      await apiFetch("DELETE",editBoardId,undefined,cardId);
      setBoards(prev=>({...prev,[editBoardId]:prev[editBoardId].filter(c=>c.id!==cardId)}));
      setShowPanel(false);
    }catch(e){alert("삭제 실패: "+e);}
  };

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
    try{await apiFetch("PUT",boardId,updatedCard,cardId);}catch(e){console.error(e);}
  };

  return (
    <>
      <style>{STYLE}</style>

      {/* ── Top nav ── */}
      <div style={{
        background:"var(--surface)",
        borderBottom:"1px solid var(--border-lt)",
        height:46,display:"flex",alignItems:"center",padding:"0 16px",gap:10,
        position:"sticky",top:0,zIndex:100,
      }}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <div style={{width:22,height:22,background:"var(--n900)",borderRadius:6,
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{fontSize:11.5,fontWeight:700,color:"#fff",letterSpacing:"-0.02em"}}>K</span>
          </div>
          <span style={{fontWeight:700,fontSize:14,letterSpacing:"-0.02em",color:"var(--text)"}}>Kanban</span>
        </div>

        {/* Slogan */}
        <span style={{fontSize:11,fontStyle:"italic",color:"var(--text-light)",fontWeight:300,
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1,minWidth:0,
          letterSpacing:"0.01em"}}>
          Manifesting aura; making the intangible tangible.
        </span>

        {/* Tag filters */}
        {allTags.length>0&&(
          <div style={{display:"flex",gap:2,overflowX:"auto",scrollbarWidth:"none",flexShrink:1,minWidth:0}}>
            <button className={`nav-btn${activeTagFilter===null?" active":""}`}
              onClick={()=>setActiveTagFilter(null)}>전체</button>
            {allTags.map(t=>(
              <button key={t} className={`nav-btn${activeTagFilter===t?" active":""}`}
                onClick={()=>setActiveTagFilter(activeTagFilter===t?null:t)}>#{t}</button>
            ))}
          </div>
        )}

        {/* + button */}
        <button onClick={()=>openNew("todo","work")}
          title="새 카드 추가 (+)"
          style={{
            width:28,height:28,borderRadius:7,background:"var(--n900)",color:"#fff",
            fontSize:18,fontWeight:300,lineHeight:1,flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>+</button>
      </div>

      {/* ── Main layout ── */}
      <div style={{display:"flex",height:"calc(100vh - 46px)",overflow:"hidden"}}>

        {/* Left sidebar */}
        {!isMobile&&(
          <div style={{
            width:214,flexShrink:0,
            borderRight:"1px solid var(--border-lt)",
            background:"var(--sidebar-bg)",
            padding:"16px 14px",
            overflowY:"auto",
          }}>
            <MiniCalendar cards={allCards} onDayClick={d=>openNew("todo","work",{dueDate:d})}/>
            <div style={{height:1,background:"var(--border-lt)",margin:"16px 0"}}/>
            <div style={{fontSize:10,fontWeight:600,color:"var(--text-light)",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:8}}>보드</div>
            {BOARDS_DEF.map(b=>(
              <div key={b.id}
                onClick={()=>toggleBoardCollapse(b.id)}
                style={{padding:"5px 8px",borderRadius:6,marginBottom:2,
                  fontSize:12,color:collapsedBoards[b.id]?"var(--text-light)":"var(--text-sub)",
                  cursor:"pointer",display:"flex",alignItems:"center",gap:6,
                  transition:"color .1s, background .1s"}}
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

        {/* Main area */}
        <div style={{flex:1,overflowY:"auto",padding:isMobile?"10px 8px":"16px 18px",display:"flex",flexDirection:"column",gap:18}}>
          {loading
            ? <div style={{textAlign:"center",color:"var(--text-light)",paddingTop:60,fontSize:13}}>불러오는 중…</div>
            : <>
                {BOARDS_DEF.map(def=>(
                  <Board key={def.id} def={def} cards={boards[def.id]||[]}
                    collapsed={!!collapsedBoards[def.id]}
                    onToggleCollapse={()=>toggleBoardCollapse(def.id)}
                    onCardClick={c=>openCard(c,def.id)}
                    onQuickAdd={handleQuickAdd}
                    onDrop={handleDrop}
                    activeTagFilter={activeTagFilter}
                    doneSearch={doneSearch} setDoneSearch={setDoneSearch}/>
                ))}
                {/* Mandala section — hidden when personal board is collapsed */}
                {!collapsedBoards["personal"]&&(
                  <>
                    <div style={{height:1,background:"var(--border-lt)",margin:"2px 0"}}/>
                    {/* Mandala header with its own collapse toggle */}
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
                    <div style={{height:20}}/>
                  </>
                )}
              </>
          }
        </div>
      </div>

      {/* SidePanel */}
      {showPanel&&(
        <SidePanel card={editCard} boardId={editBoardId}
          onClose={()=>setShowPanel(false)} onSave={handleSave} onDelete={handleDelete}
          allTags={allTags}/>
      )}
    </>
  );
}
