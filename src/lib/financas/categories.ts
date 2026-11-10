export type CategoryGroup = {
  key: string;
  label: string;
  icon: string;
  subcategories: string[];
};

export const DEFAULT_EXPENSE_CATEGORIES: CategoryGroup[] = [
  {
    key: "casa",
    label: "Contas Casa",
    icon: "🏠",
    subcategories: ["Aluguel", "Luz", "Internet", "IPTU", "Água", "Gás"],
  },
  {
    key: "carro",
    label: "Contas Carro",
    icon: "🚗",
    subcategories: ["Financiamento", "Seguro", "Combustível", "Manutenção", "Outros"],
  },
  {
    key: "pessoais",
    label: "Contas Pessoais",
    icon: "👤",
    subcategories: ["Faculdade", "Internet Celular", "Assinaturas", "Outros"],
  },
  {
    key: "impostos",
    label: "Impostos",
    icon: "🧾",
    subcategories: ["IR", "IPVA", "DAS / MEI", "ISS", "Multas", "Outros"],
  },
  {
    key: "extras",
    label: "Extras",
    icon: "✨",
    subcategories: ["Empréstimos", "Emergências", "Compras Extras", "Reparos", "Outros"],
  },
];

export const DEFAULT_INCOME_CATEGORIES: CategoryGroup[] = [
  {
    key: "receitas",
    label: "Receitas",
    icon: "💰",
    subcategories: ["Salário", "Horas Extras", "Vale", "PIX Recebido", "Outros"],
  },
];

// Back-compat exports
export const EXPENSE_CATEGORIES = DEFAULT_EXPENSE_CATEGORIES;
export const INCOME_CATEGORY = DEFAULT_INCOME_CATEGORIES[0];

/**
 * Registro dinâmico: preenchido pelo hook useCategories a partir do banco.
 * Permite que findCategory (usado em listas e gráficos) enxergue as
 * categorias personalizadas do usuário sem prop drilling.
 */
let dynamicExpense: CategoryGroup[] | null = null;
let dynamicIncome: CategoryGroup[] | null = null;

export function setCustomCategories(
  expense: CategoryGroup[] | null,
  income: CategoryGroup[] | null,
) {
  dynamicExpense = expense && expense.length ? expense : null;
  dynamicIncome = income && income.length ? income : null;
}

export function getExpenseCategories(): CategoryGroup[] {
  return dynamicExpense ?? DEFAULT_EXPENSE_CATEGORIES;
}

export function getIncomeCategories(): CategoryGroup[] {
  return dynamicIncome ?? DEFAULT_INCOME_CATEGORIES;
}

export function findCategory(key: string): CategoryGroup | undefined {
  const pool = [
    ...(dynamicExpense ?? []),
    ...(dynamicIncome ?? []),
    ...DEFAULT_EXPENSE_CATEGORIES,
    ...DEFAULT_INCOME_CATEGORIES,
  ];
  return pool.find((c) => c.key === key);
}

export const ALL_CATEGORIES = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];

export const DEBT_SUBCATEGORIES = new Set(["Empréstimos", "Financiamento"]);

// Categories that support linking to a registered person
export const PERSON_CATEGORY_KEYS = new Set(["pessoais"]);

export function slugify(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || `cat-${Math.random().toString(36).slice(2, 7)}`;
}
