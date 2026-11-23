import { createHmac, timingSafeEqual } from 'node:crypto';

// 서울더원 파워링크 일일 알림: 어제(KST) 성과를 네이버 검색광고 API에서 읽어 텔레그램으로 보낸다.
// 실행: Vercel Cron (vercel.json, 매일 00:00 UTC = 09:00 KST) 또는 수동 호출
//   GET /api/seoulthe1-daily            Authorization: Bearer <CRON_SECRET 또는 NOTIFY_SECRET>
//   GET /api/seoulthe1-daily?dry=1      보내지 않고 메시지만 돌려줌
// 필요한 환경변수: NAVER_API_KEY, NAVER_SECRET_KEY, NAVER_CUSTOMER_ID,
//                  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, CRON_SECRET(또는 NOTIFY_SECRET)
// 입찰가는 바꾸지 않는다 (조회 전용).

const BASE = 'https://api.searchad.naver.com';
const RULES = { budgetShare: 0.8, costJump: 2.0, minCost: 1000, impDrop: 0.3, minAvgImp: 20 };

const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

export function kstDate(offsetDays = 0, now = new Date()) {
  const d = new Date(now.getTime() + 9 * 3600e3 + offsetDays * 86400e3);
  return d.toISOString().slice(0, 10);
}

export function naverClient({ apiKey, secret, customerId, fetchImpl = fetch }) {
  return async function call(method, uri, params) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const ts = String(Date.now());
    const sig = createHmac('sha256', secret).update(`${ts}.${method}.${uri}`).digest('base64');
    const r = await fetchImpl(BASE + uri + qs, {
      method,
      headers: { 'X-Timestamp': ts, 'X-API-KEY': apiKey, 'X-Customer': String(customerId), 'X-Signature': sig },
      signal: AbortSignal.timeout(20000),
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`네이버 API ${method} ${uri} → HTTP ${r.status}: ${text.slice(0, 200)}`);
    return text ? JSON.parse(text) : null;
  };
}

// 여러 키워드 합계(기간 전체)는 ids + timeIncrement 없이 조회해야 API가 받아준다.
async function statsTotal(call, ids, since, until) {
  const out = {};
  for (let i = 0; i < ids.length; i += 100) {
    const res = await call('GET', '/stats', {
      ids: ids.slice(i, i + 100).join(','),
      fields: JSON.stringify(['impCnt', 'clkCnt', 'salesAmt']),
      timeRange: JSON.stringify({ since, until }),
    });
    for (const s of res?.data || []) out[s.id] = s;
  }
  return out;
}

export async function collect(call, day) {
  const camps = ((await call('GET', '/ncc/campaigns')) || []).filter((c) => c.campaignTp === 'WEB_SITE');
  const keywords = [];
  let budget = 0;
  for (const c of camps) {
    for (const g of (await call('GET', '/ncc/adgroups', { nccCampaignId: c.nccCampaignId })) || []) {
      budget += Number(g.dailyBudget) || 0;
      for (const k of (await call('GET', '/ncc/keywords', { nccAdgroupId: g.nccAdgroupId })) || []) {
        keywords.push({ id: k.nccKeywordId, keyword: k.keyword, status: k.status, locked: !!k.userLock });
      }
    }
  }
  const ids = keywords.map((k) => k.id);
  const d = new Date(day + 'T00:00:00Z');
  const iso = (n) => new Date(d.getTime() + n * 86400e3).toISOString().slice(0, 10);
  const [y, p] = [await statsTotal(call, ids, day, day), await statsTotal(call, ids, iso(-7), iso(-1))];
  return { keywords, budget, y, p };
}

