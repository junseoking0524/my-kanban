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
  await page.goto("http://127.0.0.1:5173/?view=mindmap&focus=1");
  await page.getByLabel("정리 방식", { exact: true }).waitFor();
  let box = await page.locator(".mm-focus").boundingBox();
  assert.equal(box.x, 0);
  assert.equal(box.y, 0);
  assert.equal(Math.round(box.width), 1440);
  await page.getByLabel("정리 방식", { exact: true }).selectOption("flow");
  await page
    .getByRole("button", { name: "다음 단계 Tab", exact: true })
    .click();
  await page.locator("#mm-title").fill("승인 여부");
  await page
    .getByLabel("순서도 박스 모양", { exact: true })
    .selectOption("decision");
  await page.getByLabel("분기 이름", { exact: true }).fill("검토");
  assert.equal(await page.locator(".mm-decision").count(), 1);
  await page
    .getByRole("button", { name: "다음 단계 Tab", exact: true })
    .click();
  await page.locator("#mm-title").fill("처리 완료");
  await page
    .getByLabel("순서도 박스 모양", { exact: true })
    .selectOption("terminal");
  await page.getByLabel("분기 이름", { exact: true }).fill("예");
  await page
    .getByLabel("추가 연결 대상", { exact: true })
    .selectOption({ label: "승인 여부" });
  await page
    .getByLabel("연결선 이름", { exact: true })
    .fill("아니오: 다시 검토");
  await page
    .getByRole("button", { name: "방향 화살표 추가", exact: true })
    .click();
  assert.equal(
    await page
      .locator(".mm-edge-label")
      .filter({ hasText: "아니오: 다시 검토" })
      .count(),
    1,
  );
  await page.getByRole("button", { name: "＋ 독립 메모", exact: true }).click();
  await page
    .getByLabel("독립 메모 내용", { exact: true })
    .fill("회의 전에 확인할 내용");
  await page
    .getByLabel("독립 메모 색상", { exact: true })
    .selectOption("#dff4e8");
  const note = page.locator(".mm-floating"),
    handle = note.getByRole("button", { name: "박스 위치 이동", exact: true });
  const start = await handle.boundingBox();
  await page.mouse.move(start.x + 8, start.y + 8);
  await page.mouse.down();
  await page.mouse.move(start.x + 100, start.y + 65, { steps: 5 });
  await page.mouse.up();
  await page
    .getByRole("status")
    .filter({ hasText: "클라우드 저장 완료" })
    .waitFor();
  assert.equal(cloud[0].mode, "flow");
  assert.equal(cloud[0].links.length, 1);
  assert.equal(cloud[0].floating[0].text, "회의 전에 확인할 내용");
  assert.equal(cloud[0].floating[0].color, "#dff4e8");
  // Move an actual process box via its touch-compatible handle.
  await page.getByRole("button", { name: "전체 보기", exact: true }).click();
  await page.waitForTimeout(300);
  const processHandle = page
    .locator(".mm-terminal")
    .getByRole("button", { name: "박스 위치 이동", exact: true });
  const pos = await processHandle.boundingBox();
  await page.mouse.move(pos.x + 5, pos.y + 5);
  await page.mouse.down();
  await page.mouse.move(pos.x + 80, pos.y + 35, { steps: 5 });
  await page.mouse.up();
  await page
    .getByRole("status")
    .filter({ hasText: "클라우드 저장 완료" })
    .waitFor();
  assert.equal(Object.keys(cloud[0].positions).length, 1);
  const native = await page.evaluate(async () => {
    const lib = await import("/src/mindmap.ts");
    const m = JSON.parse(localStorage.getItem("kanban.mindmaps.v1"))[0];
    const blob = await lib.exportXmind(m);
    const [copy] = await lib.importXmind(await blob.arrayBuffer());
    return {
      note: copy.floating[0].text,
      links: copy.links.length,
      positions: Object.keys(copy.positions).length,
      mode: copy.mode,
    };
  });
  assert.deepEqual(native, {
    note: "회의 전에 확인할 내용",
    links: 1,
    positions: 1,
    mode: "flow",
  });
  const edited = await page.evaluate(async () => {
    const lib = await import("/src/mindmap.ts");
    const JSZip = (await import("/node_modules/.vite/deps/jszip.js")).default;
    const m = JSON.parse(localStorage.getItem("kanban.mindmaps.v1"))[0];
    const z = await JSZip.loadAsync(
      await (await lib.exportXmind(m)).arrayBuffer(),
    );
    const content = JSON.parse(await z.file("content.json").async("string"));
    content[0].rootTopic.title = "외부 XMind에서 수정";
    z.file("content.json", JSON.stringify(content));
    const [copy] = await lib.importXmind(
      await z.generateAsync({ type: "arraybuffer" }),
    );
    return { title: copy.root.title, notes: copy.floating.length };
  });
  assert.equal(edited.title, "외부 XMind에서 수정");
  assert.equal(edited.notes, 1);
  await page.reload();
  await page.getByLabel("정리 방식", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("정리 방식", { exact: true }).inputValue(),
    "flow",
  );
  assert.equal(
    await page.getByLabel("독립 메모 내용", { exact: true }).inputValue(),
    "회의 전에 확인할 내용",
  );
  await page.getByRole("button", { name: "패널 숨기기", exact: true }).click();
  assert.equal(await page.locator(".mm-inspector").isVisible(), false);
  await page.getByRole("button", { name: "도구 접기", exact: true }).click();
  assert.equal(await page.locator(".mm-toolbar").isVisible(), false);
  await page.getByRole("button", { name: "전체 화면", exact: true }).click();
  await page.waitForFunction(()=>!!document.fullscreenElement,undefined,{timeout:5000});
  await page.getByRole("button", { name: "전체 화면", exact: true }).click();
  await page.waitForFunction(()=>!document.fullscreenElement,undefined,{timeout:5000});
  await page.screenshot({ path: "/tmp/mindmap-focus-flow.png" });
  await page.getByRole("button", { name: "도구 펼치기", exact: true }).click();
  await page.getByLabel("정리 방식", { exact: true }).selectOption("mindmap");
  assert.equal(await page.locator(".mm-floating").count(), 1);
  await page
    .getByRole("button", { name: "독립 메모 삭제", exact: true })
    .click();
  assert.equal(await page.locator(".mm-floating").count(), 0);
  await page.getByRole("button", { name: "↶ 실행 취소", exact: true }).click();
  assert.equal(await page.locator(".mm-floating").count(), 1);
  await page.getByRole("button", { name: "집중 종료", exact: true }).click();
  assert.equal(await page.locator(".mm-focus").count(), 0);
  assert(!page.url().includes("focus=1"));
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      passed: true,
      flow: true,
      floating: true,
      nativeXmind: true,
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
