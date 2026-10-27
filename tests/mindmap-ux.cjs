const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const { createServer } = await import("vite");
  const server = await createServer({
    server: { host: "127.0.0.1", port: 5176 },
  });
  await server.listen();
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ["--no-sandbox", "--single-process", "--no-zygote"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    let cloud = [
        {
          id: "ux",
          title: "UX 테스트",
          root: { id: "root", title: "중심 주제", children: [] },
          revision: "r0",
          updatedAt: "2026-10-27",
        },
      ],
      posts = 0;
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/api/cards?**", (r) => r.fulfill({ json: [] }));
    await page.route("**/api/mindmaps", (r) => {
      if (r.request().method() === "GET")
        return r.fulfill({ json: { maps: cloud } });
      const m = r.request().postDataJSON().map;
      const revision = "r" + ++posts;
      cloud = [{ ...m, revision, dirty: false }];
      return r.fulfill({ json: { revision } });
    });
    await page.goto("http://127.0.0.1:5176/?view=mindmap&focus=1");
    const node = (title) =>
      page.locator(".mm-topic").filter({ hasText: title });
    const input = () => page.getByLabel("노드 이름", { exact: true });
    const finish = async (text) => {
      await input().fill(text);
      await input().press("Escape");
    };
    const save = () =>
      page
        .getByRole("status")
        .filter({ hasText: "클라우드 저장 완료" })
        .waitFor();
    await node("중심 주제").waitFor();
    assert.equal(
      await page
        .locator(".mm-canvas")
        .evaluate((el) => getComputedStyle(el).backgroundImage),
      "none",
    );
    await node("중심 주제").press("Enter");
    assert.equal(await input().inputValue(), "");
    await finish("플로팅 A");
    await node("중심 주제").press("Tab");
    assert.equal(await input().inputValue(), "");
    await input().fill("동등 A");
    await input().press("Enter");
    await input().fill("동등 B");
    await input().press("Tab");
    await finish("하위 C");
    await save();
    assert(
      cloud[0].root.children.find((t) => t.title === "플로팅 A").independent,
    );
    assert.deepEqual(
      cloud[0].root.children.filter((t) => !t.independent).map((t) => t.title),
      ["동등 A", "동등 B"],
    );
    assert.equal(
      cloud[0].root.children.find((t) => t.title === "동등 B").children[0]
        .title,
      "하위 C",
    );
    await node("동등 A").click();
    await node("동등 B").click({ modifiers: ["Control"] });
    await node("동등 B").press("Delete");
    assert.equal(await node("동등 A").count(), 0);
    assert.equal(await node("동등 B").count(), 0);
    assert.equal(await node("하위 C").count(), 0);
    assert.equal(await node("플로팅 A").count(), 1);
    await node("중심 주제").press("Control+z");
    assert.equal(await node("하위 C").count(), 1);
    await page.getByRole("button", { name: /도구 펼치기/ }).click();
    await node("동등 A").click();
    await node("동등 B").click({ modifiers: ["Control"] });
    await page
      .getByRole("button", { name: "선택 삭제 (2)", exact: true })
      .click();
    assert.equal(await node("동등 A").count(), 0);
    await page
      .getByRole("button", { name: "↶ 실행 취소", exact: true })
      .click();
    assert.equal(await node("동등 A").count(), 1);
    const rootBox = () => page.locator('[data-node-id="root"]');
    await node("중심 주제").click();
    const before = await rootBox().boundingBox();
    const grip = rootBox().getByRole("button", {
      name: "박스 크기 조절",
      exact: true,
    });
    const g = await grip.boundingBox();
    await page.mouse.move(g.x + 8, g.y + 8);
    await page.mouse.down();
    await page.mouse.move(g.x + 68, g.y + 48, { steps: 6 });
    await page.mouse.up();
    const after = await rootBox().boundingBox();
    assert(after.width > before.width + 100);
    assert(after.height > before.height + 60);
    await save();
    assert(cloud[0].root.boxWidth > 250);
    assert(cloud[0].root.boxHeight > 100);
    const pos = rootBox().getByRole("button", {
      name: "박스 위치 이동",
      exact: true,
    });
    const p = await pos.boundingBox();
    await page.mouse.move(p.x + 5, p.y + 5);
    await page.mouse.down();
    await page.mouse.move(p.x + 95, p.y + 65, { steps: 6 });
    await page.mouse.up();
    await save();
    assert(cloud[0].layoutPositions.mindmap.root);
    const rootPosition = cloud[0].layoutPositions.mindmap.root;
    await node("중심 주제").press("Enter");
    await finish("수동 플로팅");
    await save();
    const manual = cloud[0].root.children.find(
      (t) => t.title === "수동 플로팅",
    );
    assert(manual.independent);
    assert.equal(cloud[0].layoutPositions.mindmap[manual.id].x, rootPosition.x);
    assert(cloud[0].layoutPositions.mindmap[manual.id].y > rootPosition.y);
    await node("중심 주제").click();
    await page
      .getByRole("button", { name: "크기 자동 맞춤", exact: true })
      .click();
    await save();
    assert.equal(cloud[0].root.boxWidth, undefined);
    await page
      .getByRole("button", { name: "↶ 실행 취소", exact: true })
      .click();
    await save();
    assert(cloud[0].root.boxWidth > 250);

    await page.getByRole("button", { name: "자동 정렬", exact: true }).click();
    await save();
    assert.deepEqual(cloud[0].layoutPositions.mindmap, {});
    await page
      .getByRole("button", { name: "＋ 독립 메모", exact: true })
      .click();
    const memoGrip = page
      .locator(".mm-floating")
      .getByRole("button", { name: "박스 크기 조절", exact: true });
    await memoGrip.focus();
    await memoGrip.press("ArrowRight");
    await save();
    assert.equal(cloud[0].floating[0].width, 260);
    const long = "긴 텍스트를 읽기 편하게 자동으로 줄바꿈합니다. ".repeat(7);
    await node("플로팅 A").dblclick();
    await finish(long);
    const textNode = node("긴 텍스트를 읽기 편하게");
    const longBox = await textNode.locator("..").boundingBox();
    assert(longBox.width >= 418 && longBox.width <= 422);
    assert(longBox.height > 100);
    assert(
      await textNode.evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
    );
    await textNode.dblclick();
    await input().fill("첫째 줄");
    await input().press("End");
    await input().press("Shift+Enter");
    await input().pressSequentially("둘째 줄");
    await input().press("Escape");
    assert.equal(await node("첫째 줄").textContent(), "첫째 줄\n둘째 줄");
    await save();
    await page.reload();
    await node("첫째 줄").waitFor();
    assert(cloud[0].root.boxWidth > 250);
    assert.equal(await page.locator(".mm-toolbar").isVisible(), false);
    await page.screenshot({ path: "/tmp/mindmap-ux-final.png" });
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        passed: true,
        multiDelete: true,
        undo: true,
        keyboardHierarchy: true,
        blankFloating: true,
        resizePersistence: true,
        freePosition: true,
        autoArrange: true,
        wrap: true,
        multiline: true,
      }),
    );
  } finally {
    await browser.close();
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
