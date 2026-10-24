CREATE TABLE public.support_tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  categoria text NOT NULL DEFAULT 'Geral',
  passos text[] NOT NULL DEFAULT '{}',
  ordem int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tutorials TO authenticated;
GRANT ALL ON public.support_tutorials TO service_role;
ALTER TABLE public.support_tutorials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tut read" ON public.support_tutorials FOR SELECT TO authenticated USING (is_active OR public.is_super_admin(auth.uid()));
CREATE POLICY "tut write" ON public.support_tutorials FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_support_tutorials_updated BEFORE UPDATE ON public.support_tutorials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  user_name text,
  company_name text,
  assunto text NOT NULL,
  status text NOT NULL DEFAULT 'aberto',
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tk read" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "tk insert" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'aberto');
CREATE POLICY "tk update" ON public.support_tickets FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_super_admin(auth.uid())) WITH CHECK (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_support_tickets_updated BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  from_support boolean NOT NULL DEFAULT false,
  mensagem text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg read" ON public.support_messages FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()));
CREATE POLICY "msg insert" ON public.support_messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND (
    (public.is_super_admin(auth.uid()))
    OR (from_support = false AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid() AND t.status = 'aberto'))));
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

INSERT INTO public.support_tutorials (titulo, categoria, ordem, passos) VALUES
('Como fazer uma anamnese','Clínica',1, ARRAY['No menu, abra Anamnese Digital → Nova Anamnese.','Escolha o paciente e o modelo de anamnese.','Responda as perguntas; use "Pular" para as que não se aplicam.','Na revisão, confira as respostas e toque em uma para corrigir.','Clique em Salvar (guarda sem baixar) ou Finalizar (salva e baixa o PDF).']),
('Juntar dois exames no mesmo PDF','Clínica',2, ARRAY['Na tela de revisão da anamnese, clique em "+ Adicionar outro exame".','Escolha o outro modelo e marque as perguntas que quer usar.','Responda as novas perguntas e volte à revisão.','Finalize: o PDF sai com os dois exames juntos.']),
('Editar uma anamnese pronta ou adicionar receita','Clínica',3, ARRAY['Abra Pacientes e entre na ficha do paciente.','Na anamnese desejada, clique em Editar para abrir a revisão.','Ajuste e clique em Finalizar revisão para regerar o PDF.','Para incluir receita, use o botão "Adicionar receita".']),
('Cadastrar paciente','Clínica',4, ARRAY['Abra Pacientes → Novo paciente.','Preencha nome, nascimento e contato (nome da mãe é opcional).','Salve. O paciente já aparece na busca por nome.']),
('Criar mapa anatômico','Clínica',5, ARRAY['Abra Anamnese Digital → Regiões Anatômicas → Mapas anatômicos.','Envie a imagem e clique em "Adicionar região".','Clique nos pontos ao redor da área, escolha a região e a cor.','Clique em Salvar área. Use o lápis para editar depois.']),
('Cadastrar assinatura','Clínica',6, ARRAY['Abra Assinaturas no menu.','Clique em Nova assinatura e escolha Médico ou Técnico.','Desenhe ou envie a imagem da assinatura.','Para técnicos, escolha o usuário dono da assinatura e salve.']),
('Solicitar materiais','Logística',7, ARRAY['Abra Solicitar Material.','Busque o item, informe a quantidade e o setor.','Envie a solicitação. A logística aprova e entrega.']),
('Gerar ordem de compra','Logística',8, ARRAY['Abra Gerar OC.','Escolha o fornecedor e adicione os itens.','Salve; ao receber, confirme a entrada em Gerenciar OC para somar ao estoque e lançar a despesa.']),
('Lançar entradas e saídas financeiras','Financeiro',9, ARRAY['Abra Financeiro → Lançamentos.','Clique em Novo lançamento e escolha Receita ou Despesa.','Informe valor, vencimento e categoria e salve.','Para vários de uma vez, use Financeiro → Importar com o modelo em Excel.']),
('Criar usuário','Administração',10, ARRAY['Abra Gestão de Usuários → Novo Usuário.','Escolha entrar por E-mail ou Nome de usuário.','Selecione o perfil; os módulos liberados aparecem abaixo.','Salve. Para admin de setor, use Setores → Equipe.']);