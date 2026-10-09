// Run via Playwright CLI against the isolated project, with synthetic storage state.
// Replace only the fixture name in a Git-ignored copy prepared by the operator.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async (page) => {
  const name = "__fixture_name__";
  const context = page.context(), errors = [];
  const onError = error => errors.push(error.message);
  const onDialog = dialog => dialog.accept();
  page.on("pageerror", onError);
  page.on("dialog", onDialog);
  try {
  await page.setViewportSize({ width: 1280, height: 900 });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:3700" });
  await page.goto("http://127.0.0.1:3700");
  const row = () => page.getByRole("article", { name, exact: true });
  const link = () => row().getByRole("link", { name: "Mở preview", exact: true });
  await link().waitFor();
  const original = await link().getAttribute("href");
  if (!/^https:\/\/view\.ods\.test:4443\/[A-Za-z0-9]{10}$/.test(original)) throw new Error("UI did not use server canonical short link");
  async function status(url) {
    const tab = await context.newPage();
    try { return (await tab.goto(url)).status(); } finally { await tab.close(); }
  }
  if (await status(original) !== 200) throw new Error("Original viewer unavailable");
  await row().getByRole("button", { name: "Sao chép link", exact: true }).click();
  await row().getByRole("button", { name: "Đã sao chép", exact: true }).waitFor();
  if (await page.evaluate(() => navigator.clipboard.readText()) !== original) throw new Error("Clipboard did not copy canonical URL");
  await row().locator("summary").click();
  await row().getByRole("button", { name: "Đổi link xem", exact: true }).click();
  await page.getByText("Đã tạo link xem mới", { exact: false }).waitFor();
  // Wait for list refresh/remount, rather than trusting the mutation notice.
  await page.waitForFunction(({ name, original }) => {
    const article = [...document.querySelectorAll("article")].find(el => el.getAttribute("aria-label") === name);
    const href = article?.querySelector('a[href*="view.ods.test"]')?.getAttribute("href");
    return Boolean(href && href !== original);
  }, { name, original });
  const changed = await link().getAttribute("href");
  if (changed === original || await status(original) !== 404 || await status(changed) !== 200) throw new Error("Rotation lifecycle failed");
  if (await row().getByRole("button", { name: "Đã sao chép", exact: true }).count()) throw new Error("Stale copied state survived rotation");
  await row().locator("summary").click();
  await row().getByRole("button", { name: "Thu hồi link xem", exact: true }).click();
  await page.getByText("Đã thu hồi link xem", { exact: false }).waitFor();
  await link().waitFor({ state: "detached" });
  if (await status(changed) !== 404) throw new Error("Revoked viewer still resolves");
  await row().locator("summary").click();
  await row().getByRole("button", { name: "Tạo link xem", exact: true }).click();
  await link().waitFor();
  const reissued = await link().getAttribute("href");
  if (reissued === original || reissued === changed || await status(reissued) !== 200) throw new Error("Reissue resurrected an old code");
  await row().getByRole("button", { name: "Tắt xuất bản", exact: true }).click();
  await row().getByRole("button", { name: "Xuất bản lại", exact: true }).waitFor();
  if (await status(reissued) !== 404) throw new Error("Unpublished viewer remained available");
  await row().getByRole("button", { name: "Xuất bản lại", exact: true }).click();
  await link().waitFor();
  if (await link().getAttribute("href") !== reissued || await status(reissued) !== 200) throw new Error("Republish changed viewer code");
  await page.screenshot({ path: "output/playwright/share-links-studio-1280.png", fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await row().locator("summary").click();
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error("Horizontal overflow at " + width);
    await page.screenshot({ path: "output/playwright/share-links-studio-" + width + ".png", fullPage: true });
    await row().locator("summary").click();
  }
  await row().getByRole("button", { name: "Tắt xuất bản", exact: true }).click();
  await row().getByRole("button", { name: "Xuất bản lại", exact: true }).waitFor();
  if (errors.length) throw new Error("Studio JS error: " + errors.join(";"));
  const result = { result: "PASS", browser: context.browser().version(), passed: [
    "Studio canonical copy/open, rotate confirmation, stale clipboard state reset",
    "revoke removes viewer action, old link 404, reissue uses new code",
    "unpublish/republish keeps code and blocks/restores viewer; fixture left unpublished",
    "1280/390/320 viewport, no horizontal overflow or JavaScript errors",
  ] };
  await page.evaluate(value => { window.__shareLinkSmoke = value; }, result);
  return result;
  } finally {
    page.off("pageerror", onError);
    page.off("dialog", onDialog);
  }
}