export function buildDaily({ keywords, budget, y, p }, day, rules = RULES) {
  const sum = (m, f) => Object.values(m).reduce((a, s) => a + (Number(s[f]) || 0), 0);
  const imp = sum(y, 'impCnt'), clk = sum(y, 'clkCnt'), cost = sum(y, 'salesAmt');
  const avgImp = sum(p, 'impCnt') / 7, avgCost = sum(p, 'salesAmt') / 7;
  const won = (n) => Math.round(n).toLocaleString('ko-KR');
  const alerts = [];
  if (imp === 0) alerts.push('어제 노출 0 → 캠페인 OFF·예산 소진·검수 보류 여부를 광고관리 화면에서 확인');
  if (budget && cost >= budget * rules.budgetShare)
    alerts.push(`예산 소진 임박: 어제 비용 ${won(cost)}원 / 하루예산 ${won(budget)}원 (${Math.round((cost / budget) * 100)}%)`);
  if (avgCost && cost > avgCost * rules.costJump && cost >= rules.minCost)
    alerts.push(`비용 급증: 어제 ${won(cost)}원, 최근 7일 평균 ${won(avgCost)}원의 ${(cost / avgCost).toFixed(1)}배`);
  if (avgImp >= rules.minAvgImp && imp < avgImp * rules.impDrop)
    alerts.push(`노출 급감: 어제 ${won(imp)}, 최근 7일 평균 ${won(avgImp)}`);
  const bad = keywords.filter((k) => !k.locked && k.status && k.status !== 'ELIGIBLE');
  if (bad.length)
    alerts.push(`노출 불가 상태 키워드 ${bad.length}개: ` + bad.slice(0, 5).map((k) => `${k.keyword}(${k.status})`).join(', ') + (bad.length > 5 ? ' 외' : ''));

  const name = Object.fromEntries(keywords.map((k) => [k.id, k.keyword]));
  const top = Object.values(y).filter((s) => Number(s.clkCnt) > 0)
    .sort((a, b) => b.clkCnt - a.clkCnt || b.salesAmt - a.salesAmt).slice(0, 5);
  const lines = [
    `[서울더원 파워링크 일일] ${day}`,
    `노출 ${won(imp)} · 클릭 ${won(clk)} · 비용 ${won(cost)}원(VAT 별도, 화면 기준 약 ${won(cost * 1.1)}원)`,
    `최근 7일 평균: 노출 ${won(avgImp)} · 비용 ${won(avgCost)}원`,
  ];
  if (budget) lines.push(`예산 소진율 ${((cost / budget) * 100).toFixed(1)}% (하루예산 ${won(budget)}원)`);
  if (top.length) lines.push('클릭 키워드: ' + top.map((s) => `${name[s.id] || s.id} ${s.clkCnt}회`).join(', '));
  lines.push('', `알림 ${alerts.length}건`, ...(alerts.length ? alerts.map((a) => `• ${a}`) : ['특이사항 없음']));
  return { text: lines.join('\n'), alerts, imp, clk, cost };
}

async function sendTelegram(text) {
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: text.slice(0, 4096), link_preview_options: { is_disabled: true } }),
  });
  const data = await r.json();
  if (!data.ok) throw new Error('텔레그램 오류: ' + (data.description || r.status));
  return data.result?.message_id;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const secrets = [process.env.CRON_SECRET, process.env.NOTIFY_SECRET].filter((s) => s && s.length >= 16);
  if (!secrets.length) return res.status(503).json({ error: '환경변수 없음: CRON_SECRET' });
  const supplied = String(req.headers.authorization || '').replace(/^Bearer /, '');
  if (!secrets.some((s) => same(supplied, s))) return res.status(401).json({ error: '인증 실패' });

  const env = process.env;
  const apiKey = env.NAVER_API_KEY || env.NAVER_AD_API_KEY;
  const secret = env.NAVER_SECRET_KEY || env.NAVER_AD_SECRET_KEY;
  const customerId = env.NAVER_CUSTOMER_ID || env.NAVER_AD_CUSTOMER_ID;
  const dry = String(req.query?.dry || '') === '1';
  const missing = [['NAVER_API_KEY', apiKey], ['NAVER_SECRET_KEY', secret], ['NAVER_CUSTOMER_ID', customerId],
    ...(dry ? [] : [['TELEGRAM_BOT_TOKEN', env.TELEGRAM_BOT_TOKEN], ['TELEGRAM_CHAT_ID', env.TELEGRAM_CHAT_ID]])]
    .filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) return res.status(503).json({ error: '환경변수 없음: ' + missing.join(', ') });

  const day = (typeof req.query?.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.day)) ? req.query.day : kstDate(-1);
  try {
    const msg = buildDaily(await collect(naverClient({ apiKey, secret, customerId }), day), day);
    if (dry) return res.status(200).json({ ok: true, dry: true, ...msg });
    const id = await sendTelegram(msg.text);
    return res.status(200).json({ ok: true, day, alerts: msg.alerts.length, message_id: id });
  } catch (err) {
    // 수집 실패도 알림으로 보낸다
    if (!dry && env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
      try { await sendTelegram(`[서울더원 파워링크 일일] ${day} 수집 실패: ${String(err.message).slice(0, 300)}`); } catch { /* 무시 */ }
    }
    return res.status(502).json({ error: String(err.message || err) });
  }
}
