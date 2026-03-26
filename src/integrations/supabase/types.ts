export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      academy_payments: {
        Row: {
          company_id: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          referencia: string
          status: string
          student_id: string
          valor: number
        }
        Insert: {
          company_id: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          referencia?: string
          status?: string
          student_id: string
          valor?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          referencia?: string
          status?: string
          student_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "academy_students"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_students: {
        Row: {
          company_id: string
          cpf: string | null
          created_at: string
          data_matricula: string
          data_nascimento: string | null
          dia_vencimento: number
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          plano: string
          renovacao_automatica: boolean
          status: string
          telefone: string | null
          updated_at: string
          valor_mensalidade: number
        }
        Insert: {
          company_id: string
          cpf?: string | null
          created_at?: string
          data_matricula?: string
          data_nascimento?: string | null
          dia_vencimento?: number
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          plano?: string
          renovacao_automatica?: boolean
          status?: string
          telefone?: string | null
          updated_at?: string
          valor_mensalidade?: number
        }
        Update: {
          company_id?: string
          cpf?: string | null
          created_at?: string
          data_matricula?: string
          data_nascimento?: string | null
          dia_vencimento?: number
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          plano?: string
          renovacao_automatica?: boolean
          status?: string
          telefone?: string | null
          updated_at?: string
          valor_mensalidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_students_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          cnpj: string | null
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_modules: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          module_key: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          module_key: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          module_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_modules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_plans: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          max_items: number
          max_users: number
          plan_name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_items?: number
          max_users?: number
          plan_name?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_items?: number
          max_users?: number
          plan_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      conciliacao_log: {
        Row: {
          company_id: string
          created_at: string
          divergencia: number
          id: string
          material_id: string
          motivo: string | null
          saldo_fisico: number
          saldo_teorico: number
          tipo_ajuste: string | null
          usuario_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          divergencia: number
          id?: string
          material_id: string
          motivo?: string | null
          saldo_fisico: number
          saldo_teorico: number
          tipo_ajuste?: string | null
          usuario_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          divergencia?: number
          id?: string
          material_id?: string
          motivo?: string | null
          saldo_fisico?: number
          saldo_teorico?: number
          tipo_ajuste?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conciliacao_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliacao_log_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      contagem_fisica: {
        Row: {
          company_id: string
          created_at: string
          data_contagem: string
          id: string
          material_id: string
          obs: string | null
          quantidade_contada: number
          usuario_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          data_contagem?: string
          id?: string
          material_id: string
          obs?: string | null
          quantidade_contada?: number
          usuario_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          data_contagem?: string
          id?: string
          material_id?: string
          obs?: string | null
          quantidade_contada?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contagem_fisica_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contagem_fisica_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      development_plans: {
        Row: {
          company_id: string
          created_at: string
          descricao: string | null
          employee_id: string
          evaluation_id: string | null
          id: string
          prazo: string | null
          status: string
          tipo: string
          titulo: string
          training_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          descricao?: string | null
          employee_id: string
          evaluation_id?: string | null
          id?: string
          prazo?: string | null
          status?: string
          tipo?: string
          titulo?: string
          training_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          descricao?: string | null
          employee_id?: string
          evaluation_id?: string | null
          id?: string
          prazo?: string | null
          status?: string
          tipo?: string
          titulo?: string
          training_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plans_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "performance_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plans_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_asos: {
        Row: {
          arquivo_url: string | null
          company_id: string
          created_at: string
          data_realizacao: string
          data_vencimento: string | null
          employee_id: string
          id: string
          observacoes: string | null
          status: string
          tipo: string
        }
        Insert: {
          arquivo_url?: string | null
          company_id: string
          created_at?: string
          data_realizacao: string
          data_vencimento?: string | null
          employee_id: string
          id?: string
          observacoes?: string | null
          status?: string
          tipo?: string
        }
        Update: {
          arquivo_url?: string | null
          company_id?: string
          created_at?: string
          data_realizacao?: string
          data_vencimento?: string | null
          employee_id?: string
          id?: string
          observacoes?: string | null
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_asos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_asos_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_certificates: {
        Row: {
          arquivo_url: string | null
          company_id: string
          created_at: string
          data_fim: string
          data_inicio: string
          dias: number
          employee_id: string
          id: string
          motivo: string | null
        }
        Insert: {
          arquivo_url?: string | null
          company_id: string
          created_at?: string
          data_fim: string
          data_inicio: string
          dias: number
          employee_id: string
          id?: string
          motivo?: string | null
        }
        Update: {
          arquivo_url?: string | null
          company_id?: string
          created_at?: string
          data_fim?: string
          data_inicio?: string
          dias?: number
          employee_id?: string
          id?: string
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_certificates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_occurrences: {
        Row: {
          company_id: string
          created_at: string
          data: string
          descricao: string
          employee_id: string
          id: string
          responsavel_nome: string
          tipo: string
        }
        Insert: {
          company_id: string
          created_at?: string
          data?: string
          descricao?: string
          employee_id: string
          id?: string
          responsavel_nome?: string
          tipo?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          data?: string
          descricao?: string
          employee_id?: string
          id?: string
          responsavel_nome?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_occurrences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_occurrences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_terminations: {
        Row: {
          company_id: string
          created_at: string
          data_desligamento: string
          employee_id: string
          id: string
          motivo: string
          observacoes: string | null
          responsavel_nome: string
        }
        Insert: {
          company_id: string
          created_at?: string
          data_desligamento: string
          employee_id: string
          id?: string
          motivo: string
          observacoes?: string | null
          responsavel_nome?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          data_desligamento?: string
          employee_id?: string
          id?: string
          motivo?: string
          observacoes?: string | null
          responsavel_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_terminations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_terminations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_trainings: {
        Row: {
          company_id: string
          created_at: string
          data_realizacao: string
          data_validade: string | null
          employee_id: string
          id: string
          status: string
          training_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          data_realizacao: string
          data_validade?: string | null
          employee_id: string
          id?: string
          status?: string
          training_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          data_realizacao?: string
          data_validade?: string | null
          employee_id?: string
          id?: string
          status?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_trainings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_trainings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_trainings_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_vacations: {
        Row: {
          company_id: string
          created_at: string
          data_fim: string
          data_inicio: string
          dias: number
          employee_id: string
          id: string
          obs: string | null
          periodo_aquisitivo_fim: string
          periodo_aquisitivo_inicio: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          data_fim: string
          data_inicio: string
          dias?: number
          employee_id: string
          id?: string
          obs?: string | null
          periodo_aquisitivo_fim: string
          periodo_aquisitivo_inicio: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          data_fim?: string
          data_inicio?: string
          dias?: number
          employee_id?: string
          id?: string
          obs?: string | null
          periodo_aquisitivo_fim?: string
          periodo_aquisitivo_inicio?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_vacations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_vacations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          cargo: string
          company_id: string
          cpf: string
          created_at: string
          data_admissao: string
          data_nascimento: string | null
          departamento: string | null
          id: string
          nome: string
          salario: number
          status: string
          updated_at: string
        }
        Insert: {
          cargo: string
          company_id: string
          cpf: string
          created_at?: string
          data_admissao: string
          data_nascimento?: string | null
          departamento?: string | null
          id?: string
          nome: string
          salario?: number
          status?: string
          updated_at?: string
        }
        Update: {
          cargo?: string
          company_id?: string
          cpf?: string
          created_at?: string
          data_admissao?: string
          data_nascimento?: string | null
          departamento?: string | null
          id?: string
          nome?: string
          salario?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_default: boolean
          nome: string
          tipo: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          nome: string
          tipo?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          nome?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          categoria_id: string | null
          company_id: string
          created_at: string
          data: string
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          origem: string | null
          origem_id: string | null
          periodicidade: string | null
          recorrente: boolean
          status: string
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          company_id: string
          created_at?: string
          data?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          origem?: string | null
          origem_id?: string | null
          periodicidade?: string | null
          recorrente?: boolean
          status?: string
          tipo?: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          categoria_id?: string | null
          company_id?: string
          created_at?: string
          data?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          origem?: string | null
          origem_id?: string | null
          periodicidade?: string | null
          recorrente?: boolean
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      material_requests: {
        Row: {
          codigo: string
          company_id: string
          created_at: string
          id: string
          material: string
          obs: string | null
          quantidade: number
          setor: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          codigo: string
          company_id: string
          created_at?: string
          id?: string
          material: string
          obs?: string | null
          quantidade: number
          setor: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          codigo?: string
          company_id?: string
          created_at?: string
          id?: string
          material?: string
          obs?: string | null
          quantidade?: number
          setor?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          codigo: string
          company_id: string
          created_at: string
          id: string
          localizacao: string | null
          material: string
          maximo: number
          minimo: number
          preco: number
          quantidade: number
          unidade: string
          updated_at: string
          validade: string | null
        }
        Insert: {
          codigo: string
          company_id: string
          created_at?: string
          id?: string
          localizacao?: string | null
          material: string
          maximo?: number
          minimo?: number
          preco?: number
          quantidade?: number
          unidade?: string
          updated_at?: string
          validade?: string | null
        }
        Update: {
          codigo?: string
          company_id?: string
          created_at?: string
          id?: string
          localizacao?: string | null
          material?: string
          maximo?: number
          minimo?: number
          preco?: number
          quantidade?: number
          unidade?: string
          updated_at?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_importadas: {
        Row: {
          company_id: string
          created_at: string
          data: string
          id: string
          lote_importacao: string
          material_id: string
          origem: string | null
          quantidade: number
          tipo: string
        }
        Insert: {
          company_id: string
          created_at?: string
          data?: string
          id?: string
          lote_importacao: string
          material_id: string
          origem?: string | null
          quantidade?: number
          tipo: string
        }
        Update: {
          company_id?: string
          created_at?: string
          data?: string
          id?: string
          lote_importacao?: string
          material_id?: string
          origem?: string | null
          quantidade?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_importadas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_importadas_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_evaluations: {
        Row: {
          avaliador_id: string
          company_id: string
          created_at: string
          employee_id: string
          id: string
          nota: number
          observacoes: string | null
        }
        Insert: {
          avaliador_id: string
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          nota: number
          observacoes?: string | null
        }
        Update: {
          avaliador_id?: string
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          nota?: number
          observacoes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_evaluations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          codigo: string
          company_id: string
          created_at: string
          id: string
          material: string
          preco: number
          purchase_order_id: string
          quantidade: number
          unidade: string | null
        }
        Insert: {
          codigo: string
          company_id: string
          created_at?: string
          id?: string
          material: string
          preco?: number
          purchase_order_id: string
          quantidade: number
          unidade?: string | null
        }
        Update: {
          codigo?: string
          company_id?: string
          created_at?: string
          id?: string
          material?: string
          preco?: number
          purchase_order_id?: string
          quantidade?: number
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          company_id: string
          cond_pagto: string
          created_at: string
          fornecedor: string
          id: string
          obs: string | null
          pdf_url: string | null
          setor: string
          status: string
          total: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          cond_pagto: string
          created_at?: string
          fornecedor: string
          id?: string
          obs?: string | null
          pdf_url?: string | null
          setor: string
          status?: string
          total?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          cond_pagto?: string
          created_at?: string
          fornecedor?: string
          id?: string
          obs?: string | null
          pdf_url?: string | null
          setor?: string
          status?: string
          total?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      saldo_sistema_importado: {
        Row: {
          company_id: string
          created_at: string
          data_importacao: string
          id: string
          lote_importacao: string
          material_id: string
          saldo_sistema: number
        }
        Insert: {
          company_id: string
          created_at?: string
          data_importacao?: string
          id?: string
          lote_importacao: string
          material_id: string
          saldo_sistema?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          data_importacao?: string
          id?: string
          lote_importacao?: string
          material_id?: string
          saldo_sistema?: number
        }
        Relationships: [
          {
            foreignKeyName: "saldo_sistema_importado_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saldo_sistema_importado_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          company_id: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sectors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          company_id: string
          created_at: string
          id: string
          material_id: string
          obs: string | null
          quantidade: number
          tipo: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          material_id: string
          obs?: string | null
          quantidade: number
          tipo: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          material_id?: string
          obs?: string | null
          quantidade?: number
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          config_key: string
          config_value: string | null
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      temperature_records: {
        Row: {
          company_id: string
          created_at: string
          data: string
          hora: string
          id: string
          local: string
          responsavel_id: string
          responsavel_nome: string
          temperatura_atual: number
          temperatura_max: number
          temperatura_min: number
          umidade_atual: number
          umidade_max: number
          umidade_min: number
        }
        Insert: {
          company_id: string
          created_at?: string
          data?: string
          hora?: string
          id?: string
          local: string
          responsavel_id: string
          responsavel_nome: string
          temperatura_atual: number
          temperatura_max: number
          temperatura_min: number
          umidade_atual: number
          umidade_max: number
          umidade_min: number
        }
        Update: {
          company_id?: string
          created_at?: string
          data?: string
          hora?: string
          id?: string
          local?: string
          responsavel_id?: string
          responsavel_nome?: string
          temperatura_atual?: number
          temperatura_max?: number
          temperatura_min?: number
          umidade_atual?: number
          umidade_max?: number
          umidade_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "temperature_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      termination_reasons: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          is_default: boolean
          motivo: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          motivo: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          motivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "termination_reasons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      time_records: {
        Row: {
          company_id: string
          created_at: string
          data: string
          employee_id: string
          entrada: string | null
          horas_extras: number | null
          horas_trabalhadas: number | null
          id: string
          obs: string | null
          saida: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          data: string
          employee_id: string
          entrada?: string | null
          horas_extras?: number | null
          horas_trabalhadas?: number | null
          id?: string
          obs?: string | null
          saida?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          data?: string
          employee_id?: string
          entrada?: string | null
          horas_extras?: number | null
          horas_trabalhadas?: number | null
          id?: string
          obs?: string | null
          saida?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          company_id: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          obrigatorio: boolean
          periodicidade_meses: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          obrigatorio?: boolean
          periodicidade_meses?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          obrigatorio?: boolean
          periodicidade_meses?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_setup_needed: { Args: never; Returns: boolean }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _company_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin_empresa"
        | "usuario_almox"
        | "solicitante"
        | "logistica"
        | "rh"
        | "financeiro"
        | "visualizador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "admin_empresa",
        "usuario_almox",
        "solicitante",
        "logistica",
        "rh",
        "financeiro",
        "visualizador",
      ],
    },
  },
} as const
