// Print only a selected element by cloning it into a hidden same-origin iframe
// and printing that iframe. This guarantees:
//  1. ONLY the receipt/invoice content is printed — zero app chrome (no sidebar, no navbar, no modal backdrop).
//  2. `@page { margin: 0mm }` suppresses the browser's default header (URL, title) and footer (date, page #).
export function printReceiptIframe(selector = ".pos-print-thermal, .pos-print-a4") {
  if (typeof document === "undefined") return;
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return;

  // Base print reset styling
  let styles = `
    @page {
      size: auto;
      margin: 0mm !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      color: #000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }
    * {
      box-sizing: border-box;
    }
    .pos-print-thermal {
      display: flex !important;
      justify-content: center !important;
      align-items: flex-start !important;
      width: 100% !important;
      margin: 0 auto !important;
      padding: 0 !important;
      background: #fff !important;
      color: #000 !important;
    }
    .pos-print-thermal > div {
      width: 80mm !important;
      max-width: 100% !important;
      padding: 2mm !important;
      margin: 0 auto !important;
    }
    .pos-print-a4 {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      color: #000 !important;
    }
    .pos-sales-print-receipt {
      display: block !important;
      width: 100% !important;
      max-width: 80mm !important;
      margin: 0 auto !important;
      background: #fff !important;
      color: #000 !important;
    }
  `;

  // Copy active application stylesheets for utility preservation (Tailwind utilities, flex, borders)
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        if (!sheet.cssRules) continue;
        for (const rule of Array.from(sheet.cssRules)) {
          styles += rule.cssText + "\n";
        }
      } catch (e) {
        // Skip cross-origin stylesheets
      }
    }
  } catch (e) {}

  // App stylesheets are appended above, so print-specific overrides must come last.
  // Product barcode label grid: flow as a normal flex grid that grows across pages.
  styles += `
    @media print {
      .pos-print-labels {
        display: flex !important;
        flex-wrap: wrap !important;
        align-content: flex-start !important;
        gap: 16px !important;
        padding: 16px !important;
        width: 100% !important;
        position: static !important;
        inset: auto !important;
        background: #fff !important;
        color: #000 !important;
      }
    }
  `;

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
  setTimeout(() => {
    try {
      iframe.contentWindow?.print();
    } catch (e) {
      window.print();
    }
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1500);
  }, 100);
}
