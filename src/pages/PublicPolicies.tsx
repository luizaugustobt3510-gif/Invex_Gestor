import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PublicCommerceFooter } from '@/components/PublicCommerceFooter';
import { SELLER_NAME, SUPPORT_URL, PADDLE_BUYER_TERMS, PADDLE_REFUND_POLICY } from '@/lib/publicCommerce';
import invexLogo from '@/assets/invex-logo.png';

type PolicyKind = 'terms' | 'privacy' | 'refund';
const content: Record<PolicyKind, { title: string; sections: { title: string; text: string }[] }> = {
  terms: {
    title: 'Termos de uso',
    sections: [
      { title: '1. Vendedor e aceitação', text: 'O Invex Rotina é um serviço de organização pessoal de tarefas, hábitos, metas e revisões fornecido por Invex Gestor. Ao utilizar o serviço de forma continuada, você concorda com estes termos e contrata com Invex Gestor. Você deve ter capacidade legal para contratar ou autorização de seu responsável; ao representar uma organização, deve ter autoridade para vinculá-la.' },
      { title: '2. Conta e acesso', text: 'Mantenha seus dados corretos e suas credenciais confidenciais. Você é responsável pelas atividades de sua conta. O acesso é pessoal, limitado, não exclusivo e não transferível, conforme o plano escolhido. Uma conta do Invex Rotina não concede acesso aos módulos empresariais do Invex Gestor.' },
      { title: '3. Uso permitido', text: 'É proibido usar o serviço para fins ilícitos, fraude, spam ou violação de direitos autorais e outros direitos de terceiros. Também são proibidos malware, interferência na segurança, sondagem não autorizada, scraping, tentativas de acessar dados de outras pessoas, contornar limites técnicos, revender o serviço ou realizar engenharia reversa fora das hipóteses permitidas por lei.' },
      { title: '4. Propriedade intelectual e conteúdo', text: 'Invex Gestor mantém a titularidade do software, documentação, marca e demais direitos de propriedade intelectual do serviço. Você conserva os direitos sobre os conteúdos que insere e deve ter autorização para usá-los. Você concede apenas a licença necessária para armazenar e processar esse conteúdo para prestar o serviço. Reclamações de direitos podem ser enviadas pelo canal de contato abaixo; infrações graves ou reiteradas podem resultar em suspensão.' },
      { title: '5. Planos, pagamentos e assinaturas', text: 'Os recursos e preços do Invex Rotina estão na página pública de Preços e são confirmados no checkout. Assinaturas renovam conforme a periodicidade escolhida até o cancelamento. Pagamentos, faturamento, tributos, cancelamentos e procedimentos de reembolso seguem os Termos do Comprador da Paddle, disponíveis no link abaixo. O cancelamento pode ser solicitado em Perfil → Gestão do plano → Gerenciar assinatura; o acesso Premium permanece até o fim do período já pago, conforme o status da assinatura. O cancelamento não exclui automaticamente os seus dados.' },
      { title: '6. Paddle — Merchant of Record', text: 'Nosso processo de pedidos é conduzido por nosso revendedor online Paddle.com. Paddle.com é o Merchant of Record (comerciante responsável pela venda) de todos os nossos pedidos. A Paddle presta atendimento às consultas de clientes relativas à compra e administra devoluções e reembolsos. Invex Gestor presta o suporte de utilização do serviço.' },
      { title: '7. Disponibilidade e responsabilidade', text: 'Não garantimos funcionamento ininterrupto ou livre de erros. Podemos realizar manutenção e atualizar o serviço. Ferramentas de planejamento e indicadores não substituem aconselhamento médico, financeiro ou outro atendimento profissional. Nada nestes termos limita direitos obrigatórios do consumidor ou responsabilidades que não possam ser excluídas por lei.' },
      { title: '8. Suspensão e encerramento', text: 'Podemos suspender ou encerrar o acesso por descumprimento material destes termos, não pagamento, risco de segurança ou fraude, ou violações graves ou reiteradas das políticas. O encerramento não afasta obrigações legais de retenção. Você pode solicitar informações sobre seus dados e seu encerramento pelo canal de contato abaixo.' },
    ],
  },
  privacy: {
    title: 'Política de privacidade',
    sections: [
      { title: '1. Quem controla seus dados', text: 'Invex Gestor é o controlador dos dados pessoais tratados para fornecer o Invex Rotina e seus canais de atendimento. Esta política abrange a conta pessoal e a navegação nas páginas públicas; o uso do Rotina não concede acesso a dados empresariais do Invex Gestor. Para solicitações de privacidade, utilize o canal de contato abaixo.' },
      { title: '2. Dados e finalidades', text: 'Tratamos nome, e-mail, identificador de conta, dados de autenticação e foto opcional para criar, proteger e personalizar sua conta. No acesso pelo Google, recebemos os dados de perfil autorizados por você. Tarefas, hábitos, marcações, metas, notas, lembretes e revisões são tratados para executar os recursos que você utiliza. Mensagens e anexos enviados ao suporte são usados para atender sua solicitação. Endereço IP, informações do dispositivo e navegador, registros de acesso, uso e erros podem ser tratados para segurança, prevenção de fraude, diagnóstico e melhoria do serviço. Identificadores de cliente e assinatura, plano, status e períodos de cobrança permitem administrar seu acesso; os dados de pagamento são tratados pela Paddle segundo sua própria política.' },
      { title: '3. Bases legais', text: 'Usamos a execução do contrato para criar a conta, oferecer os recursos e atender solicitações; interesses legítimos para proteger o serviço, prevenir fraudes e diagnosticar falhas, respeitando seus direitos; obrigação legal para cumprir deveres aplicáveis; e consentimento quando necessário para recursos opcionais, permissões de notificações ou comunicações promocionais. O consentimento pode ser retirado sem afetar o tratamento realizado anteriormente.' },
      { title: '4. Compartilhamento', text: 'Podemos compartilhar os dados necessários com prestadores de hospedagem, armazenamento, autenticação, diagnóstico e suporte; com a Paddle, Merchant of Record, para venda do produto, gestão de assinaturas, pagamentos, conformidade tributária e emissão de documentos; com assessores jurídicos e contábeis quando necessário; e com autoridades quando exigido por lei. O Google participa da autenticação quando você escolhe esse acesso. Compartilhamento com prestadores não torna seu conteúdo público.' },
      { title: '5. Retenção', text: 'Os dados da conta e o conteúdo são mantidos enquanto necessários para fornecer o serviço e atender suas solicitações. Registros de suporte e segurança são mantidos pelo tempo necessário para resolver ocorrências e proteger o serviço. Documentos relacionados a obrigações legais são retidos pelos prazos legais aplicáveis. Quando não houver necessidade ou fundamento legal para retenção, os dados serão excluídos ou anonimizados; cópias de segurança podem permanecer até seu ciclo de substituição.' },
      { title: '6. Seus direitos', text: 'Nos termos da LGPD e da legislação aplicável, você pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio ou exclusão de dados desnecessários ou tratados irregularmente, portabilidade quando aplicável, informações sobre compartilhamento e revogação de consentimento. Também pode contestar o tratamento e apresentar reclamação à ANPD. Solicitações são recebidas pelo contato abaixo e podem exigir confirmação segura de identidade; serão respondidas nos prazos legais aplicáveis.' },
      { title: '7. Segurança', text: 'Adotamos medidas técnicas e organizacionais apropriadas, incluindo transmissão criptografada, controles de acesso e restrições de acesso por usuário. Nenhum sistema é completamente imune a riscos. Proteja suas credenciais e comunique suspeitas de acesso indevido pelo canal de contato.' },
      { title: '8. Cookies e armazenamento local', text: 'O serviço utiliza cookies ou armazenamento local essenciais para sessão, autenticação, preferências e funcionamento de recursos. O navegador permite limpar ou bloquear esses dados, o que pode encerrar sua sessão ou afetar funcionalidades. Eventuais cookies de análise ou marketing não essenciais dependerão de consentimento quando exigido por lei. Você pode gerenciar permissões de notificações nas configurações do navegador ou dispositivo; elas são opcionais.' },
      { title: '9. Transferências internacionais e atualizações', text: 'Prestadores de infraestrutura, autenticação e a Paddle podem tratar dados em outros países. Quando aplicável, adotamos os mecanismos e salvaguardas exigidos pela LGPD para transferências internacionais. Atualizações desta política serão disponibilizadas nesta página; mudanças relevantes serão comunicadas pelos canais apropriados.' },
    ],
  },
  refund: {
    title: 'Política de reembolso',
    sections: [
      { title: 'Política aplicável', text: 'As compras e assinaturas do Invex Rotina, fornecido por Invex Gestor, são processadas pela Paddle, nosso Merchant of Record. Adotamos a Política de Reembolso da Paddle, disponível no link abaixo, incluindo suas regras de solicitação, prazos e os direitos obrigatórios de consumidor aplicáveis. Esta política não restringe direitos legais de arrependimento ou outras garantias previstas em lei.' },
      { title: 'Como solicitar', text: 'Para solicitar um reembolso, acesse paddle.net e informe os dados da compra ou utilize o atendimento vinculado ao seu comprovante da Paddle. Se precisar de ajuda para localizar a compra, fale com Invex Gestor pelo canal de contato abaixo. A Paddle administra o pedido e o processamento do reembolso conforme sua política.' },
      { title: 'Cancelar uma assinatura', text: 'Cancelar a renovação e solicitar reembolso são ações distintas. Para impedir próximas renovações, abra Perfil → Gestão do plano → Gerenciar assinatura no Invex Rotina. O acesso permanece até o fim do período já pago, conforme o status da assinatura. Pedidos de reembolso devem ser feitos à Paddle e não excluem automaticamente seus dados pessoais.' },
    ],
  },
};

