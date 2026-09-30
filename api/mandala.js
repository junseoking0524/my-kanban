import { google } from 'googleapis';

const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = 'Mandala';

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

// Mandala structure: 9x9 grid stored as rows A1:I9
// cells[row][col] => single string value
// Row 0 = top of mandala

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // Ensure the Mandala sheet exists
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const exists = meta.data.sheets.some(s => s.properties.title === SHEET_NAME);
    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
        },
      });
      // Initialize with empty 9x9
      const empty = Array.from({ length: 9 }, () => Array(9).fill(''));
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A1:I9`,
        valueInputOption: 'RAW',
        requestBody: { values: empty },
      });
    }

    // GET: return the 9x9 grid
    if (req.method === 'GET') {
      const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A1:I9`,
      });
      const raw = resp.data.values || [];
      // Normalize to 9x9
      const grid = Array.from({ length: 9 }, (_, r) => {
        const row = raw[r] || [];
        return Array.from({ length: 9 }, (_, c) => row[c] || '');
      });
      return res.status(200).json({ grid });
    }

    // POST: save a single cell { row, col, value }
    if (req.method === 'POST') {
      const { row, col, value } = req.body;
      if (row == null || col == null) return res.status(400).json({ error: 'row/col required' });
      const colLetter = String.fromCharCode(65 + col); // A-I
      const rowNum = row + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!${colLetter}${rowNum}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[value || '']] },
      });
      return res.status(200).json({ ok: true });
    }

  } catch (e) {
    console.error('[Mandala] error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
