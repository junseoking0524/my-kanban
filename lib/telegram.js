import { timingSafeEqual } from 'node:crypto';

// 서울더원 알림 공용: 텔레그램 전송과 Cron/수동 호출 인증
export const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

export function authorized(req, env = process.env) {
  const secrets = [env.CRON_SECRET, env.NOTIFY_SECRET].filter((s) => s && s.length >= 16);
  if (!secrets.length) return { ok: false, status: 503, error: '환경변수 없음: CRON_SECRET' };
  const supplied = String(req.headers?.authorization || '').replace(/^Bearer /, '');
  return secrets.some((s) => same(supplied, s)) ? { ok: true } : { ok: false, status: 401, error: '인증 실패' };
}

export async function sendTelegram(text, env = process.env) {
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: text.slice(0, 4096), link_preview_options: { is_disabled: true } }),
  });
  const data = await r.json();
  if (!data.ok) throw new Error('텔레그램 오류: ' + (data.description || r.status));
  return data.result?.message_id;
}

export function kstDate(offsetDays = 0, now = new Date()) {
  return new Date(now.getTime() + 9 * 3600e3 + offsetDays * 86400e3).toISOString().slice(0, 10);
}
