import { useState, useEffect, useRef, useCallback } from "react";

// ── Apple key color palette (B&W + Gray + Blue accent) ───────────────────────
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Nanum+Barun+Gothic:wght@400;700&display=swap');

  :root {
    --font: 'Nanum Barun Gothic', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
    /* Apple grayscale */
    --c-black:   #000000;
    --c-gray6:   #1c1c1e;
    --c-gray5:   #3a3a3c;
    --c-gray4:   #636366;
    --c-gray3:   #8e8e93;
    --c-gray2:   #c7c7cc;
    --c-gray1:   #e5e5ea;
    --c-gray0:   #f2f2f7;
    --c-white:   #ffffff;
    /* Apple blue */
    --c-blue:    #007aff;
    --c-blue-lt: #e8f1ff;
    /* Semantic */
    --bg:        var(--c-gray0);
    --nav-bg:    var(--c-white);
    --sidebar-bg:var(--c-white);
    --col-bg:    var(--c-gray1);
    --card-bg:   var(--c-white);
    --text:      var(--c-gray6);
    --text-sub:  var(--c-gray4);
    --text-light:var(--c-gray3);
    --border:    var(--c-gray2);
    --border-lt: var(--c-gray1);
    --accent:    var(--c-blue);
    --accent-lt: var(--c-blue-lt);
    --danger:    #ff3b30;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg:        #000000;
      --nav-bg:    #1c1c1e;
      --sidebar-bg:#1c1c1e;
      --col-bg:    #2c2c2e;
      --card-bg:   #3a3a3c;
      --text:      #ffffff;
      --text-sub:  #ebebf5cc;
      --text-light:#ebebf599;
      --border:    #3a3a3c;
      --border-lt: #2c2c2e;
      --accent:    #0a84ff;
      --accent-lt: #0a84ff22;
      --danger:    #ff453a;
    }
  }

  *, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin:0; padding:0; height:100%; font-family:var(--font); font-size:13px; background:var(--bg); color:var(--text); }
  input, textarea, button, select { font-family:var(--font); }
  button { cursor:pointer; border:none; background:none; }

  /* Scrollbar */
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }

  /* Card */
  .kcard {
    background: var(--card-bg);
    border: 1px solid var(--border-lt);
    border-radius: 6px;
    padding: 7px 10px;
    margin-bottom: 3px;
    cursor: grab;
    user-select: none;
    transition: box-shadow 0.12s, transform 0.10s;
  }
  .kcard:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .kcard:active { cursor: grabbing; }
  .kcard.dragging { opacity:0.4; transform:scale(0.98); }
  .kcard.drag-over { border-top: 2px solid var(--accent); }

  /* Inline quick-add input */
  .quick-input {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 12px;
    background: var(--card-bg);
    color: var(--text);
    outline: none;
    margin-top: 3px;
  }
  .quick-input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-lt); }

  /* Nav link btn */
  .nav-btn {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-sub);
    transition: background 0.1s, color 0.1s;
  }
  .nav-btn:hover { background: var(--col-bg); color: var(--text); }
  .nav-btn.active { background: var(--accent); color: #fff; }

  /* Tag pill */
  .tag-pill {
    display: inline-flex; align-items: center; gap: 2px;
    background: var(--col-bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 0 5px;
    font-size: 10px;
    font-weight: 700;
    color: var(--text-sub);
    white-space: nowrap;
    line-height: 16px;
  }
`;

// ── Column accent colors (subtle, monochrome-friendly) ───────────────────────
const COL_META: Record<string, { dot:string }> = {
  todo:       { dot:"#8e8e93" },
  inprogress: { dot:"#007aff" },
  done:       { dot:"#34c759" },
  check:      { dot:"#5856d6" },
  carry:      { dot:"#ff9500" },
  done2:      { dot:"#30d158" },
};

// ── Progress bar colors (Apple system) ───────────────────────────────────────
const PROG_COLORS: Record<string, string> = {
  todo:"#c7c7cc", inprogress:"#007aff", done:"#34c759",
  check:"#5856d6", carry:"#ff9500", done2:"#30d158",
};

const CAL_LABELS = [
  { id:"family",   ko:"가족",    color:"#ff3b30" },
  { id:"junseok",  ko:"준석",    color:"#48484a" },
  { id:"default",  ko:"기본",    color:"#ff9500" },
  { id:"business", ko:"대상업무", color:"#007aff" },
  { id:"noupdate", ko:"미분류",  color:"#636366" },
];
const PERSONAL_LABELS = ["family","default","noupdate"];

const BOARDS_DEF = [
  { id:"work", title:"업무 칸반보드",
    cols:[
      { id:"todo",       ko:"할 일"  },
      { id:"inprogress", ko:"진행 중" },
      { id:"done",       ko:"완료"   },
    ]},
  { id:"personal", title:"개인 주요사항",
    cols:[
      { id:"check", ko:"확인"   },
      { id:"carry", ko:"챙길 것" },
      { id:"done2", ko:"루틴"   },
    ]},
];

const HOLIDAYS: Record<string,string> = {
  "01-01":"신정","03-01":"삼일절","05-05":"어린이날","06-06":"현충일",
  "08-15":"광복절","10-03":"개천절","10-09":"한글날","12-25":"크리스마스",
};

type Card = {
  id:string; colId:string; title:string; note?:string;
  dueDate?:string; labelId?:string; calEventId?:string; tags?:string[];
};

let gDrag: { cardId:string|null; boardId:string|null; card:Card|null } =
  { cardId:null, boardId:null, card:null };

function apiFetch(method:string, boardId:string, body?:any, cardId?:string) {
  const url = cardId ? `/api/cards?boardId=${boardId}&id=${cardId}` : `/api/cards?boardId=${boardId}`;
  return fetch(url, {
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
// ProgressBar
// ─────────────────────────────────────────────────────────────────────────────
function ProgressBar({ cards, cols }:{cards:Card[];cols:{id:string;ko:string}[]}) {
  const counts = cols.map(c=>({...c, n:cards.filter(k=>k.colId===c.id).length}));
  const total = counts.reduce((s,c)=>s+c.n,0);
  if (!total) return null;
  return (
    <div style={{display:"flex",height:4,borderRadius:2,overflow:"hidden",gap:1}}>
      {counts.map(c=>{
        const pct=(c.n/total)*100;
        if(!pct) return null;
        return <div key={c.id} title={`${c.ko}: ${c.n}`}
          style={{flex:pct, background:PROG_COLORS[c.id]||"#c7c7cc", minWidth:2}} />;
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MiniCalendar (left sidebar, full month)
// ─────────────────────────────────────────────────────────────────────────────
function MiniCalendar({cards, onDayClick}:{cards:Card[];onDayClick:(d:string)=>void}) {
  const [view,setView] = useState(()=>{const d=new Date();return{y:d.getFullYear(),m:d.getMonth()};});
  const today = new Date();
  const toKey=(y:number,m:number,d:number)=>`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const dueDays = new Set(cards.filter(c=>c.dueDate).map(c=>c.dueDate!.slice(0,10)));
  const firstDay = new Date(view.y,view.m,1).getDay();
  const daysInMonth = new Date(view.y,view.m+1,0).getDate();
  const cells:(number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  while(cells.length%7!==0) cells.push(null);
  const WK=["일","월","화","수","목","금","토"];
  const todayKey=toKey(today.getFullYear(),today.getMonth(),today.getDate());

  return (
    <div style={{width:200,flexShrink:0}}>
      {/* month nav */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <button onClick={()=>setView(v=>v.m===0?{y:v.y-1,m:11}:{y:v.y,m:v.m-1})}
          style={{fontSize:16,color:"var(--text-sub)",padding:"2px 6px",borderRadius:4}}>‹</button>
        <span style={{fontSize:12,fontWeight:700,color:"var(--text)"}}>
          {view.y}.{String(view.m+1).padStart(2,"0")}
        </span>
        <button onClick={()=>setView(v=>v.m===11?{y:v.y+1,m:0}:{y:v.y,m:v.m+1})}
          style={{fontSize:16,color:"var(--text-sub)",padding:"2px 6px",borderRadius:4}}>›</button>
      </div>
      {/* grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"2px 0",textAlign:"center"}}>
        {WK.map((d,i)=>(
          <div key={d} style={{fontSize:10,fontWeight:700,paddingBottom:4,
            color:i===0?"var(--danger)":i===6?"var(--accent)":"var(--text-light)"}}>
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
          const isSun=dow===0,isSat=dow===6,isHol=!!HOLIDAYS[mmdd];
          return (
            <div key={i} onClick={()=>onDayClick(key)}
              title={isHol?HOLIDAYS[mmdd]:undefined}
              style={{
                position:"relative", cursor:"pointer", borderRadius:4,
                padding:"3px 0", fontSize:11,
                background:isToday?"var(--accent)":"transparent",
                color:isToday?"#fff":(isHol||isSun)?"var(--danger)":isSat?"var(--accent)":"var(--text)",
                fontWeight:isToday?700:400,
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
// SidePanel (right drawer)
// ─────────────────────────────────────────────────────────────────────────────
function SidePanel({card,boardId,onClose,onSave,onDelete,allTags}:{
  card:Card|null;boardId:string;
  onClose:()=>void;onSave:(c:Card)=>void;onDelete:(id:string)=>void;allTags:string[];
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
  const handleKey=(e:React.KeyboardEvent)=>{if(e.key==="Escape") onClose();};

  return (
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex"}} onKeyDown={handleKey}>
      <div onClick={onClose} style={{flex:1,background:"rgba(0,0,0,0.25)"}}/>
      <div style={{width:320,background:"var(--sidebar-bg)",borderLeft:"1px solid var(--border)",
        display:"flex",flexDirection:"column",overflowY:"auto",boxShadow:"-4px 0 20px rgba(0,0,0,0.08)"}}>
        {/* Header */}
        <div style={{padding:"14px 16px 12px",borderBottom:"1px solid var(--border-lt)",
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:700,fontSize:14}}>{form.id?"카드 편집":"새 카드"}</span>
          <button onClick={onClose} style={{fontSize:20,color:"var(--text-light)",lineHeight:1,padding:2}}>×</button>
        </div>
        {/* Body */}
        <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:12,flex:1}}>
          {/* Title */}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"var(--text-sub)",display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.04em"}}>제목</label>
            <textarea ref={titleRef} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} rows={2}
              style={{width:"100%",border:"1px solid var(--border)",borderRadius:6,padding:"7px 9px",
                background:"var(--bg)",color:"var(--text)",fontSize:13,resize:"vertical",outline:"none"}}
              onFocus={e=>e.target.style.borderColor="var(--accent)"}
              onBlur={e=>e.target.style.borderColor="var(--border)"} />
          </div>
          {/* Note */}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"var(--text-sub)",display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.04em"}}>메모</label>
            <textarea value={form.note||""} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={3}
              style={{width:"100%",border:"1px solid var(--border)",borderRadius:6,padding:"7px 9px",
                background:"var(--bg)",color:"var(--text)",fontSize:12,resize:"vertical",outline:"none"}}
              onFocus={e=>e.target.style.borderColor="var(--accent)"}
              onBlur={e=>e.target.style.borderColor="var(--border)"} />
          </div>
          {/* Due */}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"var(--text-sub)",display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.04em"}}>마감일</label>
            <input type="date" value={form.dueDate||""} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}
              style={{width:"100%",border:"1px solid var(--border)",borderRadius:6,padding:"6px 9px",
                background:"var(--bg)",color:"var(--text)",fontSize:12,outline:"none"}} />
          </div>
          {/* Label */}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"var(--text-sub)",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.04em"}}>라벨</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {labels.map(l=>(
                <button key={l.id} onClick={()=>setForm(f=>({...f,labelId:f.labelId===l.id?undefined:l.id}))}
                  style={{padding:"3px 10px",borderRadius:5,border:`1.5px solid ${l.color}`,
                    background:form.labelId===l.id?l.color:"transparent",
                    color:form.labelId===l.id?"#fff":l.color,fontSize:11,fontWeight:700}}>
                  {l.ko}
                </button>
              ))}
            </div>
          </div>
          {/* Tags */}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"var(--text-sub)",display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.04em"}}>태그</label>
            <div style={{display:"flex",gap:5,marginBottom:5}}>
              <input value={tagInput} onChange={e=>setTagInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"||e.key===","){ e.preventDefault();addTag();}}}
                placeholder="입력 후 Enter"
                style={{flex:1,border:"1px solid var(--border)",borderRadius:6,padding:"5px 8px",
                  background:"var(--bg)",color:"var(--text)",fontSize:12,outline:"none"}} />
              <button onClick={addTag}
                style={{padding:"5px 12px",background:"var(--c-gray6)",color:"#fff",borderRadius:6,fontSize:11,fontWeight:700}}>+</button>
            </div>
            {allTags.filter(t=>!(form.tags||[]).includes(t)).length>0&&(
              <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:6}}>
                {allTags.filter(t=>!(form.tags||[]).includes(t)).slice(0,10).map(t=>(
                  <span key={t} onClick={()=>setForm(f=>({...f,tags:[...(f.tags||[]),t]}))}
                    style={{cursor:"pointer",fontSize:10,padding:"1px 6px",borderRadius:4,
                      border:"1px dashed var(--border)",color:"var(--text-sub)"}}>+{t}</span>
                ))}
              </div>
            )}
            <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
              {(form.tags||[]).map(t=>(
                <span key={t} className="tag-pill">
                  {t}
                  <span onClick={()=>removeTag(t)} style={{cursor:"pointer",opacity:0.5,marginLeft:2,fontSize:12,lineHeight:1}}>×</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{padding:"12px 16px",borderTop:"1px solid var(--border-lt)",display:"flex",gap:6}}>
          <button onClick={()=>onSave(form)}
            style={{flex:1,padding:"8px",background:"var(--c-black)",color:"#fff",borderRadius:6,fontWeight:700,fontSize:13}}>
            저장
          </button>
          {form.id&&(
            <button onClick={()=>onDelete(form.id)}
              style={{padding:"8px 14px",background:"var(--danger)",color:"#fff",borderRadius:6,fontWeight:700,fontSize:13}}>
              삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuickAdd — inline input in column
// ─────────────────────────────────────────────────────────────────────────────
function QuickAdd({colId,boardId,onAdd,onCancel}:{colId:string;boardId:string;onAdd:(title:string)=>void;onCancel:()=>void}) {
  const [val,setVal] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(()=>ref.current?.focus(),[]);
  return (
    <div style={{marginTop:3}}>
      <input ref={ref} value={val} onChange={e=>setVal(e.target.value)}
        placeholder="카드 제목..."
        className="quick-input"
        onKeyDown={e=>{
          if(e.key==="Enter"){ e.preventDefault(); if(val.trim()) onAdd(val.trim()); }
          if(e.key==="Escape"){ onCancel(); }
        }} />
      <div style={{display:"flex",gap:4,marginTop:4}}>
        <button onClick={()=>{if(val.trim()) onAdd(val.trim());}}
          style={{padding:"4px 12px",background:"var(--c-black)",color:"#fff",borderRadius:5,fontSize:11,fontWeight:700}}>추가</button>
        <button onClick={onCancel}
          style={{padding:"4px 8px",color:"var(--text-sub)",fontSize:11}}>취소</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Board
// ─────────────────────────────────────────────────────────────────────────────
function Board({def,cards,onCardClick,onAddCard,onQuickAdd,onDrop,activeTagFilter,doneSearch,setDoneSearch,routineChecks,toggleRoutine}:{
  def:typeof BOARDS_DEF[0]; cards:Card[];
  onCardClick:(c:Card)=>void; onAddCard:(colId:string)=>void;
  onQuickAdd:(colId:string,title:string,boardId:string)=>void;
  onDrop:(targetColId:string,afterCardId:string|null,boardId:string)=>void;
  activeTagFilter:string|null; doneSearch:string; setDoneSearch:(s:string)=>void;
  routineChecks:Record<string,boolean>; toggleRoutine:(id:string)=>void;
}) {
  const [dragOverCol,setDragOverCol] = useState<string|null>(null);
  const [dragOverCard,setDragOverCard] = useState<string|null>(null);
  const [quickAddCol,setQuickAddCol] = useState<string|null>(null);

  const isRoutineCol=(colId:string)=>def.id==="personal"&&colId==="done2";

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
    e.preventDefault();e.stopPropagation();
    setDragOverCol(null);setDragOverCard(null);
    if(!gDrag.cardId) return;
    onDrop(colId,afterCardId,def.id);
  };

  const today=new Date().toISOString().slice(0,10);

  return (
    <div>
      {/* Board title + progress */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <span style={{fontSize:11,fontWeight:700,color:"var(--text-sub)",letterSpacing:"0.06em",textTransform:"uppercase"}}>{def.title}</span>
        <div style={{flex:1,maxWidth:120}}><ProgressBar cards={cards} cols={def.cols}/></div>
        <span style={{fontSize:10,color:"var(--text-light)"}}>{cards.length}개</span>
      </div>
      {/* Columns */}
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
        {def.cols.map(col=>{
          const colCards=getCards(col.id);
          const meta=COL_META[col.id]||{dot:"#c7c7cc"};
          const isRoutine=isRoutineCol(col.id);
          const isDone=def.id==="work"&&col.id==="done";
          const isOver=dragOverCol===col.id;
          return (
            <div key={col.id}
              onDragOver={e=>onDragOver(e,col.id)}
              onDrop={e=>onDropH(e,col.id)}
              style={{
                flex:"1 1 0",minWidth:160,maxWidth:280,
                background:"var(--col-bg)",
                borderRadius:8,
                padding:"8px 7px 6px",
                border:`1.5px solid ${isOver?"var(--accent)":"transparent"}`,
                transition:"border 0.1s",
              }}>
              {/* Col header */}
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:meta.dot,flexShrink:0,display:"inline-block"}}/>
                <span style={{fontSize:12,fontWeight:700,color:"var(--text)",flex:1}}>{col.ko}</span>
                <span style={{fontSize:10,color:"var(--text-light)",fontWeight:600,minWidth:14,textAlign:"right"}}>{colCards.length}</span>
                <button onClick={()=>setQuickAddCol(quickAddCol===col.id?null:col.id)}
                  title="카드 추가 (+)"
                  style={{marginLeft:2,fontSize:15,lineHeight:1,color:"var(--text-light)",padding:"0 3px",fontWeight:700,borderRadius:4}}
                  onMouseOver={e=>(e.currentTarget.style.color="var(--text)")}
                  onMouseOut={e=>(e.currentTarget.style.color="var(--text-light)")}>
                  +
                </button>
              </div>
              {/* Done search */}
              {isDone&&(
                <input value={doneSearch} onChange={e=>setDoneSearch(e.target.value)}
                  placeholder="완료 검색..."
                  style={{width:"100%",border:"1px solid var(--border)",borderRadius:5,padding:"3px 7px",
                    background:"var(--card-bg)",color:"var(--text)",fontSize:11,outline:"none",marginBottom:5}}/>
              )}
              {/* Cards */}
              {colCards.map(card=>{
                const isDue=card.dueDate&&card.dueDate<today;
                const isDueToday=card.dueDate===today;
                const label=CAL_LABELS.find(l=>l.id===card.labelId);
                const isChecked=isRoutine&&routineChecks[card.id];
                return (
                  <div key={card.id}
                    className={`kcard${gDrag.cardId===card.id?" dragging":""}${dragOverCard===card.id?" drag-over":""}`}
                    draggable
                    onDragStart={e=>onDragStart(e,card)} onDragEnd={onDragEnd}
                    onDragOver={e=>onDragOver(e,col.id,card.id)} onDrop={e=>onDropH(e,col.id,card.id)}
                    onClick={()=>onCardClick(card)}
                    style={{opacity:isChecked?0.45:1}}>
                    {/* Label stripe */}
                    {label&&(
                      <div style={{height:2,borderRadius:2,background:label.color,margin:"-7px -10px 5px",borderTopLeftRadius:5,borderTopRightRadius:5}}/>
                    )}
                    <div style={{display:"flex",alignItems:"flex-start",gap:5}}>
                      {isRoutine&&(
                        <input type="checkbox" checked={!!isChecked}
                          onChange={e=>{e.stopPropagation();toggleRoutine(card.id);}}
                          onClick={e=>e.stopPropagation()}
                          style={{marginTop:2,flexShrink:0,cursor:"pointer",accentColor:"var(--accent)"}}/>
                      )}
                      <span style={{flex:1,fontSize:12,color:"var(--text)",lineHeight:1.4,
                        textDecoration:isChecked?"line-through":"none",wordBreak:"break-word"}}>
                        {card.title}
                      </span>
                    </div>
                    {card.dueDate&&(
                      <div style={{marginTop:3,fontSize:10,
                        color:isDue?"var(--danger)":isDueToday?"#ff9500":"var(--text-light)",
                        fontWeight:(isDue||isDueToday)?700:400}}>
                        {card.dueDate}
                      </div>
                    )}
                    {(card.tags||[]).length>0&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:2,marginTop:4}}>
                        {(card.tags||[]).map(t=><span key={t} className="tag-pill">{t}</span>)}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Drop zone */}
              <div onDragOver={e=>onDragOver(e,col.id)} onDrop={e=>onDropH(e,col.id,null)}
                style={{minHeight:12,borderRadius:4,background:isOver&&!dragOverCard?"rgba(0,122,255,0.06)":"transparent"}}/>
              {/* Quick add */}
              {quickAddCol===col.id
                ? <QuickAdd colId={col.id} boardId={def.id}
                    onAdd={title=>{onQuickAdd(col.id,title,def.id);setQuickAddCol(null);}}
                    onCancel={()=>setQuickAddCol(null)}/>
                : <button onClick={()=>setQuickAddCol(col.id)}
                    style={{display:"flex",alignItems:"center",gap:4,marginTop:4,padding:"3px 4px",
                      borderRadius:5,color:"var(--text-light)",fontSize:11,width:"100%",
                      transition:"background 0.1s"}}
                    onMouseOver={e=>{e.currentTarget.style.background="rgba(0,0,0,0.04)";e.currentTarget.style.color="var(--text)";}}
                    onMouseOut={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="var(--text-light)";}}>
                    <span style={{fontSize:14,fontWeight:400,lineHeight:1}}>+</span> 새 카드
                  </button>
              }
            </div>
          );
        })}
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
  const [routineChecks,setRoutineChecks] = useState<Record<string,boolean>>({});
  const [doneSearch,setDoneSearch] = useState("");
  const [activeTagFilter,setActiveTagFilter] = useState<string|null>(null);

  // Global keyboard shortcut: "+" anywhere → quick add to work/todo
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
    const saved=JSON.parse(localStorage.getItem("routine_checks")||"{}");
    const today=new Date().toISOString().slice(0,10);
    if(saved._date!==today){
      localStorage.setItem("routine_checks",JSON.stringify({_date:today}));
      setRoutineChecks({});
    } else {
      const{_date:_,...rest}=saved;
      setRoutineChecks(rest);
    }
    Promise.all([
      apiFetch("GET","work").catch(()=>({cards:[]})),
      apiFetch("GET","personal").catch(()=>({cards:[]})),
    ]).then(([w,p])=>{
      setBoards({work:w.cards||[],personal:p.cards||[]});
      setLoading(false);
    });
  },[]);

  const toggleRoutine=useCallback((cardId:string)=>{
    setRoutineChecks(prev=>{
      const next={...prev,[cardId]:!prev[cardId]};
      const today=new Date().toISOString().slice(0,10);
      localStorage.setItem("routine_checks",JSON.stringify({...next,_date:today}));
      return next;
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
    } catch(e){alert("저장 실패: "+e);}
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
    } catch(e){alert("저장 실패: "+e);}
  };

  const handleDelete=async(cardId:string)=>{
    if(!confirm("삭제할까요?")) return;
    try{
      await apiFetch("DELETE",editBoardId,undefined,cardId);
      setBoards(prev=>({...prev,[editBoardId]:prev[editBoardId].filter(c=>c.id!==cardId)}));
      setShowPanel(false);
    } catch(e){alert("삭제 실패: "+e);}
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

  const handleDayClick=(date:string)=>{
    openNew("todo","work",{dueDate:date});
  };

  return (
    <>
      <style>{STYLE}</style>

      {/* ── Top nav ── */}
      <div style={{background:"var(--nav-bg)",borderBottom:"1px solid var(--border-lt)",
        height:46,display:"flex",alignItems:"center",padding:"0 16px",gap:10,
        position:"sticky",top:0,zIndex:100}}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:7,marginRight:12}}>
          <div style={{width:22,height:22,background:"var(--c-black)",borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:12,color:"#fff"}}>K</span>
          </div>
          <span style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>칸반보드</span>
        </div>

        {/* Tag filters */}
        {allTags.length>0&&(
          <div style={{display:"flex",gap:3,overflowX:"auto",scrollbarWidth:"none",flex:1,minWidth:0}}>
            <button className={`nav-btn${activeTagFilter===null?" active":""}`}
              onClick={()=>setActiveTagFilter(null)}>전체</button>
            {allTags.map(t=>(
              <button key={t} className={`nav-btn${activeTagFilter===t?" active":""}`}
                onClick={()=>setActiveTagFilter(activeTagFilter===t?null:t)}>#{t}</button>
            ))}
          </div>
        )}
        {allTags.length===0&&<div style={{flex:1}}/>}

        {/* + button */}
        <button onClick={()=>openNew("todo","work")}
          title="새 카드 추가 (+)"
          style={{display:"flex",alignItems:"center",justifyContent:"center",
            width:28,height:28,borderRadius:6,background:"var(--c-black)",color:"#fff",fontSize:18,fontWeight:400,lineHeight:1}}>
          +
        </button>
      </div>

      {/* ── Main layout ── */}
      <div style={{display:"flex",height:"calc(100vh - 46px)",overflow:"hidden"}}>

        {/* Left sidebar — calendar */}
        {!isMobile&&(
          <div style={{width:220,flexShrink:0,borderRight:"1px solid var(--border-lt)",
            background:"var(--nav-bg)",padding:"16px 14px",overflowY:"auto"}}>
            <MiniCalendar cards={allCards} onDayClick={handleDayClick}/>

            {/* Divider */}
            <div style={{height:1,background:"var(--border-lt)",margin:"16px 0"}}/>

            {/* Board shortcuts */}
            <div style={{fontSize:11,fontWeight:700,color:"var(--text-light)",letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:8}}>보드</div>
            {BOARDS_DEF.map(b=>(
              <div key={b.id} style={{padding:"5px 8px",borderRadius:6,marginBottom:2,
                fontSize:12,color:"var(--text-sub)",cursor:"default",
                display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"var(--c-gray3)"}}/>
                {b.title}
              </div>
            ))}

            {/* Total counts */}
            <div style={{height:1,background:"var(--border-lt)",margin:"12px 0"}}/>
            <div style={{fontSize:11,color:"var(--text-light)"}}>
              {allCards.length}개 카드
            </div>
          </div>
        )}

        {/* Right — kanban area */}
        <div style={{flex:1,overflowY:"auto",padding:isMobile?"10px 8px":"14px 16px",display:"flex",flexDirection:"column",gap:20}}>
          {loading
            ? <div style={{textAlign:"center",color:"var(--text-light)",paddingTop:60,fontSize:13}}>불러오는 중…</div>
            : BOARDS_DEF.map(def=>(
                <Board key={def.id} def={def} cards={boards[def.id]||[]}
                  onCardClick={c=>openCard(c,def.id)}
                  onAddCard={colId=>openNew(colId,def.id)}
                  onQuickAdd={handleQuickAdd}
                  onDrop={handleDrop}
                  activeTagFilter={activeTagFilter}
                  doneSearch={doneSearch} setDoneSearch={setDoneSearch}
                  routineChecks={routineChecks} toggleRoutine={toggleRoutine}/>
              ))
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
