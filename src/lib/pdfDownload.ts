// PDF helpers compatible with both desktop/mobile browsers and Android WebView
// wrappers (Median, Capacitor, Cordova, TWA, custom WebViews).
//
// WebViews frequently cannot handle `blob:` URLs (no download manager binding)
// and often block `window.open`. So we detect that environment and fall back to
// direct navigation with the real (signed) URL, which the native layer can
// intercept and download.

export function isAndroidWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const anyWin = window as any;
  const nativeBridge =
    !!anyWin.Capacitor ||
    !!anyWin.cordova ||
    !!anyWin.median ||
    !!anyWin.gonative ||
    !!anyWin.ReactNativeWebView ||
    !!anyWin.AndroidInterface ||
    !!anyWin.Android ||
    // Kodular / MIT App Inventor WebViewer bridges
    !!anyWin.AppInventor ||
    !!anyWin.Kodular ||
    !!anyWin.KodularWebView ||
    !!anyWin.Niotron;
  if (nativeBridge) return true;
  const isAndroid = /Android/i.test(ua);
  // Kodular/App Inventor WebViewer UA tokens
  if (/Kodular|AppInventor|Niotron|MIT App Inventor/i.test(ua)) return true;
  // Android WebView UA contains "; wv)" or lacks a real browser token
  const wvToken = /;\s*wv\)/i.test(ua) || /\bVersion\/[\d.]+\s+Chrome\//i.test(ua);
  return isAndroid && wvToken;
}

/** Kodular / App Inventor WebViewer specifically (no download manager binding). */
export function isKodularWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const anyWin = window as any;
  const ua = navigator.userAgent || '';
  return (
    !!anyWin.AppInventor || !!anyWin.Kodular || !!anyWin.KodularWebView || !!anyWin.Niotron ||
    /Kodular|AppInventor|Niotron|MIT App Inventor/i.test(ua)
  );
}

export function isIosWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && !isSafari && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function isWebView(): boolean {
  return isAndroidWebView() || isIosWebView();
}


const pad = (n: number) => String(n).padStart(2, '0');

/** Removes characters that are invalid in file names on Android/iOS/Windows. */
export function sanitizeFileName(name: string): string {
  return (name || '')
    // Remove acentos (evita nomes com "UTF-8''" / %C3%A7 vindos do Content-Disposition)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Somente ASCII seguro
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Standard document file name:
 *   "Nome do Paciente - DD-MM-AAAA - HH-MM.pdf"
 * e.g. "João da Silva - 30-07-2026 - 08-35.pdf"
 */
/** Anamnese file name: apenas o nome do paciente, ex.: "Joao da Silva.pdf" */
export function buildPatientPdfFilename(patientName?: string | null): string {
  const nome = sanitizeFileName(patientName || 'Documento') || 'Documento';
  return `${nome}.pdf`;
}

export function buildPdfFilename(patientName?: string | null, date: Date = new Date()): string {
  const nome = sanitizeFileName(patientName || 'Documento') || 'Documento';
  const d = `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
  const t = `${pad(date.getHours())}-${pad(date.getMinutes())}`;
  return `${nome} - ${d} - ${t}.pdf`;
}

/** Appends a download hint to the URL so native layers name the file correctly. */
function withDownloadHint(url: string, filename: string): string {
  try {
    const u = new URL(url, window.location.origin);
    // Supabase signed URLs honour `download=<filename>`
    if (!u.searchParams.has('download')) u.searchParams.set('download', filename);
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Open/download a PDF from a (signed) URL.
 * - Browser: downloads as blob and triggers an anchor click (reliable naming).
 * - WebView: navigates directly to the URL (no blob:), letting the native
 *   download manager / viewer handle it.
 */
export async function downloadPdfFromUrl(url: string, filename = 'documento.pdf') {
  const safeName = sanitizeFileName(filename) || 'documento.pdf';
  const hinted = withDownloadHint(url, safeName);

  if (isWebView()) {
    const anyWin = window as any;
    // 1) Notify a native bridge when present (Kodular/App Inventor, RN, custom).
    try {
      if (anyWin.AppInventor?.setWebViewString) {
        anyWin.AppInventor.setWebViewString(JSON.stringify({ action: 'download', url: hinted, filename: safeName }));
      } else if (anyWin.ReactNativeWebView?.postMessage) {
        anyWin.ReactNativeWebView.postMessage(JSON.stringify({ action: 'download', url: hinted, filename: safeName }));
      } else if (anyWin.AndroidInterface?.downloadFile) {
        anyWin.AndroidInterface.downloadFile(hinted, safeName);
      } else if (anyWin.Android?.downloadFile) {
        anyWin.Android.downloadFile(hinted, safeName);
      }
    } catch { /* noop */ }

    // 2) Anchor click — triggers the native DownloadListener in most WebViews.
    let clicked = false;
    try {
      const a = document.createElement('a');
      a.href = hinted;
      a.download = safeName;
      a.rel = 'noopener';
      a.target = '_self';
      document.body.appendChild(a);
      a.click();
      a.remove();
      clicked = true;
    } catch { /* noop */ }

    // 3) Kodular WebViewer often ignores anchors — force a direct navigation.
    if (!clicked || isKodularWebView()) {
      setTimeout(() => { try { window.location.href = hinted; } catch { /* noop */ } }, clicked ? 600 : 0);
    }
    return true;
  }


  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = safeName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return true;
  } catch {
    // Fallback — direct open with the original URL
    try { window.open(hinted, '_blank', 'noopener'); } catch { window.location.href = hinted; }
    return false;
  }
}

/** Opens any URL (attachments, signed links) safely in browser and WebView. */
export function openUrlSafely(url: string) {
  if (isWebView()) {
    const anyWin = window as any;
    try {
      if (anyWin.AppInventor?.setWebViewString) {
        anyWin.AppInventor.setWebViewString(JSON.stringify({ action: 'open', url }));
      } else if (anyWin.ReactNativeWebView?.postMessage) {
        anyWin.ReactNativeWebView.postMessage(JSON.stringify({ action: 'open', url }));
      }
    } catch { /* noop */ }
    window.location.href = url;
    return;
  }
  const w = window.open(url, '_blank', 'noopener');
  if (!w) window.location.href = url;
}


/**
 * Print an HTML document. Uses a popup window in browsers; falls back to a
 * hidden same-document iframe in WebViews (where window.open is blocked and
 * blob:/document.write popups fail).
 */
export function printHtmlDocument(html: string, title = 'Documento') {
  if (!isWebView()) {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      setTimeout(() => { try { w.focus(); w.print(); } catch { /* noop */ } }, 400);
      return true;
    }
  }

  // WebView / popup-blocked fallback: hidden iframe
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', title);
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) { iframe.remove(); return false; }
  doc.open();
  doc.write(html);
  doc.close();
  const run = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch { /* noop */ }
    setTimeout(() => iframe.remove(), 60_000);
  };
  if (doc.readyState === 'complete') setTimeout(run, 300);
  else iframe.onload = () => setTimeout(run, 300);
  return true;
}
