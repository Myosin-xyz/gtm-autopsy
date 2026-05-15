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
  return `/* GTM Autopsy embed widget — by Hivemind */
(function () {
  if (window.__gtmAutopsyEmbedLoaded) return;
  window.__gtmAutopsyEmbedLoaded = true;

  var ORIGIN = ${JSON.stringify(origin)};
  var script = document.currentScript || (function(){var s=document.getElementsByTagName('script');return s[s.length-1];})();
  var d = (script && script.dataset) || {};

  var config = {
    buttonLabel: d.label || 'Get a free GTM teardown',
    buttonIcon: d.icon || '⚡',
    position: d.position || 'bottom-right',
    accent: d.accent || '#8B5CF6',
    cta: d.cta || (location.origin + (location.pathname || '/') + '#contact'),
    ctaLabel: d.ctaLabel || 'Hire Hivemind →',
    auto: d.auto === 'true',
  };

  var STYLE = '\\
    .gtma-launcher{position:fixed;z-index:2147483646;display:inline-flex;align-items:center;gap:8px;\\
      padding:12px 18px;border-radius:999px;font:600 14px/1 ui-sans-serif,system-ui,-apple-system,Inter,sans-serif;\\
      color:white;cursor:pointer;border:1px solid rgba(255,255,255,0.18);\\
      background:linear-gradient(135deg,'+config.accent+',#6d28d9);\\
      box-shadow:0 0 0 1px rgba(139,92,246,0.3),0 18px 40px -10px rgba(139,92,246,0.6);\\
      transition:transform 160ms ease, box-shadow 160ms ease;}\\
    .gtma-launcher:hover{transform:translateY(-2px);box-shadow:0 0 0 1px rgba(139,92,246,0.5),0 22px 50px -10px rgba(139,92,246,0.7);}\\
    .gtma-launcher .gtma-dot{width:8px;height:8px;border-radius:999px;background:#A3E635;box-shadow:0 0 10px #A3E635;}\\
    .gtma-pos-bottom-right{right:24px;bottom:24px;}\\
    .gtma-pos-bottom-left{left:24px;bottom:24px;}\\
    .gtma-pos-top-right{right:24px;top:24px;}\\
    .gtma-pos-top-left{left:24px;top:24px;}\\
    .gtma-overlay{position:fixed;inset:0;z-index:2147483646;background:radial-gradient(800px 500px at 50% 30%,rgba(139,92,246,0.15),transparent 60%),rgba(7,7,11,0.78);\\
      backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);\\
      display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;transition:opacity 220ms ease;}\\
    .gtma-overlay.gtma-open{opacity:1;}\\
    .gtma-modal{position:relative;width:100%;max-width:460px;height:min(720px,calc(100vh - 64px));\\
      border-radius:20px;overflow:hidden;background:#07070b;\\
      border:1px solid rgba(255,255,255,0.08);\\
      box-shadow:0 30px 80px -20px rgba(0,0,0,0.7),0 0 0 1px rgba(139,92,246,0.25);\\
      transform:translateY(8px) scale(0.98);transition:transform 220ms cubic-bezier(0.2,0.8,0.2,1);}\\
    .gtma-overlay.gtma-open .gtma-modal{transform:translateY(0) scale(1);}\\
    .gtma-iframe{width:100%;height:100%;border:0;display:block;background:#07070b;}\\
    .gtma-close{position:absolute;top:10px;right:10px;z-index:2;\\
      width:30px;height:30px;border-radius:999px;border:1px solid rgba(255,255,255,0.12);\\
      background:rgba(7,7,11,0.7);color:rgba(255,255,255,0.7);cursor:pointer;\\
      font:600 16px/1 ui-sans-serif,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;}\\
    .gtma-close:hover{background:rgba(255,255,255,0.08);color:white;}\\
    @media (max-width:520px){.gtma-launcher{padding:11px 14px;font-size:13px;}.gtma-modal{height:calc(100vh - 24px);max-width:none;border-radius:14px;}.gtma-overlay{padding:12px;}}\\
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
    overlay.setAttribute('aria-label', 'GTM Autopsy');

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
    iframe.setAttribute('title', 'GTM Autopsy by Hivemind');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    var params = new URLSearchParams();
    params.set('cta', config.cta);
    params.set('label', config.ctaLabel);
    iframe.src = ORIGIN + '/widget?' + params.toString();
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
    btn.innerHTML = '<span class="gtma-dot"></span><span>' + config.buttonIcon + ' ' + escapeHtml(config.buttonLabel) + '</span>';
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
