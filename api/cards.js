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

// 시트 컬럼: A id | B colId | C title | D note | E dueDate | F labelId | G calEventId
//           H tags(JSON) | I progress | J category | K priority
const LAST_COL = 'K';
let headerChecked = false;

function rowToCard(r) {
  let tags = [];
  try { tags = r[7] ? JSON.parse(r[7]) : []; } catch { tags = []; }
  return {
    id: r[0],
    colId: r[1],
    title: r[2],
    note: r[3] || '',
    dueDate: r[4] || '',
    labelId: r[5] || '',
    calEventId: r[6] || '',
    tags,
    progress: Number(r[8]) || 0,
    category: r[9] || '',
    priority: r[10] || 'normal',
  };
}

function cardToRow(c, calEventId) {
  return [
    c.id, c.colId || '', c.title || '', c.note || '', c.dueDate || '', c.labelId || '',
    calEventId || '', JSON.stringify(c.tags || []), c.progress ?? 0, c.category || '', c.priority || 'normal',
  ];
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const pad = n => String(n).padStart(2, '0');

// 날짜만 있으면 종일 일정(종료일은 다음날), 시간이 있으면 1시간짜리 일정 (KST)
function eventTimes(due) {
  if (due.length > 10) {
    const start = `${due.slice(0, 10)}T${due.slice(11, 16)}:00`;
    const end = new Date(new Date(`${start}+09:00`).getTime() + 3600000 + 9 * 3600000);
    const endStr = `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}T${pad(end.getUTCHours())}:${pad(end.getUTCMinutes())}:00`;
    return {
      start: { dateTime: start, timeZone: 'Asia/Seoul' },
      end: { dateTime: endStr, timeZone: 'Asia/Seoul' },
    };
  }
  const d = new Date(`${due}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  const next = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return { start: { date: due }, end: { date: next } };
}

async function insertEvent(calendar, c) {
  if (!c.dueDate || !c.labelId || !CALENDAR_MAP[c.labelId]) return '';
  try {
    const event = await calendar.events.insert({
      calendarId: CALENDAR_MAP[c.labelId],
      requestBody: { summary: c.title, description: c.note || '', ...eventTimes(c.dueDate) },
    });
    return `${c.labelId}:${event.data.id}`;
  } catch (e) {
    console.error('Calendar insert error:', e.message);
    return '';
  }
}

async function deleteEvent(calendar, calEventId) {
  if (!calEventId) return;
  try {
    const [labelId, eventId] = calEventId.split(':');
    const calId = CALENDAR_MAP[labelId];
    if (calId && eventId) await calendar.events.delete({ calendarId: calId, eventId });
  } catch (e) {
    console.error('Calendar delete error:', e.message);
  }
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
  const readRows = async () => {
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A2:${LAST_COL}1000`,
    });
    return resp.data.values || [];
  };

  try {
    // 확장 컬럼 헤더(H1:K1)를 한 번만 보장
    if (!headerChecked) {
      headerChecked = true;
      try {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `${sheetName}!H1:K1`,
          valueInputOption: 'RAW',
          requestBody: { values: [['tags', 'progress', 'category', 'priority']] },
        });
      } catch (e) { console.error('Header update error:', e.message); }
    }

    // GET: 전체 카드 불러오기
    if (req.method === 'GET') {
      const rows = await readRows();
      return res.status(200).json(rows.filter(r => r[0]).map(rowToCard));
    }

    // POST: 카드 추가 (+ 캘린더 등록)
    if (req.method === 'POST') {
      const c = { ...req.body, id: req.body.id || newId() };
      const calEventId = await insertEvent(calendar, c);
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A:${LAST_COL}`,
        valueInputOption: 'RAW',
        requestBody: { values: [cardToRow(c, calEventId)] },
      });
      return res.status(200).json({ ok: true, card: { ...c, calEventId } });
    }

    // PUT: 카드 수정 (캘린더 관련 값이 바뀐 경우에만 캘린더 갱신)
    if (req.method === 'PUT') {
      const c = req.body;
      const rows = await readRows();
      const rowIdx = rows.findIndex(r => r[0] === c.id);
      if (rowIdx === -1) return res.status(404).json({ error: 'Not found' });
      const rowNum = rowIdx + 2;
      const old = rowToCard(rows[rowIdx]);
      let calEventId = old.calEventId;

      const calChanged =
        old.title !== (c.title || '') || old.note !== (c.note || '') ||
        old.dueDate !== (c.dueDate || '') || old.labelId !== (c.labelId || '');
      if (calChanged) {
        await deleteEvent(calendar, old.calEventId);
        calEventId = await insertEvent(calendar, c);
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A${rowNum}:${LAST_COL}${rowNum}`,
        valueInputOption: 'RAW',
        requestBody: { values: [cardToRow(c, calEventId)] },
      });
      return res.status(200).json({ ok: true, card: { ...c, calEventId } });
    }

    // DELETE: 카드 삭제 + 캘린더 이벤트 삭제
    if (req.method === 'DELETE') {
      const rows = await readRows();
      const rowIdx = rows.findIndex(r => String(r[0]).trim() === String(id).trim());
      // 이미 지워진 카드는 성공으로 처리 (중복 요청 대비)
      if (rowIdx === -1) return res.status(200).json({ ok: true, alreadyGone: true });
      const rowNum = rowIdx + 2;
      await deleteEvent(calendar, rows[rowIdx][6] || '');
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A${rowNum}:${LAST_COL}${rowNum}`,
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('Handler error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
