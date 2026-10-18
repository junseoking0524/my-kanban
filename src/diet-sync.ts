import { initial, emptyDay, totals, workoutVolume } from './nutrition-data.ts';
import type { State } from './nutrition-data.ts';
export const DIET_KEY='austin-nutrition-v1';
export function summary(state:State) {
  const {calories,protein,carbs,fat,water,goal}=state.settings;
  return JSON.parse(JSON.stringify({settings:{calories,protein,carbs,fat,water,goal},days:Object.fromEntries(Object.entries(state.days).map(([date,d])=>[date,{
    morning:d.morning,bedtimeWeight:d.bedtimeWeight,water:d.water,sleep:d.sleep,breakfast:d.breakfast,
    supplements:d.supplements.map(id=>state.supplementProducts?.find(p=>'product:'+p.id===id)?.product??id),exercise:d.exercise,minutes:d.minutes,intensity:d.intensity,bodyPart:d.bodyPart,burned:d.burned,
    nutrition:totals(d),mealCount:d.meals.length,sets:(d.workouts??[]).reduce((n,w)=>n+w.sets.filter(s=>s.done).length,0),volume:workoutVolume(d.workouts??[]),
  }]))}));
}
export type CloudSummary=ReturnType<typeof summary>;
export type CloudRecord={revision:string;writer:string|null;summary:CloudSummary|null;updatedAt:string|null};
export class CloudError extends Error { status:number; constructor(message:string,status:number){super(message);this.status=status;} }
export async function cloudRequest(body?:unknown):Promise<CloudRecord> {
  const res=await fetch('/api/diet-sync',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
  const data=await res.json().catch(()=>({error:'서버 응답을 읽지 못했습니다.'}));
  if(!res.ok)throw new CloudError(data.error??'동기화에 실패했습니다.',res.status);
  return data;
}
// Only the read-only dashboard uses these aggregate rows. They are never restored
// into the input page's food history or uploaded as actual food records.
export function dashboardState(record:CloudRecord):State {
  const s=initial();if(!record.summary)return s;
  s.settings={...s.settings,...record.summary.settings};
  for(const [date,value] of Object.entries(record.summary.days)) {
    const d=value as Record<string,any>,n=d.nutrition;
    s.days[date]={...emptyDay(),...d,meals:d.mealCount?[{id:'daily-summary',name:'일별 합계',portion:'하루',source:'동기화 요약',amount:1,meal:'합계',kcal:n.kcal,protein:n.protein,carbs:n.carbs,fat:n.fat}]:[]};
    // Carry missing-value counts without inventing nutritional values.
    (s.days[date] as any).cloudNutrition=n;
  }
  return s;
}
