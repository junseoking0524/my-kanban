import { google } from 'googleapis';

// 서울더원 파워링크 모니터링: 구글 시트 「서울더원 파워링크 대시보드」를 읽기 전용으로 읽어 돌려준다.
// GET /api/seoulthe1-monitor
// 필요한 환경변수: GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY (기존 칸반과 같은 서비스 계정)
// 선택: MONITOR_SHEET_ID (기본값: 대시보드 시트 ID)
// 서비스 계정 이메일(GOOGLE_CLIENT_EMAIL)에 대시보드 시트를 '뷰어'로 공유해야 읽을 수 있다.

const DEFAULT_SHEET_ID = '1e1Q_leZ1lhjMdE4msoczMslav3wmPu0xMSlIwJdPBb0';

export function parseDashboard(dash = [], kw = []) {
  const cell = (r, c) => (dash[r] && dash[r][c] != null ? String(dash[r][c]) : '');
  // 대시보드!A1:I26 기준 (0-based 행)
  const period = { start: cell(4, 1), end: cell(5, 1), prevStart: cell(6, 1), prevEnd: cell(7, 1) };
  const metrics = [];
  for (let r = 10; r <= 17; r++) {
    if (cell(r, 0)) metrics.push({ label: cell(r, 0), cur: cell(r, 1), prev: cell(r, 2), change: cell(r, 3) });
  }
  const alerts = [];
  for (let r = 10; r <= 16; r++) {
    if (cell(r, 5)) alerts.push({ label: cell(r, 5), threshold: cell(r, 6), value: cell(r, 7), status: cell(r, 8) });
  }
  const recs = [];
  for (let r = 20; r <= 24; r++) {
    if (cell(r, 0)) recs.push({ action: cell(r, 0), count: cell(r, 1) });
  }
  const header = kw[0] || [];
  const idx = (name) => header.indexOf(name);
  const pick = (row, name) => (idx(name) >= 0 && row[idx(name)] != null ? String(row[idx(name)]) : '');
  const keywords = kw.slice(1).filter((r) => r && r[0]).map((r) => ({
    keyword: pick(r, '키워드'), group: pick(r, '그룹'), action: pick(r, '추천'), diagnosis: pick(r, '진단'),
    bid: pick(r, '현재 입찰가(원)'), proposed: pick(r, '추천 입찰가(원)'), target: pick(r, '목표순위'),
    rank: pick(r, '평균순위'), imp: pick(r, '노출'), clk: pick(r, '클릭'), cost: pick(r, '비용(원, VAT 별도)'),
    reason: pick(r, '근거'),
  }));
  return { period, metrics, alerts, alertCount: cell(17, 7), recs, keywords };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'GET만 지원합니다.' });
  }
  const missing = ['GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY'].filter((k) => !process.env[k]);
  if (missing.length) return res.status(503).json({ error: '환경변수 없음: ' + missing.join(', ') });

  const spreadsheetId = process.env.MONITOR_SHEET_ID || DEFAULT_SHEET_ID;
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const r = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: ['대시보드!A1:I26', '키워드현황!A1:Q'],
    });
    const [dash, kw] = (r.data.valueRanges || []).map((v) => v.values || []);
    return res.status(200).json({ ok: true, sheetUrl, ...parseDashboard(dash, kw) });
  } catch (err) {
    const code = err?.code || err?.response?.status;
    if (code === 403 || code === 404) {
      return res.status(403).json({
        error: `대시보드 시트를 읽을 권한이 없습니다. 시트를 서비스 계정(${process.env.GOOGLE_CLIENT_EMAIL})에 뷰어로 공유해 주세요.`,
        sheetUrl,
      });
    }
    return res.status(502).json({ error: '시트 읽기 실패: ' + (err?.message || String(err)), sheetUrl });
  }
}
