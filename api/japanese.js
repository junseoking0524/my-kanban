import { google } from 'googleapis';

// 일본어 학습 DB(구글 시트)를 읽기 전용으로 가져온다. 쓰기는 학습지 파이프라인이 직접 한다.
// 서비스 계정(GOOGLE_CLIENT_EMAIL)에 해당 시트의 '뷰어' 권한이 있어야 한다.
const JP_SHEET_ID = process.env.JP_SHEET_ID;
export const JP_RANGES = {
  words: '단어장!A2:K2000',
  grammar: '문법!A2:J1000',
  talk: "'회화·핵심문장'!A2:J1000",
  articles: '기사목록!A2:I1000',
  lesson: "'수업 표현'!A2:O1000",
};

let cache = null;
const CACHE_MS = 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET만 지원해요' });
  if (!JP_SHEET_ID) return res.status(503).json({ error: 'JP_SHEET_ID 환경 변수가 없어요' });
  const fresh = req.query?.fresh === '1';
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return res.status(200).json(cache.body);
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const keys = Object.keys(JP_RANGES);
    const resp = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: JP_SHEET_ID,
      ranges: keys.map(k => JP_RANGES[k]),
    });
    const body = { fetchedAt: new Date().toISOString() };
    keys.forEach((k, i) => { body[k] = resp.data.valueRanges?.[i]?.values || []; });
    cache = { at: Date.now(), body };
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(body);
  } catch (e) {
    console.error('Japanese sheet read error:', e.message);
    const denied = /permission|403|not found|404/i.test(e.message);
    return res.status(denied ? 403 : 500).json({
      error: denied ? '서비스 계정이 일본어 학습 시트를 읽을 권한이 없어요. 시트를 서비스 계정 이메일과 공유해 주세요.' : '시트를 읽지 못했어요',
    });
  }
}
