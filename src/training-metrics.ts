import type {Day,State,Workout} from './nutrition-data.ts';
import {offsetDate,workoutVolume} from './nutrition-data.ts';
export const parts=['하체','등','가슴','어깨','팔','코어','미분류'] as const;
export type Part=typeof parts[number];
export type TrainingSummary={sets:number;volume:number;partSets:Partial<Record<Part,number>>;unknownSets:number};
export function musclePart(w:Workout):Part {
 if(parts.includes(w.bodyPart as Part)&&w.bodyPart!=='미분류')return w.bodyPart as Part;
 const n=w.name.toLowerCase();
 if(/레터럴|레이즈|숄더|업라이트|리버스.*플라이|shoulder|lateral|reverse.*fly/.test(n))return '어깨';
 if(/스쿼트|레그|런지|데드리프트|힙|카프|squat|leg|lunge|deadlift/.test(n))return '하체';
 if(/벤치|체스트|푸시업|딥스|펙덱|chest|bench|push.?up/.test(n))return '가슴';
 if(/풀다운|풀업|친업|로우|row|pull/.test(n))return '등';
 if(/컬|푸시다운|트라이셉|curl|triceps/.test(n))return '팔';
 if(/플랭크|크런치|데드버그|팔로프|plank|crunch/.test(n))return '코어';
 if(parts.includes(w.bodyPart as Part))return w.bodyPart as Part;
 return '미분류';
}
export function trainingSummary(d?:Day):TrainingSummary {
 if(d?.trainingSummary&&!d.workouts?.length)return d.trainingSummary;
 const result:TrainingSummary={sets:0,volume:workoutVolume(d?.workouts??[]),partSets:{},unknownSets:0};
 for(const w of d?.workouts??[]){const done=w.sets.filter(s=>s.done);const p=musclePart(w);result.sets+=done.length;result.partSets[p]=(result.partSets[p]??0)+done.length;result.unknownSets+=done.filter(s=>s.kg===null||s.reps===null).length;}
 return result;
}
export function activityStatus(d?:Day){
 if(!d)return 'missing';
 if(d.exerciseDone===true||trainingSummary(d).sets>0||d.minutes>0&& !['미기록','휴식','안 함',''].includes(d.exercise))return 'done';
 if(d.exercise==='휴식'||d.exercise==='안 함')return 'rest';
 return 'missing';
}
export function monday(date:string){const day=new Date(date+'T12:00:00Z').getUTCDay();return offsetDate(date,-((day+6)%7));}
export function trainingWeeks(state:State,anchor:string,weeks=4,asOf=anchor){
 const start=offsetDate(monday(anchor),-7*(weeks-1));
 return Array.from({length:weeks},(_,week)=>{
  const days=Array.from({length:7},(_,i)=>{const date=offsetDate(start,week*7+i),d=state.days[date];return {date,weight:d?.morning,status:date>asOf?'future':activityStatus(d),training:trainingSummary(d)};});
  const weights=days.filter(d=>d.date<=asOf&&d.weight!==undefined).map(d=>d.weight!);
  return {start:days[0].date,days,mean:weights.length?weights.reduce((a,b)=>a+b,0)/weights.length:null,weightDays:weights.length,done:days.filter(d=>d.status==='done').length,rest:days.filter(d=>d.status==='rest').length,sets:days.filter(d=>d.date<=asOf).reduce((a,b)=>a+b.training.sets,0)};
 });
}
export function recentTraining(state:State,date:string){
 const partSets:Partial<Record<Part,number>>={};const latest:Partial<Record<Part,string>>={};let recorded=0,unknown=0;
 for(let i=6;i>=0;i--){const key=offsetDate(date,-i),d=state.days[key];if(activityStatus(d)!=='missing')recorded++;const s=trainingSummary(d);unknown+=s.unknownSets;for(const p of parts){partSets[p]=(partSets[p]??0)+(s.partSets[p]??0);if(s.partSets[p])latest[p]=key;}}
 return {partSets,latest,recorded,unknown};
}
export const routines:Record<string,{name:string;sets:number;reps:number;cue:string}[]>={
 '하체':[{name:'레그 프레스',sets:3,reps:10,cue:'골반이 들리지 않는 편안한 범위'},{name:'시티드 레그 컬',sets:2,reps:12,cue:'반동 없이 천천히'}],
 '등':[{name:'체스트 서포티드 로우',sets:3,reps:10,cue:'가슴 지지 유지, 허리 반동 줄이기'},{name:'뉴트럴 그립 랫 풀다운',sets:2,reps:10,cue:'편안한 범위에서 당기기'}],
 '가슴':[{name:'머신 체스트 프레스',sets:3,reps:10,cue:'통증 없는 깊이, 손목과 팔꿈치 정렬'}],
 '어깨':[{name:'덤벨 레터럴 레이즈',sets:2,reps:12,cue:'가벼운 무게로 편안한 범위, 억지로 어깨를 내리지 않기'}],
 '팔':[{name:'케이블 컬',sets:2,reps:12,cue:'몸통 반동 없이'},{name:'케이블 푸시다운',sets:2,reps:12,cue:'팔꿈치 위치 유지'}],
 '코어':[{name:'데드버그',sets:2,reps:8,cue:'호흡 유지, 허리를 과하게 젖히지 않기'}],
};
export function trainingAdvice(state:State,date:string){
 const recent=recentTraining(state,date),d=state.days[date];
 if(d?.pain===true)return {...recent,title:'오늘은 통증 확인이 먼저',reason:'통증을 유발하는 운동은 제외하고 지속되거나 악화되면 전문가에게 확인하세요.',focus:[] as Part[],routine:[],blocked:true};
 if(activityStatus(d)==='done')return {...recent,title:'오늘 운동은 기록 완료',reason:'추가 볼륨을 채우기보다 회복과 내일 컨디션을 확인하세요.',focus:[] as Part[],routine:[],blocked:true};
 if(d?.exercise==='휴식'||d?.condition?.includes('피곤')||(d?.rpe??0)>=9)return {...recent,title:'회복 우선 · 휴식 또는 가벼운 걷기',reason:'오늘 기록한 휴식·피로 정보를 반영했습니다. 편안하면 가벼운 걷기 정도를 선택하세요.',focus:[] as Part[],routine:[],blocked:true};
 const candidates=(['하체','등','가슴','어깨','팔','코어'] as Part[]).filter(p=>!recent.latest[p]||recent.latest[p]!<offsetDate(date,-1)).sort((a,b)=>(recent.partSets[a]??0)-(recent.partSets[b]??0));
 const focus=candidates.slice(0,2);const blocked=d?.pain!==false||!d?.condition;
 return {...recent,title:focus.length?`${focus.join(' + ')} · 오늘의 운동 후보`:'오늘은 회복을 확인하세요',reason:recent.recorded<7?`최근 7일 중 ${recent.recorded}일만 운동/휴식 기록이 있어 잠정 제안입니다. 기록이 적은 부위를 우선했고, 미기록을 실제 운동 부족으로 단정하지 않습니다.`:'최근 7일의 주 부위별 세트와 최근 운동일을 비교했습니다. 세트가 적은 부위를 우선합니다.',focus,routine:focus.flatMap(p=>(routines[p]??[]).map(x=>({...x,part:p}))),blocked};
}
