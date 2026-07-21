import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Search, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { logisticaService } from '@/services/logisticaService';
import { supabase } from '@/integrations/supabase/client';

interface Row {
  sector_id: string;
  sector_nome: string;
  material_id: string;
  codigo: string;
  material: string;
  unidade: string | null;
  quantidade: number;
  updated_at: string;
}
interface Sector { id: string; nome: string; }

export default function EstoqueSetores() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user?.companyId) return;
      setLoading(true);
      const [{ data: secData }, { data: stockData }] = await Promise.all([
        supabase.from('sectors').select('id, nome').eq('company_id', user.companyId).order('nome'),
        logisticaService.getSectorStock(user.companyId),
      ]);
      setSectors((secData as Sector[]) || []);
      const parsed: Row[] = (stockData || []).map((r: any) => ({
        sector_id: r.sector_id,
        sector_nome: r.sectors?.nome || '—',
        material_id: r.material_id,
        codigo: r.materials?.codigo || '',
        material: r.materials?.material || '',
        unidade: r.materials?.unidade || null,
        quantidade: Number(r.quantidade),
        updated_at: r.updated_at,
      }));
      setRows(parsed);
      setLoading(false);
    })();
  }, [user?.companyId]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return rows.filter(r =>
      (sectorFilter === 'all' || r.sector_id === sectorFilter) &&
      (!s || r.material.toLowerCase().includes(s) || r.codigo.toLowerCase().includes(s) || r.sector_nome.toLowerCase().includes(s))
    );
  }, [rows, sectorFilter, search]);

  return (
    <MainLayout>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" /> Estoque por Setor
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Saldo atual de cada setor. Alimentado pelas entregas de solicitações e transferências avulsas.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 min-w-[200px]">
              <Label className="text-xs">Setor</Label>
              <Select value={sectorFilter} onValueChange={setSectorFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os setores</SelectItem>
                  {sectors.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Código, material ou setor..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Nenhum saldo em setores.</div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Setor</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Atualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={`${r.sector_id}-${r.material_id}`}>
                      <TableCell>{r.sector_nome}</TableCell>
                      <TableCell className="font-mono">{r.codigo}</TableCell>
                      <TableCell>{r.material}</TableCell>
                      <TableCell>{r.unidade || '-'}</TableCell>
                      <TableCell className="text-right font-semibold">{r.quantidade}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.updated_at).toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="text-xs text-muted-foreground">{filtered.length} registro(s)</div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
