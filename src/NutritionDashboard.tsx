import TrainingOverview from './TrainingOverview';
import DietOverview from './DietOverview';
import './diet-quick.css';
import DietSyncPanel from './DietSyncPanel';
import { dashboardState } from './diet-sync';
import { GoalSummary, MacroSummary } from './NutritionTools';
import { useEffect, useState } from 'react';
import { initial, emptyDay, today, offsetDate, totals, validateState } from './nutrition-data';
import type { State } from './nutrition-data';
import './nutrition.css';
const KEY='austin-nutrition-v1';
export default function NutritionDashboard() {
 const [cloud,setCloud]=useState(false);
 const [state,setState]=useState<State>(initial),[error,setError]=useState('');
 useEffect(()=>{const refresh=()=>{if(cloud)return;try{const raw=localStorage.getItem(KEY);if(!raw){setState(initial());setError('');return;}const value=JSON.parse(raw);if(!validateState(value))throw Error();setState(value);setError('');}catch{setError('기록을 읽지 못했습니다. 입력·관리 페이지에서 백업을 확인해주세요.');}};refresh();const storage=(e:StorageEvent)=>{if(e.key===KEY||e.key===null)refresh();};window.addEventListener('storage',storage);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{window.removeEventListener('storage',storage);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[cloud]);
 const [date,setDate]=useState(today); const day=state.days[date]??emptyDay(),sum=totals(day),settings=state.settings;
 const week=Object.entries(state.days).filter(([d])=>d>=offsetDate(date,-6)&&d<=date).sort(([a],[b])=>a.localeCompare(b));
 const weights=week.map(([,d])=>d.morning).filter((n):n is number=>n!==undefined);
 const average=weights.length?weights.reduce((a,b)=>a+b,0)/weights.length:null;
 const all=Object.entries(state.days).sort(([a],[b])=>b.localeCompare(a));
 return <div className="nt"><header className="nt-heading"><div><span className="nt-eyebrow">diet_obokpapa</span><h1>식단 대시보드</h1><p>근육 증가 · 체중 감량 | {date}</p></div><a className="nt-link-primary" href="/nutrition.html" target="_blank" rel="noopener noreferrer">입력·관리 열기 ↗</a></header>
 <p className="nt-status" role="status">{error||'요약 전용 화면 · 입력·관리 페이지의 기록을 읽어 표시합니다.'}</p>
 <details className="nt-card"><summary>기기 연결 및 동기화</summary><DietSyncPanel onRead={r=>{setCloud(true);setState(dashboardState(r));setError(r.summary?'서버 요약 조회 중':'서버에 저장된 요약이 없습니다.');}}/></details><TrainingOverview state={state} date={date} onDate={setDate}/><GoalSummary state={state} date={date}/><DietOverview state={state} date={date} onDate={setDate}/>
 <p className="nt-note">기기 연결 전에는 이 브라우저 기록을 표시합니다. 연결 후에는 입력 기기가 올린 서버 요약만 조회하며, 메뉴명과 식단 이미지는 표시하지 않습니다.</p>
 </div>;
}
