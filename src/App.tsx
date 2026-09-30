import { useState, useEffect, useRef, useCallback } from "react";

const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Nanum+Barun+Gothic:wght@400;700&display=swap');

  :root {
    --font: 'Nanum Barun Gothic', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
    --bg: #f4f5f7;
    --col-bg: #ebecf0;
    --card-bg: #ffffff;
    --card-border: rgba(9,30,66,0.08);
    --card-shadow: 0 1px 2px rgba(9,30,66,0.12);
    --card-shadow-hover: 0 4px 12px rgba(9,30,66,0.18);
    --text: #172b4d;
    --text-sub: #5e6c84;
    --text-light: #97a0af;
    --accent: #0052cc;
    --accent-light: #deebff;
    --separator: rgba(9,30,66,0.13);
    --radius-col: 6px;
    --radius-card: 3px;
    --tag-radius: 3px;
    --sidebar-bg: #ffffff;
    --sidebar-border: rgba(9,30,66,0.13);
    --input-bg: #fafbfc;
    --input-border: rgba(9,30,66,0.20);
    --nav-bg: #0052cc;
    --nav-text: #fff;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0d1117;
      --col-bg: #21262d;
      --card-bg: #1c2128;
      --card-border: rgba(240,246,252,0.10);
      --card-shadow: 0 1px 2px rgba(0,0,0,0.30);
      --card-shadow-hover: 0 4px 12px rgba(0,0,0,0.50);
      --text: #e6edf3;
      --text-sub: #8b949e;
      --text-light: #6e7681;
      --accent: #388bfd;
      --accent-light: #1f3a5f;
      --separator: rgba(240,246,252,0.10);
      --sidebar-bg: #1c2128;
      --sidebar-border: rgba(240,246,252,0.10);
      --input-bg: #161b22;
      --input-border: rgba(240,246,252,0.15);
      --nav-bg: #161b22;
    }
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin:0; padding:0; font-family:var(--font); font-size:13px; background:var(--bg); color:var(--text); }
  input, textarea, button, select { font-family:var(--font); }
  button { cursor:pointer; }
  ::-webkit-scrollbar { width:5px; height:5px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(9,30,66,0.20); border-radius:3px; }
  .kcard {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    box-shadow: var(--card-shadow);
    border-radius: var(--radius-card);
    padding: 4px 6px;
    margin-bottom: 2px;
    cursor: grab;
    user-select: none;
    transition: box-shadow 0.12s, transform 0.10s;
    line-height: 1.3;
  }
  .kcard:active { cursor: grabbing; }
  .kcard:hover { box-shadow: var(--card-shadow-hover); }
  .kcard.dragging { opacity:0.5; transform:scale(0.97); }
  .kcard.drag-over { border-top: 2px solid var(--accent); }
