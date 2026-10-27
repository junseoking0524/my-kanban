import { google } from "googleapis";
const TAB = "Mindmaps",
  CHUNK = 40000;
export function validate(map) {
  let n = 0;
  const ids = new Set();
  const walk = (t, d) => {
    if (
      !t ||
      typeof t.id !== "string" ||
      ids.has(t.id) ||
      typeof t.title !== "string" ||
      !Array.isArray(t.children) ||
      (t.core !== undefined && typeof t.core !== "boolean") ||
      (t.independent !== undefined && typeof t.independent !== "boolean") ||
      d > 50 ||
      ++n > 2000
    )
      return false;
    ids.add(t.id);
    return t.children.every((c) => walk(c, d + 1));
  };
  return (
    !!map &&
    typeof map.id === "string" &&
    /^[a-zA-Z0-9_-]{1,100}$/.test(map.id) &&
    typeof map.title === "string" &&
    walk(map.root, 0) &&
    (!map.mode ||
      map.mode === "mindmap" ||
      map.mode === "flow" ||
      map.mode === "graph") &&
    (!map.floating ||
      (Array.isArray(map.floating) &&
        map.floating.length <= 100 &&
        new Set(map.floating.map((n) => n?.id)).size === map.floating.length &&
        map.floating.every(
          (n) =>
            n &&
            typeof n.id === "string" &&
            !ids.has(n.id) &&
            typeof n.text === "string" &&
            typeof n.color === "string" &&
            (!n.kind || n.kind === "summary") &&
            (!n.title || typeof n.title === "string") &&
            (!n.sourceIds ||
              (Array.isArray(n.sourceIds) &&
                n.sourceIds.length <= 2000 &&
                n.sourceIds.every((id) => typeof id === "string"))) &&
            Number.isFinite(n.x) &&
            Number.isFinite(n.y) &&
            n.x >= -1000 &&
            n.y >= -1000 &&
            n.x <= 20000 &&
            n.y <= 20000,
        ))) &&
    (!map.positions ||
      (typeof map.positions === "object" &&
        Object.values(map.positions).every(
          (p) =>
            p &&
            Number.isFinite(p.x) &&
            Number.isFinite(p.y) &&
            p.x >= -1000 &&
            p.y >= -1000 &&
            p.x <= 20000 &&
            p.y <= 20000,
        ))) &&
    (!map.layoutPositions ||
      (typeof map.layoutPositions === "object" &&
        Object.values(map.layoutPositions).every(
          (set) =>
            set &&
            typeof set === "object" &&
            Object.values(set).every(
              (p) =>
                p &&
                Number.isFinite(p.x) &&
                Number.isFinite(p.y) &&
                p.x >= -1000 &&
                p.y >= -1000 &&
                p.x <= 20000 &&
                p.y <= 20000,
            ),
        ))) &&
    (!map.links ||
      (Array.isArray(map.links) &&
        map.links.length <= 500 &&
        map.links.every(
          (l) =>
            l &&
            typeof l.id === "string" &&
            ids.has(l.from) &&
            ids.has(l.to) &&
            typeof l.label === "string",
        ))) &&
    JSON.stringify(map).length < 790000
  );
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST"].includes(req.method))
    return res.status(405).json({ error: "Method not allowed" });
  if (
    !process.env.SHEET_ID ||
    !process.env.GOOGLE_CLIENT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY
  )
    return res
      .status(503)
      .json({ error: "마인드맵 클라우드 저장 설정을 확인해주세요." });
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth }),
      spreadsheetId = process.env.SHEET_ID;
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    });
    const tab = meta.data.sheets.find((s) => s.properties.title === TAB);
    if (!tab) {
      if (req.method === "GET") return res.json({ maps: [] });
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: TAB,
                    gridProperties: { rowCount: 2000, columnCount: 23 },
                  },
                },
              },
            ],
          },
        });
      } catch (e) {
        const again = await sheets.spreadsheets.get({
          spreadsheetId,
          fields: "sheets.properties",
        });
        if (!again.data.sheets.some((s) => s.properties.title === TAB)) throw e;
      }
    }
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TAB}!A1:W2000`,
    });
    const rows = read.data.values || [];
    const parse = (r) => {
      if (!r?.[0]) return null;
      try {
        const m = JSON.parse(r.slice(3).join(""));
        return { ...m, revision: r[2], dirty: false };
      } catch {
        throw new Error(
          "저장된 마인드맵 데이터를 읽지 못했습니다. 기존 데이터는 보존됩니다.",
        );
      }
    };
    if (req.method === "GET")
      return res.json({ maps: rows.map(parse).filter(Boolean) });
    const map = req.body?.map;
    if (!validate(map))
      return res
        .status(400)
        .json({ error: "유효하지 않거나 너무 큰 마인드맵입니다." });
    const idx = rows.findIndex((r) => r[0] === map.id),
      old = idx >= 0 ? parse(rows[idx]) : null;
    if (old && old.revision !== (map.revision || ""))
      return res.status(409).json({
        error: "다른 화면에서 수정되었습니다. 복사본으로 저장해 주세요.",
      });
    const revision = crypto.randomUUID(),
      clean = { ...map, dirty: false, revision };
    const json = JSON.stringify(clean),
      chunks = [];
    for (let i = 0; i < json.length;) {
      let end = Math.min(i + CHUNK, json.length);
      if (end < json.length && /[\uD800-\uDBFF]/.test(json[end - 1])) end--;
      chunks.push(json.slice(i, end));
      i = end;
    }
    const values = [
      [
        map.id,
        map.title,
        revision,
        ...chunks,
        ...Array(20 - chunks.length).fill(""),
      ],
    ];
    if (idx >= 0)
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${TAB}!A${idx + 1}:W${idx + 1}`,
        valueInputOption: "RAW",
        requestBody: { values },
      });
    else {
      if (rows.length >= 1999)
        return res
          .status(400)
          .json({ error: "마인드맵 저장 공간이 가득 찼습니다." });
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${TAB}!A:W`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values },
      });
    }
    return res.json({ revision });
  } catch (e) {
    console.error("[Mindmaps]", e.message);
    return res.status(500).json({
      error:
        "마인드맵 저장소 연결에 실패했습니다. 복구본을 보관하고 다시 시도해주세요.",
    });
  }
}
