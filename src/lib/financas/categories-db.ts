import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, type CategoryGroup,
} from "@/lib/financas/categories";
import { slugify } from "@/lib/financas/categories";

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

/** Garante que o usuário já tenha suas próprias categorias (copia as padrão na primeira vez). */
export async function ensureOwnCategories(userId: string): Promise<DbCategory[]> {
  let rows = await fetchCategories(userId);
  if (rows.length === 0) {
    await seedDefaultCategories(userId);
    rows = await fetchCategories(userId);
  }
  return rows;
}

/** Cria uma categoria nova e devolve a chave dela. */
export async function addCategoryQuick(userId: string, kind: "receita" | "despesa", label: string, icon?: string): Promise<string> {
  const name = label.trim();
  if (!name) throw new Error("Informe o nome da categoria");
  const rows = await ensureOwnCategories(userId);
  const exists = rows.find((r) => r.kind === kind && r.label.toLowerCase() === name.toLowerCase());
  if (exists) return exists.key;
  let key = slugify(name) || `cat-${Date.now()}`;
  if (rows.some((r) => r.key === key)) key = `${key}-${Date.now().toString(36)}`;
  const { error } = await supabase.from("personal_categories").insert({
    user_id: userId, kind, key, label: name, icon: icon ?? (kind === "receita" ? "💰" : "📦"),
    subcategories: ["Geral"], sort_order: 50,
  } as never);
  if (error) throw error;
  return key;
}

/** Acrescenta uma subcategoria a uma categoria existente. */
export async function addSubcategoryQuick(userId: string, kind: "receita" | "despesa", categoryKey: string, sub: string): Promise<string> {
  const name = sub.trim();
  if (!name) throw new Error("Informe o nome da subcategoria");
  const rows = await ensureOwnCategories(userId);
  const row = rows.find((r) => r.key === categoryKey && r.kind === kind) ?? rows.find((r) => r.key === categoryKey);
  if (!row) throw new Error("Categoria não encontrada");
  if (row.subcategories.some((s) => s.toLowerCase() === name.toLowerCase())) return name;
  const { error } = await supabase.from("personal_categories")
    .update({ subcategories: [...row.subcategories, name] }).eq("id", row.id);
  if (error) throw error;
  return name;
}

/** Ao renomear uma subcategoria, os lançamentos antigos acompanham o novo nome. */
export async function renameSubcategoryInTransactions(userId: string, categoryKey: string, oldName: string, newName: string) {
  if (!oldName || oldName === newName) return;
  const { error } = await supabase.from("personal_transactions")
    .update({ subcategory: newName })
    .eq("user_id", userId).eq("category", categoryKey).eq("subcategory", oldName);
  if (error) throw error;
}
