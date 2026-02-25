import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Edit, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CompanyPlan {
  id: string;
  company_id: string;
  plan_name: string;
  max_users: number;
  max_items: number;
  is_active: boolean;
  company_name?: string;
}

const PLAN_OPTIONS = [
  { value: 'basico', label: 'Básico' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
];

const GestaoPlanos = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<CompanyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPlan, setEditPlan] = useState<CompanyPlan | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    const { data: companies } = await supabase.from('companies').select('id, name').order('name');
    const { data: plansData } = await supabase.from('company_plans').select('*');

    const merged = (companies || []).map(c => {
      const plan = (plansData || []).find(p => p.company_id === c.id);
      return {
        id: plan?.id || '',
        company_id: c.id,
        plan_name: plan?.plan_name || 'basico',
        max_users: plan?.max_users ?? 5,
        max_items: plan?.max_items ?? 500,
        is_active: plan?.is_active ?? true,
        company_name: c.name,
      };
    });
    setPlans(merged);
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleSave = async () => {
    if (!editPlan) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_plans')
        .upsert({
          company_id: editPlan.company_id,
          plan_name: editPlan.plan_name,
          max_users: editPlan.max_users,
          max_items: editPlan.max_items,
          is_active: editPlan.is_active,
        }, { onConflict: 'company_id' });
      if (error) throw error;
      toast({ title: 'Plano atualizado!' });
      setEditPlan(null);
      fetchPlans();
    } catch {
      toast({ title: 'Erro', description: 'Erro ao salvar plano.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Planos e Limites
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchPlans} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-center">Máx. Usuários</TableHead>
                    <TableHead className="text-center">Máx. Itens</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map(p => (
                    <TableRow key={p.company_id}>
                      <TableCell className="font-medium">{p.company_name}</TableCell>
                      <TableCell>
                        <Badge variant={p.plan_name === 'enterprise' ? 'default' : 'secondary'}>
                          {PLAN_OPTIONS.find(o => o.value === p.plan_name)?.label || p.plan_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{p.max_users}</TableCell>
                      <TableCell className="text-center">{p.max_items}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={p.is_active ? 'default' : 'destructive'}>
                          {p.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => setEditPlan({ ...p })}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editPlan} onOpenChange={(open) => { if (!open) setEditPlan(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Plano — {editPlan?.company_name}</DialogTitle>
          </DialogHeader>
          {editPlan && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={editPlan.plan_name} onValueChange={v => setEditPlan({ ...editPlan, plan_name: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Máx. Usuários</Label>
                  <Input type="number" value={editPlan.max_users} onChange={e => setEditPlan({ ...editPlan, max_users: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Máx. Itens</Label>
                  <Input type="number" value={editPlan.max_items} onChange={e => setEditPlan({ ...editPlan, max_items: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlan(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default GestaoPlanos;
