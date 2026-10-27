import type {Day,State,Workout,WorkoutSet} from './nutrition-data.ts';
import {emptyDay,validDate,validateState} from './nutrition-data.ts';
import {musclePart} from './training-metrics.ts';
export type FleekActivity={name:string;seconds:number|null;distanceRaw:number|null;rpe:number|null;setType:string;grip:string};
export type CsvDay={date:string;workouts:Workout[];activities:FleekActivity[];fingerprint:string;rows:number;sessions:number};
export type CsvImport={days:CsvDay[];rows:number;warnings:string[]};
const headers=['Date','Exercise','Weight(kg)','Reps','Duration(s)','Distance(m)','Rpe','Set type','Grip type'];
// RFC 4180: repeated equal rows are real sets and must never be deduplicated.
export function csvRows(text:string):string[][] {
 if(text.length>5_000_000)throw Error('CSV는 5MB 이하여야 합니다.');
 text=text.replace(/^\uFEFF/,'');const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell||closed)throw Error('CSV 따옴표 형식을 확인해주세요.');quoted=true;continue;}
  if(c===','||c==='\r'||c==='\n'){row.push(cell);cell='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(v=>v!==''))rows.push(row);row=[];if(rows.length>50001)throw Error('한 번에 50,000행까지 가져올 수 있습니다.');}continue;}
  if(closed)throw Error('CSV 따옴표 뒤 구분자를 확인해주세요.');cell+=c;
 }
 if(quoted)throw Error('CSV 따옴표가 닫히지 않았습니다.');row.push(cell);if(row.some(v=>v!==''))rows.push(row);return rows;
}
const bounded=(s:string,max:number,label:string,row:number)=>{if(s==='-'||s==='')return null;if(!/^\d+(\.\d+)?$/.test(s)||!Number.isFinite(+s)||+s>max)throw Error(`${row}행 ${label} 값을 확인해주세요.`);return +s;};
const digest=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(x=>x.toString(16).padStart(2,'0')).join('');
export async function parseFleekCsv(text:string):Promise<CsvImport>{
 const rows=csvRows(text),head=rows.shift();if(!head||new Set(head).size!==head.length||headers.some(h=>!head.includes(h)))throw Error('Fleek CSV 원본(Date, Exercise, Weight(kg), Reps 등)을 선택해주세요.');
 if(!rows.length)throw Error('운동 기록이 없는 CSV입니다.');
 const by=new Map<string,{raw:string[];workouts:Map<string,Workout>;activities:FleekActivity[];sessions:Set<string>}>();let distances=0,rpeCount=0;
 for(let i=0;i<rows.length;i++){
  const row=rows[i];if(row.length!==head.length)throw Error(`${i+2}행 열 개수가 다릅니다.`);const r=Object.fromEntries(head.map((h,j)=>[h,row[j].trim()]));
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(r.Date)||!validDate(r.Date.slice(0,10))||!Number.isFinite(Date.parse(r.Date)))throw Error(`${i+2}행 날짜·시간대가 올바르지 않습니다.`);
  const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date(r.Date));
  if(!r.Exercise||r.Exercise.length>100)throw Error(`${i+2}행 운동명을 확인해주세요.`);
  const kg=bounded(r['Weight(kg)'],2000,'중량',i+2),reps=bounded(r.Reps,2000,'반복수',i+2),seconds=bounded(r['Duration(s)'],86400,'시간',i+2),distanceRaw=bounded(r['Distance(m)'],1000000,'거리',i+2),rpe=bounded(r.Rpe,10,'RPE',i+2);
  if(distanceRaw!==null)distances++;if(rpe!==null)rpeCount++;
  const d=by.get(date)??{raw:[],workouts:new Map(),activities:[],sessions:new Set()};d.sessions.add(r.Date);d.raw.push(JSON.stringify(headers.map(h=>r[h])));
  if(reps!==null){const key=r.Date+'\u0000'+r.Exercise;const w=d.workouts.get(key)??{name:r.Exercise,bodyPart:musclePart({name:r.Exercise,bodyPart:'미분류',sets:[]}),sets:[]};const set:WorkoutSet={kg,reps,done:true,csvMeta:{seconds,distanceRaw,rpe,setType:r['Set type'],grip:r['Grip type']}};w.sets.push(set);if(w.sets.length>100)throw Error(`${date} ${w.name}: 세트가 100개를 넘습니다.`);d.workouts.set(key,w);}else d.activities.push({name:r.Exercise,seconds,distanceRaw,rpe,setType:r['Set type'],grip:r['Grip type']});
  if(d.workouts.size>100||d.activities.length>500)throw Error(`${date} 하루 기록 한도를 초과했습니다.`);by.set(date,d);
 }
 const days=await Promise.all([...by.entries()].sort(([a],[b])=>a.localeCompare(b)).map(async([date,d])=>({date,workouts:[...d.workouts.values()],activities:d.activities,rows:d.raw.length,sessions:d.sessions.size,fingerprint:await digest(d.raw.sort().join('\n'))})));
 const warnings=['날짜는 한국 시간으로 변환합니다. 같은 중량·횟수가 반복된 행도 각각 1세트로 유지합니다.','CSV에 체중·소모 칼로리·전체 운동시간은 없습니다. 기존 값은 유지하며 새 값은 추정하지 않습니다.'];
 if(distances)warnings.push(`거리 ${distances}행은 단위 확인 전까지 원본 숫자로만 보관합니다. km 합계에 넣지 않습니다.`);
 if(!rpeCount)warnings.push('RPE가 비어 있어 운동 강도를 추정하지 않습니다.');
 return {days,rows:rows.length,warnings};
}
export function csvDayStatus(state:State,d:CsvDay):'new'|'same'|'conflict'{
 const old=state.days[d.date];if(old?.fleekCsv?.fingerprint===d.fingerprint)return 'same';
 return old&&(old.workouts?.length||old.fleekActivities?.length||old.exerciseDone||old.exercise!=='미기록'||old.minutes>0||old.workoutReport)?'conflict':'new';
}
export function mergeFleekCsv(state:State,input:CsvImport,replaceDates:string[]=[]){
 const days={...state.days};let added=0,replaced=0,skipped=0;
 for(const d of input.days){const status=csvDayStatus(state,d);if(status==='same'||status==='conflict'&&!replaceDates.includes(d.date)){skipped++;continue;}
  const old=days[d.date]??emptyDay();days[d.date]={...old,workouts:d.workouts,fleekActivities:d.activities,fleekCsv:{fingerprint:d.fingerprint,rows:d.rows,sessions:d.sessions},exerciseDone:true,exercise:d.workouts.length?'근력':d.activities.some(x=>/러닝|트레드밀|스텝|사이클|수영|걷기|자전거/.test(x.name))?'유산소':'야외 활동',trainingSummary:undefined};
  if(status==='new')added++;else replaced++;
 }
 const next={...state,days};if(!validateState(next))throw Error('가져온 데이터가 저장 형식과 맞지 않습니다. 기존 기록은 변경하지 않았습니다.');
 return {state:next,added,replaced,skipped};
}
