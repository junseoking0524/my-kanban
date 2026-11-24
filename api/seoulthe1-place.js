import { google } from 'googleapis';
import { authorized, sendTelegram, kstDate } from '../lib/telegram.js';

// 서울더원 네이버 플레이스 순위 일일 리포트
// 구글 시트 「서울더원마취통증의학과 | 네이버 플레이스 순위」의 [일별 요약] 탭(매일 09:00 KST PC 기록)을 읽어
// 키워드별 순위·전일/전주 대비와 이슈 알림을 텔레그램으로 보낸다. 시트는 읽기만 한다.
//   GET /api/seoulthe1-place          Authorization: Bearer <CRON_SECRET 또는 NOTIFY_SECRET>
//   GET /api/seoulthe1-place?dry=1    보내지 않고 메시지만 돌려줌
// 환경변수: GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, CRON_SECRET
// 선택: PLACE_SHEET_ID (기본값: 아래 시트)

const DEFAULT_SHEET_ID = '14kPweEp6vVhWK57qE1_chSUs2wmaLOLJim-x8mSZ3zA';
// 우리 병원 핵심 키워드: 2계단 이상 하락하거나 10위 밖으로 밀리면 알림
const CORE = ['판교정형외과', '판교도수치료', '삼평동정형외과', '판교신경외과', '삼평동통증의학과', '삼평동신경외과'];
const RULES = { drop: 3, coreDrop: 2, coreTop: 10, weekDrop: 5, staleDays: 2 };

// "11등" → 11, "40위 내 미노출" → 'out', "미확인"/"미제공"/빈칸 → null
export function parseRank(v) {
  const s = String(v ?? '').trim();
  const m = s.match(/^(\d+)\s*등$/);
  if (m) return Number(m[1]);
  if (s.includes('미노출')) return 'out';
  return null;
}

const fmt = (r) => (typeof r === 'number' ? `${r}등` : r === 'out' ? '40위 밖' : '미확인');
const md = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const dow = (d) => DOW[new Date(d + 'T00:00:00Z').getUTCDay()];

function change(cur, prev) {
  if (typeof cur === 'number' && typeof prev === 'number') {
    const d = prev - cur;
    return { delta: d, text: d > 0 ? `▲${d}` : d < 0 ? `▼${-d}` : '—' };
  }
  if (cur === 'out' && typeof prev === 'number') return { delta: -Infinity, text: '이탈' };
  if (typeof cur === 'number' && prev === 'out') return { delta: Infinity, text: '진입' };
  return { delta: null, text: '' };
}

