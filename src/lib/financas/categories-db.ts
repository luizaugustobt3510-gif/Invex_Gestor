import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, type CategoryGroup,
} from "@/lib/financas/categories";

export type DbCategory = {
  id: string;
  user_id: string;
  kind: "receita" | "despesa";
  key: string;
  label: string;
  icon: string;
  subcategories: string[];
  sort_order: number;
};

export async function fetchCategories(ownerId?: string): Promise<DbCategory[]> {
  let q = supabase.from("personal_categories").select("*").order("sort_order", { ascending: true });
  if (ownerId) q = q.eq("user_id", ownerId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DbCategory[];
}

export function toGroup(c: DbCategory): CategoryGroup {
  return { key: c.key, label: c.label, icon: c.icon, subcategories: c.subcategories ?? [] };
}

/** Copia as categorias padrão para o banco do usuário (uma vez). */
export async function seedDefaultCategories(userId: string) {
  const rows = [
    ...DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({ ...c, kind: "despesa" as const, sort_order: i })),
    ...DEFAULT_INCOME_CATEGORIES.map((c, i) => ({ ...c, kind: "receita" as const, sort_order: 100 + i })),
  ].map((c) => ({
    user_id: userId,
    kind: c.kind,
    key: c.key,
    label: c.label,
    icon: c.icon,
    subcategories: c.subcategories,
    sort_order: c.sort_order,
  }));
  const { error } = await supabase.from("personal_categories").insert(rows as never);
  if (error) throw error;
}
