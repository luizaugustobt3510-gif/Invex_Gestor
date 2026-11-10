import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchPeople } from "@/lib/financas/people";
import { toast } from "sonner";

export function PeopleManager({
  userId,
  ownerId,
  readOnly = false,
}: {
  userId: string;
  ownerId?: string;
  readOnly?: boolean;
}) {
  const effectiveOwner = ownerId ?? userId;
  const qc = useQueryClient();
  const { data: people = [], isLoading } = useQuery({
    queryKey: ["pf-people", effectiveOwner],
    queryFn: () => fetchPeople(effectiveOwner),
    staleTime: 60_000,
  });
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    const { error } = await supabase.from("personal_people").insert({
      user_id: userId,
      name: trimmed,
    });
    setBusy(false);
    if (error) return toast.error(error.message.includes("duplicate") ? "Já existe" : error.message);
    setName("");
    qc.invalidateQueries({ queryKey: ["pf-people", effectiveOwner] });
    toast.success("Pessoa adicionada");
  };

  const remove = async (id: string, displayName: string) => {
    if (!confirm(`Remover ${displayName}? Os lançamentos vinculados ficam sem pessoa.`)) return;
    const { error } = await supabase.from("personal_people").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["pf-people", effectiveOwner] });
    qc.invalidateQueries({ queryKey: ["pf-transactions"] });
    toast.success("Pessoa removida");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Pessoas cadastradas</h3>
      </div>
      {!readOnly && (
        <form onSubmit={add} className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Nome da pessoa" maxLength={60} />
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>
      )}

      <div className="mt-3">
        {isLoading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Carregando...</p>
        ) : people.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {readOnly ? "Nenhuma pessoa cadastrada." : <>Cadastre as pessoas que aparecem em <strong>Contas Pessoais</strong>.</>}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {people.map((p) => (
              <li key={p.id}
                className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span className="truncate text-sm">{p.name}</span>
                {!readOnly && (
                  <Button variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => remove(p.id, p.name)} aria-label="Remover">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
