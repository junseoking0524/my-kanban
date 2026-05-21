import { google } from 'googleapis';

const SHEET_ID = process.env.SHEET_ID;

// 캘린더 라벨 → 캘린더 ID 매핑
const CALENDAR_MAP = {
  family:   'j5219s5glr8n823suh66oss4uc@group.calendar.google.com',
  junseok:  'jvi1v3t6b645cum5is31h9vfn8@group.calendar.google.com',
  default:  'gogoist0524@gmail.com',
  business: '333e5d8a6fc310fbb2095f16e93957f85fe72a1f02dd963061fea9a3192ba4b8@group.calendar.google.com',
  noupdate: null,
};

async function getAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/calendar',
    ],
  });
  return auth;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const calendar = google.calendar({ version: 'v3', auth });
  const { boardId, id } = req.query;
  const sheetName = boardId === 'personal' ? 'personal' : 'work';

  try {
    // GET: 전체 카드 불러오기
    if (req.method === 'GET') {
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A2:G1000`,
      });
      const rows = resp.data.values || [];
      const cards = rows
        .filter(r => r[0])
        .map(r => ({
          id: r[0],
          colId: r[1],
          title: r[2],
          note: r[3] || '',
          dueDate: r[4] || '',
          labelId: r[5] || 'default',
          calEventId: r[6] || '',
        }));
      return res.status(200).json(cards);
    }

    // POST: 카드 추가 + 캘린더 등록
    if (req.method === 'POST') {
      const c = req.body;
      let calEventId = '';

      console.log('[DEBUG] POST card:', JSON.stringify(c));
      console.log('[DEBUG] labelId:', c.labelId, 'dueDate:', c.dueDate);
      console.log('[DEBUG] calendarId:', CALENDAR_MAP[c.labelId]);

      if (c.dueDate && c.labelId && CALENDAR_MAP[c.labelId]) {
        try {
          const calId = CALENDAR_MAP[c.labelId];
          console.log('[DEBUG] Inserting to calendar:', calId);
          const event = await calendar.events.insert({
            calendarId: calId,
            requestBody: {
              summary: c.title,
              description: c.note || '',
              start: { date: c.dueDate },
              end: { date: c.dueDate },
            },
          });
          calEventId = `${c.labelId}:${event.data.id}`;
          console.log('[DEBUG] Calendar event created:', calEventId);
        } catch (e) {
          console.error('[DEBUG] Calendar insert error:', e.message);
        }
      } else {
        console.log('[DEBUG] Skipping calendar - dueDate:', c.dueDate, 'labelId:', c.labelId, 'calId:', CALENDAR_MAP[c.labelId]);
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A:G`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[c.id, c.colId, c.title, c.note, c.dueDate, c.labelId, calEventId]],
        },
      });
      return res.status(200).json({ ok: true });
    }

    // PUT: 카드 수정 + 캘린더 업데이트
    if (req.method === 'PUT') {
      const c = req.body;
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A2:G1000`,
      });
      const rows = resp.data.values || [];
      const rowIdx = rows.findIndex(r => r[0] === c.id);
      if (rowIdx === -1) return res.status(404).json({ error: 'Not found' });
      const rowNum = rowIdx + 2;
      const oldCalEventId = rows[rowIdx][6] || '';
      let calEventId = oldCalEventId;

      // 기존 캘린더 이벤트 삭제
      if (oldCalEventId) {
        try {
          const [oldLabelId, oldEventId] = oldCalEventId.split(':');
          const oldCalId = CALENDAR_MAP[oldLabelId];
          if (oldCalId && oldEventId) {
            await calendar.events.delete({ calendarId: oldCalId, eventId: oldEventId });
          }
        } catch (e) {
          console.error('[DEBUG] Calendar delete error:', e.message);
        }
        calEventId = '';
      }

      // 새 캘린더 이벤트 등록
      if (c.dueDate && c.labelId && CALENDAR_MAP[c.labelId]) {
        try {
          const calId = CALENDAR_MAP[c.labelId];
          const event = await calendar.events.insert({
            calendarId: calId,
            requestBody: {
              summary: c.title,
              description: c.note || '',
              start: { date: c.dueDate },
              end: { date: c.dueDate },
            },
          });
          calEventId = `${c.labelId}:${event.data.id}`;
        } catch (e) {
          console.error('[DEBUG] Calendar insert error:', e.message);
        }
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A${rowNum}:G${rowNum}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[c.id, c.colId, c.title, c.note, c.dueDate, c.labelId, calEventId]],
        },
      });
      return res.status(200).json({ ok: true });
    }

    // DELETE: 카드 삭제 + 캘린더 이벤트 삭제
    if (req.method === 'DELETE') {
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A2:G1000`,
      });
      const rows = resp.data.values || [];
      const rowIdx = rows.findIndex(r => r[0] === id);
      if (rowIdx === -1) return res.status(404).json({ error: 'Not found' });
      const rowNum = rowIdx + 2;
      const oldCalEventId = rows[rowIdx][6] || '';

      if (oldCalEventId) {
        try {
          const [oldLabelId, oldEventId] = oldCalEventId.split(':');
          const oldCalId = CALENDAR_MAP[oldLabelId];
          if (oldCalId && oldEventId) {
            await calendar.events.delete({ calendarId: oldCalId, eventId: oldEventId });
          }
        } catch (e) {
          console.error('[DEBUG] Calendar delete error:', e.message);
        }
      }

      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A${rowNum}:G${rowNum}`,
      });
      return res.status(200).json({ ok: true });
    }

  } catch (e) {
    console.error('[DEBUG] Handler error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
