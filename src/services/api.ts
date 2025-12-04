const API_URL = 'https://script.google.com/macros/s/AKfycbzftF6xnnk-AvM9lfasz_cgpd8_0azt4kRT-cMK50TVpUBTl7YuDecU2d2BqHtNEKY/exec';

export interface ApiResponse {
  ok: boolean;
  msg?: string;
  nome?: string;
  email?: string;
  role?: string;
  link?: string;
  setores?: Array<{ id: string; nome: string; descricao: string }>;
  solicitacoes?: Array<{
    id: string;
    data: string;
    email_usuario: string;
    setor: string;
    codigo: string;
    material: string;
    quantidade: number;
    status: string;
    obs: string;
  }>;
  [key: string]: unknown;
}

export interface MaterialData {
  codigo: string;
  material: string;
  unidade: string;
  localizacao: string;
  validade: string;
  quantidade: string;
  minimo: string;
  maximo: string;
  preco: string;
}

export interface OCItem {
  codigo: string;
  material: string;
  unidade: string;
  quantidade: string;
  preco: string;
}

export interface MovementItem {
  codigo: string;
  quantidade: string;
  obs: string;
}

async function apiRequest(data: Record<string, unknown>): Promise<ApiResponse> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

export const api = {
  login: async (email: string, senha: string): Promise<ApiResponse> => {
    return apiRequest({ action: 'login', email, senha });
  },

  cadastrarMaterial: async (email: string, data: MaterialData): Promise<ApiResponse> => {
    return apiRequest({
      action: 'cadastrar_material',
      email,
      ...data,
    });
  },

  gerarOC: async (
    email: string,
    setor: string,
    fornecedor: string,
    cond_pagto: string,
    obs: string,
    itens: OCItem[]
  ): Promise<ApiResponse> => {
    return apiRequest({
      action: 'gerar_oc',
      email,
      setor,
      fornecedor,
      cond_pagto,
      obs,
      itens,
    });
  },

  updateStock: async (email: string, codigo: string, quantidade: string): Promise<ApiResponse> => {
    return apiRequest({
      action: 'update',
      email,
      codigo,
      quantidade,
    });
  },

  movimentarEstoque: async (
    email: string,
    tipo: 'entrada' | 'saida',
    itens: MovementItem[]
  ): Promise<ApiResponse> => {
    return apiRequest({
      action: 'movimentar',
      email,
      tipo,
      itens,
    });
  },

  criarSetor: async (email: string, nome: string, descricao: string): Promise<ApiResponse> => {
    return apiRequest({
      action: 'criar_setor',
      email,
      nome,
      descricao,
    });
  },

  listarSetores: async (email: string): Promise<ApiResponse> => {
    return apiRequest({
      action: 'listar_setores',
      email,
    });
  },

  solicitarMaterial: async (
    email: string,
    setor: string,
    codigo: string,
    material: string,
    quantidade: string,
    obs: string
  ): Promise<ApiResponse> => {
    return apiRequest({
      action: 'solicitar_material',
      email,
      setor,
      codigo,
      material,
      quantidade,
      obs,
    });
  },

  listarSolicitacoes: async (email: string): Promise<ApiResponse> => {
    return apiRequest({
      action: 'listar_solicitacoes',
      email,
    });
  },

  criarUsuario: async (
    emailAdmin: string,
    email: string,
    senha: string,
    nome: string,
    autenticacao: string
  ): Promise<ApiResponse> => {
    return apiRequest({
      action: 'criar_usuario',
      email: emailAdmin,
      novo_email: email,
      senha,
      nome,
      autenticacao,
    });
  },
};
