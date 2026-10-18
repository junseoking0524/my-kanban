import { google } from 'googleapis';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { validSummary, encrypt, fold } from '../lib/diet-cloud.js';

const same = (a,b) => {const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);};
const sign = (value,secret) => createHmac('sha256',secret).update('diet-session:'+value).digest('hex');
const cookieName = 'diet_obokpapa_session';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('Vary','Cookie');
  const secret=process.env.DIET_ACCESS_PASSWORD;
  if (!secret || secret.length<24 || !process.env.SHEET_ID || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY)
    return res.status(503).json({error:'동기화 서버 설정이 필요합니다. DIET_ACCESS_PASSWORD는 24자 이상이어야 합니다.'});
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({error:'Method not allowed'});
  if(req.method==='POST') {
    const expected='https://'+req.headers.host;
    if(req.headers.origin!==expected || !String(req.headers['content-type']||'').startsWith('application/json')) return res.status(403).json({error:'요청 출처를 확인할 수 없습니다.'});
  }
  const body=req.body??{};
  if(req.method==='POST' && body.action==='login') {
    if(!same(body.password??'',secret)) return res.status(401).json({error:'접근 암호를 확인해주세요.'});
    const expires=String(Date.now()+30*86400000), token=expires+'.'+sign(expires,secret);
    res.setHeader('Set-Cookie',`${cookieName}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/diet-sync; Max-Age=2592000`);
    return res.status(200).json({ok:true});
  }
  if(req.method==='POST' && body.action==='logout') {
    res.setHeader('Set-Cookie',`${cookieName}=; HttpOnly; Secure; SameSite=Strict; Path=/api/diet-sync; Max-Age=0`);
    return res.status(200).json({ok:true});
  }
  const token=String(req.headers.cookie??'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1)??'';
  const [expires,signature]=token.split('.');
  if(!expires||!signature||!/^\d+$/.test(expires)||Number(expires)<Date.now()||!same(signature,sign(expires,secret))) return res.status(401).json({error:'기기 연결을 위해 접근 암호를 입력해주세요.'});
  if(req.method==='POST' && (body.action!=='save'||!validSummary(body.summary)||!/^[-a-zA-Z0-9]{1,80}$/.test(body.id??'')||!/^[-a-zA-Z0-9]{1,80}$/.test(body.writer??'')||typeof body.base!=='string')) return res.status(400).json({error:'허용된 일별 요약 형식이 아닙니다.'});
  try {
    const auth=new google.auth.GoogleAuth({credentials:{client_email:process.env.GOOGLE_CLIENT_EMAIL,private_key:process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n')},scopes:['https://www.googleapis.com/auth/spreadsheets']});
    const sheets=google.sheets({version:'v4',auth}), spreadsheetId=process.env.SHEET_ID;
    const title=process.env.VERCEL_ENV==='production'?'diet_obokpapa':'diet_obokpapa_preview';
    const meta=await sheets.spreadsheets.get({spreadsheetId,fields:'sheets.properties.title'});
    if(!meta.data.sheets?.some(s=>s.properties.title===title)) {
      try {await sheets.spreadsheets.batchUpdate({spreadsheetId,requestBody:{requests:[{addSheet:{properties:{title,gridProperties:{rowCount:1000,columnCount:9}}}}]}});} catch(err) {
        const check=await sheets.spreadsheets.get({spreadsheetId,fields:'sheets.properties.title'});
        if(!check.data.sheets?.some(s=>s.properties.title===title)) throw err;
      }
    }
    const read=async()=>fold((await sheets.spreadsheets.values.get({spreadsheetId,range:`'${title}'!A:I`})).data.values??[],secret);
    let current=await read();
    if(req.method==='GET') return res.status(200).json(current);
    if(current.revision===body.id) return res.status(200).json(current);
    if(current.writer && current.writer!==body.writer) return res.status(409).json({error:'다른 브라우저가 입력 기기로 연결돼 있습니다. 이 기기에서는 칸반 요약을 조회해주세요.'});
    if(current.revision!==body.base) return res.status(409).json({error:'서버에 더 최신 기록이 있어 덮어쓰기를 중단했습니다. 원래 입력 기기에서 다시 연결해주세요.'});
    const encrypted=encrypt({base:body.base,writer:body.writer,summary:body.summary,at:new Date().toISOString()},secret);
    if(encrypted.length>320000) return res.status(413).json({error:'기록 용량 한도를 초과했습니다. CSV 백업 후 관리자에게 문의해주세요.'});
    const chunks=encrypted.match(/.{1,40000}/g)??[];
    await sheets.spreadsheets.values.append({spreadsheetId,range:`'${title}'!A:I`,valueInputOption:'RAW',insertDataOption:'INSERT_ROWS',requestBody:{values:[[body.id,...chunks]]}});
    current=await read();
    if(current.revision!==body.id) return res.status(409).json({error:'동시 저장 충돌로 이 변경은 반영되지 않았습니다. 로컬 기록은 유지됩니다.'});
    return res.status(200).json(current);
  } catch {return res.status(502).json({error:'Google Sheets 연결 또는 암호화 기록 확인에 실패했습니다. 기존 데이터와 접근 암호 설정을 확인해주세요.'});}
}
