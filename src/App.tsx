import { useState, useEffect, useRef, useCallback } from "react";

const FONT = "'Nanum Gothic', 'Apple SD Gothic Neo', sans-serif";
const iStyle: any = { width:"100%", fontSize:13, padding:"7px 10px", borderRadius:6, border:"1px solid #EFEFEF", outline:"none", boxSizing:"border-box", fontFamily:FONT, background:"#fff", color:"#333" };
const lStyle: any = { fontSize:10, color:"#AAA", display:"block", marginBottom:4, fontWeight:700, letterSpacing:0.5, textTransform:"uppercase" };

const COL_COLORS: any = {
  todo:       { bg:"#EEF4FF", bar:"#93B4F5" },
  inprogress: { bg:"#FFF0F0", bar:"#F5A0A0" },
  done:       { bg:"#F4F4F4", bar:"#BBBBBB" },
  check:      { bg:"#F0FFF4", bar:"#86EFAC" },
  carry:      { bg:"#FFF8EC", bar:"#FCD080" },
  done2:      { bg:"#F5F0FF", bar:"#C4AAFA" },
};

const CAL_LABELS = [
  { id:"family",   ko:"가족",   color:"#E74C3C", text:"#fff" },
  { id:"junseok",  ko:"준석",   color:"#555F6E", text:"#fff" },
  { id:"default",  ko:"기본",   color:"#F5C518", text:"#333" },
  { id:"business", ko:"대상업무", color:"#2980B9", text:"#fff" },
  { id:"noupdate", ko:"미분류",  color:"#1A1A1A", text:"#fff" },
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

// 루틴 유틸
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
  if (checkedToday) return { bg:"#F0FFF4", border:"#27AE60" };
  const missed = getMissedDays(cardId);
  if (missed >= 7) return { bg:"#FFE0E0", border:"#C0392B" };
  if (missed >= 5) return { bg:"#FFEBE8", border:"#E74C3C" };
  if (missed >= 3) return { bg:"#FFF0EE", border:"#F5A0A0" };
  return { bg:"#fff", border:"#E8E8E8" };
}

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
        <div style={{ display:"flex", gap:6, padding:"4px 2px 6px", width:"max-content" }}>
          {days.map((d,i)=>{
            const str=fmt(d),isSel=value===str,isT=i===0,dow=d.getDay();
            return (
              <div key={str} onClick={()=>{ if(!dg.current.moved) onChange(isSel?"":str); }}
                style={{ width:40,height:52,borderRadius:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,cursor:"grab",flexShrink:0,
                  background:isSel?"#111":isT?"#F5F5F5":"#fff", border:isSel?"none":isT?"1px solid #DDD":"1px solid #EFEFEF" }}>
                <span style={{ fontSize:9,fontWeight:600,color:isSel?"rgba(255,255,255,0.6)":dow===0?"#E74C3C":dow===6?"#2980B9":"#BBB" }}>{dayNames[dow]}</span>
                <span style={{ fontSize:15,fontWeight:700,lineHeight:1,color:isSel?"#fff":isT?"#111":dow===0?"#E74C3C":dow===6?"#2980B9":"#333" }}>{d.getDate()}</span>
                {isT&&!isSel&&<span style={{ width:4,height:4,borderRadius:"50%",background:"#111" }}/>}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ height:3,borderRadius:2,background:"#F0F0F0",marginBottom:6,overflow:"hidden" }}>
        <div ref={barRef} style={{ height:"100%",borderRadius:2,background:"#CCC" }}/>
      </div>
      <input value={value||""} onChange={(e: any)=>onChange(e.target.value)} onBlur={(e: any)=>onChange(parseDate(e.target.value))}
        placeholder="직접 입력 (예) 0530 / 5/30" style={{ ...iStyle,fontSize:12 }}/>
      {value&&<div style={{ fontSize:11,color:"#888",marginTop:4,display:"flex",justifyContent:"space-between" }}>
        <span>선택: {value}</span>
        <button onClick={()=>onChange("")} style={{ background:"none",border:"none",fontSize:11,color:"#CCC",cursor:"pointer",padding:0 }}>지우기</button>
      </div>}
    </div>
  );
}

