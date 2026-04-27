// Utility for printing filtered lists as a clean printable HTML page.

const escapeHtml = (str: any) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export interface PrintColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
  align?: 'left' | 'right' | 'center';
}

export interface PrintOptions<T> {
  title: string;
  subtitle?: string;
  columns: PrintColumn<T>[];
  rows: T[];
}

export function printList<T>({ title, subtitle, columns, rows }: PrintOptions<T>) {
  const win = window.open('', '_blank');
  if (!win) return;

  const now = new Date().toLocaleString('pt-BR');

  const thead = columns
    .map(c => `<th style="text-align:${c.align || 'left'}">${escapeHtml(c.header)}</th>`)
    .join('');

  const tbody = rows
    .map(
      r =>
        `<tr>${columns
          .map(
            c =>
              `<td style="text-align:${c.align || 'left'}">${escapeHtml(c.accessor(r))}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
    <title>${escapeHtml(title)}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; color: #111; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border-bottom: 1px solid #ddd; padding: 6px 8px; vertical-align: top; }
      th { background: #f4f4f5; text-align: left; font-weight: 600; }
      tr:nth-child(even) td { background: #fafafa; }
      .footer { margin-top: 16px; font-size: 11px; color: #777; text-align: right; }
      @media print { body { padding: 12px; } .no-print { display: none; } }
    </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">${subtitle ? escapeHtml(subtitle) + ' &middot; ' : ''}Gerado em ${escapeHtml(now)} &middot; ${rows.length} registro(s)</div>
    <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
    <div class="footer">Invex</div>
    <script>window.onload = () => { window.print(); };</script>
    </body></html>`;

  win.document.write(html);
  win.document.close();
}
