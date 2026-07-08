import { chromium } from 'playwright'
import fs from 'fs';
import { getRandomUserAgent } from './user_agents.js'

// Session replay helper for authorized QA/debugging in controlled environments.

const default_user_agent = getRandomUserAgent();
const chromiumExecutablePath = process.env.CHROMIUM_EXECUTABLE_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || ''
var proxy = false
if(process.argv.length > 3){
  var proxy = process.argv[2];
  var session = JSON.parse(fs.readFileSync(process.argv[3]));
}else{
  var session = JSON.parse(fs.readFileSync(process.argv[2]));
}

(async () => {
  let browser_options = [
    "--ignore-certificate-errors",
    "--disable-blink-features=AutomationControlled",
    "--start-maximized",
    "--no-sandbox",
  ]
  if(proxy){
    browser_options.push("--proxy-server=" + proxy)
  }
  const browser = await chromium.launchPersistentContext('./user_data/replay_profile', {
    headless: false,
    ignoreHTTPSErrors: true,
    bypassCSP: true,
    ...(chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {}),
    ignoreDefaultArgs: ["--enable-automation"],
    viewport: null,
    userAgent: default_user_agent,
    args: browser_options
  });
  browser.on('close', () => clearInterval(checkClosed));
  const page = browser.pages()[0] || await browser.newPage();
  var checkClosed = setInterval(async () => {
    const pages = await browser.pages()
    if(pages.length === 0) {
      clearInterval(checkClosed);
      process.exit();
    }
  }, 3000)
  //filter out the partitionKey attribute on all cookies
  session.cookies.map((cookie) => {
      delete cookie.partitionKey
  })
  //inject our cookies
  // const cdp = await page.target().createCDPSession();
  // await cdp.send('Network.setCookies',{
  //   cookies: session.cookies,
  // })
  const cdp = await browser.newCDPSession(page)
  for (let cookie of session.cookies) {
    await cdp.send('Network.setCookie', cookie).catch((err) => console.log(`error setting cookie on ${cookie}`, err));
  }

  await page.goto(session.url, {
    waitUntil: 'domcontentloaded'
  })
  .catch((err) => console.log("error loading url", err));
  for (const key_val of session.local_storage) {
    await page.evaluate(([key, value]) => {
      window.localStorage.setItem(key, value)
    }, key_val)
  }
  
  // Reload after injecting local storage so the page sees the restored session state.
  await page.goto(session.url, {
    waitUntil: 'networkidle'
  })
  .catch((err) => console.log("error loading url", err));

})();


