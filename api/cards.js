import { google } from 'googleapis';

const SHEET_ID = process.env.SHEET_ID;

async function getAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
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
  const { boardId, id } = req.query;
  const sheetName = boardId === 'personal' ? 'personal' : 'work';

  try {
    // GET: 전체 카드 불러오기
    if (req.method === 'GET') {
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A2:F1000`,
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
        }));
      return res.status(200).json(cards);
    }

    // POST: 카드 추가
    if (req.method === 'POST') {
      const c = req.body;
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A:F`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[c.id, c.colId, c.title, c.note, c.dueDate, c.labelId]],
        },
      });
      return res.status(200).json({ ok: true });
    }

    // PUT: 카드 수정
    if (req.method === 'PUT') {
      const c = req.body;
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A2:A1000`,
      });
      const rows = resp.data.values || [];
      const rowIdx = rows.findIndex(r => r[0] === c.id);
      if (rowIdx === -1) return res.status(404).json({ error: 'Not found' });
      const rowNum = rowIdx + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A${rowNum}:F${rowNum}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[c.id, c.colId, c.title, c.note, c.dueDate, c.labelId]],
        },
      });
      return res.status(200).json({ ok: true });
    }

    // DELETE: 카드 삭제
    if (req.method === 'DELETE') {
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A2:A1000`,
      });
      const rows = resp.data.values || [];
      const rowIdx = rows.findIndex(r => r[0] === id);
      if (rowIdx === -1) return res.status(404).json({ error: 'Not found' });
      const rowNum = rowIdx + 2;
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A${rowNum}:F${rowNum}`,
      });
      return res.status(200).json({ ok: true });
    }

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
