import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Factory, PackagePlus, PackageSearch, ClipboardList, ShoppingCart, Edit, Trash2, Thermometer, Layers, CalendarClock, Tag, Gauge } from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventoryData';

export interface MPInfo {
  lotesComSaldo: number; saldoLotes: number; ultimoControle: string; ultimaEntrada: string | null;
  procedencia: string; temperatura: number | null; custoMedio: number; validadeProxima: string | null;
}
export interface PFInfo {
  producoes: number; ultimoLote: string; ultimaProducao: string | null; rendimento: number | null; validadeProxima: string | null;
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtD = (s: string | null) => (s ? new Date(s.length <= 10 ? s + 'T12:00:00' : s).toLocaleDateString('pt-BR') : '-');

interface CardProps {
  item: InventoryItem;
  status: { label: string; color: string; dot: string };
  mp?: MPInfo;
  pf?: PFInfo;
  canEdit: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function StockRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="flex items-center gap-1 text-muted-foreground">{icon}{label}</span>
      <span className="font-medium text-foreground text-right truncate">{value}</span>
    </div>
  );
}

/** Cartão completo de matéria-prima ou produto final no dashboard da Logística. */
export function ProductionStockCard({ item, status, mp, pf, canEdit, onOpen, onEdit, onDelete }: CardProps) {
  const isMP = item.tipo === 'materia_prima';
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`${isMP ? 'Matéria-prima' : 'Produto final'} ${item.material}`}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
      className={`h-full flex flex-col border-2 ${isMP ? 'border-primary/40 bg-primary/5' : 'border-dashed border-primary/50 bg-card'} cursor-pointer transition-all hover:shadow-md`}
    >
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Badge className="mb-1 text-[10px] gap-1" variant={isMP ? 'default' : 'secondary'}>
              {isMP ? <Factory className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
              {isMP ? 'Matéria-prima' : 'Produto final · à venda'}
            </Badge>
            <p className="text-xs font-mono text-muted-foreground">{item.codigo}</p>
            <p className="font-semibold text-sm text-foreground leading-snug break-words line-clamp-2" title={item.material}>{item.material}</p>
          </div>
          <Badge variant="outline" className={`text-xs shrink-0 ${status.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status.dot}`} />{status.label}
          </Badge>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{item.quantidade}</p>
            <p className="text-xs text-muted-foreground">{item.unidade}</p>
          </div>
          <div className="flex items-end gap-1">
            {canEdit && (
              <>
                <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Editar material" onClick={(e) => { e.stopPropagation(); onEdit(); }}><Edit className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Excluir material" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 className="w-3.5 h-3.5" /></Button>
              </>
            )}
            <p className="text-xs text-muted-foreground text-right">{brl(item.valorTotal)}</p>
          </div>
        </div>
        <div className="mt-auto space-y-1 rounded-md border bg-background/70 p-2">
          {isMP ? (
            <>
              <StockRow icon={<Layers className="w-3 h-3" />} label="Lotes com saldo" value={mp ? `${mp.lotesComSaldo} (${mp.saldoLotes} ${item.unidade})` : '0'} />
              <StockRow icon={<PackageSearch className="w-3 h-3" />} label="Último lote" value={mp?.ultimoControle ? `${mp.ultimoControle} · ${fmtD(mp.ultimaEntrada)}` : '-'} />
              <StockRow icon={<PackagePlus className="w-3 h-3" />} label="Procedência" value={mp?.procedencia || '-'} />
              <StockRow icon={<Thermometer className="w-3 h-3" />} label="Temperatura" value={mp?.temperatura != null ? `${mp.temperatura} °C` : '-'} />
              <StockRow icon={<Tag className="w-3 h-3" />} label="Custo médio" value={mp && mp.custoMedio > 0 ? `${brl(mp.custoMedio)}/${item.unidade}` : '-'} />
              <StockRow icon={<CalendarClock className="w-3 h-3" />} label="Validade mais próxima" value={fmtD(mp?.validadeProxima ?? null)} />
            </>
          ) : (
            <>
              <StockRow icon={<Tag className="w-3 h-3" />} label="Preço de venda" value={brl(item.preco)} />
              <StockRow icon={<Factory className="w-3 h-3" />} label="Produções" value={pf?.producoes ?? 0} />
              <StockRow icon={<PackageSearch className="w-3 h-3" />} label="Último lote" value={pf?.ultimoLote ? `${pf.ultimoLote} · ${fmtD(pf.ultimaProducao)}` : '-'} />
              <StockRow icon={<Gauge className="w-3 h-3" />} label="Rendimento médio" value={pf?.rendimento != null ? `${pf.rendimento.toFixed(1)}%` : '-'} />
              <StockRow icon={<CalendarClock className="w-3 h-3" />} label="Validade mais próxima" value={fmtD(pf?.validadeProxima ?? null)} />
            </>
          )}
        </div>
        <p className="mt-auto text-[11px] text-primary font-medium">Toque para ver as opções de {isMP ? 'produção' : 'venda e produção'}</p>
      </CardContent>
    </Card>
  );
}

interface DialogProps {
  item: InventoryItem | null;
  canProduce: boolean;
  canSell: boolean;
  onClose: () => void;
  onEdit: (item: InventoryItem) => void;
}

/** Opções de produção/venda ao clicar num cartão de matéria-prima ou produto final. */
export function ProductionActionsDialog({ item, canProduce, canSell, onClose, onEdit }: DialogProps) {
  const navigate = useNavigate();
  const go = (path: string) => { onClose(); navigate(path); };
  const isMP = item?.tipo === 'materia_prima';
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item?.material}</DialogTitle>
          <DialogDescription>{isMP ? 'Matéria-prima' : 'Produto final'} · {item?.quantidade} {item?.unidade} em estoque</DialogDescription>
        </DialogHeader>
        {item && (
          <div className="grid gap-2">
            {isMP ? (
              <>
                <Button className="justify-start" onClick={() => go(`/logistica/entrada-materia-prima?material=${item.id}`)}><PackagePlus className="w-4 h-4 mr-2" /> Registrar entrada de lote</Button>
                {canProduce && <Button className="justify-start" variant="outline" onClick={() => go(`/producao/processar?material=${item.id}`)}><Factory className="w-4 h-4 mr-2" /> Processar (transformar em produto)</Button>}
                {canProduce && <Button className="justify-start" variant="outline" onClick={() => go('/producao/lotes')}><PackageSearch className="w-4 h-4 mr-2" /> Lotes e rastreio</Button>}
                {canProduce && <Button className="justify-start" variant="outline" onClick={() => go('/producao/fichas')}><ClipboardList className="w-4 h-4 mr-2" /> Fichas técnicas</Button>}
              </>
            ) : (
              <>
                {canSell && <Button className="justify-start" disabled={item.quantidade <= 0} onClick={() => go(`/vendas/pdv?material=${item.id}`)}><ShoppingCart className="w-4 h-4 mr-2" /> {item.quantidade > 0 ? 'Vender no PDV' : 'Sem estoque para vender'}</Button>}
                {canProduce && <Button className="justify-start" variant="outline" onClick={() => go('/producao/processar')}><Factory className="w-4 h-4 mr-2" /> Produzir mais</Button>}
                {canProduce && <Button className="justify-start" variant="outline" onClick={() => go('/producao/lotes')}><PackageSearch className="w-4 h-4 mr-2" /> Ver rastreio dos lotes</Button>}
              </>
            )}
            <Button className="justify-start" variant="ghost" onClick={() => { onClose(); onEdit(item); }}><Edit className="w-4 h-4 mr-2" /> Editar material (preço, tipo, mínimo)</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
