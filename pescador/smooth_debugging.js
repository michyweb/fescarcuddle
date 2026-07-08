import { chromium } from 'playwright'
import fs from 'fs';

var proxy = process.argv[2];
var target = process.argv[3];

(async () => {
    const browser = await chromium.connectOverCDP(`http://${proxy}`).catch((err) => console.log("error connecting to browser", err));
    if (!browser) process.exit(1)
    const context = browser.contexts()[0] || await browser.newContext()
    const target_page = await context.newPage();
    await target_page.goto(target, {
        waitUntil: 'networkidle'
    })
    const cdp = await context.newCDPSession(target_page)
    let cookie_data = await cdp.send('Storage.getCookies')
    let cookies = cookie_data.cookies
    let dom_data = await cdp.send('DOMStorage.getDOMStorageItems', {
        storageId: {
            securityOrigin: await target_page.evaluate(() => window.origin),
            isLocalStorage: true,
        },
    })
    let local_storage = dom_data.entries
//    console.log({ url: target_page.url(), cookies: cookies, local_storage: local_storage })
    //write the data to a file
    fs.writeFileSync('data.json', JSON.stringify({ url: target_page.url(), cookies: cookies, local_storage: local_storage }))
    //close the page
    await target_page.close();
    await browser.close();
})()


