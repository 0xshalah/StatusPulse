/**
 * StatusPulse AI — Embed Script v2
 *
 * Customizable, accessible, motion-ready widget.
 *
 * Usage:
 *   <script src="https://statuspulse.edgeone.dev/embed.js" async></script>
 *
 * Options (data-* attributes):
 *   data-color      — Accent color hex (default: reads --primary CSS var or #e1567c)
 *   data-position   — "bottom-right" (default) or "bottom-left"
 *   data-theme      — "dark" (default), "light", or "auto"
 *   data-font       — Custom font family for widget
 *   data-brand      — Brand name shown in header (default: "StatusPulse AI")
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window.__aiAssistantLoaded) return;
  // Never nest — the widget page IS the chat, don't embed inside it
  if (window.location.pathname === '/widget') return;
  window.__aiAssistantLoaded = true;

  var script = document.currentScript || (function () { var s = document.getElementsByTagName('script'); for (var i = s.length - 1; i >= 0; i--) { if (s[i].src && s[i].src.indexOf('embed.js') !== -1) return s[i]; } return null; })();
  if (!script || !script.src) return;

  var origin;
  try { origin = new URL(script.src).origin; } catch (e) { return; }
  if (!origin) return;

  // ─── Options ─────────────────────────────────────────────────────────────
  function getAccent() {
    // Priority: data-color > --primary CSS var > default
    var dc = script.getAttribute('data-color');
    if (dc) return dc;

    try {
      var primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
      if (primary) {
        var parts = primary.split(' ');
        if (parts.length === 3) return 'hsl(' + parts[0] + ',' + parts[1] + ',' + parts[2] + ')';
      }
    } catch (e) {}
    return '#e1567c';
  }

  var accent = getAccent();
  var position = script.getAttribute('data-position') || 'bottom-right';
  var theme = script.getAttribute('data-theme') || 'dark';
  var font = script.getAttribute('data-font') || '';
  var brand = script.getAttribute('data-brand') || 'StatusPulse AI';
  var isLeft = position === 'bottom-left';
  var side = isLeft ? 'left' : 'right';

  // Resolve auto theme
  if (theme === 'auto') {
    try { theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { theme = 'dark'; }
  }

  // ─── Wait for DOM ────────────────────────────────────────────────────────
  function init() {
    function getPageContext() {
      var el = document.querySelector('[role="main"]') || document.querySelector('main') || document.querySelector('article');
      var content = el ? el.innerText : document.body.innerText;
      return { title: document.title || '', url: location.href || '', content: (content || '').slice(0, 6000) };
    }

    // ─── Styles ────────────────────────────────────────────────────────────
    var bubbleSize = window.innerWidth < 400 ? 50 : 60;
    var bubbleBottom = window.innerWidth < 400 ? 16 : 24;
    var bubbleIcon = window.innerWidth < 400 ? 22 : 28;
    var css = document.createElement('style');
    css.textContent =
      '#__aa-bubble{position:fixed;bottom:' + bubbleBottom + 'px;' + side + ':' + bubbleBottom + 'px;z-index:2147483647;' +
      'width:' + bubbleSize + 'px;height:' + bubbleSize + 'px;border-radius:50%;' +
      'background:linear-gradient(135deg,' + accent + ',' + accent + 'dd);' +
      'cursor:pointer;border:none;outline:none;' +
      'box-shadow:0 6px 18px ' + accent + '44,0 2px 6px rgba(0,0,0,.25);' +
      'display:flex;align-items:center;justify-content:center;' +
      'transition:all .3s cubic-bezier(.4,0,.2,1)}' +
      '#__aa-bubble:hover{transform:scale(1.1) translateY(-2px);box-shadow:0 10px 28px ' + accent + '55,0 4px 10px rgba(0,0,0,.35)}' +
      '#__aa-bubble:active{transform:scale(.95)}' +
      '#__aa-bubble svg{width:' + bubbleIcon + 'px;height:' + bubbleIcon + 'px;fill:#fff;transition:transform .3s}' +
      '#__aa-frame{position:fixed;bottom:' + (bubbleBottom + bubbleSize + 16) + 'px;' + side + ':24px;z-index:2147483647;' +
      'width:min(420px, calc(100vw - 48px));height:640px;max-height:calc(100vh - ' + (bubbleBottom * 2 + bubbleSize + 32) + 'px);' +
      'border:none;border-radius:18px;' +
      'box-shadow:0 20px 50px rgba(0,0,0,.2),0 6px 20px rgba(0,0,0,.15),0 0 0 1px ' + accent + '26;' +
      'opacity:0;transform:translateY(10px) scale(.97);' +
      'transition:opacity .3s cubic-bezier(.4,0,.2,1),transform .3s cubic-bezier(.4,0,.2,1);' +
      'pointer-events:none;overflow:hidden}' +
      '#__aa-frame.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}' +
      '@media(max-width:480px){#__aa-frame{width:100vw;height:100vh;max-height:100vh;' +
      'bottom:0;' + side + ':0;border-radius:0 !important}}';
    document.head.appendChild(css);

    // ─── Build widget URL with params ──────────────────────────────────────
    var params = new URLSearchParams();
    params.set('accent', encodeURIComponent(accent));
    params.set('theme', theme);
    if (font) params.set('font', encodeURIComponent(font));
    if (brand) params.set('brand', encodeURIComponent(brand));
    var frameUrl = origin + '/widget?' + params.toString();

    // ─── Bubble ────────────────────────────────────────────────────────────
    var bubble = document.createElement('button');
    bubble.id = '__aa-bubble';
    bubble.setAttribute('aria-label', 'Open ' + brand + ' chat');
    bubble.setAttribute('title', 'Ask ' + brand + ' about your APIs');
    if (font) bubble.style.fontFamily = font;
    var chatIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>';
    var closeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    bubble.innerHTML = chatIcon;
    document.body.appendChild(bubble);

    // ─── Iframe ────────────────────────────────────────────────────────────
    var frame = document.createElement('iframe');
    frame.id = '__aa-frame';
    frame.src = frameUrl;
    frame.setAttribute('allow', 'clipboard-write');
    frame.setAttribute('title', brand + ' Chat');
    if (theme === 'light') frame.style.background = '#ffffff';
    document.body.appendChild(frame);

    var contextSent = false;
    function sendContext() {
      if (!frame.contentWindow) return;
      frame.contentWindow.postMessage({ type: '__aa_page_context', payload: getPageContext() }, origin);
      frame.contentWindow.postMessage({ type: '__aa_theme', accent: accent, theme: theme, font: font }, origin);
      contextSent = true;
    }

    frame.addEventListener('load', function () {
      if (!contextSent) setTimeout(sendContext, 200);
    });

    // SPA navigation
    var lastUrl = location.href;
    setInterval(function () {
      if (location.href !== lastUrl) { lastUrl = location.href; contextSent = false; setTimeout(sendContext, 500); }
    }, 1000);

    // Watch accent color changes (from accent picker)
    if (window.MutationObserver) {
      var observer = new MutationObserver(function () {
        try {
          var p = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
          if (p && p !== accent) {
            accent = p;
            bubble.style.background = 'linear-gradient(135deg,hsl(' + p + '),hsl(' + p + 'dd))';
            frame.contentWindow && frame.contentWindow.postMessage({ type: '__aa_theme', accent: 'hsl(' + p + ')' }, origin);
          }
        } catch (e) {}
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    // ─── Toggle ────────────────────────────────────────────────────────────
    var isOpen = false;
    bubble.addEventListener('click', function () {
      isOpen = !isOpen;
      frame.classList.toggle('open', isOpen);
      bubble.innerHTML = isOpen ? closeIcon : chatIcon;
      bubble.setAttribute('aria-label', isOpen ? 'Close chat' : 'Open ' + brand + ' chat');
      if (isOpen && !contextSent) sendContext();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) { isOpen = false; frame.classList.remove('open'); bubble.innerHTML = chatIcon; bubble.setAttribute('aria-label', 'Open ' + brand + ' chat'); }
    });
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
