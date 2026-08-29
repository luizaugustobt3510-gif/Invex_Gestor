import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, FileText } from 'lucide-react';
import { printHtmlDocument, sanitizeFileName } from '@/lib/pdfDownload';
import invexLogo from '@/assets/invex-logo.png';

export interface FaturaCompany {
  id: string;
  name: string;
  cnpj?: string | null;
  monthly_fee?: number;
  next_due_date?: string | null;
}

interface Item {
  id: string;
  descricao: string;
  valor: string;
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const escapeHtml = (s: string) =>
  (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const uid = () => Math.random().toString(36).slice(2, 10);

interface Props {
  company: FaturaCompany | null;
  onOpenChange: (open: boolean) => void;
}

export const FaturaDialog = ({ company, onOpenChange }: Props) => {
  const [numero, setNumero] = useState('');
  const [emissao, setEmissao] = useState(() => new Date().toISOString().slice(0, 10));
  const [vencimento, setVencimento] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [pagamento, setPagamento] = useState('PIX / Transferência bancária');

  useEffect(() => {
    if (!company) return;
    const now = new Date();
    setNumero(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${company.id.slice(0, 4).toUpperCase()}`);
    setEmissao(now.toISOString().slice(0, 10));
    setVencimento(company.next_due_date || '');
    setItems([
      {
        id: uid(),
        descricao: `Assinatura Invex Gestor — ${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
        valor: String(company.monthly_fee ?? 0),
      },
    ]);
    setObservacoes('');
  }, [company]);

  const total = useMemo(
    () => items.reduce((s, i) => s + (parseFloat(i.valor.replace(',', '.')) || 0), 0),
    [items],
  );

  const updateItem = (id: string, patch: Partial<Item>) =>
    setItems(list => list.map(i => (i.id === id ? { ...i, ...patch } : i)));

  const gerarPdf = () => {
    if (!company) return;
    const logoUrl = `${window.location.origin}${invexLogo}`;
    const fmtDate = (d: string) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-');

    const rows = items
      .filter(i => i.descricao.trim() || parseFloat(i.valor.replace(',', '.')))
      .map(
        (i, idx) => `<tr>
          <td class="c">${idx + 1}</td>
          <td>${escapeHtml(i.descricao)}</td>
          <td class="r">${brl(parseFloat(i.valor.replace(',', '.')) || 0)}</td>
        </tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Fatura ${escapeHtml(numero)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#1b2a26;margin:0;padding:32px;font-size:12px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1f6f5c;padding-bottom:14px}
  .head img{height:52px}
  .doc{text-align:right}
  .doc h1{margin:0;font-size:22px;color:#1f6f5c;letter-spacing:1px}
  .doc div{color:#5b6b66;margin-top:2px}
  .box{border:1px solid #dbe5e1;border-radius:8px;padding:14px;margin-top:20px}
  .box h2{margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:#1f6f5c}
  .grid{display:flex;gap:24px;flex-wrap:wrap}
  .grid div{min-width:180px}
  .lbl{color:#7a8a85;font-size:10px;text-transform:uppercase}
  table{width:100%;border-collapse:collapse;margin-top:20px}
  th{background:#1f6f5c;color:#fff;text-align:left;padding:8px;font-size:11px;text-transform:uppercase}
  td{padding:8px;border-bottom:1px solid #e6edea}
  tr:nth-child(even) td{background:#f6faf8}
  .r{text-align:right}.c{text-align:center;width:36px}
  .total{margin-top:14px;display:flex;justify-content:flex-end}
  .total .b{background:#1f6f5c;color:#fff;padding:12px 20px;border-radius:8px;font-size:16px;font-weight:bold}
  .obs{margin-top:20px;white-space:pre-wrap}
  footer{margin-top:36px;border-top:1px solid #dbe5e1;padding-top:10px;color:#7a8a85;font-size:10px;text-align:center}
  @media print{body{padding:12px}}
</style></head><body>
  <div class="head">
    <img src="${logoUrl}" alt="Invex" />
    <div class="doc">
      <h1>FATURA</h1>
      <div>Nº ${escapeHtml(numero)}</div>
      <div>Emissão: ${fmtDate(emissao)}</div>
      <div>Vencimento: ${fmtDate(vencimento)}</div>
    </div>
  </div>

  <div class="box">
    <h2>Dados do pagador</h2>
    <div class="grid">
      <div><div class="lbl">Empresa</div><div>${escapeHtml(company.name)}</div></div>
      <div><div class="lbl">CNPJ</div><div>${escapeHtml(company.cnpj || '-')}</div></div>
      <div><div class="lbl">Forma de pagamento</div><div>${escapeHtml(pagamento)}</div></div>
    </div>
  </div>

  <table>
    <thead><tr><th class="c">#</th><th>Descrição</th><th class="r">Valor</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="3">Sem itens</td></tr>'}</tbody>
  </table>

  <div class="total"><div class="b">Total: ${brl(total)}</div></div>

  ${observacoes.trim() ? `<div class="box obs"><h2>Observações</h2>${escapeHtml(observacoes)}</div>` : ''}

  <footer>Invex Gestor — Sistema de Gestão Inteligente · Documento gerado em ${new Date().toLocaleString('pt-BR')}</footer>
</body></html>`;

    printHtmlDocument(html, sanitizeFileName(`Fatura ${numero} - ${company.name}`));
  };

  return (
    <Dialog open={!!company} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar Fatura — {company?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label>Nº da fatura</Label>
              <Input value={numero} onChange={e => setNumero(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Emissão</Label>
              <Input type="date" value={emissao} onChange={e => setEmissao(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Pagamento</Label>
              <Input value={pagamento} onChange={e => setPagamento(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens da fatura</Label>
              <Button variant="outline" size="sm" onClick={() => setItems(l => [...l, { id: uid(), descricao: '', valor: '' }])}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex gap-2 items-center">
                  <Input
                    className="flex-1"
                    placeholder="Descrição do serviço"
                    value={item.descricao}
                    onChange={e => updateItem(item.id, { descricao: e.target.value })}
                  />
                  <Input
                    className="w-32"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={item.valor}
                    onChange={e => updateItem(item.id, { valor: e.target.value })}
                  />
                  <Button variant="ghost" size="sm" onClick={() => setItems(l => l.filter(i => i.id !== item.id))}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-sm text-muted-foreground py-3 text-center border rounded-lg">Nenhum item adicionado.</div>
              )}
            </div>
          </div>

          <div className="flex justify-end items-center gap-3 border-t pt-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-bold text-primary">{brl(total)}</span>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea rows={3} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Dados bancários, chave PIX, instruções..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={gerarPdf} disabled={items.length === 0}>
            <FileText className="w-4 h-4 mr-1" /> Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
