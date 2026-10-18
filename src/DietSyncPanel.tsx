import { useEffect, useRef, useState } from 'react';
import type { State } from './nutrition-data';
import { cloudRequest, summary, CloudError } from './diet-sync';
import type { CloudRecord } from './diet-sync';

const ACK='diet_obokpapa_ack',DEVICE='diet_obokpapa_device',PENDING='diet_obokpapa_pending';
export default function DietSyncPanel({state,onRead}:{state?:State;onRead?:(r:CloudRecord)=>void}) {
  const [password,setPassword]=useState(''),[message,setMessage]=useState('기기 연결 전 · 입력 기록은 이 브라우저에 보관됩니다.'),[active,setActive]=useState(false),[busy,setBusy]=useState(false);
  const latest=useRef(state);latest.current=state;
  const callback=useRef(onRead);callback.current=onRead;
  const sending=useRef(false),revision=useRef('0'),writer=useRef('');
  async function connect(login=false) {
    setBusy(true);
    try {
      if(login){await cloudRequest({action:'login',password});setPassword('');}
      const remote=await cloudRequest();callback.current?.(remote);
      if(latest.current) {
        writer.current=localStorage.getItem(DEVICE)??crypto.randomUUID();localStorage.setItem(DEVICE,writer.current);
        if(remote.writer&&remote.writer!==writer.current)throw Error('다른 브라우저가 입력 기기입니다. 여기서는 칸반 요약을 조회할 수 있습니다.');
        const pending=JSON.parse(localStorage.getItem(PENDING)??'null');
        if(pending?.id===remote.revision){localStorage.setItem(ACK,JSON.stringify({revision:remote.revision,body:JSON.stringify(pending.summary)}));localStorage.removeItem(PENDING);}
        const ack=JSON.parse(localStorage.getItem(ACK)??'null');
        if(remote.summary&&remote.revision!==ack?.revision&&JSON.stringify(summary(latest.current))!==JSON.stringify(remote.summary))throw Error('서버 기록과 이 기기 기록이 다릅니다. 자동 덮어쓰기를 중단했습니다. JSON 백업을 보관해주세요.');
        revision.current=remote.revision;
        if(remote.summary&&JSON.stringify(summary(latest.current))===JSON.stringify(remote.summary))localStorage.setItem(ACK,JSON.stringify({revision:remote.revision,body:JSON.stringify(remote.summary)}));
      }
      setActive(true);setMessage(remote.updatedAt?`연결됨 · 서버 저장 ${new Date(remote.updatedAt).toLocaleString('ko-KR')}`:'연결됨 · 첫 요약 저장 대기');
    } catch(e){setActive(false);setMessage((e as Error).message);}finally{setBusy(false);}
  }
  useEffect(()=>{
    if(!active)return;
    let cancelled=false;
    async function sync() {
      if(sending.current||!navigator.onLine)return;
      sending.current=true;
      try {
        if(!latest.current){const r=await cloudRequest();if(!cancelled){callback.current?.(r);setMessage(r.updatedAt?`서버 요약 · ${new Date(r.updatedAt).toLocaleString('ko-KR')}`:'서버 기록 없음');}return;}
        const encoded=JSON.stringify(summary(latest.current)),ack=JSON.parse(localStorage.getItem(ACK)??'null');
        let pending=JSON.parse(localStorage.getItem(PENDING)??'null');
        if(!pending&&ack?.body===encoded)return;
        if(!pending){pending={action:'save',id:crypto.randomUUID(),writer:writer.current,base:revision.current,summary:JSON.parse(encoded)};localStorage.setItem(PENDING,JSON.stringify(pending));}
        const r=await cloudRequest(pending);
        revision.current=r.revision;
        localStorage.setItem(ACK,JSON.stringify({revision:r.revision,body:JSON.stringify(pending.summary)}));
        localStorage.removeItem(PENDING);
        if(!cancelled)setMessage(`요약 동기화 완료 · ${new Date(r.updatedAt!).toLocaleString('ko-KR')}`);
      } catch(e){if(!cancelled){const stop=e instanceof CloudError&&[400,401,403,409,413].includes(e.status);if(stop)setActive(false);setMessage(`${(e as Error).message} · 로컬 기록 유지${stop?' · 자동 전송 중단':', 연결 복구 후 재시도'}`);}}finally{sending.current=false;}
    }
    void sync();const timer=window.setInterval(sync,state?5000:30000);
    window.addEventListener('online',sync);window.addEventListener('focus',sync);
    return()=>{cancelled=true;clearInterval(timer);window.removeEventListener('online',sync);window.removeEventListener('focus',sync);};
  },[active,!!state]);
  return <section className="nt-card"><h3>diet_obokpapa · 기기 연결</h3><p role="status">{message}</p>{!active&&<><label className="nt-field">앱 전용 접근 암호<input type="password" autoComplete="off" value={password} onChange={e=>setPassword(e.target.value)}/></label><div className="nt-buttons"><button disabled={busy||!password} onClick={()=>void connect(true)}>암호로 연결</button><button disabled={busy} onClick={()=>void connect()}>기존 로그인으로 연결</button></div></>}{active&&<button onClick={async()=>{await cloudRequest({action:'logout'});setActive(false);setMessage('이 기기의 연결을 해제했습니다.');}}>로그아웃</button>}<p className="nt-note">{state?'입력은 처음 연결한 브라우저 한 곳에서 진행합니다. 페이지가 열려 있을 때 5초마다 변경된 일별 요약을 저장하고, 끊긴 연결은 재시도합니다.':'연결 후 30초마다 서버 요약을 새로 읽습니다.'} 식단표·메뉴명·사진·운동 세트 상세는 전송하지 않습니다. 암호는 저장하지 않고 로그인 쿠키만 사용합니다.</p></section>;
}
