const VERSIONS = {
  CHROME_VERSION: '150.0.7871.49',
  EDGE_VERSION: '150.0.4078.50',
  FIREFOX_VERSION: '152.0.5',
  SAFARI_VERSION: '26.5.2',
  SAMSUNG_BROWSER_VERSION: '30.0.0.67',
  CHROME_IOS_VERSION: '150.0.7871.51'
}

const userAgentTemplates = [
  // Windows - Chrome
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/<<CHROME_VERSION>> Safari/537.36',

  // Windows - Edge
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/<<CHROME_VERSION>> Safari/537.36 Edg/<<EDGE_VERSION>>',

  // macOS - Chrome
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/<<CHROME_VERSION>> Safari/537.36',

  // macOS - Edge
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/<<CHROME_VERSION>> Safari/537.36 Edg/<<EDGE_VERSION>>',
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
