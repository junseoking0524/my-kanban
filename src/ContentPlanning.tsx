import {useEffect,useState} from 'react';
import {TEMPLATE,DEFAULT_RULES,parseMemo,compareMemo,reviewKey,makeBrief} from '../lib/content-planning.js';
import './ContentPlanning.css';
type Item={id:string;title:string;raw?:string;revision?:string;status?:string;updatedAt?:string;[key:string]:string|undefined};
type Data={items:Item[];rules:string;sheetUrl:string};
const cacheKey='content_planning_unsaved_v1';
function recover(){try{return JSON.parse(localStorage.getItem(cacheKey)||'null');}catch{return null;}}
export default function ContentPlanning(){
  const [data,setData]=useState<Data>({items:[],rules:DEFAULT_RULES,sheetUrl:''});
  const [draft,setDraft]=useState(()=>recover()||{id:'',base:'',raw:'',dirty:false});
  const [message,setMessage]=useState('');const [locked,setLocked]=useState(false);const [password,setPassword]=useState('');
  const [setup,setSetup]=useState(false);const [busy,setBusy]=useState(false);const [reviewed,setReviewed]=useState(false);
  const [serviceAccount,setServiceAccount]=useState('');
  const selected=data.items.find(i=>i.id===draft.id);
  const basic=selected||{id:draft.id,...parseMemo(draft.raw)};
  const comparisons=compareMemo(basic,draft.raw);
  const conflicts=comparisons.filter(x=>x.conflict);
  const changed=!!selected&&draft.base!==(selected.revision||'');
  const readyCount=data.items.filter(i=>i.status==='입력 완료').length;
  function updateDraft(next:typeof draft|((previous:typeof draft)=>typeof draft)) {
    const value=typeof next==='function'?next(draft):next;
    setDraft(value);
    try{if(value.dirty)localStorage.setItem(cacheKey,JSON.stringify(value));else localStorage.removeItem(cacheKey);}
    catch{setMessage('브라우저 임시 보관 공간이 부족합니다. 원문을 메모장에도 보관해주세요.');}
  }
  async function request(body?:object){
    const response=await fetch('/api/content-planning',body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);
    const result=await response.json();
    if(response.status===401)setLocked(true);
    if(result.needsSetup)setSetup(true);
    if(result.sheetUrl)setData(d=>({...d,sheetUrl:result.sheetUrl}));
    if(result.serviceAccount)setServiceAccount(result.serviceAccount);
    if(!response.ok)throw new Error(result.error||'연결에 실패했습니다.');
    if(result.items){setData(result);setLocked(false);setSetup(false);}
    return result;
  }
  async function load(){setBusy(true);try{await request();setReviewed(false);setMessage('시트 정보를 새로 불러왔습니다. 입력 중인 원문은 유지됩니다.');}catch(e){setMessage(e.message);}finally{setBusy(false);}}
  useEffect(()=>{let active=true;fetch('/api/content-planning').then(async response=>{const result=await response.json();if(!active)return;if(response.status===401)setLocked(true);if(result.needsSetup)setSetup(true);if(result.sheetUrl)setData(d=>({...d,sheetUrl:result.sheetUrl}));if(result.serviceAccount)setServiceAccount(result.serviceAccount);if(response.ok)setData(result);else setMessage(result.error||'연결 실패');}).catch(()=>active&&setMessage('연결할 수 없습니다. 작성 내용은 이 브라우저에 보관됩니다.'));return()=>{active=false;};},[]);

  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(draft.dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[draft.dirty]);
  function choose(item?:Item){if(draft.dirty&&!window.confirm('현재 입력은 아직 Sheets에 저장되지 않았습니다. 다른 글로 이동할까요?'))return;updateDraft({id:item?.id||'',base:item?.revision||'',raw:item?.raw||'',dirty:false});setReviewed(false);setMessage('');}
  async function copy(text:string){try{await navigator.clipboard.writeText(text);setMessage('복사했습니다. 메모장 또는 글쓰기 대화에 붙여넣으세요.');}catch{setMessage('복사 권한을 사용할 수 없습니다. 아래 텍스트를 직접 선택해 복사해주세요.');}}
  async function save(status:string){
    if(!draft.raw.trim()){setMessage('메모 원문을 먼저 입력해주세요.');return;}
    if(!parseMemo(draft.raw).title&&!selected){setMessage('첫 줄에 글 이름: 제목을 입력해주세요.');return;}
    setBusy(true);
    const id=draft.id||crypto.randomUUID();updateDraft(d=>({...d,id}));
    try{
      const result=await request({action:'save',id,base:draft.base,revision:crypto.randomUUID(),raw:draft.raw,status,reviewed:reviewed?reviewKey(basic,draft.raw):''});
      const saved=result.items.find((i:Item)=>i.id===id);updateDraft({id,base:saved.revision,raw:saved.raw,dirty:false});
      setMessage(status==='입력 완료'?'입력 완료로 저장했습니다. 글쓰기 대기에 등록됐습니다.':'Google Sheets에 저장했습니다.');
    }catch(e){setMessage(e.message);}finally{setBusy(false);}
  }
  async function login(e:React.FormEvent){e.preventDefault();setBusy(true);try{await request({action:'login',password});setPassword('');setLocked(false);await request();setMessage('연결했습니다.');}catch(e){setMessage(e.message);}finally{setBusy(false);}}
  return <section className="content-planning" aria-label="콘텐츠 메모">
    <header><div><span className="cp-eyebrow">CONTENT PLANNING</span><h2>틈틈이 메모하고, 한 번에 글쓰기</h2><p>양식 복사 → 메모장에서 작성 → 아래에 붙여넣기 → 저장</p></div><span className="cp-count">작성 대기 {readyCount}건</span></header>
    <div className="cp-toolbar"><button onClick={()=>copy(TEMPLATE)}>양식 복사하기</button><button disabled={busy} onClick={()=>choose()}>새 메모</button><button disabled={busy} onClick={load}>시트 새로 불러오기</button>{data.sheetUrl&&<a href={data.sheetUrl} target="_blank" rel="noreferrer">Google Sheets 열기 ↗</a>}</div>
    <details><summary>메모장용 기본 양식 보기</summary><pre><code>{TEMPLATE}</code></pre><p>글 이름은 네이버 임시저장글과 맞춰주세요. 메모에는 메뉴, 맛, 동행, 가격, 생각난 드립을 순서 없이 적어도 됩니다. 라벨은 선택입니다.</p></details>
    {locked&&<form onSubmit={login} className="cp-connect"><label>기기 연결 <input aria-label="콘텐츠 접근 암호" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="기존 식단 관리 접근 암호"/></label><button disabled={busy||!password}>연결하기</button><small>네이버 로그인과 별개입니다. 회사 공용 PC에서는 작업 후 연결 해제를 눌러주세요.</small></form>}
    {setup&&!locked&&<button disabled={busy} onClick={async()=>{setBusy(true);try{await request({action:'initialize'});setMessage('콘텐츠용 시트 양식을 만들었습니다.');}catch(e){setMessage(e.message);}finally{setBusy(false);}}}>콘텐츠 시트 양식 만들기</button>}
    <div className="cp-grid"><aside><h3>저장한 글</h3>{!data.items.length&&<p>첫 메모를 저장하면 이곳에 표시됩니다.</p>}{data.items.map(item=><button className={draft.id===item.id?'active':''} key={item.id} disabled={busy} onClick={()=>choose(item)}><strong>{item.title}</strong><small>{item.status||'기본정보만 등록'}{item.plannedDate?` · ${item.plannedDate}`:''}</small></button>)}<button disabled={!readyCount} onClick={()=>copy(data.items.filter(i=>i.status==='입력 완료').map(i=>makeBrief(i,i.raw||'',data.rules)).join('\n\n--- 다음 글 ---\n\n'))}>작성 대기 자료 한 번에 복사</button></aside>
    <div className="cp-editor"><label htmlFor="cp-raw">메모장 내용을 여기에 붙여넣으세요</label><textarea disabled={busy} id="cp-raw" value={draft.raw} maxLength={20000} placeholder={TEMPLATE} onChange={e=>{updateDraft(d=>({...d,raw:e.target.value,dirty:true}));setReviewed(false);}}/><div className="cp-meta"><span>{draft.raw.length.toLocaleString()} / 20,000자</span><span>{draft.dirty?'아직 Sheets에 저장하지 않음':selected?.updatedAt?`저장: ${new Date(selected.updatedAt).toLocaleString('ko-KR')}`:'새 메모'}</span></div>
    <details open={!!selected}><summary>시트 기본 정보와 메모 비교 {conflicts.length?`· ${conflicts.length}개 값 확인 필요`:''}</summary><div className="cp-table-scroll"><table><thead><tr><th>항목</th><th>시트 기본 정보</th><th>붙여넣은 메모</th></tr></thead><tbody>{comparisons.map(row=><tr className={row.conflict?'cp-conflict':''} key={row.key}><th>{row.label}</th><td>{row.basic||'—'}</td><td>{row.memo||'—'}{row.conflict&&<b> · 값 다름</b>}</td></tr>)}</tbody></table></div><p>첫 저장 시 라벨 정보를 기본 정보로 등록합니다. 이후 메모 저장은 시트 기본 정보를 덮어쓰지 않습니다. 기본 정보는 Sheets에서 수정하세요. 자유 문장 속 사실은 글 작성 시 함께 대조합니다.</p></details>
    {changed&&<div className="cp-warning">서버에 더 최신 메모가 있습니다. 아래 서버 원문과 비교한 뒤 현재 입력을 유지하거나 목록에서 다시 열어주세요.<pre>{selected?.raw}</pre><button onClick={()=>{updateDraft(d=>({...d,base:selected?.revision||'',dirty:true}));setReviewed(false);}}>현재 입력을 유지하고 최신 버전 위에 저장 준비</button></div>}
    <label className="cp-check"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>기본 정보·원문을 점검했습니다. 값이 다른 내용은 메모에 최종 내용을 적었습니다.</label>
    <div className="cp-toolbar"><button className="cp-primary" disabled={busy||locked||setup||changed} onClick={()=>save('메모 중')}>저장하기</button><button disabled={busy||locked||setup||changed||!reviewed} onClick={()=>save('입력 완료')}>입력 완료 · 글쓰기 대기</button><button disabled={!draft.raw} onClick={()=>copy(makeBrief(basic,draft.raw,data.rules))}>이 글 작성 자료 복사</button></div>
    <p className="cp-hint">입력 완료는 작성 대기 등록입니다. 네이버 글 작성·꾸미기·임시저장은 별도로 진행하며, 발행은 직접 조율합니다.</p>
    </div></div>
    <p role="status" className="cp-message">{busy?'처리 중…':message}</p>
    {serviceAccount&&message.includes('권한')&&<p>연결 계정: {serviceAccount} · 위 Google Sheets에서 이 계정의 편집 권한을 확인해주세요.</p>}
    <details><summary>공통 작성 기준</summary><pre>{data.rules}</pre><p>Google Sheets의 콘텐츠작성설정 탭에서 기준과 참고 글을 보완할 수 있습니다.</p></details>
    {!locked&&<button className="cp-disconnect" disabled={busy} onClick={async()=>{if(draft.dirty&&!window.confirm('저장하지 않은 로컬 메모도 지우고 연결을 해제할까요?'))return;try{await request({action:'logout'});localStorage.removeItem(cacheKey);updateDraft({id:'',base:'',raw:'',dirty:false});setData({items:[],rules:DEFAULT_RULES,sheetUrl:''});setLocked(true);setMessage('연결을 해제하고 이 브라우저의 임시 메모를 지웠습니다. Sheets 기록은 유지됩니다.');}catch(e){setMessage(e.message);}}}>연결 해제 · 이 기기 임시 메모 지우기</button>}
  </section>;
}