function SidePanel({ form, setForm, cols, mode, onSave, onDelete, onClose, isMobile }: any) {
  const lbl = getLbl(form.labelId);
  return (
    <div style={isMobile
      ? { position:"fixed",left:0,right:0,bottom:0,maxHeight:"90vh",background:"#fff",borderTop:"1px solid #E0E0E0",borderRadius:"16px 16px 0 0",boxShadow:"0 -4px 24px rgba(0,0,0,0.12)",zIndex:500,display:"flex",flexDirection:"column" } as any
      : { position:"fixed",top:0,right:0,bottom:0,width:292,background:"#fff",borderLeft:"1px solid #EBEBEB",boxShadow:"-6px 0 24px rgba(0,0,0,0.07)",zIndex:500,display:"flex",flexDirection:"column" } as any}>
      {isMobile&&<div style={{ width:40,height:4,borderRadius:2,background:"#E0E0E0",margin:"12px auto 0" }}/>}
      <div style={{ padding:"13px 16px 12px",borderBottom:"1px solid #F2F2F2",display:"flex",alignItems:"center",gap:8 }}>
        <div style={{ width:8,height:8,borderRadius:"50%",background:lbl.color }}/>
        <span style={{ fontSize:12,fontWeight:700,color:"#111",flex:1 }}>{mode==="add"?"새 카드 추가":"카드 편집"}</span>
        <button onClick={onClose} style={{ background:"none",border:"none",fontSize:18,color:"#CCC",cursor:"pointer",padding:0 }}>✕</button>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:12 }}>
        <div><label style={lStyle}>캘린더 분류</label>
          <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
            {CAL_LABELS.map(l=>(
              <button key={l.id} onClick={()=>setForm((f: any)=>({...f,labelId:l.id}))}
                style={{ fontSize:isMobile?12:10,padding:isMobile?"6px 12px":"3px 9px",borderRadius:16,cursor:"pointer",fontFamily:FONT,fontWeight:700,
                  background:form.labelId===l.id?l.color:"#F5F5F5",color:form.labelId===l.id?l.text:"#999",
                  border:form.labelId===l.id?`1.5px solid ${l.color}`:"1.5px solid transparent" }}>{l.ko}</button>
            ))}
          </div>
        </div>
        <div><label style={lStyle}>상태</label>
          <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
            {cols.map((c: any)=>(
              <button key={c.id} onClick={()=>setForm((f: any)=>({...f,colId:c.id}))}
                style={{ fontSize:isMobile?12:11,padding:isMobile?"6px 14px":"4px 11px",borderRadius:5,cursor:"pointer",fontFamily:FONT,
                  background:form.colId===c.id?"#111":"#F5F5F5",color:form.colId===c.id?"#fff":"#888",border:"none",fontWeight:form.colId===c.id?700:400 }}>{c.ko}</button>
            ))}
          </div>
        </div>
        <div><label style={lStyle}>제목</label>
          <input value={form.title} onChange={(e: any)=>setForm((f: any)=>({...f,title:e.target.value}))} placeholder="카드 제목" autoFocus style={{ ...iStyle,fontSize:isMobile?15:13 }}/>
        </div>
        <div><label style={lStyle}>메모</label>
          <textarea value={form.note} onChange={(e: any)=>setForm((f: any)=>({...f,note:e.target.value}))} placeholder="메모 (선택)" rows={3} style={{ ...iStyle,resize:"vertical",lineHeight:1.55,fontSize:isMobile?14:13 }}/>
        </div>
        <div><label style={lStyle}>마감일</label>
          <DateSlider value={form.dueDate} onChange={(v: string)=>setForm((f: any)=>({...f,dueDate:v}))}/>
        </div>
      </div>
      <div style={{ padding:"11px 16px",borderTop:"1px solid #F2F2F2",display:"flex",gap:7,paddingBottom:isMobile?"24px":"11px" }}>
        <button onClick={onSave} style={{ flex:1,padding:isMobile?"12px 0":"8px 0",borderRadius:8,border:"none",background:"#111",color:"#fff",fontWeight:700,fontSize:isMobile?15:13,cursor:"pointer",fontFamily:FONT }}>저장</button>
        <button onClick={onClose} style={{ padding:isMobile?"12px 16px":"8px 12px",borderRadius:8,border:"1px solid #EFEFEF",background:"#fff",color:"#AAA",fontSize:isMobile?14:13,cursor:"pointer",fontFamily:FONT }}>취소</button>
        {mode==="edit"&&<button onClick={onDelete} style={{ padding:isMobile?"12px 16px":"8px 14px",borderRadius:8,border:"none",background:"#FFF0EE",color:"#D04040",fontSize:isMobile?13:12,fontWeight:700,cursor:"pointer",fontFamily:FONT }}>삭제</button>}
      </div>
    </div>
  );
}

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
    <div style={{ background:"#fff",border:"1px solid #EFEFEF",borderRadius:10,padding:"14px 14px 12px",fontFamily:FONT }}>
      <div style={{ display:"flex",alignItems:"center",marginBottom:12 }}>
        <button onClick={()=>{if(vm===0){setVm(11);setVy((y: number)=>y-1);}else setVm((m: number)=>m-1);}} style={{ background:"none",border:"none",cursor:"pointer",color:"#AAA",fontSize:16,padding:"0 8px" }}>‹</button>
        <span style={{ flex:1,textAlign:"center",fontSize:13,fontWeight:700,color:"#111" }}>{vy}년 {mn[vm]}</span>
        <button onClick={()=>{if(vm===11){setVm(0);setVy((y: number)=>y+1);}else setVm((m: number)=>m+1);}} style={{ background:"none",border:"none",cursor:"pointer",color:"#AAA",fontSize:16,padding:"0 8px" }}>›</button>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:4 }}>
        {dn.map((d,i)=><div key={d} style={{ textAlign:"center",fontSize:10,fontWeight:700,color:i===0?"#E74C3C":i===6?"#2980B9":"#BBB",padding:"2px 0" }}>{d}</div>)}
      </div>
      {weeks.map((week,wi)=>(
        <div key={wi} style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:2 }}>
          {week.map((d,di)=>{
            if(d<1||d>dim)return <div key={di}/>;
            const ds=`${vy}-${pad(vm+1)}-${pad(d)}`,dots=cbd[ds]||[],isT=d===today.getDate()&&vm===today.getMonth()&&vy===today.getFullYear();
            const holiday=isHoliday(vm+1,d);
            const isRed=di===0||!!holiday;
            const isBlue=di===6&&!holiday;
            return (
              <div key={di} onClick={()=>onDateClick(ds)} style={{ textAlign:"center",padding:"3px 1px",cursor:"pointer",borderRadius:6 }}
                onMouseEnter={(e: any)=>e.currentTarget.style.background="#F5F5F5"}
                onMouseLeave={(e: any)=>e.currentTarget.style.background="transparent"}
                title={holiday||""}>
                <span style={{ fontSize:12,fontWeight:isT?700:400,color:isT?"#fff":isRed?"#E74C3C":isBlue?"#2980B9":"#333",background:isT?"#111":"transparent",borderRadius:"50%",width:22,height:22,display:"inline-flex",alignItems:"center",justifyContent:"center" }}>{d}</span>
                {dots.length>0&&<div style={{ display:"flex",justifyContent:"center",gap:2,marginTop:1 }}>{dots.slice(0,3).map((c: any,i: number)=><div key={i} style={{ width:5,height:5,borderRadius:"50%",background:getLbl(c.labelId).color }}/>)}</div>}
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ borderTop:"1px solid #F5F5F5",marginTop:10,paddingTop:8,display:"flex",flexWrap:"wrap",gap:"6px 10px" }}>
        {CAL_LABELS.map(l=><div key={l.id} style={{ display:"flex",alignItems:"center",gap:4 }}><div style={{ width:6,height:6,borderRadius:"50%",background:l.color }}/><span style={{ fontSize:10,color:"#AAA" }}>{l.ko}</span></div>)}
      </div>
    </div>
  );
}

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
    c.style.cssText=`position:fixed;opacity:0.85;pointer-events:none;z-index:9999;width:${el.offsetWidth}px;left:${t.clientX-el.offsetWidth/2}px;top:${t.clientY-el.offsetHeight/2}px;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.18);transform:scale(1.03);`;
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
        draggable
        onDragStart={(e: any)=>{e.dataTransfer.effectAllowed="move";gDrag.cardId=card.id;gDrag.boardId=boardDef.id;gDrag.card=card;setTick((n: number)=>n+1);}}
        onDragEnd={()=>{gDrag.cardId=null;gDrag.boardId=null;gDrag.card=null;setDragOverCol(null);setTick((n: number)=>n+1);}}
        onTouchStart={(e: any)=>onTouchStart(e,card)}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={(e: any)=>{if((e.target as HTMLElement).closest('button'))return;openEdit(card);}}
        style={{
          background: isRoutine?(rs?.bg||"#fff"):"#fff",
          border: `1px solid ${isRoutine?(rs?.border||"#E8E8E8"):"#E8E8E8"}`,
          borderLeft: `3px solid ${isRoutine?(checkedToday?"#27AE60":rs?.border||"#E8E8E8"):lbl.color}`,
          borderRadius:8,padding:"8px 10px",marginBottom:6,cursor:"grab",opacity:isDragging?0.4:1,
          position:"relative",boxShadow:"0 1px 3px rgba(0,0,0,0.05)",touchAction:"none",userSelect:"none"
        } as any}
        onMouseEnter={(e: any)=>e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.1)"}
        onMouseLeave={(e: any)=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.05)"}>
        <button onMouseDown={(e: any)=>e.stopPropagation()} onClick={(e: any)=>{e.stopPropagation();delCard(card.id);}}
          style={{ position:"absolute",top:6,right:6,background:"none",border:"none",padding:"1px 4px",cursor:"pointer",fontSize:11,color:"#D8D8D8",lineHeight:1 }}
          onMouseEnter={(e: any)=>e.currentTarget.style.color="#D04040"}
          onMouseLeave={(e: any)=>e.currentTarget.style.color="#D8D8D8"}>✕</button>
        <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:4 }}>
          {isRoutine ? (
            <>
              <button onMouseDown={(e: any)=>e.stopPropagation()} onClick={(e: any)=>{e.stopPropagation();toggleRoutineCheck(card.id);setTick((n: number)=>n+1);}}
                style={{ fontSize:10,padding:"2px 8px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:FONT,fontWeight:700,
                  background:checkedToday?"#27AE60":"#F0F0F0",color:checkedToday?"#fff":"#AAA" }}>
                {checkedToday?"✓ 완료":"체크"}
              </button>
              {missed>=3&&!checkedToday&&<span style={{ fontSize:9,fontWeight:700,color:missed>=7?"#C0392B":missed>=5?"#E74C3C":"#F5A0A0" }}>{missed}일 미체크</span>}
            </>
          ) : (
            <span style={{ fontSize:9,padding:"1px 6px",borderRadius:8,background:lbl.color,color:lbl.text,fontWeight:700 }}>{lbl.ko}</span>
          )}
        </div>
        <p style={{ margin:"0 0 2px",fontSize:12,fontWeight:600,color:"#1A1A1A",lineHeight:1.4,paddingRight:20 }}>{card.title}</p>
        {card.note&&<p style={{ margin:0,fontSize:10,color:"#AAA",lineHeight:1.3 }}>{card.note}</p>}
        {card.dueDate&&<span style={{ fontSize:10,color:"#BABABA",display:"flex",alignItems:"center",gap:3,marginTop:3 }}>⏰ {card.dueDate}</span>}
      </div>
    );
  };

  return (
    <div data-boardid={boardDef.id} style={{ marginBottom:28 }}>
      <div style={{ display:"flex",alignItems:"baseline",gap:12,marginBottom:12,borderBottom:"1px solid #EBEBEB",paddingBottom:8 }}>
        <span style={{ fontSize:14,fontWeight:700,color:"#111" }}>{boardDef.title}</span>
        <span style={{ fontSize:10,fontWeight:600,color:"#BBB",letterSpacing:2 }}>{boardDef.titleEn}</span>
      </div>
      {loading?<div style={{ fontSize:12,color:"#CCC",padding:"20px 0",textAlign:"center" }}>불러오는 중...</div>
      :isMobile?(
        <div>
          <div style={{ display:"flex",borderBottom:"1px solid #EBEBEB",marginBottom:12 }}>
            {boardDef.cols.map((col: any)=>{const cc=COL_COLORS[col.id]||{bg:"#F9F9F9",bar:"#DDD"};return(
              <button key={col.id} onClick={()=>setActiveTab(col.id)}
                data-tabid={col.id} data-colid={col.id} data-boardid={boardDef.id}
                style={{ flex:1,padding:"10px 4px",fontSize:12,fontWeight:activeTab===col.id?700:400,
                  color:activeTab===col.id?"#111":"#AAA",background:activeTab===col.id?cc.bg:"transparent",
                  border:"none",borderBottom:activeTab===col.id?`2px solid ${cc.bar}`:"2px solid transparent",cursor:"pointer",fontFamily:FONT }}>
                {col.ko} <span style={{ fontSize:10,color:"#BBB" }}>{byCol(col.id).length}</span>
              </button>
            );})}
          </div>
          <div data-colid={activeTab} data-boardid={boardDef.id} style={{ minHeight:60 }}>
            {byCol(activeTab).map((card: any)=>renderCard(card))}
          </div>
          <button onClick={()=>openAdd(activeTab)} style={{ width:"100%",padding:"12px",borderRadius:8,border:"1px dashed #E0E0E0",background:"transparent",cursor:"pointer",color:"#BABABA",fontSize:13,fontFamily:FONT }}>+ 추가</button>
        </div>
      ):(
        <div style={{ display:"flex",gap:10 }}>
          {boardDef.cols.map((col: any)=>{const cc=COL_COLORS[col.id]||{bg:"#F9F9F9",bar:"#DDD"};const isOver=dragOverCol===col.id;return(
            <div key={col.id} data-colid={col.id} data-boardid={boardDef.id}
              style={{ flex:1,minWidth:0,background:isOver?`${cc.bg}dd`:cc.bg,borderRadius:10,padding:"10px 8px 8px",border:`2px solid ${isOver?cc.bar:"transparent"}`,transition:"all 0.15s" }}
              onDragOver={(e: any)=>{e.preventDefault();setDragOverCol(col.id);}}
              onDragLeave={(e: any)=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDragOverCol(null);}}
              onDrop={(e: any)=>handleDrop(e,col.id)}>
              <div style={{ marginBottom:8 }}>
                <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",background:cc.bar }}/>
                  <span style={{ fontSize:12,fontWeight:700,color:"#111" }}>{col.ko}</span>
                  <span style={{ fontSize:9,color:"#BBB" }}>{col.en}</span>
                  <span style={{ marginLeft:"auto",fontSize:11,color:"#AAA",fontWeight:600,background:"rgba(0,0,0,0.06)",borderRadius:8,padding:"1px 7px" }}>{byCol(col.id).length}</span>
                </div>
                <div style={{ height:2,borderRadius:2,marginTop:6,background:cc.bar,opacity:0.5 }}/>
              </div>
              {byCol(col.id).map((card: any)=>renderCard(card))}
              <button onClick={()=>openAdd(col.id)}
                style={{ width:"100%",textAlign:"left",fontSize:11,padding:"6px 7px",borderRadius:6,border:`1px dashed ${cc.bar}`,background:"rgba(255,255,255,0.6)",cursor:"pointer",color:"#AAA",display:"flex",alignItems:"center",gap:4,fontFamily:FONT }}>
                + 추가
              </button>
            </div>
          );})}
        </div>
      )}
      {isMyPanel&&<SidePanel form={panelState.form} setForm={setForm} cols={boardDef.cols} mode={panelState.mode} onSave={handleSave} onDelete={handleDelete} onClose={()=>setPanelState(null)} isMobile={isMobile}/>}
    </div>
  );
}

