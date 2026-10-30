const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const { createServer } = await import("vite");
  const server = await createServer({
    server: { host: "127.0.0.1", port: 5177 },
  });
  await server.listen();
  const browser = await chromium.launch({
    executablePath: "/tmp/mindmap-chromium",
    args: ["--no-sandbox", "--single-process", "--no-zygote"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();
    const errors = [],
      writes = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/api/**", (r) => {
      if (r.request().method() !== "GET") writes.push(r.request().url());
      return r.fulfill({
        json: r.request().url().includes("content-planning")
          ? { items: [], rules: "", sheetUrl: "" }
          : r.request().url().includes("mindmaps")
            ? {
                maps: [
                  {
                    id: "test",
                    title: "테스트",
                    root: { id: "root", title: "중심", children: [] },
                    updatedAt: "2026-10-30",
                    revision: "r1",
                  },
                ],
              }
            : [],
      });
    });
    await page.goto("http://127.0.0.1:5177/?view=memo");
    const editor = page.getByLabel("자유 메모", { exact: true });
    await editor.waitFor();
    const note =
      "챙겨둘 것\n회사에서 물어볼 자료\n```javascript\nconst x = 1;\n```\n아이디어 <script>그대로 보관</script>";
    await editor.fill(note);
    await page.getByRole("button", { name: "저장하기", exact: true }).click();
    assert.equal(
      await page
        .locator(".memo-status")
        .textContent()
        .then((t) => t.includes("저장했습니다.")),
      true,
    );
    const nav = page.getByRole("group", { name: "칸반보드 분류" });
    assert.equal(await nav.getByRole("button").count(), 4);
    const indent = await nav
      .getByRole("button")
      .first()
      .evaluate((el) => getComputedStyle(el).paddingLeft);
    assert.equal(indent, "36px");
    await page
      .locator(".metal-side")
      .getByRole("button", { name: "플래닝", exact: true })
      .click();
    await page
      .locator(".metal-side")
      .getByRole("button", { name: "메모", exact: true })
      .click();
    assert.equal(await editor.inputValue(), note);
    await page
      .getByRole("button", { name: "코드 블록 출력·복사", exact: true })
      .click();
    const block = "````\n" + note + "\n````";
    assert.equal(
      await page.getByLabel("복사용 텍스트", { exact: true }).inputValue(),
      block,
    );
    assert.equal(
      await page.evaluate(() => navigator.clipboard.readText()),
      block,
    );
    assert.equal(
      await page.locator(".memo-output pre code").textContent(),
      note,
    );
    await page.reload();
    assert.equal(await editor.inputValue(), note);
    // A failed write retains the edit across menu switches and can be retried.
    await page.evaluate(() => {
      window.memoOriginalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === "kanban.scratchpad.v1")
          throw new DOMException("quota", "QuotaExceededError");
        return window.memoOriginalSet.call(this, k, v);
      };
    });
    await editor.fill(note + "\n실패해도 유지");
    await page
      .getByRole("alert")
      .filter({ hasText: "기기에 저장하지 못했습니다" })
      .waitFor();
    await page
      .locator(".metal-side")
      .getByRole("button", { name: "마인드맵", exact: true })
      .click();
    await page
      .locator(".metal-side")
      .getByRole("button", { name: "메모", exact: true })
      .click();
    assert.equal(await editor.inputValue(), note + "\n실패해도 유지");
    await page.evaluate(
      () => (Storage.prototype.setItem = window.memoOriginalSet),
    );
    await page.getByRole("button", { name: "저장하기", exact: true }).click();
    await page.reload();
    assert.equal(await editor.inputValue(), note + "\n실패해도 유지");
    await page.screenshot({ path: "/tmp/kanban-memo-desktop.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "메모", exact: true }).waitFor();
    assert(await editor.isVisible());
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({ path: "/tmp/kanban-memo-mobile.png" });
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, []);
    await page.evaluate(() =>
      localStorage.setItem("kanban.scratchpad.v1", "invalid-original"),
    );
    await page.reload();
    assert(await editor.isDisabled());
    assert.equal(
      await page.evaluate(() => localStorage.getItem("kanban.scratchpad.v1")),
      "invalid-original",
    );
    console.log(
      JSON.stringify({
        passed: true,
        localPersistence: true,
        manualSave: true,
        safeCodeFence: true,
        clipboard: true,
        menuHierarchy: true,
        mobile: true,
        quotaRecovery: true,
        malformedDataPreserved: true,
        noServerWrites: true,
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
