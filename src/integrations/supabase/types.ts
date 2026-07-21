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
      anamnese_templates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          exam_type: string
          id: string
          is_active: boolean
          name: string
          questions: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          exam_type: string
          id?: string
          is_active?: boolean
          name: string
          questions?: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          exam_type?: string
          id?: string
          is_active?: boolean
          name?: string
          questions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnese_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      anamneses: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          exam_type: string
          id: string
          observations: string | null
          patient_id: string
          pdf_path: string | null
          responses: Json
          signature_image_url: string | null
          signature_source: string | null
          template_id: string | null
          template_name: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          exam_type: string
          id?: string
          observations?: string | null
          patient_id: string
          pdf_path?: string | null
          responses?: Json
          signature_image_url?: string | null
          signature_source?: string | null
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          exam_type?: string
          id?: string
          observations?: string | null
          patient_id?: string
          pdf_path?: string | null
          responses?: Json
          signature_image_url?: string | null
          signature_source?: string | null
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamneses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamneses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamneses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "anamnese_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      benefits: {
        Row: {
          allows_dependents: boolean
          base_value: number
          company_id: string
          cost_type: string
          created_at: string
          description: string | null
          id: string
          is_variable: boolean
          name: string
          start_date: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          allows_dependents?: boolean
          base_value?: number
          company_id: string
          cost_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_variable?: boolean
          name: string
          start_date?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          allows_dependents?: boolean
          base_value?: number
          company_id?: string
          cost_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_variable?: boolean
          name?: string
          start_date?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      benefits_monthly: {
        Row: {
          benefit_id: string
          company_cost: number
          company_id: string
          competencia: string
          created_at: string
          employee_benefit_id: string | null
          employee_cost: number
          employee_id: string
          financial_discount_id: string | null
          financial_entry_id: string | null
          id: string
          net_cost: number
        }
        Insert: {
          benefit_id: string
          company_cost?: number
          company_id: string
          competencia: string
          created_at?: string
          employee_benefit_id?: string | null
          employee_cost?: number
          employee_id: string
          financial_discount_id?: string | null
          financial_entry_id?: string | null
          id?: string
          net_cost?: number
        }
        Update: {
          benefit_id?: string
          company_cost?: number
          company_id?: string
          competencia?: string
          created_at?: string
          employee_benefit_id?: string | null
          employee_cost?: number
          employee_id?: string
          financial_discount_id?: string | null
          financial_entry_id?: string | null
          id?: string
          net_cost?: number
        }
        Relationships: []
      }
      clinic_appointments: {
        Row: {
          attendance_type: string | null
          company_id: string
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          notes: string | null
          patient_id: string | null
          professional_name: string | null
          professional_user_id: string | null
          scheduled_at: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attendance_type?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id?: string | null
          professional_name?: string | null
          professional_user_id?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attendance_type?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id?: string | null
          professional_name?: string | null
          professional_user_id?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_evolutions: {
        Row: {
          company_id: string
          content: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          patient_id: string
          patient_signature: string | null
          professional_name: string | null
          professional_signature: string | null
          signature_type: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          patient_id: string
          patient_signature?: string | null
          professional_name?: string | null
          professional_signature?: string | null
          signature_type?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          patient_id?: string
          patient_signature?: string | null
          professional_name?: string | null
          professional_signature?: string | null
          signature_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_evolutions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          auth_methods: Json
          auto_block: boolean
          cnpj: string | null
          company_type: string
          created_at: string
          grace_days: number
          id: string
          monthly_fee: number
          name: string
          next_due_date: string | null
          plan_type: string
          status: string
          subscription_status: string
          updated_at: string
        }
        Insert: {
          auth_methods?: Json
          auto_block?: boolean
          cnpj?: string | null
          company_type?: string
          created_at?: string
          grace_days?: number
          id?: string
          monthly_fee?: number
          name: string
          next_due_date?: string | null
          plan_type?: string
          status?: string
          subscription_status?: string
          updated_at?: string
        }
        Update: {
          auth_methods?: Json
          auto_block?: boolean
          cnpj?: string | null
          company_type?: string
          created_at?: string
          grace_days?: number
          id?: string
          monthly_fee?: number
          name?: string
          next_due_date?: string | null
          plan_type?: string
          status?: string
          subscription_status?: string
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
      company_settings: {
        Row: {
          company_id: string
          created_at: string
          settings: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
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
      curva_abc_data: {
        Row: {
          company_id: string
          config: Json
          id: string
          raw_rows: Json
          results: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          config?: Json
          id?: string
          raw_rows?: Json
          results?: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          config?: Json
          id?: string
          raw_rows?: Json
          results?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curva_abc_data_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          modules: Json
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          modules?: Json
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          modules?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      employee_benefits: {
        Row: {
          benefit_id: string
          company_id: string
          created_at: string
          custom_value: number | null
          dependents_count: number
          employee_id: string
          end_date: string | null
          id: string
          observacoes: string | null
          payroll_discount: number
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          benefit_id: string
          company_id: string
          created_at?: string
          custom_value?: number | null
          dependents_count?: number
          employee_id: string
          end_date?: string | null
          id?: string
          observacoes?: string | null
          payroll_discount?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          benefit_id?: string
          company_id?: string
          created_at?: string
          custom_value?: number | null
          dependents_count?: number
          employee_id?: string
          end_date?: string | null
          id?: string
          observacoes?: string | null
          payroll_discount?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
          sexo: string | null
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
          sexo?: string | null
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
          sexo?: string | null
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
      evolution_quick_messages: {
        Row: {
          company_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      fitness_achievements: {
        Row: {
          codigo: string
          created_at: string
          descricao: string
          icone: string
          id: string
          nome: string
          raridade: string
          xp_recompensa: number
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao?: string
          icone?: string
          id?: string
          nome: string
          raridade?: string
          xp_recompensa?: number
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string
          icone?: string
          id?: string
          nome?: string
          raridade?: string
          xp_recompensa?: number
        }
        Relationships: []
      }
      fitness_daily_logs: {
        Row: {
          agua_ml: number | null
          company_id: string
          created_at: string
          data: string
          humor: string | null
          id: string
          peso: number | null
          sono_horas: number | null
          treino_feito: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agua_ml?: number | null
          company_id: string
          created_at?: string
          data?: string
          humor?: string | null
          id?: string
          peso?: number | null
          sono_horas?: number | null
          treino_feito?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agua_ml?: number | null
          company_id?: string
          created_at?: string
          data?: string
          humor?: string | null
          id?: string
          peso?: number | null
          sono_horas?: number | null
          treino_feito?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fitness_emagrecimento_logs: {
        Row: {
          calorias: number
          carboidratos: number
          created_at: string
          fibras: number
          gorduras: number
          id: string
          peso: number
          proteinas: number
          user_id: string
        }
        Insert: {
          calorias: number
          carboidratos: number
          created_at?: string
          fibras: number
          gorduras: number
          id?: string
          peso: number
          proteinas: number
          user_id: string
        }
        Update: {
          calorias?: number
          carboidratos?: number
          created_at?: string
          fibras?: number
          gorduras?: number
          id?: string
          peso?: number
          proteinas?: number
          user_id?: string
        }
        Relationships: []
      }
      fitness_friends: {
        Row: {
          created_at: string
          friend_user_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_user_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_user_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      fitness_meal_logs: {
        Row: {
          alimento: string
          calorias: number
          carboidratos: number
          created_at: string
          fibras: number
          gorduras: number
          id: string
          log_date: string
          proteinas: number
          quantidade_g: number
          refeicao: string
          user_id: string
        }
        Insert: {
          alimento: string
          calorias?: number
          carboidratos?: number
          created_at?: string
          fibras?: number
          gorduras?: number
          id?: string
          log_date?: string
          proteinas?: number
          quantidade_g?: number
          refeicao: string
          user_id: string
        }
        Update: {
          alimento?: string
          calorias?: number
          carboidratos?: number
          created_at?: string
          fibras?: number
          gorduras?: number
          id?: string
          log_date?: string
          proteinas?: number
          quantidade_g?: number
          refeicao?: string
          user_id?: string
        }
        Relationships: []
      }
      fitness_measurements: {
        Row: {
          braco: number | null
          cintura: number | null
          coxa: number | null
          created_at: string
          data: string
          foto_url: string | null
          id: string
          observacoes: string | null
          panturrilha: number | null
          peitoral: number | null
          percentual_gordura: number | null
          peso: number | null
          quadril: number | null
          user_id: string
        }
        Insert: {
          braco?: number | null
          cintura?: number | null
          coxa?: number | null
          created_at?: string
          data?: string
          foto_url?: string | null
          id?: string
          observacoes?: string | null
          panturrilha?: number | null
          peitoral?: number | null
          percentual_gordura?: number | null
          peso?: number | null
          quadril?: number | null
          user_id: string
        }
        Update: {
          braco?: number | null
          cintura?: number | null
          coxa?: number | null
          created_at?: string
          data?: string
          foto_url?: string | null
          id?: string
          observacoes?: string | null
          panturrilha?: number | null
          peitoral?: number | null
          percentual_gordura?: number | null
          peso?: number | null
          quadril?: number | null
          user_id?: string
        }
        Relationships: []
      }
      fitness_profiles: {
        Row: {
          agua_data: string | null
          agua_hoje_ml: number | null
          agua_meta_ml: number | null
          altura: number | null
          avatar_id: string
          company_id: string
          created_at: string
          foto_url: string | null
          humor: string | null
          id: string
          last_workout_date: string | null
          mascote_nome: string
          meta_freq_semanal: number | null
          meta_peso: number | null
          meta_sono_horas: number | null
          nivel: number
          nome: string
          onboarding_completo: boolean
          peso_atual: number | null
          sono_horas: number | null
          streak_dias: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          agua_data?: string | null
          agua_hoje_ml?: number | null
          agua_meta_ml?: number | null
          altura?: number | null
          avatar_id?: string
          company_id: string
          created_at?: string
          foto_url?: string | null
          humor?: string | null
          id?: string
          last_workout_date?: string | null
          mascote_nome?: string
          meta_freq_semanal?: number | null
          meta_peso?: number | null
          meta_sono_horas?: number | null
          nivel?: number
          nome?: string
          onboarding_completo?: boolean
          peso_atual?: number | null
          sono_horas?: number | null
          streak_dias?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          agua_data?: string | null
          agua_hoje_ml?: number | null
          agua_meta_ml?: number | null
          altura?: number | null
          avatar_id?: string
          company_id?: string
          created_at?: string
          foto_url?: string | null
          humor?: string | null
          id?: string
          last_workout_date?: string | null
          mascote_nome?: string
          meta_freq_semanal?: number | null
          meta_peso?: number | null
          meta_sono_horas?: number | null
          nivel?: number
          nome?: string
          onboarding_completo?: boolean
          peso_atual?: number | null
          sono_horas?: number | null
          streak_dias?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      fitness_user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitness_user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "fitness_achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_workout_exercises: {
        Row: {
          calorias: number | null
          carga_kg: number | null
          created_at: string
          descanso_seg: number | null
          distancia_km: number | null
          duracao_min: number | null
          id: string
          intensidade: string | null
          midia_url: string | null
          nome: string
          observacoes: string | null
          ordem: number
          repeticoes: string
          series: number
          tipo: string
          user_id: string
          workout_id: string
        }
        Insert: {
          calorias?: number | null
          carga_kg?: number | null
          created_at?: string
          descanso_seg?: number | null
          distancia_km?: number | null
          duracao_min?: number | null
          id?: string
          intensidade?: string | null
          midia_url?: string | null
          nome: string
          observacoes?: string | null
          ordem?: number
          repeticoes?: string
          series?: number
          tipo?: string
          user_id: string
          workout_id: string
        }
        Update: {
          calorias?: number | null
          carga_kg?: number | null
          created_at?: string
          descanso_seg?: number | null
          distancia_km?: number | null
          duracao_min?: number | null
          id?: string
          intensidade?: string | null
          midia_url?: string | null
          nome?: string
          observacoes?: string | null
          ordem?: number
          repeticoes?: string
          series?: number
          tipo?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitness_workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "fitness_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_workout_logs: {
        Row: {
          created_at: string
          data_treino: string
          duracao_min: number | null
          exercicios: Json | null
          id: string
          observacoes: string | null
          user_id: string
          workout_id: string | null
          xp_ganho: number | null
        }
        Insert: {
          created_at?: string
          data_treino?: string
          duracao_min?: number | null
          exercicios?: Json | null
          id?: string
          observacoes?: string | null
          user_id: string
          workout_id?: string | null
          xp_ganho?: number | null
        }
        Update: {
          created_at?: string
          data_treino?: string
          duracao_min?: number | null
          exercicios?: Json | null
          id?: string
          observacoes?: string | null
          user_id?: string
          workout_id?: string | null
          xp_ganho?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_workout_logs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "fitness_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_workouts: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          dias_semana: number[] | null
          expires_at: string | null
          grupo_muscular: string | null
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          dias_semana?: number[] | null
          expires_at?: string | null
          grupo_muscular?: string | null
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          dias_semana?: number[] | null
          expires_at?: string | null
          grupo_muscular?: string | null
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hr_appointments: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          data_evento: string
          descricao: string | null
          hora_evento: string | null
          id: string
          notificar: boolean
          titulo: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          data_evento: string
          descricao?: string | null
          hora_evento?: string | null
          id?: string
          notificar?: boolean
          titulo: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          data_evento?: string
          descricao?: string | null
          hora_evento?: string | null
          id?: string
          notificar?: boolean
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_appointments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_attachments: {
        Row: {
          arquivo_url: string
          company_id: string
          created_at: string
          id: string
          maintenance_record_id: string
          nome_arquivo: string
          tipo_documento: string
          uploaded_by: string
          uploaded_by_nome: string
        }
        Insert: {
          arquivo_url: string
          company_id: string
          created_at?: string
          id?: string
          maintenance_record_id: string
          nome_arquivo: string
          tipo_documento?: string
          uploaded_by: string
          uploaded_by_nome?: string
        }
        Update: {
          arquivo_url?: string
          company_id?: string
          created_at?: string
          id?: string
          maintenance_record_id?: string
          nome_arquivo?: string
          tipo_documento?: string
          uploaded_by?: string
          uploaded_by_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_attachments_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_history: {
        Row: {
          arquivo_url: string | null
          company_id: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          data_evento: string
          descricao: string
          id: string
          maintenance_record_id: string
          tipo: string
          usuario_id: string
          usuario_nome: string
        }
        Insert: {
          arquivo_url?: string | null
          company_id: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          data_evento?: string
          descricao?: string
          id?: string
          maintenance_record_id: string
          tipo?: string
          usuario_id: string
          usuario_nome?: string
        }
        Update: {
          arquivo_url?: string | null
          company_id?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          data_evento?: string
          descricao?: string
          id?: string
          maintenance_record_id?: string
          tipo?: string
          usuario_id?: string
          usuario_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_history_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          andar: string | null
          company_id: string
          controle: string
          created_at: string
          created_by: string
          data_validade: string
          empresa_prestadora: string
          equipamento: string
          frequencia: string
          id: string
          manutencao_corretiva: string | null
          manutencao_preventiva: string
          observacoes: string | null
          parent_id: string | null
          sala: string | null
          setor: string | null
          updated_at: string
        }
        Insert: {
          andar?: string | null
          company_id: string
          controle?: string
          created_at?: string
          created_by: string
          data_validade: string
          empresa_prestadora?: string
          equipamento: string
          frequencia?: string
          id?: string
          manutencao_corretiva?: string | null
          manutencao_preventiva: string
          observacoes?: string | null
          parent_id?: string | null
          sala?: string | null
          setor?: string | null
          updated_at?: string
        }
        Update: {
          andar?: string | null
          company_id?: string
          controle?: string
          created_at?: string
          created_by?: string
          data_validade?: string
          empresa_prestadora?: string
          equipamento?: string
          frequencia?: string
          id?: string
          manutencao_corretiva?: string | null
          manutencao_preventiva?: string
          observacoes?: string | null
          parent_id?: string | null
          sala?: string | null
          setor?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_service_orders: {
        Row: {
          company_id: string
          created_at: string
          data_conclusao: string | null
          data_inicio_atendimento: string | null
          data_solicitacao: string
          descricao: string
          empresa_prestadora: string
          equipamento: string
          id: string
          observacoes: string | null
          prioridade: string
          solicitante_id: string
          solicitante_nome: string
          status: string
          tipo_servico: string
          updated_at: string
          valor: number
        }
        Insert: {
          company_id: string
          created_at?: string
          data_conclusao?: string | null
          data_inicio_atendimento?: string | null
          data_solicitacao?: string
          descricao?: string
          empresa_prestadora?: string
          equipamento: string
          id?: string
          observacoes?: string | null
          prioridade?: string
          solicitante_id: string
          solicitante_nome?: string
          status?: string
          tipo_servico?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          data_conclusao?: string | null
          data_inicio_atendimento?: string | null
          data_solicitacao?: string
          descricao?: string
          empresa_prestadora?: string
          equipamento?: string
          id?: string
          observacoes?: string | null
          prioridade?: string
          solicitante_id?: string
          solicitante_nome?: string
          status?: string
          tipo_servico?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_service_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      material_dispensations: {
        Row: {
          billing_status: string
          company_id: string
          created_at: string
          destino_sector_id: string | null
          destino_sector_nome: string | null
          destino_tipo: string
          exam_type: string | null
          id: string
          material_codigo: string | null
          material_id: string | null
          material_nome: string | null
          observacoes: string | null
          patient_consumption_id: string | null
          patient_id: string | null
          patient_name: string | null
          quantidade: number
          unidade: string | null
          updated_at: string
          user_id: string
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          billing_status?: string
          company_id: string
          created_at?: string
          destino_sector_id?: string | null
          destino_sector_nome?: string | null
          destino_tipo?: string
          exam_type?: string | null
          id?: string
          material_codigo?: string | null
          material_id?: string | null
          material_nome?: string | null
          observacoes?: string | null
          patient_consumption_id?: string | null
          patient_id?: string | null
          patient_name?: string | null
          quantidade?: number
          unidade?: string | null
          updated_at?: string
          user_id: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          billing_status?: string
          company_id?: string
          created_at?: string
          destino_sector_id?: string | null
          destino_sector_nome?: string | null
          destino_tipo?: string
          exam_type?: string | null
          id?: string
          material_codigo?: string | null
          material_id?: string | null
          material_nome?: string | null
          observacoes?: string | null
          patient_consumption_id?: string | null
          patient_id?: string | null
          patient_name?: string | null
          quantidade?: number
          unidade?: string | null
          updated_at?: string
          user_id?: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "material_dispensations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_dispensations_destino_sector_id_fkey"
            columns: ["destino_sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_dispensations_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_dispensations_patient_consumption_fkey"
            columns: ["patient_consumption_id"]
            isOneToOne: false
            referencedRelation: "patient_consumptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_dispensations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
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
          preco_unitario: number | null
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
          preco_unitario?: number | null
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
          preco_unitario?: number | null
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
      medical_record_attachments: {
        Row: {
          company_id: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          record_id: string
          size_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          record_id: string
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          record_id?: string
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_record_attachments_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          attendance_type: string | null
          clinical_evolution: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          observations: string | null
          patient_id: string
          professional_name: string | null
          professional_user_id: string | null
          record_date: string
          record_time: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attendance_type?: string | null
          clinical_evolution?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          observations?: string | null
          patient_id: string
          professional_name?: string | null
          professional_user_id?: string | null
          record_date?: string
          record_time?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attendance_type?: string | null
          clinical_evolution?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          observations?: string | null
          patient_id?: string
          professional_name?: string | null
          professional_user_id?: string | null
          record_date?: string
          record_time?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
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
      patient_consumptions: {
        Row: {
          appointment_id: string | null
          company_id: string
          created_at: string
          dispensation_id: string | null
          evolution_id: string | null
          exam_type: string | null
          id: string
          material_id: string
          observacoes: string | null
          patient_id: string
          professional_user_id: string | null
          quantidade: number
          sector_id: string
          updated_at: string
          valor_unitario: number | null
        }
        Insert: {
          appointment_id?: string | null
          company_id: string
          created_at?: string
          dispensation_id?: string | null
          evolution_id?: string | null
          exam_type?: string | null
          id?: string
          material_id: string
          observacoes?: string | null
          patient_id: string
          professional_user_id?: string | null
          quantidade: number
          sector_id: string
          updated_at?: string
          valor_unitario?: number | null
        }
        Update: {
          appointment_id?: string | null
          company_id?: string
          created_at?: string
          dispensation_id?: string | null
          evolution_id?: string | null
          exam_type?: string | null
          id?: string
          material_id?: string
          observacoes?: string | null
          patient_id?: string
          professional_user_id?: string | null
          quantidade?: number
          sector_id?: string
          updated_at?: string
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_consumptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "clinic_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consumptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consumptions_dispensation_id_fkey"
            columns: ["dispensation_id"]
            isOneToOne: false
            referencedRelation: "material_dispensations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consumptions_evolution_id_fkey"
            columns: ["evolution_id"]
            isOneToOne: false
            referencedRelation: "clinical_evolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consumptions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consumptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_consumptions_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          birth_date: string | null
          company_id: string
          cpf: string | null
          created_at: string
          created_by: string | null
          email: string | null
          gender: string | null
          height_cm: number | null
          id: string
          is_active: boolean
          nome: string
          notes: string | null
          phone: string | null
          updated_at: string
          updated_by: string | null
          weight_kg: number | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          company_id: string
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          is_active?: boolean
          nome: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
          weight_kg?: number | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          company_id?: string
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          is_active?: boolean
          nome?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      payroll_config: {
        Row: {
          company_id: string
          competencia: string
          created_at: string
          fgts_rate: number
          id: string
          inss_manual_rate: number
          inss_mode: string
          inss_patronal_rate: number
          irrf_manual_rate: number
          irrf_mode: string
          other_discounts: number
          rat_rate: number
          sistema_s_rate: number
          updated_at: string
          vt_mode: string
          vt_value: number
        }
        Insert: {
          company_id: string
          competencia: string
          created_at?: string
          fgts_rate?: number
          id?: string
          inss_manual_rate?: number
          inss_mode?: string
          inss_patronal_rate?: number
          irrf_manual_rate?: number
          irrf_mode?: string
          other_discounts?: number
          rat_rate?: number
          sistema_s_rate?: number
          updated_at?: string
          vt_mode?: string
          vt_value?: number
        }
        Update: {
          company_id?: string
          competencia?: string
          created_at?: string
          fgts_rate?: number
          id?: string
          inss_manual_rate?: number
          inss_mode?: string
          inss_patronal_rate?: number
          irrf_manual_rate?: number
          irrf_mode?: string
          other_discounts?: number
          rat_rate?: number
          sistema_s_rate?: number
          updated_at?: string
          vt_mode?: string
          vt_value?: number
        }
        Relationships: []
      }
      payroll_events: {
        Row: {
          company_id: string
          competencia: string
          created_at: string
          description: string
          employee_id: string
          id: string
          is_percent: boolean
          type: string
          value: number
        }
        Insert: {
          company_id: string
          competencia: string
          created_at?: string
          description?: string
          employee_id: string
          id?: string
          is_percent?: boolean
          type: string
          value?: number
        }
        Update: {
          company_id?: string
          competencia?: string
          created_at?: string
          description?: string
          employee_id?: string
          id?: string
          is_percent?: boolean
          type?: string
          value?: number
        }
        Relationships: []
      }
      payroll_forecast: {
        Row: {
          base_salary: number
          benefits_company: number
          benefits_employee: number
          benefits_total: number
          bonus_total: number
          company_cost: number
          company_id: string
          competencia: string
          created_at: string
          dependents: number
          employee_id: string
          encargos_patronais: number
          faltas_value: number
          financial_entry_id: string | null
          generated_at: string | null
          gross_salary: number
          id: string
          inss_value: number
          irrf_value: number
          net_salary: number
          other_discounts: number
          pensao_value: number
          status: string
          total_discounts: number
          updated_at: string
          vt_value: number
        }
        Insert: {
          base_salary?: number
          benefits_company?: number
          benefits_employee?: number
          benefits_total?: number
          bonus_total?: number
          company_cost?: number
          company_id: string
          competencia: string
          created_at?: string
          dependents?: number
          employee_id: string
          encargos_patronais?: number
          faltas_value?: number
          financial_entry_id?: string | null
          generated_at?: string | null
          gross_salary?: number
          id?: string
          inss_value?: number
          irrf_value?: number
          net_salary?: number
          other_discounts?: number
          pensao_value?: number
          status?: string
          total_discounts?: number
          updated_at?: string
          vt_value?: number
        }
        Update: {
          base_salary?: number
          benefits_company?: number
          benefits_employee?: number
          benefits_total?: number
          bonus_total?: number
          company_cost?: number
          company_id?: string
          competencia?: string
          created_at?: string
          dependents?: number
          employee_id?: string
          encargos_patronais?: number
          faltas_value?: number
          financial_entry_id?: string | null
          generated_at?: string | null
          gross_salary?: number
          id?: string
          inss_value?: number
          irrf_value?: number
          net_salary?: number
          other_discounts?: number
          pensao_value?: number
          status?: string
          total_discounts?: number
          updated_at?: string
          vt_value?: number
        }
        Relationships: []
      }
      payroll_tax_brackets: {
        Row: {
          company_id: string | null
          created_at: string
          deduction: number
          dependent_deduction: number
          id: string
          max_value: number | null
          min_value: number
          rate: number
          tax_type: string
          updated_at: string
          year: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          deduction?: number
          dependent_deduction?: number
          id?: string
          max_value?: number | null
          min_value?: number
          rate?: number
          tax_type: string
          updated_at?: string
          year?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          deduction?: number
          dependent_deduction?: number
          id?: string
          max_value?: number | null
          min_value?: number
          rate?: number
          tax_type?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
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
          accepted_invite_at: string | null
          cargo: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          data_nascimento: string | null
          email: string
          email_verified: boolean
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          invited_at: string | null
          last_login: string | null
          nome: string
          provider: string
          provider_id: string | null
          sexo: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_invite_at?: string | null
          cargo?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email: string
          email_verified?: boolean
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_at?: string | null
          last_login?: string | null
          nome: string
          provider?: string
          provider_id?: string | null
          sexo?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_invite_at?: string | null
          cargo?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email?: string
          email_verified?: boolean
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_at?: string | null
          last_login?: string | null
          nome?: string
          provider?: string
          provider_id?: string | null
          sexo?: string | null
          telefone?: string | null
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
      role_module_permissions: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          module_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          module_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          module_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_module_permissions_company_id_fkey"
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
      sale_items: {
        Row: {
          company_id: string
          created_at: string
          id: string
          material_id: string
          preco_unitario: number
          quantidade: number
          sale_id: string
          subtotal: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          material_id: string
          preco_unitario?: number
          quantidade?: number
          sale_id: string
          subtotal?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          material_id?: string
          preco_unitario?: number
          quantidade?: number
          sale_id?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          company_id: string
          created_at: string
          desconto: number
          desconto_tipo: string
          forma_pagamento: string
          id: string
          observacoes: string | null
          status: string
          updated_at: string
          user_id: string
          valor_total: number
        }
        Insert: {
          company_id: string
          created_at?: string
          desconto?: number
          desconto_tipo?: string
          forma_pagamento?: string
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valor_total?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          desconto?: number
          desconto_tipo?: string
          forma_pagamento?: string
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_stock: {
        Row: {
          company_id: string
          created_at: string
          id: string
          material_id: string
          quantidade: number
          sector_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          material_id: string
          quantidade?: number
          sector_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          material_id?: string
          quantidade?: number
          sector_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sector_stock_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_stock_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_stock_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
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
      stock_access_grants: {
        Row: {
          can_read: boolean
          can_write: boolean
          company_id: string
          created_at: string
          from_sector_id: string | null
          granted_by: string | null
          id: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          can_read?: boolean
          can_write?: boolean
          company_id: string
          created_at?: string
          from_sector_id?: string | null
          granted_by?: string | null
          id?: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          can_read?: boolean
          can_write?: boolean
          company_id?: string
          created_at?: string
          from_sector_id?: string | null
          granted_by?: string | null
          id?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_access_grants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_access_grants_from_sector_id_fkey"
            columns: ["from_sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
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
          patient_consumption_id: string | null
          quantidade: number
          request_id: string | null
          sector_id: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          material_id: string
          obs?: string | null
          patient_consumption_id?: string | null
          quantidade: number
          request_id?: string | null
          sector_id?: string | null
          tipo: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          material_id?: string
          obs?: string | null
          patient_consumption_id?: string | null
          quantidade?: number
          request_id?: string | null
          sector_id?: string | null
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
          {
            foreignKeyName: "stock_movements_patient_consumption_fkey"
            columns: ["patient_consumption_id"]
            isOneToOne: false
            referencedRelation: "patient_consumptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "material_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          due_date: string
          id: string
          notes: string | null
          payment_date: string | null
          registered_by: string | null
          registered_by_name: string | null
          status: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          registered_by?: string | null
          registered_by_name?: string | null
          status?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          registered_by?: string | null
          registered_by_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_evaluations: {
        Row: {
          avaliador_id: string
          comentario: string | null
          company_id: string
          created_at: string
          id: string
          nota: number
          supplier_id: string
        }
        Insert: {
          avaliador_id: string
          comentario?: string | null
          company_id: string
          created_at?: string
          id?: string
          nota?: number
          supplier_id: string
        }
        Update: {
          avaliador_id?: string
          comentario?: string | null
          company_id?: string
          created_at?: string
          id?: string
          nota?: number
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_evaluations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_evaluations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          cnpj: string | null
          company_id: string
          created_at: string
          id: string
          nome: string
          nota_qualidade: number
          observacoes: string | null
          prazo_medio_dias: number
          preco_medio: number
          tipo_material: string
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          company_id: string
          created_at?: string
          id?: string
          nome: string
          nota_qualidade?: number
          observacoes?: string | null
          prazo_medio_dias?: number
          preco_medio?: number
          tipo_material?: string
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          company_id?: string
          created_at?: string
          id?: string
          nome?: string
          nota_qualidade?: number
          observacoes?: string | null
          prazo_medio_dias?: number
          preco_medio?: number
          tipo_material?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      system_updates: {
        Row: {
          correcoes: Json
          created_at: string
          created_by: string | null
          data_atualizacao: string
          descricao: string
          id: string
          novas_funcionalidades: Json
          status: string
          titulo: string
          updated_at: string
          versao: string
        }
        Insert: {
          correcoes?: Json
          created_at?: string
          created_by?: string | null
          data_atualizacao?: string
          descricao?: string
          id?: string
          novas_funcionalidades?: Json
          status?: string
          titulo: string
          updated_at?: string
          versao: string
        }
        Update: {
          correcoes?: Json
          created_at?: string
          created_by?: string | null
          data_atualizacao?: string
          descricao?: string
          id?: string
          novas_funcionalidades?: Json
          status?: string
          titulo?: string
          updated_at?: string
          versao?: string
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
      user_module_permissions: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          module_key: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          module_key: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          module_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_permissions_company_id_fkey"
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
      user_signatures: {
        Row: {
          company_id: string
          created_at: string
          credencial: string | null
          id: string
          image_url: string
          is_default: boolean
          nome: string
          sector_id: string | null
          sector_nome: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          credencial?: string | null
          id?: string
          image_url: string
          is_default?: boolean
          nome: string
          sector_id?: string | null
          sector_nome?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          credencial?: string | null
          id?: string
          image_url?: string
          is_default?: boolean
          nome?: string
          sector_id?: string | null
          sector_nome?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_signatures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_signatures_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_update_views: {
        Row: {
          id: string
          update_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          update_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          update_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_update_views_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "system_updates"
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
      deliver_material_request: {
        Args: { _request_id: string; _sector_id?: string }
        Returns: string
      }
      evaluate_subscription_status: {
        Args: { _company_id: string }
        Returns: string
      }
      get_auth_methods_for_email: { Args: { _email: string }; Returns: Json }
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
      has_role_in_company: {
        Args: {
          _company_id: string
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
      register_subscription_payment: {
        Args: {
          _amount: number
          _company_id: string
          _notes?: string
          _payment_date: string
        }
        Returns: string
      }
      role_has_module: {
        Args: { _company_id: string; _module_key: string; _user_id: string }
        Returns: boolean
      }
      user_can_write_module: {
        Args: { _company_id: string; _module_key: string; _user_id: string }
        Returns: boolean
      }
      user_has_domain_access: {
        Args: { _company_id: string; _module_key: string; _user_id: string }
        Returns: boolean
      }
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
        | "manutencao"
        | "fitness_user"
        | "clinica"
        | "enfermagem"
        | "enfermeiro"
        | "recepcionista"
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
        "manutencao",
        "fitness_user",
        "clinica",
        "enfermagem",
        "enfermeiro",
        "recepcionista",
      ],
    },
  },
} as const
