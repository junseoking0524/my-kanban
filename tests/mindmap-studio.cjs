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
  page.setDefaultTimeout(12000);
  await page.goto("http://127.0.0.1:5173/?view=mindmap&focus=1");
  await page.getByLabel("정리 방식", { exact: true }).waitFor();
  const node = (text) => page.locator(".mm-topic").filter({ hasText: text });
  const rename = async (name) => {
    await page.getByLabel("노드 이름", { exact: true }).fill(name);
    await page.getByLabel("노드 이름", { exact: true }).press("Enter");
  };
  const save = () =>
    page
      .getByRole("status")
      .filter({ hasText: "클라우드 저장 완료" })
      .waitFor();
  await page
    .getByLabel("마인드맵 이름", { exact: true })
    .fill("성장 실험 보드");
  await node("중심 주제").dblclick();
  await rename("플랫폼 성장");
  await page
    .getByRole("button", { name: "하위 주제 Tab", exact: true })
    .click();
  await rename("광고 매출 개선");
  await page.getByRole("button", { name: "노드 옵션", exact: true }).click();
  await page
    .getByLabel("메모", { exact: true })
    .fill("플랫폼 성장을 위한 광고 실험");
  await page.getByRole("button", { name: "노드 옵션", exact: true }).click();
  await page
    .getByRole("button", { name: "하위 주제 Tab", exact: true })
    .click();
  await rename("광고 데이터 분석");
  await node("플랫폼 성장").click();
  await page
    .getByRole("button", { name: "하위 주제 Tab", exact: true })
    .click();
  await rename("고객 경험 개선");
  await save();
  assert.equal(await page.locator("[data-node-id]").count(), 4);
  assert.equal(await page.locator(".mm-inspector textarea").count(), 0);
  await page.getByRole("button", { name: "전체 보기", exact: true }).click();
  await page.waitForTimeout(250);
  // Connect two unrelated boxes using real pointer drag, without hierarchy mutation.
  const source = page.getByRole("button", {
    name: "광고 데이터 분석 연결점",
    exact: true,
  });
  const dest = node("고객 경험 개선");
  let a = await source.boundingBox(),
    b = await dest.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
  await save();
  assert.equal(cloud[0].links.length, 1);
  const edgePoint = await page
    .locator(".mm-edge-hit")
    .last()
    .evaluate((el) => {
      const p = el.getPointAtLength(el.getTotalLength() / 2),
        m = el.getScreenCTM();
      return { x: p.x * m.a + p.y * m.c + m.e, y: p.x * m.b + p.y * m.d + m.f };
    });
  await page.mouse.click(edgePoint.x, edgePoint.y);
  page.once("dialog", (d) => d.accept("함께 검토"));
  await page
    .getByRole("button", { name: "연결 이름 편집", exact: true })
    .click();
  await save();
  assert.equal(cloud[0].links[0].label, "함께 검토");
  await page
    .getByRole("button", { name: "추가 연결 삭제", exact: true })
    .click();
  await save();
  assert.equal(cloud[0].links.length, 0);
  await page.getByRole("button", { name: "↶ 실행 취소", exact: true }).click();
  await save();
  assert.equal(cloud[0].links.length, 1);

  await dest.dblclick();
  await rename("고객 경험 실험");
  await save();
  assert.equal(cloud[0].links.length, 1);
  // Change a logic-tree position with a persistent handle.
  const moved = page
    .locator("[data-node-id]")
    .filter({ has: node("고객 경험 실험") });
  let h = await moved
    .getByRole("button", { name: "박스 위치 이동", exact: true })
    .boundingBox();
  await page.mouse.move(h.x + 5, h.y + 5);
  await page.mouse.down();
  await page.mouse.move(h.x + 80, h.y + 45, { steps: 6 });
  await page.mouse.up();
  await save();
  const logic = JSON.stringify(cloud[0].layoutPositions.mindmap);
  assert.notEqual(logic, "{}");
  await page.getByLabel("정리 방식", { exact: true }).selectOption("graph");
  await page.getByRole("button", { name: "전체 보기", exact: true }).click();
  await page.waitForTimeout(300);
  assert.equal(await page.locator(".mm-galaxy .mm-graph-node").count(), 4);
  await node("광고 매출 개선").click();
  await node("광고 데이터 분석").click({ modifiers: ["Shift"] });
  await node("고객 경험 실험").click({ modifiers: ["Shift"] });
  assert.equal(await page.locator(".mm-picked").count(), 3);
  await page
    .getByRole("button", { name: "Σ 서머리 만들기 (3)", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "서머리 만들기" });
  await dialog.waitFor();
  assert(
    (
      await page.getByLabel("서머리 초안", { exact: true }).inputValue()
    ).includes("광고 매출 개선"),
  );
  await page
    .getByLabel("서머리 초안 이름", { exact: true })
    .fill("성장 실험의 우선순위");
  await page
    .getByRole("button", { name: "캔버스에 서머리 추가", exact: true })
    .click();
  await save();
  assert.equal(cloud[0].floating[0].kind, "summary");
  assert.equal(cloud[0].floating[0].sourceIds.length, 3);
  assert.equal(await page.locator(".mm-summary-boundary").count(), 1);
  await page.getByRole("button", { name: "전체 보기", exact: true }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: "/tmp/mindmap-galaxy-studio.png" });
  await page.getByRole("button", { name: "여러 개 선택", exact: true }).click();
  const boxes = await page.locator("[data-node-id]").evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
    }),
  );
  const x1 = Math.min(...boxes.map((b) => b.x)) - 25,
    y1 = Math.min(...boxes.map((b) => b.y)) - 25,
    x2 = Math.max(...boxes.map((b) => b.right)) + 35,
    y2 = Math.max(...boxes.map((b) => b.bottom)) + 35;
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  await page.mouse.move(x2, y2, { steps: 10 });
  await page.mouse.up();
  assert.equal(await page.locator(".mm-picked").count(), 4);
  const groupHandle = page
    .locator("[data-node-id]")
    .first()
    .getByRole("button", { name: "박스 위치 이동", exact: true });
  const groupBox = await groupHandle.boundingBox();
  await page.mouse.move(groupBox.x + 5, groupBox.y + 5);
  await page.mouse.down();
  await page.mouse.move(groupBox.x + 45, groupBox.y + 25, { steps: 5 });
  await page.mouse.up();
  await save();
  assert.equal(Object.keys(cloud[0].layoutPositions.graph).length, 4);
  await page.getByRole("button", { name: "여러 개 선택", exact: true }).click();

  await page.reload();
  await page.getByLabel("정리 방식", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("정리 방식", { exact: true }).inputValue(),
    "graph",
  );
  assert.equal(
    await page.getByLabel("서머리 이름", { exact: true }).inputValue(),
    "성장 실험의 우선순위",
  );
  // Mode switching keeps data and each layout's saved positions.
  await page.getByLabel("정리 방식", { exact: true }).selectOption("mindmap");
  await save();
  assert.equal(JSON.stringify(cloud[0].layoutPositions.mindmap), logic);
  await page.getByRole("button", { name: "전체 보기", exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/mindmap-logic-studio.png" });
  await page.getByLabel("정리 방식", { exact: true }).selectOption("flow");
  await node("고객 경험 실험").click();
  await page.getByRole("button", { name: "노드 옵션", exact: true }).click();
  await page
    .getByLabel("순서도 박스 모양", { exact: true })
    .selectOption("decision");
  await page.getByLabel("분기 이름", { exact: true }).fill("예");
  assert.equal(await page.locator(".mm-decision").count(), 1);
  await page.getByRole("button", { name: "노드 옵션", exact: true }).click();
  await save();
  const archive = await page.evaluate(async () => {
    const lib = await import("/src/mindmap.ts");
    const map = JSON.parse(localStorage.getItem("kanban.mindmaps.v1"))[0];
    const [copy] = await lib.importXmind(
      await (await lib.exportXmind(map)).arrayBuffer(),
    );
    const JSZip = (await import("/node_modules/.vite/deps/jszip.js")).default;
    const z = new JSZip();
    z.file(
      "content.xml",
      '<xmap-content><sheet><title>구형</title><topic><title>중심</title><children><topics type="attached"><topic><title>하위</title></topic></topics></children></topic></sheet></xmap-content>',
    );
    const old = await lib.importXmind(
      await z.generateAsync({ type: "arraybuffer" }),
    );
    const changed = await JSZip.loadAsync(
      await (await lib.exportXmind(map)).arrayBuffer(),
    );
    const content = JSON.parse(
      await changed.file("content.json").async("string"),
    );
    content[0].rootTopic.title = "외부 편집 이름";
    changed.file("content.json", JSON.stringify(content));
    const [external] = await lib.importXmind(
      await changed.generateAsync({ type: "arraybuffer" }),
    );
    let invalid = false;
    try {
      await lib.importXmind(new ArrayBuffer(10));
    } catch {
      invalid = true;
    }
    return {
      mode: copy.mode,
      sources: copy.floating[0].sourceIds.length,
      logic: !!copy.layoutPositions.mindmap,
      legacy: old[0].root.children[0].title,
      external: external.root.title,
      invalid,
    };
  });
  assert.deepEqual(archive, {
    mode: "flow",
    sources: 3,
    logic: true,
    legacy: "하위",
    external: "외부 편집 이름",
    invalid: true,
  });
  // Folder management and new maps preserve the old board.
  const firstId = cloud[0].id;
  await page.getByRole("button", { name: "＋ 새 맵", exact: true }).click();
  await save();
  assert.equal(cloud.length, 2);
  await page
    .locator(".mm-map-row .mm-tree-name")
    .filter({ hasText: "성장 실험 보드" })
    .click();
  assert.equal(
    await page.getByLabel("마인드맵 선택", { exact: true }).inputValue(),
    firstId,
  );
  page.once("dialog", (d) => d.accept("전략"));
  await page.getByRole("button", { name: "＋ 폴더", exact: true }).click();
  await save();
  assert.equal(
    await page.getByLabel("현재 맵의 폴더", { exact: true }).inputValue(),
    "전략",
  );
  // Save failure keeps a recoverable local copy.
  fail = true;
  await node("플랫폼 성장").dblclick();
  await rename("플랫폼 성장 계획");
  await page
    .getByRole("alert")
    .filter({ hasText: "시험용 저장 실패" })
    .waitFor();
  await page.reload();
  await page.getByLabel("정리 방식", { exact: true }).waitFor();
  assert.equal(await node("플랫폼 성장 계획").count(), 1);
  fail = false;
  await page.getByRole("button", { name: "저장 재시도", exact: true }).click();
  await save();
  await page.getByRole("button", { name: "전체 화면", exact: true }).click();
  await page.waitForFunction(() => !!document.fullscreenElement);
  await page.getByRole("button", { name: "전체 화면", exact: true }).click();
  await page.waitForFunction(() => !document.fullscreenElement);
  await page.getByRole("button", { name: "패널 숨기기", exact: true }).click();
  await page.getByRole("button", { name: "도구 접기", exact: true }).click();
  assert.equal(await page.locator(".mm-toolbar").isVisible(), false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(120);
  assert.equal(
    Math.round((await page.locator(".mm-focus").boundingBox()).width),
    390,
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      passed: true,
      inlineNames: true,
      layouts: 3,
      dragConnection: true,
      summarySources: 3,
      archive: true,
      recovery: true,
      focus: true,
      posts,
    }),
  );
  await browser.close();
  await server.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
