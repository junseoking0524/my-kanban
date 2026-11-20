import { timingSafeEqual } from 'node:crypto';

// 텔레그램 알림 발송 엔드포인트 (@obokpapa_bot → 본인 채팅)
// POST /api/notify
//   Header: Authorization: Bearer <NOTIFY_SECRET>
//   Body (JSON): { "text": "보낼 내용", "title"?: "제목", "silent"?: true, "html"?: true }
// 필요한 환경변수: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, NOTIFY_SECRET(24자 이상)

const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST만 지원합니다.' });
  }

  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId, NOTIFY_SECRET: secret } = process.env;
  const missing = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'NOTIFY_SECRET'].filter((k) => !process.env[k]);
  if (missing.length) return res.status(503).json({ error: '환경변수 없음: ' + missing.join(', ') });
  if (secret.length < 24) return res.status(503).json({ error: 'NOTIFY_SECRET은 24자 이상이어야 합니다.' });

  const supplied = String(req.headers.authorization || '').replace(/^Bearer /, '');
  if (!same(supplied, secret)) return res.status(401).json({ error: '인증 실패' });

  let body = req.body ?? {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = { text: body }; }
  }
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) return res.status(400).json({ error: 'text가 필요합니다.' });

  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : '';
  const message = body.html
    ? (title ? `<b>${escapeHtml(title)}</b>\n` : '') + text
    : (title ? `<b>${escapeHtml(title)}</b>\n` : '') + escapeHtml(text);

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        chat_id: chatId,
        text: message.slice(0, 4096),
        parse_mode: 'HTML',
        disable_notification: !!body.silent,
        link_preview_options: { is_disabled: true },
      }),
    });
    const data = await r.json();
    if (!data.ok) return res.status(502).json({ error: '텔레그램 오류: ' + (data.description || r.status) });
    return res.status(200).json({ ok: true, message_id: data.result?.message_id });
  } catch (err) {
    return res.status(502).json({ error: '텔레그램 연결 실패: ' + err.message });
  }
}