// rows: [일별 요약] A:H 값 (헤더 포함)
export function buildPlaceReport(rows, today = kstDate(0), rules = RULES) {
  const data = rows.slice(1).filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(String(r[0] || '')) && r[1]);
  if (!data.length) return { text: '[서울더원 플레이스 순위] 시트에 기록이 없습니다.', alerts: ['순위 기록 없음'], latest: null };
  const dates = [...new Set(data.map((r) => r[0]))].sort();
  const latest = dates[dates.length - 1];
  const prevDate = dates[dates.length - 2];
  const byDate = (d) => new Map(data.filter((r) => r[0] === d).map((r) => [r[1], r]));
  const cur = byDate(latest), prev = prevDate ? byDate(prevDate) : new Map();
  const weekAgo = new Date(new Date(latest + 'T00:00:00Z').getTime() - 7 * 86400e3).toISOString().slice(0, 10);
  const week = byDate(weekAgo);

  const alerts = [];
  const lagDays = Math.round((new Date(today + 'T00:00:00Z') - new Date(latest + 'T00:00:00Z')) / 86400e3);
  if (lagDays >= rules.staleDays) {
    alerts.push(`순위 기록이 ${lagDays}일째 갱신 안 됨 (마지막 ${md(latest)}). 순위 기록 PC(Codex) 실행 여부 확인 필요`);
  }

  const lines = [];
  for (const [kw, r] of cur) {
    const rank = parseRank(r[2]);
    const p = prev.get(kw), w = week.get(kw);
    const c = change(rank, p ? parseRank(p[2]) : null);
    const cw = change(rank, w ? parseRank(w[2]) : null);
    const core = CORE.includes(kw);
    lines.push(`${core ? '★' : '·'} ${kw} ${fmt(rank)}${c.text ? ` (${c.text}` : ''}${cw.text ? `${c.text ? ', ' : ' ('}전주 ${cw.text}` : ''}${c.text || cw.text ? ')' : ''}`);
    if (c.delta === -Infinity) alerts.push(`${kw}: 40위 밖으로 이탈 (전일 ${fmt(parseRank(p[2]))})`);
    else if (typeof c.delta === 'number' && c.delta <= -(core ? rules.coreDrop : rules.drop))
      alerts.push(`${kw}: ${fmt(parseRank(p[2]))} → ${fmt(rank)} (${-c.delta}계단 하락${core ? ', 핵심 키워드' : ''})`);
    if (core && typeof rank === 'number' && rank > rules.coreTop && p && typeof parseRank(p[2]) === 'number' && parseRank(p[2]) <= rules.coreTop)
      alerts.push(`${kw}: 10위 밖으로 밀림 (${fmt(rank)})`);
    if (typeof cw.delta === 'number' && Number.isFinite(cw.delta) && cw.delta <= -rules.weekDrop)
      alerts.push(`${kw}: 전주 대비 ${-cw.delta}계단 하락 (${fmt(parseRank(w[2]))} → ${fmt(rank)})`);
    const ads = Number(r[5]), padS = p ? Number(p[5]) : NaN;
    if (core && Number.isFinite(ads) && Number.isFinite(padS) && ads - padS >= 3)
      alerts.push(`${kw}: 광고 병원 ${padS} → ${ads}곳으로 증가`);
  }
  const unique = [...new Set(alerts)];
  const head = [
    `[서울더원 플레이스 순위] ${md(latest)} (${dow(latest)}) 기록 · 광고 포함`,
    latest !== today && lagDays < rules.staleDays ? `오늘(${md(today)}) 기록은 아직 없음, 최신 기록 기준` : null,
    prevDate ? `비교: 전일 = ${md(prevDate)} 기록` : null,
  ].filter(Boolean);
  const text = [...head, '', `알림 ${unique.length}건`, ...(unique.length ? unique.map((a) => `• ${a}`) : ['특이사항 없음']), '', ...lines,
    '', '★ 핵심 키워드 · 시트: 한눈에 보기 탭'].join('\n');
  return { text, alerts: unique, latest };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const auth = authorized(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  const env = process.env;
  const dry = String(req.query?.dry || '') === '1';
  const missing = ['GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY', ...(dry ? [] : ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'])].filter((k) => !env[k]);
  if (missing.length) return res.status(503).json({ error: '환경변수 없음: ' + missing.join(', ') });
  try {
    const gauth = new google.auth.GoogleAuth({
      credentials: { client_email: env.GOOGLE_CLIENT_EMAIL, private_key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth: gauth });
    const r = await sheets.spreadsheets.values.get({ spreadsheetId: env.PLACE_SHEET_ID || DEFAULT_SHEET_ID, range: '일별 요약!A:H' });
    const msg = buildPlaceReport(r.data.values || []);
    if (dry) return res.status(200).json({ ok: true, dry: true, ...msg });
    const id = await sendTelegram(msg.text);
    return res.status(200).json({ ok: true, latest: msg.latest, alerts: msg.alerts.length, message_id: id });
  } catch (err) {
    const text = `[서울더원 플레이스 순위] 시트 읽기 실패: ${String(err?.message || err).slice(0, 300)}`;
    if (!dry && env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) { try { await sendTelegram(text); } catch { /* 무시 */ } }
    return res.status(502).json({ error: text });
  }
}
