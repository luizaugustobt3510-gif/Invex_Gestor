# Mapas anatômicos configuráveis

## Objetivo
Substituir o crânio geométrico atual por imagens anatômicas enviadas pelo administrador, com áreas clicáveis desenhadas manualmente e seleção múltipla na anamnese, preservando o cadastro atual de regiões.

## Alterações no banco e armazenamento
- Criar a tabela `anatomical_maps` para nome, categoria, vista, caminho da imagem, dimensões, ordem e estado ativo, sempre vinculada à empresa.
- Criar a tabela `anatomical_map_regions` para vincular cada mapa às regiões já existentes e armazenar o polígono em coordenadas percentuais.
- Manter `anatomical_regions` sem remoções ou mudanças incompatíveis; os novos polígonos apenas referenciam seus registros.
- Criar um armazenamento privado `anatomical-maps`, organizado por pasta da empresa.
- Aplicar leitura a membros legítimos da empresa e criação/edição/exclusão somente a administradores da mesma empresa, tanto nas tabelas quanto nas imagens.
- Conceder apenas os acessos necessários aos papéis autenticado e de serviço; nenhuma permissão ou política existente será removida.

## Editor administrativo
- Adicionar “Mapas anatômicos” à tela atual de Regiões Anatômicas.
- Permitir criar/editar mapa, definir nome, categoria, vista, ordem, ativo e enviar/substituir imagem.
- Exibir a imagem em um editor responsivo; “Adicionar região” inicia a marcação por cliques.
- Fechar o polígono, escolher uma região já cadastrada ou criar seus dados, mover vértices, editar vínculo, excluir área e salvar.
- Armazenar pontos como percentuais de 0 a 100 para manter o alinhamento em computador, celular e tablet.

## Seleção na anamnese
- Remover completamente o mapa geométrico fixo e seu uso no seletor.
- Carregar mapas ativos da empresa conforme as categorias configuradas na pergunta.
- Mostrar imagem, vistas disponíveis e polígonos clicáveis, com destaque, seleção múltipla e lista removível.
- Se nenhuma imagem estiver configurada, manter apenas a lista de regiões cadastradas, sem ilustração artificial.
- Preservar respostas como lista estruturada de slugs e acrescentar a identificação do mapa quando disponível, mantendo texto legível no PDF e compatibilidade com respostas existentes.

## Correção de “Avançando”
- Classificar `localizacao_anatomica` como pergunta de avanço manual; hoje ela cai no fluxo automático sem iniciar temporizador, deixando o texto “Avançando…” preso.
- Validar vazio somente quando obrigatório, aceitar uma ou várias regiões e sempre liberar o estado de navegação após erro.
- Testar pergunta opcional vazia, obrigatória vazia, uma região, várias regiões, troca de vista, revisão e gravação.

## Validação
- Verificar o editor com imagem real em desktop e tablet.
- Confirmar isolamento entre empresas e bloqueio de edição para não administradores.
- Confirmar criação, edição, movimentação de pontos e exclusão de áreas.
- Confirmar avanço, revisão, gravação estruturada, reexibição e PDF sem regressões nas demais perguntas.