export function PublicPageMeta({ title }: { title: string }) {
  useEffect(() => {
    const original = document.title;
    document.title = `${title} | Invex Gestor`;
    return () => { document.title = original; };
  }, [title]);
  return null;
}

export function PublicPageLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <PublicPageMeta title={title} />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/login" aria-label="Invex Gestor — início"><img src={invexLogo} alt="Invex Gestor" className="h-10 w-auto" /></Link>
          <Button asChild variant="outline"><Link to="/rotina/entrar">Entrar no Rotina</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        {children}
        <div className="mt-12 border-t border-border pt-5 text-sm text-muted-foreground">
          <p>Vendedor: {SELLER_NAME}</p>
          <a className="inline-flex min-h-11 items-center text-primary underline underline-offset-4" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">Contato e solicitações de privacidade</a>
        </div>
        <PublicCommerceFooter />
      </main>
    </div>
  );
}

export default function PublicPolicies({ kind }: { kind: PolicyKind }) {
  const policy = content[kind];
  return (
    <PublicPageLayout title={policy.title}>
      <article className="max-w-3xl">
        <p className="mb-3 text-sm font-medium text-primary">Invex Gestor · Invex Rotina</p>
        <h1 className="text-3xl font-semibold leading-tight">{policy.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Atualizado em 30 de outubro de 2026</p>
        <div className="mt-9 space-y-8">
          {policy.sections.map(section => <section key={section.title}><h2 className="mb-3 text-lg font-semibold">{section.title}</h2><p className="text-base leading-7 text-muted-foreground">{section.text}</p></section>)}
        </div>
        {kind === 'terms' && <a className="mt-6 inline-flex min-h-11 items-center text-primary underline" href={PADDLE_BUYER_TERMS} target="_blank" rel="noopener noreferrer">Termos do Comprador da Paddle</a>}
        {kind === 'refund' && <div className="mt-6 flex flex-col items-start gap-3"><a className="text-primary underline" href={PADDLE_REFUND_POLICY} target="_blank" rel="noopener noreferrer">Política de Reembolso da Paddle</a><Button asChild><a href="https://paddle.net" target="_blank" rel="noopener noreferrer">Solicitar reembolso na Paddle</a></Button></div>}
      </article>
    </PublicPageLayout>
  );
}