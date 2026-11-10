import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useFinancasCategories";
import { seedDefaultCategories, type DbCategory } from "@/lib/financas/categories-db";
import { slugify } from "@/lib/financas/categories";

const EMOJIS = ["🏠", "🚗", "👤", "🧾", "✨", "💰", "🍔", "🏥", "🎓", "🐶", "✈️", "🎁", "📦", "💳"];

export function CategoryManager({
  userId, ownerId, readOnly,
}: { userId: string; ownerId: string; readOnly: boolean }) {
  const qc = useQueryClient();
  const { rows, isLoading, isCustom } = useCategories(ownerId);
  const [editing, setEditing] = useState<DbCategory | null>(null);
  const [creatingKind, setCreatingKind] = useState<"receita" | "despesa" | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["pf-categories"] });
  };

  const ensureSeed = async () => {
    if (isCustom) return true;
    setBusy(true);
    try {
      await seedDefaultCategories(userId);
      await qc.invalidateQueries({ queryKey: ["pf-categories"] });
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const startCreate = async (kind: "receita" | "despesa") => {
    if (await ensureSeed()) setCreatingKind(kind);
  };

  const startEdit = async (c: DbCategory) => {
    if (await ensureSeed()) setEditing(c);
  };

  const remove = async (c: DbCategory) => {
    if (!confirm(`Excluir a categoria "${c.label}"? Os lançamentos antigos continuam salvos.`)) return;
    const { error } = await supabase.from("personal_categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Categoria excluída");
    refresh();
  };

  const despesas = rows.filter((c) => c.kind === "despesa");
  const receitas = rows.filter((c) => c.kind === "receita");

  if (readOnly) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Você está visualizando outra conta — as categorias não podem ser alteradas.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {!isCustom && !isLoading && (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm shadow-[var(--shadow-card)]">
          <p className="font-semibold">Você está usando as categorias padrão</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ao criar ou editar qualquer categoria, as padrões são copiadas para a sua conta e ficam
            totalmente editáveis.
          </p>
        </div>
      )}

      <Section
        title="Despesas"
        list={isCustom ? despesas : []}
        fallbackNote={!isCustom}
        onCreate={() => startCreate("despesa")}
        onEdit={startEdit}
        onRemove={remove}
        busy={busy}
      />
      <Section
        title="Receitas"
        list={isCustom ? receitas : []}
        fallbackNote={!isCustom}
        onCreate={() => startCreate("receita")}
        onEdit={startEdit}
        onRemove={remove}
        busy={busy}
      />

      <CategoryDialog
        userId={userId}
        category={editing}
        kind={editing?.kind ?? creatingKind ?? "despesa"}
        open={!!editing || !!creatingKind}
        onOpenChange={(o) => { if (!o) { setEditing(null); setCreatingKind(null); } }}
        onSaved={refresh}
      />
    </div>
  );
}

function Section({
  title, list, fallbackNote, onCreate, onEdit, onRemove, busy,
}: {
  title: string; list: DbCategory[]; fallbackNote: boolean;
  onCreate: () => void; onEdit: (c: DbCategory) => void;
  onRemove: (c: DbCategory) => void; busy: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button size="sm" variant="outline" onClick={onCreate} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Nova
        </Button>
      </div>
      {fallbackNote ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
          Categorias padrão em uso. Toque em <strong>Nova</strong> para personalizar.
        </p>
      ) : list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
          Nenhuma categoria aqui ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.id}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-lg">
                {c.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{c.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {c.subcategories.length ? c.subcategories.join(" · ") : "Sem subcategorias"}
                </p>
              </div>
              <div className="flex gap-0.5">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(c)} aria-label="Editar">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemove(c)} aria-label="Excluir">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryDialog({
  userId, category, kind, open, onOpenChange, onSaved,
}: {
  userId: string; category: DbCategory | null; kind: "receita" | "despesa";
  open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void;
}) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("📦");
  const [subs, setSubs] = useState<string[]>([]);
  const [newSub, setNewSub] = useState("");
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState<string | null>(null);

  const seedKey = `${open}-${category?.id ?? "new"}-${kind}`;
  if (open && initialized !== seedKey) {
    setInitialized(seedKey);
    setLabel(category?.label ?? "");
    setIcon(category?.icon ?? (kind === "receita" ? "💰" : "📦"));
    setSubs(category?.subcategories ?? []);
    setNewSub("");
  }

  const addSub = () => {
    const v = newSub.trim();
    if (!v) return;
    if (subs.includes(v)) return toast.error("Subcategoria já existe");
    setSubs([...subs, v]);
    setNewSub("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return toast.error("Informe o nome da categoria");
    setBusy(true);
    let error;
    if (category) {
      ({ error } = await supabase.from("personal_categories")
        .update({ label: label.trim(), icon, subcategories: subs })
        .eq("id", category.id));
    } else {
      ({ error } = await supabase.from("personal_categories").insert({
        user_id: userId,
        kind,
        key: slugify(label),
        label: label.trim(),
        icon,
        subcategories: subs,
        sort_order: 50,
      } as never));
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(category ? "Categoria atualizada" : "Categoria criada");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{category ? "Editar categoria" : "Nova categoria"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Saúde" maxLength={40} required />
          </div>

          <div>
            <Label>Ícone</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {EMOJIS.map((e) => (
                <button key={e} type="button" onClick={() => setIcon(e)}
                  className={`grid h-9 w-9 place-items-center rounded-lg border text-lg transition ${
                    icon === e ? "border-primary bg-primary/10" : "border-border bg-muted/40"
                  }`}>{e}</button>
              ))}
            </div>
          </div>

          <div>
            <Label>Subcategorias</Label>
            <div className="mt-1 flex gap-2">
              <Input value={newSub} onChange={(e) => setNewSub(e.target.value)}
                placeholder="Ex: Farmácia"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSub(); } }} />
              <Button type="button" variant="outline" onClick={addSub}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {subs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {subs.map((s) => (
                  <span key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    {s}
                    <button type="button" onClick={() => setSubs(subs.filter((x) => x !== s))}
                      aria-label={`Remover ${s}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
