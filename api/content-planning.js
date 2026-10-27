import {google} from 'googleapis';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {BASE_HEADERS,MEMO_HEADERS,DEFAULT_RULES,TEMPLATE,FIELDS,parseMemo,foldMemos,reviewKey} from '../lib/content-planning.js';
export const config={maxDuration:60};
const equal=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);};
const sign=(s,key)=>createHmac('sha256',key).update('content-session:'+s).digest('hex');
const cookie='content_planning_session';
const validId=s=>typeof s==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(s);
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('Vary','Cookie');
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
  if(req.method==='POST'&&(req.headers.origin!=='https://'+req.headers.host||!String(req.headers['content-type']||'').startsWith('application/json')))return res.status(403).json({error:'같은 사이트에서 다시 시도해주세요.'});
  const secret=process.env.CONTENT_ACCESS_PASSWORD||process.env.DIET_ACCESS_PASSWORD;
  if(!secret||secret.length<24)return res.status(503).json({error:'앱 접근 암호 설정을 확인해주세요.'});
  const body=req.body||{};
  if(req.method==='POST'&&body.action==='login'){
    if(!equal(body.password||'',secret))return res.status(401).json({error:'접근 암호를 확인해주세요. 기존 식단 관리 접근 암호를 사용할 수 있습니다.'});
    const expires=String(Date.now()+30*86400000);
    res.setHeader('Set-Cookie',`${cookie}=${expires}.${sign(expires,secret)}; HttpOnly; Secure; SameSite=Strict; Path=/api/content-planning; Max-Age=2592000`);
    return res.status(200).json({ok:true});
  }
  if(req.method==='POST'&&body.action==='logout'){
    res.setHeader('Set-Cookie',`${cookie}=; HttpOnly; Secure; SameSite=Strict; Path=/api/content-planning; Max-Age=0`);return res.status(200).json({ok:true});
  }
  const token=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookie+'='))?.slice(cookie.length+1)||'';
  const [expires,signature]=token.split('.');
  if(!/^\d+$/.test(expires||'')||Number(expires)<Date.now()||!equal(signature||'',sign(expires,secret)))return res.status(401).json({error:'메모를 불러오려면 접근 암호로 연결해주세요.'});
  const spreadsheetId=process.env.CONTENT_SHEET_ID||process.env.SHEET_ID;
  if(!spreadsheetId||!process.env.GOOGLE_CLIENT_EMAIL||!process.env.GOOGLE_PRIVATE_KEY)return res.status(503).json({error:'Google Sheets 연결 설정이 필요합니다.'});
  const suffix=process.env.VERCEL_ENV==='preview'?'_preview':'';
  const titles=['콘텐츠기본정보','콘텐츠메모이력','콘텐츠작성설정'].map(x=>x+suffix);
  const headers=[BASE_HEADERS,MEMO_HEADERS,['항목','내용']];
  const auth=new google.auth.GoogleAuth({credentials:{client_email:process.env.GOOGLE_CLIENT_EMAIL,private_key:process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n')},scopes:['https://www.googleapis.com/auth/spreadsheets']});
  const sheets=google.sheets({version:'v4',auth});
  try{
    const meta=(await sheets.spreadsheets.get({spreadsheetId,fields:'sheets.properties'})).data;
    const missing=titles.filter(t=>!meta.sheets?.some(s=>s.properties.title===t));
    if(missing.length){
      if(body.action!=='initialize')return res.status(409).json({needsSetup:true,error:'콘텐츠 시트 양식을 처음 한 번 만들어주세요.'});
      for(const title of missing){
        const i=titles.indexOf(title);
        const added=await sheets.spreadsheets.batchUpdate({spreadsheetId,requestBody:{requests:[{addSheet:{properties:{title,gridProperties:{rowCount:1000,columnCount:Math.max(10,headers[i].length),frozenRowCount:1}}}}]}});
        const sheetId=added.data.replies[0].addSheet.properties.sheetId;
        await sheets.spreadsheets.batchUpdate({spreadsheetId,requestBody:{requests:[{updateCells:{start:{sheetId,rowIndex:0,columnIndex:0},rows:[{values:headers[i].map(stringValue=>({userEnteredValue:{stringValue}}))},...(i===2?[{values:[{userEnteredValue:{stringValue:'작성 원칙'}},{userEnteredValue:{stringValue:DEFAULT_RULES}}]},{values:[{userEnteredValue:{stringValue:'메모 양식'}},{userEnteredValue:{stringValue:TEMPLATE}}]}]:[])],fields:'userEnteredValue'}},{repeatCell:{range:{sheetId,startRowIndex:0,endRowIndex:1},cell:{userEnteredFormat:{backgroundColor:{red:.94,green:.94,blue:.94},textFormat:{bold:true},wrapStrategy:'WRAP'}},fields:'userEnteredFormat'}},{updateDimensionProperties:{range:{sheetId,dimension:'COLUMNS',startIndex:0,endIndex:headers[i].length},properties:{pixelSize:180},fields:'pixelSize'}}]}});
      }
    }
    const read=async()=>{
      const data=(await sheets.spreadsheets.values.batchGet({spreadsheetId,ranges:[`'${titles[0]}'!A:J`,`'${titles[1]}'!A:G`,`'${titles[2]}'!A:B`]})).data.valueRanges.map(r=>r.values||[]);
      data.forEach((rows,i)=>{if(headers[i].some((h,j)=>rows[0]?.[j]!==h))throw new Error('SCHEMA');});
      const basics=data[0].slice(1).filter(r=>r[0]).map(r=>Object.fromEntries(['id',...Object.keys(FIELDS)].map((k,i)=>[k,r[i]||''])));
      if(new Set(basics.map(b=>b.id)).size!==basics.length)throw new Error('DUPLICATE');
      const {records}=foldMemos(data[1]);
      return {items:basics.map(b=>{const item={...b,...records.find(r=>r.id===b.id)};if(item.status==='입력 완료'&&item.reviewed!==reviewKey(item,item.raw))item.status='재점검 필요';return item;}),rules:(data[2].find(r=>r[0]==='작성 원칙')?.[1]||DEFAULT_RULES)+'\n\n참고 글:\n'+(data[2].find(r=>r[0]==='참고 글')?.[1]||'(미등록)'),sheetUrl:`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,serviceAccount:process.env.GOOGLE_CLIENT_EMAIL};
    };
    let current=await read();
    if(req.method==='GET'||body.action==='initialize')return res.status(200).json(current);
    if(body.action!=='save'||!validId(body.id)||!validId(body.revision)||typeof body.base!=='string'||typeof body.raw!=='string'||body.raw.length>20000||!['메모 중','입력 완료'].includes(body.status))return res.status(400).json({error:'메모 형식을 확인해주세요. 최대 20,000자입니다.'});
    let item=current.items.find(i=>i.id===body.id);
    if(item?.revision===body.revision)return res.status(200).json(current);
    if((item?.revision||'')!==body.base)return res.status(409).json({error:'다른 곳에서 수정된 메모입니다. 입력 내용은 유지됩니다. 새로 불러온 뒤 비교해주세요.'});
    if(!item){
      const fields=parseMemo(body.raw);if(!fields.title)return res.status(400).json({error:'글 이름: 뒤에 네이버 임시저장글의 이름을 적어주세요.'});
      if(current.items.some(i=>i.title===fields.title))return res.status(409).json({error:'같은 글 이름이 있습니다. 목록에서 기존 메모를 선택해주세요.'});
      item={id:body.id,...fields};
      if(body.status==='입력 완료'&&body.reviewed!==reviewKey(item,body.raw))return res.status(409).json({error:'기본 정보와 메모를 다시 점검해주세요.'});
      await sheets.spreadsheets.values.append({spreadsheetId,range:`'${titles[0]}'!A:J`,valueInputOption:'RAW',insertDataOption:'INSERT_ROWS',requestBody:{values:[[body.id,...Object.keys(FIELDS).map(k=>fields[k]||'')]]}});
    }
    if(body.status==='입력 완료'&&body.reviewed!==reviewKey(item,body.raw))return res.status(409).json({error:'기본 정보와 메모를 다시 점검한 뒤 입력 완료로 저장해주세요.'});
    await sheets.spreadsheets.values.append({spreadsheetId,range:`'${titles[1]}'!A:G`,valueInputOption:'RAW',insertDataOption:'INSERT_ROWS',requestBody:{values:[[body.revision,body.id,body.base,new Date().toISOString(),body.status,body.raw,body.reviewed||'']]}});
    current=await read();
    if(current.items.find(i=>i.id===body.id)?.revision!==body.revision)return res.status(409).json({error:'동시 저장 충돌입니다. 입력 원문은 보존되었지만 현재 메모에 반영되지 않았습니다. 새로 불러와 비교해주세요.'});
    return res.status(200).json(current);
  }catch(error){
    if(error.message==='SCHEMA'||error.message==='DUPLICATE')return res.status(409).json({error:'시트 헤더 또는 콘텐츠 ID 중복을 확인해주세요. 기존 데이터는 변경하지 않았습니다.'});
    return res.status(502).json({error:'Google Sheets 연결을 확인해주세요. 시트 편집 권한이 필요할 수 있습니다.',sheetUrl:`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,serviceAccount:process.env.GOOGLE_CLIENT_EMAIL});
  }
}
