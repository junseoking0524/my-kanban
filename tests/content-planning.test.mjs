import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {google} from 'googleapis';
import handler from '../api/content-planning.js';
import {parseMemo,compareMemo,foldMemos,makeBrief,reviewKey,BASE_HEADERS,MEMO_HEADERS} from '../lib/content-planning.js';
test('Korean Notepad CRLF and free prose preserve source while extracting only known labels',()=>{
 const raw='글 이름： 마늘치킨\r\n메모:\r\n마늘향 대박.\r\n드립: 마늘 먹고 사람됨\r\n가격: 19000\r\n발행 예정일: 2026-11-01';
 assert.deepEqual(parseMemo(raw),{title:'마늘치킨',price:'19000',plannedDate:'2026-11-01'});
 const basic={id:'one',title:'마늘치킨',price:'17000'};
 assert.equal(compareMemo(basic,raw).filter(r=>r.conflict).length,1);
 assert.ok(makeBrief(basic,raw).includes(raw));assert.ok(makeBrief(basic,raw).includes('시트 [17000] / 메모 [19000]'));
});
test('stale concurrent edits and retries never replace winning revisions; other posts remain independent',()=>{
 const rows=[MEMO_HEADERS,['r1','a','','1','메모 중','old'],['r1','a','','1','메모 중','retry'],['r2','a','r1','2','메모 중','winner'],['r3','a','r1','3','메모 중','loser'],['r4','b','','4','메모 중','other']];
 const result=foldMemos(rows);assert.equal(result.records[0].raw,'winner');assert.deepEqual(result.rejected,['r3']);assert.equal(result.records[1].raw,'other');
});
test('API authenticates before Sheets and blocks cross-origin writes',async()=>{
 const old=process.env.DIET_ACCESS_PASSWORD;process.env.DIET_ACCESS_PASSWORD='testing-only-secret-long-enough-123';
 const res={setHeader(){},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};
 try {await handler({method:'GET',headers:{}},res);assert.equal(res.code,401);await handler({method:'POST',headers:{host:'test.example',origin:'https://evil.example','content-type':'application/json'},body:{}},res);assert.equal(res.code,403);}finally{if(old===undefined)delete process.env.DIET_ACCESS_PASSWORD;else process.env.DIET_ACCESS_PASSWORD=old;}
});
test('save, reload, direct Sheet edit, stale save, and readiness validation round trip',async()=>{
 const keys=['DIET_ACCESS_PASSWORD','CONTENT_ACCESS_PASSWORD','CONTENT_SHEET_ID','SHEET_ID','GOOGLE_CLIENT_EMAIL','GOOGLE_PRIVATE_KEY','VERCEL_ENV'];const original=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{DIET_ACCESS_PASSWORD:'testing-only-secret-long-enough-123',CONTENT_SHEET_ID:'test-sheet',GOOGLE_CLIENT_EMAIL:'test@example.com',GOOGLE_PRIVATE_KEY:'test',VERCEL_ENV:'production'});delete process.env.CONTENT_ACCESS_PASSWORD;
 const rows=[[BASE_HEADERS],[MEMO_HEADERS],[['항목','내용'],['작성 원칙','test rules'],['참고 글','reference prose']]];
 const titles=['콘텐츠기본정보','콘텐츠메모이력','콘텐츠작성설정'];const originalSheets=google.sheets;
 google.sheets=()=>({spreadsheets:{get:async()=>({data:{sheets:titles.map(title=>({properties:{title}}))}}),values:{batchGet:async()=>({data:{valueRanges:rows.map(values=>({values}))}}),append:async input=>{assert.equal(input.valueInputOption,'RAW');const n=titles.findIndex(t=>input.range.includes(t));rows[n].push(...input.requestBody.values);return {data:{}};}}}});
 const expires=String(Date.now()+60000),signature=createHmac('sha256',process.env.DIET_ACCESS_PASSWORD).update('content-session:'+expires).digest('hex');
 const headers={host:'test.example',origin:'https://test.example','content-type':'application/json',cookie:`content_planning_session=${expires}.${signature}`};
 const call=async(body)=>{const res={setHeader(){},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};await handler({method:body?'POST':'GET',headers,body},res);return res;};
 try {
 const raw='글 이름: 테스트\n가격: =1+1\n메모:\n맛 메모';
 let result=await call({action:'save',id:'a',revision:'r1',base:'',raw,status:'메모 중'});assert.equal(result.code,200);assert.equal(rows[0][1][6],'=1+1');
 result=await call();assert.equal(result.body.items[0].raw,raw);assert.ok(result.body.rules.includes('reference prose'));
 rows[0][1][6]='20000';
 result=await call({action:'save',id:'a',revision:'r2',base:'r1',raw:raw+'\n추가 메모',status:'메모 중'});assert.equal(result.code,200);assert.equal(rows[0][1][6],'20000');
 result=await call({action:'save',id:'a',revision:'r3',base:'r1',raw:'stale',status:'메모 중'});assert.equal(result.code,409);assert.equal(rows[1].length,3);
 result=await call({action:'save',id:'a',revision:'r4',base:'r2',raw,status:'입력 완료',reviewed:'stale'});assert.equal(result.code,409);
 const current=(await call()).body.items[0];
 result=await call({action:'save',id:'a',revision:'r5',base:'r2',raw,status:'입력 완료',reviewed:reviewKey(current,raw)});assert.equal(result.code,200);assert.equal(result.body.items[0].status,'입력 완료');
 rows[0][1][6]='21000';assert.equal((await call()).body.items[0].status,'재점검 필요');
 result=await call({action:'save',id:'b',revision:'r6',base:'',raw,status:'메모 중'});assert.equal(result.code,409);
 }finally{google.sheets=originalSheets;for(const k of keys){if(original[k]===undefined)delete process.env[k];else process.env[k]=original[k];}}
});
