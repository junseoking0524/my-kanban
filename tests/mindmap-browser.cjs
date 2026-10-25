const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const { createServer } = await import("vite");
  const server = await createServer({
    server: { host: "127.0.0.1", port: 5173 },
  });
  await server.listen();
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? {
          executablePath: process.env.CHROMIUM_PATH,
          args: [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--single-process",
            "--no-zygote",
          ],
        }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let cloud = [],
    posts = 0,
    fail = false;
  await page.route("**/api/cards?**", (r) => r.fulfill({ json: [] }));
  await page.route("**/api/mindmaps", async (r) => {
    if (fail)
      return r.fulfill({ status: 503, json: { error: "시험용 저장 실패" } });
    if (r.request().method() === "GET")
      return r.fulfill({ json: { maps: cloud } });
    const m = r.request().postDataJSON().map;
    posts++;
    await new Promise((r) => setTimeout(r, 100));
    const revision = "r" + posts;
    cloud = cloud.filter((x) => x.id !== m.id);
    cloud.push({ ...m, revision, dirty: false });
    return r.fulfill({ json: { revision } });
  });
  await page.goto("http://127.0.0.1:5173/?view=mindmap");
  await page
    .getByRole("button", { name: "하위 주제 Tab", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "하위 주제 Tab", exact: true })
    .click();
  await page.locator("#mm-title").fill("블로그 운영");
  await page
    .getByRole("button", { name: "하위 주제 Tab", exact: true })
    .click();
  await page.locator("#mm-title").fill("키워드 조사");
  await page.getByLabel("메모", { exact: true }).fill("육아템 콘텐츠 조사");
  await page.getByLabel("링크", { exact: true }).fill("https://example.com");
  await page
    .getByRole("button", { name: "같은 단계 Enter", exact: true })
    .click();
  await page.locator("#mm-title").fill("글 작성");
  await page
    .getByRole("status")
    .filter({ hasText: "클라우드 저장 완료" })
    .waitFor();
  assert.equal(cloud[0].root.children[0].children.length, 2);
  await page.reload();
  await page
    .getByRole("button", { name: "키워드 조사 ✎", exact: true })
    .click();
  assert.equal(await page.locator("#mm-title").inputValue(), "키워드 조사");
  assert.equal(
    await page.getByLabel("메모", { exact: true }).inputValue(),
    "육아템 콘텐츠 조사",
  );
  const result = await page.evaluate(async () => {
    const m = await import("/src/mindmap.ts");
    const JSZip = (await import("/node_modules/.vite/deps/jszip.js")).default;
    const maps = JSON.parse(localStorage.getItem("kanban.mindmaps.v1"));
    const blob = await m.exportXmind(maps[0]);
    const restored = await m.importXmind(await blob.arrayBuffer());
    const a = maps[0].root.children[0].children[0],
      b = restored[0].root.children[0].children[0];
    if (a.title !== b.title || a.note !== b.note || a.href !== b.href)
      throw Error("roundtrip mismatch");
    const xml = new JSZip();
    xml.file(
      "content.xml",
      '<xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0"><sheet><title>구형 테스트</title><topic id="root"><title>한글 중심</title><children><topics type="attached"><topic id="child"><title>하위 가지</title><notes><plain>메모</plain></notes></topic></topics></children></topic></sheet></xmap-content>',
    );
    const old = await m.importXmind(
      await xml.generateAsync({ type: "arraybuffer" }),
    );
    if (old[0].root.children[0].title !== "하위 가지")
      throw Error("XML failed");
    const before = JSON.stringify(maps[0].root);
    if (
      m.moveTopic(
        maps[0].root,
        maps[0].root.children[0].id,
        maps[0].root.children[0].children[0].id,
      )
    )
      throw Error("cycle accepted");
    if (JSON.stringify(maps[0].root) !== before) throw Error("cycle mutated");
    let rejected = false;
    try {
      await m.importXmind(new ArrayBuffer(10));
    } catch {
      rejected = true;
    }
    if (!rejected) throw Error("invalid file accepted");
    return { roundtrip: true, legacy: true, cycle: true, invalid: true };
  });
  await page.getByRole("button", { name: "가지 삭제", exact: true }).click();
  await page.getByRole("button", { name: "↶ 실행 취소", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "키워드 조사 ✎", exact: true })
      .count(),
    1,
  );
  await page
    .getByRole("status")
    .filter({ hasText: "클라우드 저장 완료" })
    .waitFor();
  fail = true;
  await page.locator("#mm-title").fill("오프라인 복구");
  await page
    .getByRole("alert")
    .filter({ hasText: "시험용 저장 실패" })
    .waitFor();
  await page.reload();
  await page.getByRole("button", { name: "주제 편집", exact: true }).click();
  await page.locator("#mm-title").waitFor();
  const local = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kanban.mindmaps.v1")),
  );
  assert(local.some((m) => JSON.stringify(m).includes("오프라인 복구")));
  fail = false;
  await page.getByRole("button", { name: "저장 재시도", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "클라우드 저장 완료" })
    .waitFor();
  assert(JSON.stringify(cloud).includes("오프라인 복구"));
  // Creating a map must preserve the original, and folder navigation must restore it.
  await page.getByLabel("마인드맵 이름", { exact: true }).fill("블로그 계획");
  await page
    .getByRole("status")
    .filter({ hasText: "클라우드 저장 완료" })
    .waitFor();
  const firstId = cloud[0].id;
  await page.getByRole("button", { name: "＋ 새 맵", exact: true }).click();
  await page.getByRole("button", { name: "＋ 새 맵", exact: true }).focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator(".mm-map-entry").count(), 3);
  assert.equal(
    (await page.getByLabel("마인드맵 선택", { exact: true }).inputValue()) ===
      firstId,
    false,
  );
  await page
    .locator(".mm-map-row .mm-tree-name")
    .filter({ hasText: "블로그 계획" })
    .click();
  assert.equal(
    await page.getByLabel("마인드맵 선택", { exact: true }).inputValue(),
    firstId,
  );
  await page
    .getByRole("button", { name: "새 마인드맵 주제 목록", exact: true })
    .click();
  assert.match(
    await page
      .getByLabel("마인드맵 선택", { exact: true })
      .locator("option:checked")
      .textContent(),
    /새 마인드맵/,
  );
  await page
    .locator(".mm-map-row .mm-tree-name")
    .filter({ hasText: "블로그 계획" })
    .click();
  page.once("dialog", (d) => d.accept("업무"));
  await page.getByRole("button", { name: "＋ 폴더", exact: true }).click();
  assert.equal(
    await page.getByLabel("현재 맵의 폴더", { exact: true }).inputValue(),
    "업무",
  );
  await page
    .getByRole("status")
    .filter({ hasText: "클라우드 저장 완료" })
    .waitFor();
  await page.reload();
  await page.locator(".mm-library").waitFor();
  assert.equal(
    await page.getByLabel("마인드맵 선택", { exact: true }).inputValue(),
    firstId,
  );
  assert.equal(await page.locator(".mm-map-entry").count(), 3);
  await page.getByLabel("보관함 검색", { exact: true }).fill("블로그");
  assert.equal(await page.locator(".mm-map-entry").count(), 1);
  await page.getByLabel("보관함 검색", { exact: true }).fill("");
  const canvas = page.locator(".mm-canvas");
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 80);
  const beforeZoom = Number(
    await page.getByLabel("확대 비율", { exact: true }).inputValue(),
  );
  await page.mouse.wheel(0, -180);
  await page.waitForTimeout(120);
  assert(
    Number(await page.getByLabel("확대 비율", { exact: true }).inputValue()) >
      beforeZoom,
  );
  const beforePan = await canvas.evaluate((el) => el.scrollLeft);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 - 100, bounds.y + 80, {
    steps: 5,
  });
  await page.mouse.up();
  assert((await canvas.evaluate((el) => el.scrollLeft)) > beforePan + 50);
  await page.getByRole("button", { name: "전체 보기", exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/mindmap-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 2,
  });
  const mobileBounds = await canvas.boundingBox(),
    touchY = mobileBounds.y + 70;
  const pinchBefore = Number(
    await page.getByLabel("확대 비율", { exact: true }).inputValue(),
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 100, y: touchY, id: 1 },
      { x: 200, y: touchY, id: 2 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: 60, y: touchY, id: 1 },
      { x: 240, y: touchY, id: 2 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(150);
  assert(
    Number(await page.getByLabel("확대 비율", { exact: true }).inputValue()) >
      pinchBefore,
    "pinch zoom",
  );
  await page.screenshot({ path: "/tmp/mindmap-mobile.png" });
  assert.equal(await page.locator(".mm").count(), 1);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, posts, ...result, errors }));
  await browser.close();
  await server.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
