import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { goalKey, isGoalKey } from "@/lib/financas/caixinha";

/** Metas das caixinhas (guardadas como "meta:<propósito>" nos tetos). */
export function useCaixinhaGoals(ownerId: string) {
  const qc = useQueryClient();
  const { data: goals = {} } = useQuery<Record<string, number>>({
    queryKey: ["pf-budgets", ownerId, "goals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("personal_budgets").select("category, amount").eq("user_id", ownerId);
      if (error) throw error;
      const out: Record<string, number> = {};
      (data ?? []).forEach((b) => { if (isGoalKey(b.category)) out[b.category] = Number(b.amount); });
      return out;
    },
    enabled: !!ownerId,
    staleTime: 60_000,
  });

  const saveGoal = async (purpose: string, amount: number) => {
    const category = goalKey(purpose);
    const q = amount > 0
      ? supabase.from("personal_budgets").upsert({ user_id: ownerId, category, amount } as never, { onConflict: "user_id,category" })
      : supabase.from("personal_budgets").delete().eq("user_id", ownerId).eq("category", category);
    const { error } = await q;
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["pf-budgets", ownerId] });
  };
  return { goals, saveGoal };
}
