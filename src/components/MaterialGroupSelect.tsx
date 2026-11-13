import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { MaterialGroup } from '@/hooks/useMaterialGroups';
import { groupNameExists, normalizeGroupName } from '@/lib/dbErrors';

interface Props {
  id?: string;
  value: string;
  onChange: (id: string) => void;
  groups: MaterialGroup[];
  loading?: boolean;
  createGroup: (nome: string, descricao?: string) => Promise<MaterialGroup | null>;
  seedDefaults?: () => Promise<void>;
}

/** Seletor de grupo de material com opção de criar um grupo novo na hora. */
export const MaterialGroupSelect = ({ id, value, onChange, groups, loading, createGroup, seedDefaults }: Props) => {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const clean = normalizeGroupName(nome);
    if (!clean) { toast.error('Informe o nome do grupo.'); return; }
    if (groupNameExists(clean, groups)) { toast.error('Já existe um grupo com esse nome.'); return; }
    setSaving(true);
    const created = await createGroup(clean, descricao);
    setSaving(false);
    if (created) {
      onChange(created.id);
      toast.success(`Grupo "${created.nome}" criado`);
      setNome(''); setDescricao(''); setOpen(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Select value={value} onValueChange={(v) => { if (v) onChange(v); }}>
          <SelectTrigger id={id} className="flex-1">
            <SelectValue placeholder={loading ? 'Carregando...' : 'Selecione o grupo'} />
          </SelectTrigger>
          <SelectContent>
            {groups.map(g => (
              <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="icon" onClick={() => setOpen(true)} aria-label="Criar novo grupo" title="Criar novo grupo">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {!loading && groups.length === 0 && seedDefaults && (
        <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={seedDefaults}>
          Criar grupos padrão
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo grupo de materiais</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="novo-grupo-nome">Nome do grupo *</Label>
              <Input
                id="novo-grupo-nome"
                value={nome}
                autoFocus
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }}
                placeholder="Ex.: Pescados, Embalagens"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="novo-grupo-desc">Descrição (opcional)</Label>
              <Input id="novo-grupo-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={handleCreate} disabled={saving}>
              {saving ? 'Criando...' : 'Criar grupo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
