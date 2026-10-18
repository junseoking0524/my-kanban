import test from 'node:test';
import assert from 'node:assert/strict';
import {summary,dashboardState} from '../src/diet-sync.ts';
import {initial,emptyDay,totals} from '../src/nutrition-data.ts';
import {validSummary,encrypt,decrypt,fold} from '../lib/diet-cloud.js';
import handler from '../api/diet-sync.js';
const secret='test-only-not-a-real-password-12345';
const base=()=>{const s=initial();s.days['2026-10-18']={...emptyDay(),morning:80,meals:[{id:'meal',name:'PRIVATE MENU',portion:'secret portion',source:'test',meal:'lunch',amount:1,kcal:500,protein:30,carbs:null,fat:null}],workouts:[{name:'PRIVATE WORKOUT',bodyPart:'등',sets:[{kg:20,reps:10,done:true}]}]};s.plans['2026-10-19']=[{name:'PRIVATE PLAN'}];return s;};
test('cloud projection excludes menu, plan, photo, workout names and keeps aggregates',()=>{
 const s=summary(base());assert.equal(validSummary(s),true);assert.equal(JSON.stringify(s).includes('PRIVATE'),false);
 assert.equal(s.days['2026-10-18'].volume,200);assert.equal(s.days['2026-10-18'].sets,1);
 const d=dashboardState({summary:s});assert.equal(totals(d.days['2026-10-18']).unknownMacros,1);assert.equal(totals(d.days['2026-10-18']).protein,30);
 assert.equal(validSummary({...s,plans:{}}),false);s.days['2026-10-18'].meals=[];assert.equal(validSummary(s),false);
});
test('authenticated encryption detects wrong key and corrupted data',()=>{
 const s=summary(base()),cipher=encrypt(s,secret);assert.deepEqual(decrypt(cipher,secret),s);
 assert.equal(cipher.includes('morning'),false);assert.throws(()=>decrypt(cipher,'wrong-key'));const raw=Buffer.from(cipher,'base64');raw[30]^=1;assert.throws(()=>decrypt(raw.toString('base64'),secret));
});
test('concurrent stale snapshots and duplicate retries cannot overwrite accepted state',()=>{
 const row=(id,base,writer,weight)=>{const s=summary(baseState());s.days['2026-10-18'].morning=weight;return [id,encrypt({base,writer,summary:s,at:'2026-10-18T00:00:00Z'},secret)];};
 const baseState=base;
 const a=row('a','0','phone',80),b=row('b','0','phone',90),c=row('c','a','other-device',70),d=row('d','a','phone',79);
 const result=fold([a,b,a,c,d],secret);assert.equal(result.revision,'d');assert.equal(result.summary.days['2026-10-18'].morning,79);
});
test('server fails closed without config and rejects unauthenticated and cross-origin access',async()=>{
 const names=['DIET_ACCESS_PASSWORD','SHEET_ID','GOOGLE_CLIENT_EMAIL','GOOGLE_PRIVATE_KEY'];const old=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 const response=()=>({code:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(v){this.data=v;return this;}});
 try {
 delete process.env.DIET_ACCESS_PASSWORD;let r=response();await handler({method:'GET',headers:{}},r);assert.equal(r.code,503);
 for(const k of names)process.env[k]=k==='DIET_ACCESS_PASSWORD'?secret:'test-only';
 r=response();await handler({method:'GET',headers:{}},r);assert.equal(r.code,401);
 r=response();await handler({method:'POST',headers:{host:'app.example','content-type':'application/json',origin:'https://evil.example'},body:{action:'login',password:secret}},r);assert.equal(r.code,403);
 r=response();await handler({method:'POST',headers:{host:'app.example','content-type':'application/json',origin:'https://app.example'},body:{action:'login',password:secret}},r);assert.equal(r.code,200);assert.match(r.headers['Set-Cookie'],/HttpOnly; Secure; SameSite=Strict/);
 }finally{for(const k of names){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
});
