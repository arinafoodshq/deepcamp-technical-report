// One-off: capture the video-lessons page (YouTube source filter, so the
// shot is not littered with expired TikTok CDN thumbnails).
export default async function run(page) {
  await page.goto('https://deepcamp.cc/video-lessons?src=youtube', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let y = 0;
    const height = () => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    while (y < height()) {
      y += 700;
      window.scrollTo(0, y);
      await sleep(120);
    }
  });
  try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch {}
  await page.evaluate(() => Promise.race([
    Promise.all(Array.from(document.images).filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; }))),
    new Promise((r) => setTimeout(r, 6000)),
  ]));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'paper/assets/screenshots/03-video-lessons.png', fullPage: true });
  return { name: '03-video-lessons', title: await page.title() };
}
