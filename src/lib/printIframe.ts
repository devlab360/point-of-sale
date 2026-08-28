// Print only a selected element by cloning it into a hidden same-origin iframe
// and printing that iframe. This is the bulletproof way to print a receipt:
//  1. ONLY the cloned receipt is printed — nothing else from the app document
//     (no app header/footer nav, no product grid, no cart, no modals).
//  2. `@page { margin: 0 }` inside the isolated document suppresses the browser's
//     default print header/footer (page title, URL, date, page numbers),
//     regardless of the print dialog margin settings.
// The app's full stylesheet is copied into the iframe so Tailwind utilities used
// by the receipt (w-[80mm], font-mono, etc.) still apply.
export function printReceiptIframe(selector = ".pos-print-thermal, .pos-print-a4") {
  if (typeof document === "undefined") return;
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return;

  // Copy the application's stylesheet rules so the cloned receipt keeps its look.
  let styles = "@page{size:auto;margin:0}html,body{margin:0!important;padding:0!important}";
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        if (!sheet.cssRules) continue;
        for (const rule of Array.from(sheet.cssRules)) {
          styles += rule.cssText + "\n";
        }
      } catch (e) {
        // Skip cross-origin / inaccessible stylesheets.
      }
    }
  } catch (e) {}

  // Force the receipt visible and laid out as a normal block inside the iframe.
  styles += [
    ".pos-print-thermal{display:flex!important}",
    ".pos-print-a4{display:block!important}",
    ".pos-print-thermal,.pos-print-a4{position:static!important;inset:auto!important;width:100%!important;max-width:none!important;box-shadow:none!important;background:#fff!important;overflow:visible!important}",
  ].join("\n");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title></title><style>${styles}</style></head><body>${el.outerHTML}</body></html>`,
  );
  doc.close();

  iframe.contentWindow?.focus();
  // Give the iframe a tick to lay out, then print and clean up.
  setTimeout(() => {
    try {
      iframe.contentWindow?.print();
    } catch (e) {
      window.print();
    }
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1000);
  }, 60);
}