export default function App() {
  const [panelState,setPanelState]=useState<any>(null);
  const [hidePersonal,setHidePersonal]=useState(false);
  const [showCalendar,setShowCalendar]=useState(false);
  const isMobile=useIsMobile();
  const allCardsRef=useRef<any>({});

  const handleDateClick=(ds: string)=>{setPanelState({boardId:"work",mode:"add",form:{colId:"todo",title:"",note:"",dueDate:ds,labelId:"default"}});if(isMobile)setShowCalendar(false);};
  const allCards=Object.values(allCardsRef.current).flatMap((b: any)=>b.cards||[]);

  return (
    <div style={{ fontFamily:FONT,background:"#F7F8FA",minHeight:"100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&display=swap'); *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}`}</style>
      <div style={{ padding:isMobile?"12px 16px":"14px 20px 10px",borderBottom:"1px solid #EBEBEB",display:"flex",alignItems:"center",background:"#fff",position:"sticky",top:0,zIndex:100 }}>
        <p style={{ margin:0,fontSize:isMobile?11:13,color:"#BABABA",fontStyle:"italic" }}>Manifesting aura; making the intangible tangible.</p>
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:10 }}>
          {isMobile&&<button onClick={()=>setShowCalendar((v: boolean)=>!v)} style={{ background:"none",border:"none",fontSize:20,cursor:"pointer",color:showCalendar?"#111":"#CCC",padding:0 }}>📅</button>}
          <label style={{ display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:isMobile?11:12,color:"#888",userSelect:"none" }}>
            <div onClick={()=>setHidePersonal((v: boolean)=>!v)} style={{ width:34,height:18,borderRadius:10,background:hidePersonal?"#111":"#DDD",position:"relative",transition:"background 0.2s",cursor:"pointer",flexShrink:0 }}>
              <div style={{ width:14,height:14,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:hidePersonal?18:2,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}/>
            </div>
            {!isMobile&&"개인일정 숨기기"}
          </label>
        </div>
      </div>
      {isMobile&&showCalendar&&<div style={{ padding:"16px",background:"#fff",borderBottom:"1px solid #EBEBEB" }}><MiniCalendar allCards={allCards} onDateClick={handleDateClick}/></div>}
      <div style={{ display:"flex",alignItems:"flex-start" }}>
        {!isMobile&&<div style={{ width:240,flexShrink:0,padding:"18px 14px",position:"sticky",top:50 }}><MiniCalendar allCards={allCards} onDateClick={handleDateClick}/></div>}
        <div style={{ flex:1,padding:isMobile?"16px":"18px 20px 18px 6px",marginRight:(!isMobile&&panelState)?300:0,transition:"margin-right 0.22s ease",minWidth:0 }}>
          {BOARDS_DEF.filter(b=>!(hidePersonal&&b.id==="personal")).map(b=>(
            <Board key={b.id} boardDef={b} panelState={panelState} setPanelState={setPanelState}
              hidePersonal={hidePersonal} allCardsRef={allCardsRef.current} isMobile={isMobile}/>
          ))}
        </div>
      </div>
      {panelState&&<div onClick={()=>setPanelState(null)} style={{ position:"fixed",inset:0,zIndex:499,background:isMobile?"rgba(0,0,0,0.3)":"transparent" }}/>}
    </div>
  );
}
