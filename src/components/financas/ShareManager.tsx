import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Share2, Loader2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchMyShares } from "@/lib/financas/shares";
import { toast } from "sonner";

export function ShareManager({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: shares = [], isLoading } = useQuery({
    queryKey: ["pf-shares", userId],
    queryFn: fetchMyShares,
    staleTime: 60_000,
  });
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) return toast.error("Informe um e-mail válido");
    setBusy(true);
    const { error } = await supabase.from("personal_account_shares").insert({
      owner_id: userId,
      viewer_email: trimmed,
    });
    setBusy(false);
    if (error) return toast.error(error.message.includes("duplicate") ? "Já compartilhado" : error.message);
    setEmail("");
    qc.invalidateQueries({ queryKey: ["pf-shares", userId] });
    toast.success("Convite criado");
  };

  const remove = async (id: string, who: string) => {
    if (!confirm(`Remover acesso de ${who}?`)) return;
    const { error } = await supabase.from("personal_account_shares").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["pf-shares", userId] });
    toast.success("Acesso removido");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="mb-1 flex items-center gap-2">
        <Share2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Compartilhar minha conta</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        A pessoa convidada poderá <strong>apenas visualizar</strong> seus lançamentos.
      </p>
      <form onSubmit={add} className="flex gap-2">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="email@exemplo.com" maxLength={120} />
        <Button type="submit" disabled={busy || !email.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </form>

      <div className="mt-3">
        {isLoading ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Carregando...</p>
        ) : shares.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Ninguém tem acesso à sua conta ainda.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {shares.map((s) => (
              <li key={s.id}
                className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{s.viewer_email}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => remove(s.id, s.viewer_email)} aria-label="Remover">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
