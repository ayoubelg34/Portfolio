import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ids = ["about", "projects", "skills", "education", "contact"];

// Exercise semantic UI independently of software GPU speed; one dedicated test
// below validates the real WebGL renderer and its context-loss behavior.
test.beforeEach(async ({ page }, info) => {
  if (!info.title.startsWith("WebGL works")) {
    await page.route("**/assets/js/scene.js*", (route) => route.abort());
  }
});

test("all sculptures open real content, close with Escape, and restore focus", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const id of ids) {
    const link = page.locator(`[data-object="${id}"]`);
    await link.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator(`#chapter-content #${id}`)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(link).toBeFocused();
  }
  expect(errors).toEqual([]);
});

test("deep links, chapter switching, browser history, and legacy routes work", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#experience");
  await expect(page.locator("#chapter-content #education")).toBeVisible();
  await page.getByRole("button", { name: "Close section" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.locator('[data-object="about"]').click();
  await page.locator("#next-chapter").click();
  await expect(page.locator("#chapter-content #projects")).toBeVisible();
  await expect(page.locator("#chapter-content .chapter")).toHaveCount(1);
  await page.goBack();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goForward();
  await expect(page.locator("#chapter-content #projects")).toBeVisible();
  await page.reload();
  await expect(page.locator("#chapter-content #projects")).toBeVisible();
});

test("keyboard navigation and index keep every section discoverable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Index", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Portfolio index" }),
  ).toBeVisible();
  await expect(page.locator(".world-stage")).toBeHidden();
  await page.locator('.index-view a[href="#contact"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#contact-title")).toBeFocused();
  // Native modal focus must stay inside the dialog, including backwards traversal.
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => !!document.activeElement.closest("dialog")),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.locator('.index-view a[href="#contact"]')).toBeFocused();
});

test("mobile uses no WebGL download, fits the viewport, and opens full-screen chapters", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  const sceneRequests = [];
  page.on("request", (request) => {
    if (/scene\.js|three/.test(request.url()))
      sceneRequests.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator(".portal")).toHaveCount(5);
  await page.locator(".portal-projects").click();
  await expect(page.locator("#chapter-content #projects")).toBeVisible();
  await expect(page.locator("#chapter-content .project")).toHaveCount(3);
  const box = await page.getByRole("dialog").boundingBox();
  expect(box.width).toBe(390);
  expect(box.height).toBe(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.getByRole("button", { name: "Close section" }).click();
  expect(sceneRequests).toEqual([]);
});

test("world and all chapters pass automated accessibility checks", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const id of ["world", ...ids]) {
    if (id !== "world") {
      await page.locator(`[data-object="${id}"]`).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    }
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations,
      `${id}: ${JSON.stringify(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`,
    ).toEqual([]);
    if (id !== "world") {
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
    }
  }
});

test("WebGL works and context loss exposes a usable fallback", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/webgl-ready/, {
    timeout: 20000,
  });
  expect(
    await page
      .locator("canvas")
      .evaluate((canvas) => !!canvas.getContext("webgl2")),
  ).toBe(true);
  await page.locator(".portal-about").click();
  await expect(page.locator("#chapter-content #about")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .locator("canvas")
    .evaluate((canvas) =>
      canvas
        .getContext("webgl2")
        .getExtension("WEBGL_lose_context")
        .loseContext(),
    );
  await expect(page.locator("html")).not.toHaveClass(/webgl-ready/);
  await page.locator(".portal-skills").click();
  await expect(page.locator("#chapter-content #skills")).toBeVisible();
});

test("reduced-motion preference persists, and no-JavaScript content is usable", async ({
  browser,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Enable motion" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Pause motion" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/motion-paused/);
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const plain = await noJs.newPage();
  await plain.goto("http://127.0.0.1:5173/");
  await expect(plain.locator("#content-archive")).toBeVisible();
  await expect(plain.locator(".chapter")).toHaveCount(5);
  await plain.locator(".portal-contact").click();
  await expect(plain.locator("#contact-title")).toBeInViewport();
  await noJs.close();
});

test("responsive world links remain separate at laptop and tablet sizes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, height] of [
    [1366, 768],
    [1024, 768],
    [820, 1180],
    [320, 650],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    const boxes = await page
      .locator(".portal")
      .evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().toJSON()),
      );
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i],
          b = boxes[j];
        const overlap =
          Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
          Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        expect(overlap, `${width}px: objects ${i} and ${j} overlap`).toBe(0);
      }
  }
});

test("case studies switch with keyboard, reveal engineering detail, and keep real contact links", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#projects");
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
  await page.locator("#tab-geo").focus();
  for (const id of ["network", "vision", "geo"]) {
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(`#tab-${id}`)).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator(`#tab-${id}`)).toBeFocused();
    await expect(page.locator(`#project-${id}`)).toBeVisible();
    await expect(page.getByRole("tabpanel")).toHaveCount(1);
    await page.locator(`#project-${id} summary`).click();
    await expect(page.locator(`#project-${id} .project-detail`)).toBeVisible();
    await expect(
      page.locator(`#project-${id} a[href^="mailto:"]`),
    ).toHaveAttribute(
      "href",
      /ayoub\.el-ghazi-ouserbane@etu\.umontpellier\.fr\?subject=/,
    );
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
    await page.locator(`#tab-${id}`).focus();
  }
  await page.keyboard.press("End");
  await expect(page.locator("#tab-vision")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.locator("#tab-geo")).toBeFocused();
});

test("animated entry can be cancelled and the section compass returns to the same world", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".portal-projects").click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator("body")).not.toHaveClass(/world-focusing/);
  await page.locator(".portal-projects").click();
  await expect(page.locator("#projects")).toBeVisible();
  await page.locator('.chapter-compass a[href="#skills"]').click();
  await expect(page.locator("#skills")).toBeVisible();
  await expect(
    page.locator('.chapter-compass a[href="#skills"]'),
  ).toHaveAttribute("aria-current", "page");
  await page
    .getByRole("link", { name: "Back to the world", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".portal-projects")).toBeFocused();
});

test("desktop cursor adapts to objects and returns to the native cursor for reduced motion", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".portal-about").hover();
  await expect(page.locator("html")).toHaveClass(/cursor-enabled/);
  await expect(page.locator(".explore-cursor span")).toHaveText("Open");
  await page.locator(".portal-projects").hover();
  await expect(page.locator(".explore-cursor span")).toHaveText("Explore");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move(20, 20);
  await expect(page.locator("html")).not.toHaveClass(/cursor-enabled/);
});
