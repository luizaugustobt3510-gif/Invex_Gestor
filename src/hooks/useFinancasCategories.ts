import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCategories, toGroup, type DbCategory } from "@/lib/financas/categories-db";
import {
  setCustomCategories, getExpenseCategories, getIncomeCategories,
  DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, type CategoryGroup,
} from "@/lib/financas/categories";

export function useCategories(ownerId?: string) {
  const { data = [], isLoading } = useQuery<DbCategory[]>({
    queryKey: ["pf-categories", ownerId],
    queryFn: () => fetchCategories(ownerId),
    enabled: !!ownerId,
    staleTime: 5 * 60_000,
  });

  return useMemo(() => {
    const expenseDb = data.filter((c) => c.kind === "despesa");
    const incomeDb = data.filter((c) => c.kind === "receita");
    setCustomCategories(expenseDb.map(toGroup), incomeDb.map(toGroup));

    const expense: CategoryGroup[] = expenseDb.length
      ? expenseDb.map(toGroup)
      : DEFAULT_EXPENSE_CATEGORIES;
    const income: CategoryGroup[] = incomeDb.length
      ? incomeDb.map(toGroup)
      : DEFAULT_INCOME_CATEGORIES;

    return { rows: data, expense, income, isLoading, isCustom: data.length > 0 };
  }, [data, isLoading]);
}

export { getExpenseCategories, getIncomeCategories };
