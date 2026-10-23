// Captures paper screenshots of key deepcamp.cc pages.
// Run: node C:\Users\User\.claude\skills\browser-automation\browser.mjs --session dc --script paper/capture.mjs
export default async function run(page) {
  const shots = [
    ['02-topics', 'https://deepcamp.cc/topics'],
    ['03-video-lessons', 'https://deepcamp.cc/video-lessons'],
    ['04-reads', 'https://deepcamp.cc/reads'],
    ['06-search', 'https://deepcamp.cc/search?q=how+do+neural+networks+learn'],
    ['07-jobs', 'https://deepcamp.cc/jobs'],
    ['08-roadmap', 'https://deepcamp.cc/roadmap'],
    ['09-lesson', 'https://deepcamp.cc/video/how-to-build-a-1-million-business-without-selling-your-time-qkX0EBshykc'],
  ];
  const results = [];
  for (const [name, url] of shots) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(1500);
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
