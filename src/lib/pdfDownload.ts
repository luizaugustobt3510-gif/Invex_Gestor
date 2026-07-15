// Safely open/download a PDF from a signed URL, working reliably on desktop
// browsers (popup blockers, CORS) and mobile. Downloads as a blob and triggers
// an anchor click, plus opens in a new tab as a backup.
export async function downloadPdfFromUrl(url: string, filename = 'documento.pdf') {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Also try to open in a new tab (best-effort — ignored if popup blocked)
    try { window.open(objectUrl, '_blank', 'noopener'); } catch { /* noop */ }
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return true;
  } catch (e) {
    // Fallback — direct open
    try { window.open(url, '_blank', 'noopener'); } catch { /* noop */ }
    return false;
  }
}
