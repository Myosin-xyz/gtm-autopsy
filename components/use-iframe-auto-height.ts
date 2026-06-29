import { useEffect } from "react";

// When the widget is embedded in a cross-origin iframe (e.g. the Framer site),
// the parent can't measure our DOM, so we report our real content height to it
// and it sizes the iframe to fit. Two parts:
//   1. Mark the document `data-embedded` so the CSS drops the standalone 100vh
//      shell + internal scroll — otherwise scrollHeight reports the viewport
//      height (a tall iframe with empty space), not the content.
//   2. postMessage { type: "iframe-resize", height } on load, on every layout
//      change (ResizeObserver), and on a few timers (async fonts / teaser).
// Parent listens for that message shape and sets iframe.style.height.
export function useIframeAutoHeight() {
  useEffect(() => {
    if (typeof window === "undefined" || window.self === window.top) return;

    const root = document.documentElement;
    root.setAttribute("data-embedded", "");

    const sendHeight = () => {
      const height = Math.max(
        root.scrollHeight,
        document.body.scrollHeight,
        root.offsetHeight,
        document.body.offsetHeight,
      );
      window.parent.postMessage({ type: "iframe-resize", height }, "*");
    };

    sendHeight();
    window.addEventListener("load", sendHeight);
    window.addEventListener("resize", sendHeight);

    const observer = new ResizeObserver(sendHeight);
    observer.observe(root);
    observer.observe(document.body);

    // Catch late layout shifts: web-font swap, async teaser.
    const timers = [100, 500, 1000].map((ms) =>
      window.setTimeout(sendHeight, ms),
    );

    return () => {
      window.removeEventListener("load", sendHeight);
      window.removeEventListener("resize", sendHeight);
      observer.disconnect();
      timers.forEach(window.clearTimeout);
      root.removeAttribute("data-embedded");
    };
  }, []);
}
