import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;

  const script = buildScript(origin);

  return new NextResponse(script, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=60",
      "access-control-allow-origin": "*",
    },
  });
}

function buildScript(origin: string) {
  return `/* GTM Teardown embed widget — by Hivemind */
(function () {
  if (window.__gtmAutopsyEmbedLoaded) return;
  window.__gtmAutopsyEmbedLoaded = true;

  var ORIGIN = ${JSON.stringify(origin)};
  var script = document.currentScript || (function(){var s=document.getElementsByTagName('script');return s[s.length-1];})();
  var d = (script && script.dataset) || {};

  var config = {
    buttonLabel: d.label || 'Run a free teardown',
    buttonIcon: d.icon || '',
    position: d.position || 'bottom-right',
    accent: d.accent || '#FFFF6A',
    auto: d.auto === 'true',
  };

  var STYLE = '\\
    @import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap");\\
    .gtma-launcher{position:fixed;z-index:2147483646;display:inline-flex;align-items:center;gap:10px;\\
      padding:13px 22px;border-radius:999px;border:0;cursor:pointer;\\
      font-family:"IBM Plex Mono","Courier New",monospace;\\
      font-weight:700;font-size:12px;line-height:1;letter-spacing:0.14em;text-transform:uppercase;\\
      color:#000;\\
      background:'+config.accent+';\\
      box-shadow:0 14px 40px -10px rgba(0,0,0,0.6),0 0 0 1px rgba(0,0,0,0.05);\\
      transition:transform 160ms ease, box-shadow 160ms ease, background 160ms ease;}\\
    .gtma-launcher:hover{transform:translateY(-1px);background:#fff;box-shadow:0 18px 50px -10px rgba(0,0,0,0.7);}\\
    .gtma-launcher .gtma-tag{font-family:"IBM Plex Mono","Courier New",monospace;font-size:9px;\\
      font-weight:700;letter-spacing:0.16em;text-transform:uppercase;\\
      padding:3px 7px;background:#000;color:'+config.accent+';border-radius:999px;line-height:1;}\\
    .gtma-pos-bottom-right{right:24px;bottom:24px;}\\
    .gtma-pos-bottom-left{left:24px;bottom:24px;}\\
    .gtma-pos-top-right{right:24px;top:24px;}\\
    .gtma-pos-top-left{left:24px;top:24px;}\\
    .gtma-overlay{position:fixed;inset:0;z-index:2147483646;\\
      background:rgba(0,0,0,0.88);\\
      backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);\\
      display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;transition:opacity 200ms ease;}\\
    .gtma-overlay.gtma-open{opacity:1;}\\
    .gtma-modal{position:relative;width:100%;max-width:760px;height:min(880px,calc(100vh - 48px));\\
      border-radius:18px;overflow:hidden;background:#000;\\
      border:1px solid rgba(255,255,255,0.12);\\
      box-shadow:0 40px 100px -20px rgba(0,0,0,0.9);\\
      transform:translateY(8px) scale(0.985);transition:transform 220ms cubic-bezier(0.2,0.8,0.2,1);}\\
    .gtma-overlay.gtma-open .gtma-modal{transform:translateY(0) scale(1);}\\
    .gtma-iframe{width:100%;height:100%;border:0;display:block;background:#000;}\\
    .gtma-close{position:absolute;top:12px;right:12px;z-index:2;\\
      width:32px;height:32px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);\\
      background:#000;color:#fff;cursor:pointer;\\
      font-family:"IBM Plex Mono","Courier New",monospace;font-size:14px;font-weight:500;\\
      display:flex;align-items:center;justify-content:center;\\
      transition:background 120ms ease,border-color 120ms ease;}\\
    .gtma-close:hover{background:#FFFF6A;color:#000;border-color:#FFFF6A;}\\
    @media (max-width:780px){.gtma-launcher{padding:12px 18px;font-size:11px;letter-spacing:0.12em;}.gtma-modal{height:calc(100vh - 24px);max-width:none;border-radius:12px;}.gtma-overlay{padding:12px;}}\\
  ';

  function injectStyle() {
    if (document.getElementById('gtma-style')) return;
    var s = document.createElement('style');
    s.id = 'gtma-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  var overlay, iframe, opened = false;
  function buildOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'gtma-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'GTM Teardown');

    var modal = document.createElement('div');
    modal.className = 'gtma-modal';

    var close = document.createElement('button');
    close.className = 'gtma-close';
    close.setAttribute('aria-label', 'Close');
    close.innerHTML = '×';
    close.onclick = closeModal;
    modal.appendChild(close);

    iframe = document.createElement('iframe');
    iframe.className = 'gtma-iframe';
    iframe.setAttribute('title', 'GTM Teardown by Hivemind');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    iframe.setAttribute('allowtransparency', 'true');
    iframe.src = ORIGIN + '/widget';
    modal.appendChild(iframe);

    overlay.appendChild(modal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function openModal() {
    injectStyle();
    var o = buildOverlay();
    requestAnimationFrame(function () { o.classList.add('gtma-open'); });
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    opened = true;
  }

  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove('gtma-open');
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    setTimeout(function () {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      overlay = null;
      iframe = null;
    }, 240);
    opened = false;
  }

  function onKey(e) {
    if (e.key === 'Escape') closeModal();
  }

  function buildLauncher() {
    injectStyle();
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gtma-launcher gtma-pos-' + config.position;
    btn.setAttribute('aria-label', config.buttonLabel);
    var iconPart = config.buttonIcon ? escapeHtml(config.buttonIcon) + ' ' : '';
    btn.innerHTML = '<span class="gtma-tag">★ NEW</span><span>' + iconPart + escapeHtml(config.buttonLabel) + ' →</span>';
    btn.onclick = openModal;
    document.body.appendChild(btn);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  // Public API
  window.GTMAutopsy = {
    open: openModal,
    close: closeModal,
    isOpen: function () { return opened; },
  };

  function init() {
    buildLauncher();
    if (config.auto) setTimeout(openModal, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}
