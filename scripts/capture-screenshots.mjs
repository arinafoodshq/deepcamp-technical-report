// Captures paper screenshots of key deepcamp.cc pages.
// Run: node C:\Users\User\.claude\skills\browser-automation\browser.mjs --session dc --script paper/capture-screenshots.mjs
// The script scrolls each page end-to-end first so lazy-loaded thumbnails
// (loading="lazy") actually load before the full-page screenshot is taken.
export default async function run(page) {
  const pages = [
    ['01-homepage', 'https://deepcamp.cc'],
    ['02-topics', 'https://deepcamp.cc/topics'],
    ['03-video-lessons', 'https://deepcamp.cc/video-lessons'],
    ['04-reads', 'https://deepcamp.cc/reads'],
    ['05-skills', 'https://deepcamp.cc/skills'],
    ['06-search', 'https://deepcamp.cc/search?q=how+do+neural+networks+learn'],
    ['07-jobs', 'https://deepcamp.cc/jobs'],
    ['08-roadmap', 'https://deepcamp.cc/roadmap'],
    ['09-lesson', 'https://deepcamp.cc/video/how-to-build-a-1-million-business-without-selling-your-time-qkX0EBshykc'],
  ];
  const results = [];
  for (const [name, url] of pages) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      // Walk the page so lazy images enter the viewport and start loading.
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
      // Wait for the network to settle and every <img> to finish.
      try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch {}
      await page.evaluate(() => Promise.race([
        Promise.all(Array.from(document.images)
          .filter((i) => !i.complete)
          .map((i) => new Promise((r) => { i.onload = i.onerror = r; }))),
        new Promise((r) => setTimeout(r, 6000)),
      ]));
      await page.waitForTimeout(400);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      const file = `paper/assets/screenshots/${name}.png`;
      await page.screenshot({ path: file, fullPage: true });
      const title = await page.title();
      results.push({ name, status: 'ok', title });
    } catch (e) {
      results.push({ name, status: 'error', error: String(e).slice(0, 120) });
    }
  }
  return results;
}
