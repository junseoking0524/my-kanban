import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const numeric = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1000000;
const object = v => v && typeof v === 'object' && !Array.isArray(v);
const keys = (v, allowed) => object(v) && Object.keys(v).every(k => allowed.includes(k));
const text = v => typeof v === 'string' && v.length <= 160;
const date = v => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v+'T12:00:00Z')) && new Date(v+'T12:00:00Z').toISOString().slice(0,10) === v;
export function validSummary(s) {
  if (!keys(s,['days','settings']) || !object(s.days) || Object.keys(s.days).length > 3660) return false;
  if (!keys(s.settings,['calories','protein','carbs','fat','water','goal','bmrHistory'])) return false;
  if (!Object.entries(s.settings).every(([k,v]) => k === 'bmrHistory' ? Array.isArray(v) && v.length<=100 && v.every(x=>keys(x,['month','kcal']) && /^\d{4}-(0[1-9]|1[0-2])$/.test(x.month) && numeric(x.kcal) && x.kcal>0 && x.kcal<=10000) : k === 'goal' ? keys(v,['startWeight','targetWeight','startDate']) && numeric(v.startWeight) && numeric(v.targetWeight) && date(v.startDate) : numeric(v))) return false;
  return Object.entries(s.days).every(([d,r]) => date(d) && keys(r,['morning','bedtimeWeight','water','sleep','breakfast','supplements','exercise','minutes','intensity','bodyPart','burned','nutrition','mealCount','sets','volume','activityCalories','distance','heartRate','rpe','condition','dietComplete','trainingSummary','exerciseDone','pain','workoutReport']) &&
    ['morning','bedtimeWeight','water','minutes','burned','mealCount','sets','volume','activityCalories','distance','heartRate','rpe'].every(k => r[k] === undefined || numeric(r[k])) &&
    (r.trainingSummary===undefined||keys(r.trainingSummary,['sets','volume','partSets','unknownSets'])&&['sets','volume','unknownSets'].every(k=>numeric(r.trainingSummary[k]))&&keys(r.trainingSummary.partSets,['하체','등','가슴','어깨','팔','코어','미분류'])&&Object.values(r.trainingSummary.partSets).every(numeric)) && (r.workoutReport===undefined||keys(r.workoutReport,['volume','sets','reps','exercises'])&&Object.values(r.workoutReport).every(v=>v===null||numeric(v))) && ['pain','exerciseDone'].every(k=>r[k]===undefined||typeof r[k]==='boolean') && (r.rpe===undefined||r.rpe<=10) && (r.condition===undefined||text(r.condition)) && (r.dietComplete===undefined||typeof r.dietComplete==='boolean') && ['sleep','breakfast','exercise','intensity','bodyPart'].every(k => text(r[k])) && Array.isArray(r.supplements) && r.supplements.length <= 100 && r.supplements.every(text) &&
    keys(r.nutrition,['kcal','protein','carbs','fat','unknown','unknownMacros']) && ['kcal','protein','carbs','fat','unknown','unknownMacros'].every(k => numeric(r.nutrition[k])));
}
export function encrypt(value, secret) {
  const iv = randomBytes(12), key = createHash('sha256').update('diet_obokpapa:data:'+secret).digest();
  const cipher = createCipheriv('aes-256-gcm',key,iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64');
}
export function decrypt(value, secret) {
  const raw = Buffer.from(value,'base64'), key = createHash('sha256').update('diet_obokpapa:data:'+secret).digest();
  const cipher = createDecipheriv('aes-256-gcm',key,raw.subarray(0,12));
  cipher.setAuthTag(raw.subarray(12,28));
  return JSON.parse(Buffer.concat([cipher.update(raw.subarray(28)),cipher.final()]).toString('utf8'));
}
// The Sheets append order is the commit order. A stale base never replaces a newer snapshot.
// Retrying the same operation ID is idempotent even after an ambiguous network failure.
export function fold(rows, secret) {
  let current = {revision:'0',writer:null,summary:null,updatedAt:null};
  const seen = new Set();
  for (const row of rows) {
    if (!row[0] || seen.has(row[0])) continue;
    seen.add(row[0]);
    const event = decrypt(row.slice(1).join(''),secret);
    if (event.base !== current.revision || !validSummary(event.summary)) continue;
    if (current.writer && event.writer !== current.writer) continue;
    current = {revision:row[0],writer:event.writer,summary:event.summary,updatedAt:event.at};
  }
  return current;
}