`;

const COL_COLORS: Record<string, { bg:string; bar:string }> = {
  todo:       { bg:"rgba(0,82,204,0.07)",   bar:"#0052cc" },
  inprogress: { bg:"rgba(255,86,48,0.08)",  bar:"#ff5630" },
  done:       { bg:"rgba(0,135,90,0.08)",   bar:"#00875a" },
  check:      { bg:"rgba(101,84,192,0.08)", bar:"#6554c0" },
  carry:      { bg:"rgba(255,143,0,0.08)",  bar:"#ff8b00" },
  done2:      { bg:"rgba(0,184,217,0.08)",  bar:"#00b8d9" },
};

const CAL_LABELS = [
  { id:"family",   ko:"가족",    color:"#FF3B30", text:"#fff" },
  { id:"junseok",  ko:"준석",    color:"#48484A", text:"#fff" },
  { id:"default",  ko:"기본",    color:"#FF9500", text:"#fff" },
  { id:"business", ko:"대상업무", color:"#007AFF", text:"#fff" },
  { id:"noupdate", ko:"미분류",  color:"#1C1C1E", text:"#fff" },
];
const PERSONAL_LABELS = ["family","default","noupdate"];

const BOARDS_DEF = [
  { id:"work", title:"업무 칸반보드", titleEn:"WORK BOARD",
    cols:[
      { id:"todo",       ko:"할 일",  en:"TO DO" },
      { id:"inprogress", ko:"진행 중", en:"IN PROGRESS" },
      { id:"done",       ko:"완료",   en:"DONE" },
    ]},
  { id:"personal", title:"개인 주요사항", titleEn:"PERSONAL",
    cols:[
      { id:"check", ko:"확인",    en:"CHECK" },
      { id:"carry", ko:"챙길 것", en:"TO BRING" },
      { id:"done2", ko:"루틴",    en:"ROUTINE" },
    ]},
];

const HOLIDAYS: Record<string, string> = {
  "01-01":"신정","03-01":"삼일절","05-05":"어린이날","06-06":"현충일",
  "08-15":"광복절","10-03":"개천절","10-09":"한글날","12-25":"크리스마스",
};

type Card = {
  id: string; colId: string; title: string; note?: string;
  dueDate?: string; labelId?: string; calEventId?: string;
  tags?: string[];
};

let gDrag: { cardId:string|null; boardId:string|null; card:Card|null } = { cardId:null, boardId:null, card:null };

function apiFetch(method:string, boardId:string, body?:any, cardId?:string) {
  const url = cardId ? `/api/cards?boardId=${boardId}&id=${cardId}` : `/api/cards?boardId=${boardId}`;
  return fetch(url, {
    method,
    headers: { "Content-Type":"application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.ok ? r.json() : Promise.reject(r.statusText));
}

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ cards, cols }: { cards:Card[]; cols:{id:string;ko:string}[] }) {
  const counts = cols.map(c => ({ ...c, n: cards.filter(k=>k.colId===c.id).length }));
  const total = counts.reduce((s,c)=>s+c.n, 0);
  if (!total) return null;
  return (
    <div style={{ display:"flex", height:5, borderRadius:3, overflow:"hidden", gap:1 }}>
      {counts.map(c => {
        const pct = (c.n/total)*100;
        if (!pct) return null;
        const col = COL_COLORS[c.id] || { bar:"#888" };
        return (
          <div key={c.id} title={`${c.ko}: ${c.n}`}
            style={{ flex:pct, background:col.bar, minWidth:pct>0?2:0 }} />
        );
      })}
    </div>
  );
}

// ── Tag Chip ──────────────────────────────────────────────────────────────────
function TagChip({ tag, onRemove }: { tag:string; onRemove?:()=>void }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:2,
      background:"rgba(9,30,66,0.08)",
      color:"var(--text-sub)",
      border:"1px solid rgba(9,30,66,0.16)",
      borderRadius:"var(--tag-radius)",
      padding:"0 4px", fontSize:10, lineHeight:"15px", fontWeight:700,
      whiteSpace:"nowrap",
    }}>
      {tag}
      {onRemove && (
        <span onClick={e=>{e.stopPropagation();onRemove();}}
          style={{ cursor:"pointer", opacity:0.6, marginLeft:1, fontSize:11, lineHeight:1 }}>×</span>
      )}
    </span>
  );
}

// ── MiniCalendar ──────────────────────────────────────────────────────────────
function MiniCalendar({ cards, onDayClick }: { cards:Card[]; onDayClick:(d:string)=>void }) {
  const [view, setView] = useState(() => { const d=new Date(); return { y:d.getFullYear(), m:d.getMonth() }; });
  const today = new Date();
  const toKey = (y:number,m:number,d:number) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const dueDays = new Set(cards.filter(c=>c.dueDate).map(c=>c.dueDate!.slice(0,10)));
  const firstDay = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m+1, 0).getDate();
  const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weekDays = ["일","월","화","수","목","금","토"];
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());
  return (
    <div style={{ background:"var(--col-bg)", borderRadius:6, padding:"8px 10px", fontSize:11 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
        <button onClick={()=>setView(v=>v.m===0?{y:v.y-1,m:11}:{y:v.y,m:v.m-1})}
          style={{ background:"none", border:"none", color:"var(--text-sub)", padding:"0 4px", fontSize:14 }}>‹</button>
        <span style={{ fontWeight:700, color:"var(--text)" }}>{view.y}.{String(view.m+1).padStart(2,'0')}</span>
        <button onClick={()=>setView(v=>v.m===11?{y:v.y+1,m:0}:{y:v.y,m:v.m+1})}
          style={{ background:"none", border:"none", color:"var(--text-sub)", padding:"0 4px", fontSize:14 }}>›</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, textAlign:"center" }}>
        {weekDays.map((d,i)=>(
          <div key={d} style={{ fontSize:10, fontWeight:700, color:i===0?"#ff5630":i===6?"#0052cc":"var(--text-light)", padding:"1px 0" }}>{d}</div>
        ))}
        {cells.map((day,i)=>{
          if (!day) return <div key={i} />;
          const key = toKey(view.y, view.m, day);
          const mmdd = `${String(view.m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isToday = key === todayKey;
          const hasCard = dueDays.has(key);
          const dow = (firstDay + day - 1) % 7;
          const isSun = dow===0, isSat = dow===6, isHol = !!HOLIDAYS[mmdd];
          return (
            <div key={i} onClick={()=>onDayClick(key)}
              style={{
                padding:"2px 0", borderRadius:3, cursor:"pointer",
                background: isToday ? "var(--accent)" : "transparent",
                color: isToday ? "#fff" : isHol||isSun ? "#ff5630" : isSat ? "#0052cc" : "var(--text)",
                fontWeight: isToday||isHol ? 700 : 400, position:"relative",
              }}>
              {day}
              {hasCard && !isToday && (
                <span style={{ position:"absolute", bottom:1, left:"50%", transform:"translateX(-50%)",
                  width:3, height:3, borderRadius:"50%", background:"var(--accent)", display:"block" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── DateSlider ────────────────────────────────────────────────────────────────
function DateSlider({ onSelect }: { onSelect:(d:string)=>void }) {
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date();
  const WK = ["일","월","화","수","목","금","토"];
  const days = Array.from({length:18},(_,i)=>{
    const d = new Date(today); d.setDate(today.getDate()+i-3);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const mmdd = `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const dow = d.getDay();
    return { key, label:String(d.getDate()), sub:WK[dow], isToday:i===3, isSun:dow===0, isSat:dow===6, isHol:!!HOLIDAYS[mmdd] };
  });
  useEffect(()=>{ ref.current?.children[3]?.scrollIntoView({ inline:"center", behavior:"smooth" }); },[]);
  return (
    <div ref={ref} style={{ display:"flex", gap:3, overflowX:"auto", padding:"2px 0 1px", scrollbarWidth:"none" }}>
      {days.map(d=>(
        <button key={d.key} onClick={()=>onSelect(d.key)} style={{
          flexShrink:0, minWidth:32, padding:"3px 0", border:"none",
          background: d.isToday ? "var(--accent)" : "var(--col-bg)",
          color: d.isToday ? "#fff" : d.isHol||d.isSun ? "#ff5630" : d.isSat ? "#0052cc" : "var(--text)",
          borderRadius:4, cursor:"pointer", lineHeight:1.3, fontSize:11,
        }}>
          <div style={{ fontWeight:700 }}>{d.label}</div>
          <div style={{ fontSize:9 }}>{d.sub}</div>
        </button>
      ))}
    </div>
  );
}

// ── SidePanel ─────────────────────────────────────────────────────────────────
function SidePanel({
  card, boardId, onClose, onSave, onDelete, allTags
}: {
  card:Card|null; boardId:string; onClose:()=>void; onSave:(c:Card)=>void; onDelete:(id:string)=>void; allTags:string[];
}) {
  const [form, setForm] = useState<Card>(card||{id:"",colId:"",title:""});
  const [tagInput, setTagInput] = useState("");
  useEffect(()=>{ setForm(card||{id:"",colId:"",title:""}); setTagInput(""); },[card]);
  if (!card) return null;

  const isPersonal = boardId==="personal";
  const labels = isPersonal
    ? CAL_LABELS.filter(l=>PERSONAL_LABELS.includes(l.id))
    : CAL_LABELS.filter(l=>!PERSONAL_LABELS.includes(l.id));

  const addTag = () => {
    const t = tagInput.trim().replace(/[,#]/g,"");
    if (!t) return;
    const cur = form.tags||[];
    if (!cur.includes(t)) setForm(f=>({...f,tags:[...cur,t]}));
    setTagInput("");
  };
  const removeTag = (t:string) => setForm(f=>({...f,tags:(f.tags||[]).filter(x=>x!==t)}));

  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex" }}>
      <div onClick={onClose} style={{ flex:1, background:"rgba(0,0,0,0.45)" }} />
      <div style={{ width:300, background:"var(--sidebar-bg)", borderLeft:"1px solid var(--sidebar-border)", display:"flex", flexDirection:"column", overflowY:"auto" }}>
        <div style={{ padding:"9px 12px 8px", borderBottom:"1px solid var(--separator)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontWeight:700, fontSize:13 }}>{form.id?"카드 편집":"새 카드"}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:18, color:"var(--text-sub)", padding:2, lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", gap:8, flex:1 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"var(--text-sub)", display:"block", marginBottom:2 }}>제목 *</label>
            <textarea value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} rows={2}
              style={{ width:"100%", border:"1px solid var(--input-border)", borderRadius:3, padding:"4px 7px",
                background:"var(--input-bg)", color:"var(--text)", fontSize:13, resize:"vertical" }} />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"var(--text-sub)", display:"block", marginBottom:2 }}>메모</label>
            <textarea value={form.note||""} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={3}
              style={{ width:"100%", border:"1px solid var(--input-border)", borderRadius:3, padding:"4px 7px",
                background:"var(--input-bg)", color:"var(--text)", fontSize:12, resize:"vertical" }} />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"var(--text-sub)", display:"block", marginBottom:2 }}>마감일</label>
            <input type="date" value={form.dueDate||""} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}
              style={{ width:"100%", border:"1px solid var(--input-border)", borderRadius:3, padding:"3px 7px",
                background:"var(--input-bg)", color:"var(--text)", fontSize:12 }} />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"var(--text-sub)", display:"block", marginBottom:3 }}>라벨</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {labels.map(l=>(
                <button key={l.id} onClick={()=>setForm(f=>({...f,labelId:f.labelId===l.id?undefined:l.id}))}
                  style={{ padding:"2px 7px", borderRadius:3, border:`2px solid ${l.color}`,
                    background: form.labelId===l.id?l.color:"transparent",
                    color: form.labelId===l.id?l.text:l.color, fontSize:11, fontWeight:700 }}>
                  {l.ko}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"var(--text-sub)", display:"block", marginBottom:2 }}>태그</label>
            <div style={{ display:"flex", gap:4, marginBottom:3 }}>
              <input value={tagInput} onChange={e=>setTagInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter"||e.key===","){ e.preventDefault(); addTag(); } }}
                placeholder="태그 입력 후 Enter"
                style={{ flex:1, border:"1px solid var(--input-border)", borderRadius:3, padding:"3px 7px",
                  background:"var(--input-bg)", color:"var(--text)", fontSize:12 }} />
              <button onClick={addTag}
                style={{ padding:"3px 9px", background:"var(--accent)", color:"#fff", border:"none", borderRadius:3, fontSize:11, fontWeight:700 }}>+</button>
            </div>
            {allTags.filter(t=>!(form.tags||[]).includes(t)).length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginBottom:3 }}>
                {allTags.filter(t=>!(form.tags||[]).includes(t)).slice(0,10).map(t=>(
                  <span key={t} onClick={()=>setForm(f=>({...f,tags:[...(f.tags||[]),t]}))}
                    style={{ cursor:"pointer", fontSize:10, padding:"1px 5px", borderRadius:3,
                      border:"1px dashed var(--separator)", color:"var(--text-sub)" }}>+{t}</span>
                ))}
              </div>
            )}
            <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
              {(form.tags||[]).map(t=><TagChip key={t} tag={t} onRemove={()=>removeTag(t)} />)}
            </div>
          </div>
        </div>
        <div style={{ padding:"9px 12px", borderTop:"1px solid var(--separator)", display:"flex", gap:5 }}>
          <button onClick={()=>onSave(form)}
            style={{ flex:1, padding:"6px", background:"var(--accent)", color:"#fff", border:"none", borderRadius:3, fontWeight:700, fontSize:12 }}>
            저장
          </button>
          {form.id && (
            <button onClick={()=>onDelete(form.id)}
              style={{ padding:"6px 11px", background:"#ff5630", color:"#fff", border:"none", borderRadius:3, fontWeight:700, fontSize:12 }}>
              삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Board ─────────────────────────────────────────────────────────────────────
function Board({
  def, cards, onCardClick, onAddCard, onDrop, activeTagFilter, doneSearch, setDoneSearch, routineChecks, toggleRoutine
}: {
  def: typeof BOARDS_DEF[0]; cards:Card[];
  onCardClick:(card:Card)=>void; onAddCard:(colId:string)=>void;
  onDrop:(targetColId:string, afterCardId:string|null, boardId:string)=>void;
  activeTagFilter:string|null; doneSearch:string; setDoneSearch:(s:string)=>void;
  routineChecks:Record<string,boolean>; toggleRoutine:(id:string)=>void;
}) {
  const [dragOverCol, setDragOverCol] = useState<string|null>(null);
  const [dragOverCard, setDragOverCard] = useState<string|null>(null);

  const isRoutineCol = (colId:string) => def.id==="personal" && colId==="done2";

  const getFilteredCards = (colId:string) => {
    let filtered = cards.filter(c=>c.colId===colId);
    if (activeTagFilter) filtered = filtered.filter(c=>(c.tags||[]).includes(activeTagFilter));
    if (def.id==="work" && colId==="done" && doneSearch) {
      const q = doneSearch.toLowerCase();
      filtered = filtered.filter(c=>
        c.title.toLowerCase().includes(q) ||
        (c.note||"").toLowerCase().includes(q) ||
        (c.tags||[]).some(t=>t.toLowerCase().includes(q))
      );
    }
    return filtered;
  };

  const onDragStart = (e:React.DragEvent, card:Card) => {
    gDrag = { cardId:card.id, boardId:def.id, card };
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragEnd = () => {
    gDrag = { cardId:null, boardId:null, card:null };
    setDragOverCol(null); setDragOverCard(null);
  };
  const onDragOver = (e:React.DragEvent, colId:string, cardId?:string) => {
    e.preventDefault(); e.stopPropagation();
    setDragOverCol(colId); setDragOverCard(cardId||null);
  };
  const onDropHandler = (e:React.DragEvent, colId:string, afterCardId:string|null=null) => {
    e.preventDefault(); e.stopPropagation();
    setDragOverCol(null); setDragOverCard(null);
    if (!gDrag.cardId) return;
    onDrop(colId, afterCardId, def.id);
  };

  const today = new Date().toISOString().slice(0,10);

  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3, paddingLeft:1 }}>
        <span style={{ fontSize:11, fontWeight:700, color:"var(--text-sub)", letterSpacing:"0.05em", textTransform:"uppercase" }}>{def.title}</span>
        <div style={{ flex:1 }}><ProgressBar cards={cards} cols={def.cols} /></div>
        <span style={{ fontSize:10, color:"var(--text-light)" }}>{cards.length}개</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${def.cols.length},1fr)`, gap:4, alignItems:"start" }}>
        {def.cols.map(col => {
          const colCards = getFilteredCards(col.id);
          const cc = COL_COLORS[col.id]||{bg:"rgba(9,30,66,0.05)",bar:"#97a0af"};
          const isRoutine = isRoutineCol(col.id);
          const isDone = def.id==="work" && col.id==="done";
          return (
            <div key={col.id}
              onDragOver={e=>onDragOver(e,col.id)}
              onDrop={e=>onDropHandler(e,col.id)}
              style={{
                background: dragOverCol===col.id ? cc.bg+"cc" : "var(--col-bg)",
                borderRadius:"var(--radius-col)", padding:"5px 4px 3px",
                minHeight:50, border:`1.5px solid ${dragOverCol===col.id?cc.bar:"transparent"}`,
                transition:"border 0.1s, background 0.1s",
              }}>
              <div style={{ display:"flex", alignItems:"center", gap:3, marginBottom:3, paddingLeft:1 }}>
                <div style={{ width:7, height:7, borderRadius:2, background:cc.bar, flexShrink:0 }} />
                <span style={{ fontSize:11, fontWeight:700, color:"var(--text)", flex:1 }}>{col.ko}</span>
                <span style={{ fontSize:10, color:"var(--text-light)", fontWeight:700 }}>{colCards.length}</span>
                <button onClick={()=>onAddCard(col.id)}
                  style={{ background:"none", border:"none", color:"var(--text-light)", fontSize:14, lineHeight:1, padding:"0 2px", fontWeight:700 }}>+</button>
              </div>
              {isDone && (
                <input value={doneSearch} onChange={e=>setDoneSearch(e.target.value)}
                  placeholder="완료 검색..."
                  style={{ width:"100%", border:"1px solid var(--input-border)", borderRadius:3, padding:"2px 6px",
                    background:"var(--input-bg)", color:"var(--text)", fontSize:10, marginBottom:3 }} />
              )}
              {colCards.map(card => {
                const isDue = card.dueDate && card.dueDate < today;
                const isDueToday = card.dueDate === today;
                const label = CAL_LABELS.find(l=>l.id===card.labelId);
                const isChecked = isRoutine && routineChecks[card.id];
                return (
                  <div key={card.id}
                    className={`kcard${gDrag.cardId===card.id?" dragging":""}${dragOverCard===card.id?" drag-over":""}`}
                    draggable onDragStart={e=>onDragStart(e,card)} onDragEnd={onDragEnd}
                    onDragOver={e=>onDragOver(e,col.id,card.id)} onDrop={e=>onDropHandler(e,col.id,card.id)}
                    onClick={()=>onCardClick(card)}
                    style={{ opacity:isChecked?0.5:1 }}>
                    {label && (
                      <div style={{ height:2, borderRadius:"2px 2px 0 0", background:label.color,
                        margin:"-4px -6px 3px", borderTop:"none" }} />
                    )}
                    <div style={{ display:"flex", alignItems:"flex-start", gap:4 }}>
                      {isRoutine && (
                        <input type="checkbox" checked={!!isChecked}
                          onChange={e=>{e.stopPropagation();toggleRoutine(card.id);}}
                          onClick={e=>e.stopPropagation()}
                          style={{ marginTop:2, flexShrink:0, cursor:"pointer", accentColor:"var(--accent)" }} />
                      )}
                      <span style={{ flex:1, fontSize:12, color:"var(--text)", lineHeight:1.35,
                        textDecoration:isChecked?"line-through":"none", wordBreak:"break-word" }}>
                        {card.title}
                      </span>
                    </div>
                    {card.dueDate && (
                      <div style={{ marginTop:2, fontSize:10,
                        color:isDue?"#ff5630":isDueToday?"#ff8b00":"var(--text-light)",
                        fontWeight:(isDue||isDueToday)?700:400 }}>
                        📅 {card.dueDate}
                      </div>
                    )}
                    {(card.tags||[]).length > 0 && (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:2, marginTop:2 }}>
                        {(card.tags||[]).map(t=><TagChip key={t} tag={t} />)}
                      </div>
                    )}
                  </div>
                );
              })}
              <div onDragOver={e=>onDragOver(e,col.id)} onDrop={e=>onDropHandler(e,col.id,null)}
                style={{ minHeight:16, borderRadius:3, background:dragOverCol===col.id&&!dragOverCard?"rgba(0,82,204,0.06)":"transparent" }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile();
  const [boards, setBoards] = useState<Record<string,Card[]>>({ work:[], personal:[] });
  const [loading, setLoading] = useState(true);
  const [editCard, setEditCard] = useState<Card|null>(null);
  const [editBoardId, setEditBoardId] = useState("work");
  const [showPanel, setShowPanel] = useState(false);
  const [showCal, setShowCal] = useState(false);
  const [routineChecks, setRoutineChecks] = useState<Record<string,boolean>>({});
  const [doneSearch, setDoneSearch] = useState("");
  const [activeTagFilter, setActiveTagFilter] = useState<string|null>(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("routine_checks")||"{}");
    const today = new Date().toISOString().slice(0,10);
    if (saved._date !== today) {
      localStorage.setItem("routine_checks", JSON.stringify({ _date:today }));
      setRoutineChecks({});
    } else {
      const { _date:_, ...rest } = saved;
      setRoutineChecks(rest);
    }
    Promise.all([
      apiFetch("GET","work").catch(()=>({cards:[]})),
      apiFetch("GET","personal").catch(()=>({cards:[]})),
    ]).then(([w,p]) => {
      setBoards({ work:w.cards||[], personal:p.cards||[] });
      setLoading(false);
    });
  }, []);

  const toggleRoutine = useCallback((cardId:string) => {
    setRoutineChecks(prev => {
      const next = { ...prev, [cardId]:!prev[cardId] };
      const today = new Date().toISOString().slice(0,10);
      localStorage.setItem("routine_checks", JSON.stringify({ ...next, _date:today }));
      return next;
    });
  }, []);

  const allTags = Array.from(new Set(Object.values(boards).flat().flatMap(c=>c.tags||[]))).sort();

  const handleCardClick = (card:Card, boardId:string) => {
    setEditCard(card); setEditBoardId(boardId); setShowPanel(true);
  };
  const handleAddCard = (colId:string, boardId:string) => {
    setEditCard({ id:"", colId, title:"" }); setEditBoardId(boardId); setShowPanel(true);
  };
  const handleSave = async (card:Card) => {
    try {
      if (card.id) {
        const res = await apiFetch("PUT", editBoardId, card, card.id);
        const updated = res.card||card;
        setBoards(prev=>({ ...prev, [editBoardId]:prev[editBoardId].map(c=>c.id===card.id?updated:c) }));
      } else {
        const res = await apiFetch("POST", editBoardId, card);
        const created = res.card||{ ...card, id:Date.now().toString() };
        setBoards(prev=>({ ...prev, [editBoardId]:[...prev[editBoardId], created] }));
      }
      setShowPanel(false);
    } catch(e) { alert("저장 실패: "+e); }
  };
  const handleDelete = async (cardId:string) => {
    if (!confirm("삭제할까요?")) return;
    try {
      await apiFetch("DELETE", editBoardId, undefined, cardId);
      setBoards(prev=>({ ...prev, [editBoardId]:prev[editBoardId].filter(c=>c.id!==cardId) }));
      setShowPanel(false);
    } catch(e) { alert("삭제 실패: "+e); }
  };
  const handleDrop = async (targetColId:string, afterCardId:string|null, boardId:string) => {
    const { cardId, boardId:srcBoardId, card } = gDrag;
    if (!cardId||!card) return;
    const srcBoard = srcBoardId||boardId;
    const updatedCard = { ...card, colId:targetColId };
    if (srcBoard===boardId) {
      setBoards(prev=>{
        const cols = [...prev[boardId]];
        const idx = cols.findIndex(c=>c.id===cardId);
        if (idx>=0) cols.splice(idx,1);
        const afterIdx = afterCardId ? cols.findIndex(c=>c.id===afterCardId) : -1;
        if (afterIdx>=0) cols.splice(afterIdx,0,updatedCard); else cols.push(updatedCard);
        return { ...prev, [boardId]:cols };
      });
    } else {
      setBoards(prev=>({
        ...prev,
        [srcBoard]:prev[srcBoard].filter(c=>c.id!==cardId),
        [boardId]:[...prev[boardId], updatedCard],
      }));
    }
    gDrag = { cardId:null, boardId:null, card:null };
    try { await apiFetch("PUT", boardId, updatedCard, cardId); } catch(e) { console.error(e); }
  };
  const handleDayClick = (date:string) => {
    setEditCard({ id:"", colId:"todo", title:"", dueDate:date });
    setEditBoardId("work"); setShowPanel(true); setShowCal(false);
  };
  const allCards = Object.values(boards).flat();

  return (
    <>
      <style>{STYLE}</style>
      {/* Nav */}
      <div style={{ background:"var(--nav-bg)", color:"var(--nav-text)", padding:"0 8px",
        height:40, display:"flex", alignItems:"center", gap:6, position:"sticky", top:0, zIndex:100 }}>
        <span style={{ fontWeight:700, fontSize:14, flexShrink:0 }}>📋 칸반</span>
        {/* Tag filters */}
        {allTags.length > 0 && (
          <div style={{ display:"flex", gap:2, overflowX:"auto", scrollbarWidth:"none", flex:1, minWidth:0 }}>
            <button onClick={()=>setActiveTagFilter(null)} style={{ flexShrink:0, padding:"2px 6px", borderRadius:3, border:"none",
              background:activeTagFilter===null?"rgba(255,255,255,0.30)":"rgba(255,255,255,0.12)",
              color:"#fff", fontSize:10, fontWeight:700 }}>전체</button>
            {allTags.map(t=>(
              <button key={t} onClick={()=>setActiveTagFilter(activeTagFilter===t?null:t)}
                style={{ flexShrink:0, padding:"2px 6px", borderRadius:3, border:"none",
                  background:activeTagFilter===t?"rgba(255,255,255,0.30)":"rgba(255,255,255,0.12)",
                  color:"#fff", fontSize:10, fontWeight:700 }}>#{t}</button>
            ))}
          </div>
        )}
        {allTags.length===0 && <div style={{ flex:1 }} />}
        <button onClick={()=>setShowCal(v=>!v)}
          style={{ flexShrink:0, background:"rgba(255,255,255,0.15)", border:"none", borderRadius:4,
            color:"#fff", padding:"3px 7px", fontSize:11, fontWeight:700 }}>
          {showCal?"✕":"📅"}
        </button>
      </div>
      {/* Main */}
      <div style={{ padding: isMobile?"6px 5px":"8px 8px" }}>
        <div style={{ marginBottom:5 }}>
          <DateSlider onSelect={handleDayClick} />
        </div>
        {showCal && (
          <div style={{ marginBottom:7 }}>
            <MiniCalendar cards={allCards} onDayClick={handleDayClick} />
          </div>
        )}
        {loading
          ? <div style={{ textAlign:"center", color:"var(--text-light)", padding:30 }}>불러오는 중...</div>
          : BOARDS_DEF.map(def => (
              <Board key={def.id} def={def} cards={boards[def.id]||[]}
                onCardClick={c=>handleCardClick(c,def.id)}
                onAddCard={colId=>handleAddCard(colId,def.id)}
                onDrop={handleDrop}
                activeTagFilter={activeTagFilter}
                doneSearch={doneSearch} setDoneSearch={setDoneSearch}
                routineChecks={routineChecks} toggleRoutine={toggleRoutine} />
            ))
        }
      </div>
      {showPanel && (
        <SidePanel card={editCard} boardId={editBoardId}
          onClose={()=>setShowPanel(false)} onSave={handleSave} onDelete={handleDelete}
          allTags={allTags} />
      )}
    </>
  );
}
