import test from "node:test";
import assert from "node:assert/strict";
import { validate } from "../api/mindmaps.js";
test("accepts a bounded map and rejects repeated ids, cycles, and invalid ids", () => {
  const m = {
    id: "test-1",
    title: "한글",
    root: {
      id: "root",
      title: "중심",
      children: [{ id: "c", title: "가지", children: [] }],
    },
  };
  assert(validate(m));
  m.root.children.push({ id: "c", title: "중복", children: [] });
  assert.equal(validate(m), false);
  m.root.children = [m.root];
  assert.equal(validate(m), false);
  m.root.children = [];
  m.id = "../bad";
  assert.equal(validate(m), false);
});
test("rejects oversized maps", () => {
  assert.equal(
    validate({
      id: "test",
      title: "a",
      root: { id: "r", title: "x".repeat(800001), children: [] },
    }),
    false,
  );
});

import { google } from "googleapis";
import handler from "../api/mindmaps.js";
test("Sheets API roundtrip, chunking and stale revision rejection", async () => {
  const original = google.sheets;
  const keys = ["SHEET_ID", "GOOGLE_CLIENT_EMAIL", "GOOGLE_PRIVATE_KEY"];
  const before = keys.map((k) => process.env[k]);
  keys.forEach((k) => (process.env[k] = "test"));
  let exists = false;
  const rows = [];
  google.sheets = () => ({
    spreadsheets: {
      get: async () => ({
        data: { sheets: exists ? [{ properties: { title: "Mindmaps" } }] : [] },
      }),
      batchUpdate: async () => {
        exists = true;
      },
      values: {
        get: async () => ({ data: { values: rows } }),
        append: async ({ requestBody }) => {
          rows.push(...requestBody.values);
        },
        update: async ({ range, requestBody }) => {
          const n = Number(range.match(/A(\d+)/)[1]);
          rows[n - 1] = requestBody.values[0];
        },
      },
    },
  });
  const run = async (method, body) => {
    let status = 200,
      data;
    await handler(
      { method, body },
      {
        setHeader() {},
        status(n) {
          status = n;
          return this;
        },
        json(d) {
          data = d;
          return this;
        },
      },
    );
    return { status, data };
  };
  try {
    assert.deepEqual((await run("GET")).data.maps, []);
    assert.equal(exists, false);
    const map = {
      id: "sheet-roundtrip",
      title: "복구 검증",
      root: { id: "root", title: "한글😀".repeat(12000), children: [] },
    };
    const first = await run("POST", { map });
    assert.equal(first.status, 200);
    assert.equal(exists, true);
    assert(rows[0][4].length > 0);
    const read = await run("GET");
    assert.equal(read.data.maps[0].root.title, map.root.title);
    assert.equal((await run("POST", { map })).status, 409);
    const saved = read.data.maps[0];
    saved.root.title = "수정";
    const second = await run("POST", { map: saved });
    assert.equal(second.status, 200);
    assert.notEqual(second.data.revision, first.data.revision);
    assert.equal(rows.length, 1);
    rows[0][3] = "broken";
    assert.equal((await run("GET")).status, 500);
    assert.equal((await run("DELETE")).status, 405);
  } finally {
    google.sheets = original;
    keys.forEach((k, i) =>
      before[i] === undefined
        ? delete process.env[k]
        : (process.env[k] = before[i]),
    );
  }
});

test("flow metadata and floating memo bounds are validated", () => {
  const m = {
    id: "flow-test",
    title: "순서도",
    mode: "flow",
    root: {
      id: "a",
      title: "시작",
      children: [{ id: "b", title: "판단", shape: "decision", children: [] }],
    },
    floating: [
      { id: "note", text: "독립 메모", x: 300, y: 200, color: "#fff4bf" },
    ],
    positions: { a: { x: 250, y: 100 } },
    links: [{ id: "return", from: "b", to: "a", label: "다시" }],
  };
  assert(validate(m));
  m.links[0].to = "missing";
  assert.equal(validate(m), false);
  m.links[0].to = "a";
  m.floating[0].x = -100;
  assert.equal(validate(m), false);
  m.floating[0].x = 100;
  m.floating.push({ ...m.floating[0] });
  assert.equal(validate(m), false);
});
