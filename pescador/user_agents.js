const VERSIONS = {
  CHROME_VERSION: '126.0.6478.182',
  EDGE_VERSION: '126.0.2592.113',
  FIREFOX_VERSION: '127.0',
  SAFARI_VERSION: '17.5',
  SAMSUNG_BROWSER_VERSION: '24.0',
  CHROME_IOS_VERSION: '126.0.6478.108'
}

const userAgentTemplates = [
  // Windows - Chrome
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/<<CHROME_VERSION>> Safari/537.36',

  // Windows - Edge
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/<<CHROME_VERSION>> Safari/537.36 Edg/<<EDGE_VERSION>>',

  // Windows - Firefox
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:<<FIREFOX_VERSION>>) Gecko/20100101 Firefox/<<FIREFOX_VERSION>>',

  // macOS - Safari
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/<<SAFARI_VERSION>> Safari/605.1.15',

  // macOS - Chrome
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/<<CHROME_VERSION>> Safari/537.36',

  // Linux - Chrome
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/<<CHROME_VERSION>> Safari/537.36',

  // Linux - Firefox
  'Mozilla/5.0 (X11; Linux x86_64; rv:<<FIREFOX_VERSION>>) Gecko/20100101 Firefox/<<FIREFOX_VERSION>>',

  // Android - Chrome
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/<<CHROME_VERSION>> Mobile Safari/537.36',

  // Android - Samsung Internet
  'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/<<SAMSUNG_BROWSER_VERSION>> Chrome/<<CHROME_VERSION>> Mobile Safari/537.36',

  // iPhone - Safari
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/<<SAFARI_VERSION>> Mobile/15E148 Safari/604.1',

  // iPad - Safari
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/<<SAFARI_VERSION>> Mobile/15E148 Safari/604.1',

  // iPhone - Chrome
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/<<CHROME_IOS_VERSION>> Mobile/15E148 Safari/604.1'
]

const resolveTemplate = (template) => {
  return template.replace(/<<([A-Z_]+)>>/g, (match, token) => {
    return VERSIONS[token] || match
  })
}

export const userAgents = userAgentTemplates.map(resolveTemplate)

const mobileUserAgentTemplates = [
  // Android - Chrome
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/<<CHROME_VERSION>> Mobile Safari/537.36',

  // Android - Samsung Internet
  'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/<<SAMSUNG_BROWSER_VERSION>> Chrome/<<CHROME_VERSION>> Mobile Safari/537.36',

  // iPhone - Safari
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/<<SAFARI_VERSION>> Mobile/15E148 Safari/604.1',

  // iPad - Safari
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/<<SAFARI_VERSION>> Mobile/15E148 Safari/604.1',

  // iPhone - Chrome
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/<<CHROME_IOS_VERSION>> Mobile/15E148 Safari/604.1'
]

export const mobileUserAgents = mobileUserAgentTemplates.map(resolveTemplate)

export const getRandomUserAgent = () => {
  return userAgents[Math.floor(Math.random() * userAgents.length)]
}

export const getRandomMobileUserAgent = () => {
  return mobileUserAgents[Math.floor(Math.random() * mobileUserAgents.length)]
}
