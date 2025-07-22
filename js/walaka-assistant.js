// WALAKA Assistant - Chatbot AI Agent
// This script injects a chatbot assistant into the WALAKA ERP system pages.

class WalakaAssistant {
  constructor(options = {}) {
    this.userProfile = options.userProfile || {};
    this.invoiceHistory = options.invoiceHistory || [];
    this.products = options.products || [];
    this.settings = options.settings || {};
    this.memory = [];
  }

  // Função para chamada à API OpenRouter
  async callOpenRouter(messages) {
    // Always use the full Supabase Edge Function URL for compatibility
    const url = "https://qvmtozjvjflygbkjecyj.supabase.co/functions/v1/walaka-assistant";
    // TODO: Replace with your actual Supabase anon key
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bXRvemp2amZseWdia2plY3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjc2MjMsImV4cCI6MjA2MTcwMzYyM30.DJMC1eM5_EouM1oc07JaoXsMX_bSLn2AVCozAcdfHmo";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ messages })
      });
      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        return data.choices[0].message.content;
      } else {
        return "Desculpe, não consegui obter resposta da IA no momento.";
      }
    } catch (e) {
      return "Erro ao conectar com o serviço de IA.";
    }
  }

  // --- Perguntas Frequentes e Respostas Específicas ---
  getFAQResponse(userMessage) {
    const msg = userMessage.toLowerCase();
    // Criar Factura
    if (msg.includes('criar factura') || msg.includes('criar factura') || msg.includes('nova factura') || msg.includes('nova factura') || msg.includes('criar invoice')) {
      return `Passo a Passo para Criar uma Factura no WALAKA ERP:\n\n1. Aceda ao Dashboard após iniciar sessão.\n2. No menu lateral esquerdo, clique em "Facturas".\n3. Clique no botão azul "Criar Factura" no topo da página.\n4. Preencha o formulário da factura:\n   - Selecione ou adicione um cliente\n   - Adicione os itens (produtos/serviços), quantidades e valores\n   - Defina as datas e condições de pagamento\n5. Revise os totais e detalhes.\n6. Clique em "Criar Factura" para guardar.\n7. Depois pode exportar para PDF ou enviar por email ao cliente.\n\nSe precisar de ajuda em algum campo específico, diga qual!`;
    }
    // Adicionar Cliente
    if (msg.includes('adicionar cliente') || msg.includes('novo cliente') || msg.includes('criar cliente')) {
      return `Para adicionar um novo cliente:\n\n1. No menu lateral, clique em \"Clientes\".\n2. Clique no botão \"Adicionar Cliente\" (ou \"Add Client\").\n3. Preencha os dados do cliente (nome, NUIT, contacto, etc).\n4. Clique em \"Guardar\" para salvar o cliente.\n\nPode também adicionar um cliente diretamente ao criar uma factura, clicando em \"Novo Cliente\" no formulário.`;
    }
    // Exportar PDF
    if (msg.includes('exportar pdf') || msg.includes('baixar pdf') || msg.includes('download pdf')) {
      return `Para exportar uma factura em PDF:\n\n1. Aceda ao menu \"Facturas\".\n2. Encontre a factura desejada na lista.\n3. Clique no botão de ações (ícone de olho ou três pontos) ao lado da factura.\n4. Selecione \"Exportar PDF\" ou \"Download PDF\".\n\nO ficheiro será baixado para o seu computador.`;
    }
    // Enviar factura por email
    if ((msg.includes('enviar') && msg.includes('email') && msg.includes('factura')) || msg.includes('enviar factura por email')) {
      return `Para enviar uma factura por email:\n\n1. Aceda ao menu \"Facturas\".\n2. Encontre a factura que deseja enviar.\n3. Clique no botão de ações ao lado da factura.\n4. Selecione \"Enviar por Email\".\n5. Insira o email do cliente (se necessário) e confirme o envio.`;
    }
    // Adicionar Produto
    if (msg.includes('adicionar produto') || msg.includes('novo produto') || msg.includes('criar produto')) {
      return `Para adicionar um novo produto ou serviço:\n\n1. No menu lateral, clique em \"Produtos\".\n2. Clique em \"Adicionar Produto\".\n3. Preencha os dados (nome, preço, stock, etc).\n4. Clique em \"Guardar\".`;
    }
    // Gerar Relatório
    if (msg.includes('relatório financeiro') || msg.includes('gerar relatório') || msg.includes('exportar relatório')) {
      return `Para gerar ou exportar um relatório financeiro:\n\n1. No menu lateral, clique em \"Relatórios\".\n2. Escolha o tipo de relatório desejado (receitas, despesas, clientes, etc).\n3. Use os filtros para ajustar o período ou categoria.\n4. Clique em \"Exportar\" para baixar o relatório em CSV ou PDF.`;
    }
    // Onboarding/Primeiros Passos
    if (msg.includes('primeiros passos') || msg.includes('onboarding') || msg.includes('como começar') || msg.includes('tutorial')) {
      return `Bem-vindo ao WALAKA ERP! Para começar:\n1. Complete o seu perfil de empresa em Configurações.\n2. Adicione clientes e produtos.\n3. Emita a sua primeira factura.\n4. Consulte relatórios para acompanhar o seu negócio.\nSe precisar de um tutorial detalhado, aceda ao menu Ajuda.`;
    }
    // Configurar Impostos
    if (msg.includes('configurar imposto') || msg.includes('iva') || msg.includes('ispc') || msg.includes('taxa') || msg.includes('imposto')) {
      return `Para configurar impostos (IVA, ISPC, etc):\n1. Vá ao menu Configurações.\n2. Selecione \"Impostos\".\n3. Adicione ou edite as taxas conforme necessário.\n4. Salve as alterações.\nOs impostos serão aplicados automaticamente nas facturas.`;
    }
    // Adicionar Banco ou Carteira Móvel
    if ((msg.includes('adicionar') || msg.includes('cadastrar')) && (msg.includes('banco') || msg.includes('conta bancária') || msg.includes('carteira móvel') || msg.includes('mpesa') || msg.includes('emola') || msg.includes('mkesh'))) {
      return `Para adicionar uma conta bancária ou carteira móvel:\n1. Vá ao menu Bancos.\n2. Clique em \"Adicionar Conta\".\n3. Preencha os dados (nome do banco/carteira, número, titular, etc).\n4. Clique em \"Guardar\".`;
    }
    // Ajuda com erros ou problemas
    if (msg.includes('erro') || msg.includes('problema') || msg.includes('não funciona') || msg.includes('bug')) {
      return `Se encontrou um erro ou problema:\n1. Tente recarregar a página.\n2. Verifique a sua conexão à internet.\n3. Se o problema persistir, reporte pelo menu Ajuda ou envie um email para suporte@walakasoftware.com com detalhes do erro.`;
    }
    // FAQ fallback
    // Perguntas de dados em tempo real
    if (msg.includes('quanto') && (msg.includes('faturei') || msg.includes('fiz') || msg.includes('recebi')) && (msg.includes('este mês') || msg.includes('neste mês') || msg.includes('no mês'))) {
      return 'REALTIME_REVENUE_MONTH';
    }
    if ((msg.includes('top') || msg.includes('maiores') || msg.includes('principais')) && msg.includes('clientes') && (msg.includes('vendas') || msg.includes('quantidade'))) {
      if (msg.includes('quantidade')) return 'REALTIME_TOP_CLIENTS_QUANTITY';
      return 'REALTIME_TOP_CLIENTS_SALES';
    }
    // Recurring Invoices
    if (msg.includes('factura recorrente') || msg.includes('recorrente') || msg.includes('recurring invoice')) {
      return `Para criar uma factura recorrente:\n1. Vá ao menu Facturas.\n2. Clique em "Nova Fatura" e selecione a opção de recorrência.\n3. Defina a frequência (mensal, semanal, etc).\n4. Preencha os dados e salve. O sistema irá gerar facturas automaticamente conforme o agendamento.`;
    }
    // Credit Notes
    if (msg.includes('nota de crédito') || msg.includes('crédito') || msg.includes('credit note')) {
      return `Para emitir uma nota de crédito:\n1. Acesse o menu Notas de Crédito.\n2. Clique em "Nova Nota de Crédito".\n3. Selecione a factura a ser ajustada e preencha os detalhes.\n4. Salve e envie ao cliente se necessário.`;
    }
    // Debit Notes
    if (msg.includes('nota de débito') || msg.includes('débito') || msg.includes('debit note')) {
      return `Para emitir uma nota de débito:\n1. Acesse o menu Notas de Débito.\n2. Clique em "Nova Nota de Débito".\n3. Selecione o cliente e detalhe o motivo.\n4. Salve e envie ao cliente se necessário.`;
    }
    // Receipts
    if (msg.includes('recibo') || msg.includes('receipt')) {
      return `Para emitir um recibo:\n1. Vá ao menu Recibos.\n2. Clique em "Novo Recibo".\n3. Associe a factura paga e preencha os dados.\n4. Salve e envie ao cliente.`;
    }
    // Expense Management
    if (msg.includes('despesa') || msg.includes('gasto') || msg.includes('expense')) {
      return `Para registrar uma despesa:\n1. Vá ao menu Despesas.\n2. Clique em "Nova Despesa".\n3. Preencha os detalhes (categoria, valor, fornecedor, etc).\n4. Salve para atualizar seus relatórios financeiros.`;
    }
    // User Management
    if (msg.includes('gestão de utilizadores') || msg.includes('adicionar utilizador') || msg.includes('user management') || msg.includes('novo utilizador')) {
      return `Para gerir utilizadores:\n1. Vá ao menu Configurações > Gestão de Utilizadores.\n2. Clique em "Adicionar Utilizador".\n3. Defina permissões e envie convite por email.\n4. Pode editar ou remover utilizadores a qualquer momento.`;
    }
    // Logs
    if (msg.includes('logs do sistema') || msg.includes('log') || msg.includes('auditoria')) {
      return `Para consultar logs do sistema:\n1. Vá ao menu Configurações > Logs do Sistema.\n2. Filtre por data, utilizador ou ação.\n3. Use para auditoria e rastreamento de atividades.`;
    }
    // Trial/Upgrade
    if (msg.includes('trial') || msg.includes('teste') || msg.includes('limite de uso') || msg.includes('upgrade') || msg.includes('plano')) {
      return `O WALAKA oferece um período de teste com limites de uso.\n- Para ver seu status, consulte a barra de trial no topo do dashboard.\n- Para fazer upgrade, clique em "Upgrade" e escolha o plano desejado.\n- Se atingir o limite, algumas funções serão bloqueadas até atualizar o plano.`;
    }
    // Subscription
    if (msg.includes('assinatura') || msg.includes('subscrição') || msg.includes('renovar')) {
      return `Para gerir sua assinatura:\n1. Vá ao menu Configurações > Plano/Assinatura.\n2. Veja detalhes do plano atual, renove ou altere o plano.\n3. Para cancelar, clique em "Cancelar Assinatura" e siga as instruções.`;
    }
    // Notifications
    if (msg.includes('notificação') || msg.includes('alerta') || msg.includes('notification')) {
      return `O sistema envia notificações para eventos importantes (facturas vencidas, novos clientes, etc).\n- Veja o ícone de sino no topo da página.\n- Clique para ver detalhes ou marcar como lidas.`;
    }
    // Language/Theme
    if (msg.includes('idioma') || msg.includes('language') || msg.includes('tema') || msg.includes('theme') || msg.includes('escuro') || msg.includes('dark mode')) {
      return `Para alterar idioma ou tema:\n1. Vá ao menu Configurações.\n2. Selecione "Idioma" para Português ou Inglês.\n3. Escolha o tema claro ou escuro conforme sua preferência.`;
    }
    // Integrations
    if (msg.includes('integração') || msg.includes('api') || msg.includes('integrações')) {
      return `O WALAKA está a desenvolver integrações com serviços externos (pagamentos, contabilidade, etc).\n- Consulte o menu Configurações > Integrações para novidades.\n- Para API, aguarde futuras atualizações.`;
    }
    // CSV/SAFT Export
    if (msg.includes('exportar csv') || msg.includes('exportar saft') || msg.includes('saft') || msg.includes('csv')) {
      return `Para exportar dados:\n1. Vá ao menu Relatórios ou Faturas.\n2. Clique em "Exportar CSV" ou "Exportar SAFT".\n3. O ficheiro será baixado para seu computador.`;
    }
    // Permissions
    if (msg.includes('permissão') || msg.includes('acesso') || msg.includes('restrição')) {
      return `Permissões de utilizador podem ser geridas em Configurações > Gestão de Utilizadores.\n- Defina quem pode criar, editar ou visualizar módulos.\n- Apenas administradores podem alterar permissões.`;
    }
    // Suppliers
    if (msg.includes('fornecedor') || msg.includes('suppliers')) {
      return `Para adicionar ou gerir fornecedores:\n1. Vá ao menu Produtos/Inventário > Fornecedores.\n2. Clique em "Adicionar Fornecedor".\n3. Preencha os dados e salve.`;
    }
    // Inventory
    if (msg.includes('inventário') || msg.includes('stock') || msg.includes('armazém')) {
      return `Para gerir inventário:\n1. Vá ao menu Produtos/Inventário.\n2. Veja o stock atual, movimente produtos e registre entradas/saídas.\n3. Use relatórios para acompanhar o inventário.`;
    }
    // Mobile Access
    if (msg.includes('acesso móvel') || msg.includes('mobile') || msg.includes('app')) {
      return `O WALAKA é totalmente responsivo e pode ser usado em telemóveis e tablets.\n- Basta aceder pelo navegador.\n- Em breve: notificações push e app dedicada.`;
    }
    // Help/Support
    if (msg.includes('ajuda') || msg.includes('suporte') || msg.includes('documentação') || msg.includes('help')) {
      return `Para ajuda ou suporte:\n1. Consulte o menu Ajuda para documentação e tutoriais.\n2. Baixe a Memoria Descritiva ou Termos.\n3. Para suporte humano, envie email para suporte@walakasoftware.com.`;
    }
    // Troubleshooting
    if (msg.includes('não consigo') || msg.includes('não aparece') || msg.includes('não está funcionando') || msg.includes('não funciona') || msg.includes('problema')) {
      return `Se está com dificuldades:\n- Recarregue a página e tente novamente.\n- Verifique sua conexão à internet.\n- Consulte o menu Ajuda ou contacte o suporte.`;
    }
    // Onboarding Wizard
    if (msg.includes('wizard') || msg.includes('passo a passo') || msg.includes('configuração inicial')) {
      return `O WALAKA possui um assistente de configuração inicial (onboarding wizard).\n- Siga os passos para configurar empresa, clientes, produtos e métodos de pagamento.\n- Pode acessar novamente pelo menu Ajuda.`;
    }
    // Trial Restrictions
    if (msg.includes('restrição de trial') || msg.includes('trial bloqueado') || msg.includes('não consigo criar')) {
      return `Se atingiu o limite do trial:\n- Algumas funções ficam bloqueadas.\n- Faça upgrade do plano para continuar usando todas as funcionalidades.`;
    }
    // System Capabilities & Navigation
    if (msg.includes('o que o sistema faz') || msg.includes('o que posso fazer') || msg.includes('funcionalidades') || msg.includes('dashboard') || msg.includes('painel')) {
      return `O WALAKA ERP permite:
- Criar, editar e gerir facturas, notas de crédito, débito e recibos.
- Adicionar e gerir clientes e produtos.
- Aceder rapidamente a páginas pelo dashboard (Facturas, Clientes, Produtos, Bancos).
- Consultar métricas de vendas, clientes ativos, receitas e despesas.
- Gerir utilizadores e definir permissões/roles em "Gestão de Utilizadores".
- Personalizar configurações, idioma, tema (claro/escuro) e notificações.
- Exportar dados em PDF, CSV, SAFT.
- Acompanhar logs do sistema e aceder à ajuda/documentação.`;
    }
    // Top Clients by Purchases
    if ((msg.includes('cliente') && (msg.includes('mais compras') || msg.includes('mais comprou') || msg.includes('top cliente'))) || (msg.includes('maior cliente'))) {
      return `O sistema calcula o cliente com mais compras analisando o total de vendas na tabela de facturas. Para ver o top clientes:
1. Vá ao menu Relatórios ou Facturas.
2. Use filtros de período (mês, semana, dia) conforme desejar.
3. O cliente com maior valor total de facturas pagas é considerado o top cliente.
Em breve, relatórios automáticos mostrarão este ranking.`;
    }
    // Top Bank/Cash Account by Incoming Money
    if ((msg.includes('conta bancária') || msg.includes('banco') || msg.includes('caixa')) && (msg.includes('mais dinheiro') || msg.includes('mais entradas') || msg.includes('top conta'))) {
      return `Para saber qual conta bancária ou caixa recebeu mais dinheiro:
1. Consulte os relatórios financeiros.
2. O sistema soma os pagamentos recebidos por cada conta (baseado nas facturas pagas).
3. Veja o ranking no relatório de contas ou exporte para análise detalhada.`;
    }
    // Top Client by Paid/Pending/Overdue Invoices
    if ((msg.includes('cliente') && (msg.includes('mais facturas pagas') || msg.includes('mais pagou'))) || (msg.includes('cliente') && (msg.includes('mais pendentes') || msg.includes('mais em atraso') || msg.includes('mais overdue')))) {
      return `O sistema pode mostrar:
- Cliente com mais facturas pagas: soma o número de facturas com status "paga" por cliente.
- Cliente com mais pendentes/atrasadas: soma as facturas "pendente" ou "vencida".
Use filtros na página de Facturas ou Relatórios para ver estes dados.`;
    }
    // Tax Totals (IVA, ISPC, etc)
    if (msg.includes('quanto paguei de iva') || msg.includes('total de impostos') || msg.includes('quanto paguei de ispc') || msg.includes('impostos totais')) {
      return `Para saber quanto pagou de IVA, ISPC ou outros impostos:
1. Vá ao menu Relatórios.
2. Use o filtro de impostos para ver o total cobrado em cada período.
3. O sistema soma os valores das colunas de impostos nas facturas emitidas.`;
    }
    // How to turn dark mode on/off
    if ((msg.includes('modo escuro') || msg.includes('dark mode')) && (msg.includes('ativar') || msg.includes('desativar') || msg.includes('ligar') || msg.includes('desligar') || msg.includes('como'))) {
      return `Para ativar ou desativar o modo escuro:
1. No menu lateral (sidebar), vá até o final e clique no botão de sol/lua.
2. O sistema alterna entre modo claro e escuro instantaneamente.
3. A preferência é guardada no seu navegador (ver código em sidebar.html, darkmode.js, sidebar-darkmode.js).`;
    }
    // Add/Edit/Delete Suppliers
    if ((msg.includes('adicionar fornecedor') || msg.includes('novo fornecedor') || msg.includes('editar fornecedor') || msg.includes('apagar fornecedor') || msg.includes('remover fornecedor'))) {
      return `Para adicionar, editar ou remover fornecedores:
1. Vá ao menu Produtos/Inventário > Fornecedores.
2. Clique em "Adicionar Fornecedor" para novo, ou use os botões de editar/apagar ao lado do fornecedor na lista.`;
    }
    // Manage Stock Movements
    if (msg.includes('movimento de stock') || msg.includes('movimentar stock') || msg.includes('entrada de stock') || msg.includes('saída de stock')) {
      return `Para registar movimentos de stock:
1. Vá ao menu Produtos/Inventário.
2. Clique em "Movimentar Stock".
3. Escolha entrada ou saída, selecione o produto e preencha a quantidade.`;
    }
    // Reset Password
    if (msg.includes('redefinir senha') || msg.includes('esqueci a senha') || msg.includes('reset password')) {
      return `Para redefinir sua senha:
1. Na tela de login, clique em "Esqueceu a senha?".
2. Siga as instruções enviadas para o seu email.`;
    }
    // Upload/Change Company Logo
    if (msg.includes('logo da empresa') || msg.includes('carregar logo') || msg.includes('alterar logo') || msg.includes('upload logo')) {
      return `Para carregar ou alterar o logotipo da empresa:
1. Vá ao menu Configurações > Perfil da Empresa.
2. Clique em "Carregar Logo" e selecione a imagem desejada.
3. Salve as alterações.`;
    }
    // Export/Import Data
    if ((msg.includes('exportar dados') || msg.includes('importar dados') || msg.includes('importação') || msg.includes('exportação'))) {
      return `Para exportar dados:
1. Vá ao menu Relatórios ou Faturas.
2. Clique em "Exportar CSV" ou "Exportar SAFT".
Para importar dados, aguarde futuras atualizações do sistema.`;
    }
    // Set Up Notifications
    if (msg.includes('configurar notificações') || msg.includes('ativar notificações') || msg.includes('notificações push')) {
      return `Para configurar notificações:
1. Vá ao menu Configurações > Notificações.
2. Ative ou desative notificações conforme sua preferência.
3. Notificações push para mobile estarão disponíveis em breve.`;
    }
    // Use Trial Features
    if (msg.includes('usar trial') || msg.includes('funcionalidades do trial') || msg.includes('o que posso fazer no trial')) {
      return `Durante o período de trial, pode usar quase todas as funcionalidades do WALAKA, com limites de número de facturas ou dias. Veja a barra de trial no dashboard para detalhes.`;
    }
    // Contact Support
    if (msg.includes('contactar suporte') || msg.includes('falar com suporte') || msg.includes('contato suporte')) {
      return `Para contactar o suporte:
1. Use o menu Ajuda para enviar uma mensagem.
2. Ou envie email para suporte@walakasoftware.com.`;
    }
    // Use Mobile Version
    if (msg.includes('usar no telemóvel') || msg.includes('usar no celular') || msg.includes('mobile version') || msg.includes('app mobile')) {
      return `O WALAKA pode ser usado em qualquer telemóvel ou tablet pelo navegador. Basta aceder ao site normalmente.`;
    }
    // Check Logs/Audit
    if (msg.includes('ver logs') || msg.includes('auditoria') || msg.includes('atividades do sistema')) {
      return `Para consultar logs e auditoria:
1. Vá ao menu Configurações > Logs do Sistema.
2. Filtre por data, utilizador ou ação para ver detalhes.`;
    }
    // Manage User Roles
    if (msg.includes('definir roles') || msg.includes('permissões de utilizador') || msg.includes('user roles')) {
      return `Para definir roles/permissões:
1. Vá ao menu Gestão de Utilizadores.
2. Edite o utilizador e selecione o role desejado (admin, operador, etc).`;
    }
    // Customize Invoice Templates
    if (msg.includes('personalizar modelo de factura') || msg.includes('customizar template de factura') || msg.includes('invoice template')) {
      return `Para personalizar modelos de factura:
1. Vá ao menu Configurações > Modelos de Fatura.
2. Escolha um modelo e personalize cores, logotipo e campos.`;
    }
    // Filter/Search in Tables
    if (msg.includes('filtrar') || msg.includes('buscar') || msg.includes('procurar') || msg.includes('search table')) {
      return `Para filtrar ou buscar em tabelas:
1. Use o campo de busca ou filtros disponíveis no topo das listas (clientes, produtos, facturas, etc).`;
    }
    // Check Subscription Status
    if (msg.includes('status da assinatura') || msg.includes('meu plano') || msg.includes('assinatura atual')) {
      return `Para ver o status da sua assinatura:
1. Vá ao menu Configurações > Plano/Assinatura.
2. Veja detalhes do plano atual, validade e limites.`;
    }
    // Update Company Info
    if (msg.includes('atualizar dados da empresa') || msg.includes('editar empresa') || msg.includes('update company info')) {
      return `Para atualizar dados da empresa:
1. Vá ao menu Configurações > Perfil da Empresa.
2. Edite os campos desejados e salve as alterações.`;
    }
    // Set Up Payment Methods
    if (msg.includes('configurar métodos de pagamento') || msg.includes('adicionar método de pagamento') || msg.includes('payment method')) {
      return `Para configurar métodos de pagamento:
1. Vá ao menu Bancos.
2. Adicione contas bancárias ou carteiras móveis.
3. Escolha quais métodos exibir nas facturas.`;
    }
    // Use Onboarding Wizard
    if (msg.includes('usar wizard') || msg.includes('assistente de configuração') || msg.includes('onboarding wizard')) {
      return `O assistente de configuração inicial (onboarding wizard) guia você pelos passos essenciais para começar a usar o WALAKA. Pode ser acessado pelo menu Ajuda.`;
    }
    // Access Help/Documentation
    if (msg.includes('acessar ajuda') || msg.includes('ver documentação') || msg.includes('help docs')) {
      return `Para acessar a ajuda ou documentação:
1. Use o menu Ajuda no sistema.
2. Baixe a Memoria Descritiva ou consulte os tutoriais disponíveis.`;
    }
    // Check System Version
    if (msg.includes('versão do sistema') || msg.includes('system version') || msg.includes('qual a versão')) {
      return `Para ver a versão do sistema:
1. Vá ao menu Ajuda > Informações do Sistema.
2. Veja o campo "Versão" para detalhes.`;
    }
    // Handle Errors
    if (msg.includes('erro') || msg.includes('problema') || msg.includes('bug') || msg.includes('não funciona')) {
      return `Se encontrar um erro:
1. Recarregue a página e tente novamente.
2. Se persistir, reporte pelo menu Ajuda ou envie email para suporte@walakasoftware.com.`;
    }
    // General fallback
    return null;
  }

  // Helper to remove Markdown formatting from responses
  sanitizeResponse(text) {
    if (!text) return '';
    // Remove bold/italic/headers/lists Markdown
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // bold
      .replace(/\*(.*?)\*/g, '$1') // italic
      .replace(/#+\s?/g, '') // headers
      .replace(/^-\s?/gm, '') // list dashes
      .replace(/\n{2,}/g, '\n') // collapse multiple newlines
      .replace(/\n\s*\n/g, '\n');
  }

  // Helper to fetch user and business profile for context
  async fetchUserAndBusinessProfile() {
    if (!window.supabase) return { user: {}, business: {} };
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session || !session.user) return { user: {}, business: {} };
      const userId = session.user.id;
      // Fetch user profile
      const { data: userRecord } = await window.supabase
        .from('users')
        .select('username, email')
        .eq('id', userId)
        .maybeSingle();
      // Fetch business profile
      const { data: businessRecord } = await window.supabase
        .from('business_profiles')
        .select('company_name, tax_id, address, website, email')
        .eq('user_id', userId)
        .maybeSingle();
      return {
        user: userRecord || {},
        business: businessRecord || {}
      };
    } catch (e) {
      return { user: {}, business: {} };
    }
  }

  // --- Real-time Data Fetching Helpers ---
  async fetchAllClients() {
    if (!window.supabase) return [];
    try {
      const { data, error } = await window.supabase
        .from('clients')
        .select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  }

  async fetchAllProducts() {
    if (!window.supabase) return [];
    try {
      const { data, error } = await window.supabase
        .from('products')
        .select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  }

  async fetchAllInvoices() {
    if (!window.supabase) return [];
    try {
      const { data, error } = await window.supabase
        .from('invoices')
        .select('*');
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  }

  // --- Data Summary Helpers ---
  async getActiveClientsSummary() {
    const clients = await this.fetchAllClients();
    const activeClients = clients.filter(c => c.status === 'active');
    if (activeClients.length === 0) return 'Não existem clientes ativos no momento.';
    const names = activeClients.map(c => c.customer_name || c.company_name || c.contact).filter(Boolean);
    return `Existem ${activeClients.length} clientes ativos: ${names.join(', ')}.`;
  }

  async getProductStatsSummary() {
    const products = await this.fetchAllProducts();
    if (products.length === 0) return 'Não existem produtos cadastrados.';
    return `Existem ${products.length} produtos cadastrados no sistema.`;
  }

  async getInvoiceStatsSummary() {
    const invoices = await this.fetchAllInvoices();
    if (invoices.length === 0) return 'Não existem facturas registradas.';
    const paid = invoices.filter(i => i.status === 'paid').length;
    const pending = invoices.filter(i => i.status === 'pending').length;
    const overdue = invoices.filter(i => i.status === 'overdue').length;
    return `Total de facturas: ${invoices.length}. Pagas: ${paid}, Pendentes: ${pending}, Vencidas: ${overdue}.`;
  }

  // --- Enhanced handleMessage for Data Q&A ---
  async handleMessage(userMessage) {
    // Fetch user and business profile for context (needed for direct answers)
    const { user, business } = await this.fetchUserAndBusinessProfile();
    const msg = userMessage.toLowerCase();
    // Direct user info questions
    if ((msg.includes('username') || msg.includes('nome de utilizador')) && !msg.includes('empresa')) {
      return this.sanitizeResponse(`O seu nome de utilizador é: ${user.username || 'Não encontrado'}.`);
    }
    if ((msg.includes('empresa') && !msg.includes('funcionalidade') && !msg.includes('features')) && !msg.includes('nome de utilizador')) {
      return this.sanitizeResponse(`O nome da sua empresa é: ${business.company_name || 'Não encontrado'}.`);
    }
    if (msg.includes('nuit')) {
      return this.sanitizeResponse(`O NUIT da sua empresa é: ${business.tax_id || 'Não encontrado'}.`);
    }
    if (msg.includes('email') && !msg.includes('enviar')) {
      return this.sanitizeResponse(`O seu email é: ${user.email || 'Não encontrado'}.`);
    }
    // Quick summary intent
    if (msg.includes('resumo') || msg.includes('sumário') || msg.includes('como está minha conta') || msg.includes('estado da conta')) {
      const activeClients = await this.getActiveClientsSummary();
      const productStats = await this.getProductStatsSummary();
      const invoiceStats = await this.getInvoiceStatsSummary();
      return this.sanitizeResponse(`Aqui está um resumo rápido da sua conta:\n${activeClients}\n${productStats}\n${invoiceStats}`);
    }
    // FAQ and real-time logic
    if (msg.includes('clientes ativos') || (msg.includes('clientes') && msg.includes('ativos'))) {
      return this.sanitizeResponse(await this.getActiveClientsSummary());
    }
    if (msg.includes('produtos cadastrados') || (msg.includes('quantos produtos') && msg.includes('tenho'))) {
      return this.sanitizeResponse(await this.getProductStatsSummary());
    }
    if (msg.includes('facturas registradas') || (msg.includes('quantas facturas') && msg.includes('tenho'))) {
      return this.sanitizeResponse(await this.getInvoiceStatsSummary());
    }
    // Existing real-time and FAQ logic
    const faq = this.getFAQResponse(userMessage);
    if (faq === 'REALTIME_REVENUE_MONTH') return this.sanitizeResponse(await this.getRevenueThisMonth());
    if (faq === 'REALTIME_TOP_CLIENTS_SALES') return this.sanitizeResponse(await this.getTopClientsBySales());
    if (faq === 'REALTIME_TOP_CLIENTS_QUANTITY') return this.sanitizeResponse(await this.getTopClientsByQuantity());
    if (faq) return this.sanitizeResponse(faq);
    // --- CONTEXTUAL AI PROMPT LOGIC ---
    // Only inject user/system context if the user asks for summary, status, or account info
    let systemPrompt = "Você é o WALAKA Assistant, um agente de suporte para o sistema WALAKA ERP. Responda apenas sobre funcionalidades do WALAKA ERP. Não responda perguntas fora do contexto do WALAKA ERP, mesmo que solicitado. Não forneça informações gerais, dicas de vida, ou respostas não relacionadas ao sistema WALAKA. Seja sempre objetivo, profissional e contextualizado ao sistema. Se não souber, peça para o utilizador consultar o suporte humano ou a documentação oficial.";
    if (
      msg.includes('resumo') || msg.includes('sumário') ||
      msg.includes('como está minha conta') || msg.includes('estado da conta') ||
      msg.includes('status') || msg.includes('minha empresa') ||
      msg.includes('meu perfil') || msg.includes('meus dados')
    ) {
      const activeClients = await this.getActiveClientsSummary();
      const productStats = await this.getProductStatsSummary();
      const invoiceStats = await this.getInvoiceStatsSummary();
      const userContext = `\n[Contexto do Utilizador]\nNome de utilizador: ${user.username || ''}\nEmail: ${user.email || ''}\nEmpresa: ${business.company_name || ''}\nNUIT: ${business.tax_id || ''}\nEndereço: ${business.address || ''}\nWebsite: ${business.website || ''}`;
      const statsContext = `\n[Resumo do Sistema]\n${activeClients}\n${productStats}\n${invoiceStats}`;
      systemPrompt += userContext + statsContext;
    }
    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.memory.slice(-3).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage }
    ];
    const aiResponse = await this.callOpenRouter(messages);
    this.memory.push({ role: 'assistant', content: aiResponse });
    return this.sanitizeResponse(aiResponse);
  }

  // --- Funções inteligentes WALAKA ---
  async ajudaFaturas() {
    return this.guideInvoiceCreation();
  }

  async recomendacoesInteligentes() {
    return this.suggestProducts();
  }

  async descontosPromocoes() {
    return this.suggestDiscounts();
  }

  async automatizacoes() {
    return this.suggestAutomations();
  }

  async suporteSistema() {
    return this.generalSupport();
  }

  // --- Funções de dados em tempo real ---
  async getRevenueThisMonth() {
    if (!window.supabase) return 'Não foi possível aceder aos dados financeiros (Supabase não disponível).';
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session || !session.user) return 'Sessão de utilizador não encontrada.';
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const { data: invoices, error } = await window.supabase
        .from('invoices')
        .select('total_amount, status, issue_date')
        .eq('user_id', session.user.id)
        .gte('issue_date', start)
        .lte('issue_date', end)
        .in('status', ['paid', 'sent']);
      if (error) throw error;
      const total = (invoices || []).reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
      return `O total facturado este mês é de ${total.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}.`;
    } catch (e) {
      return 'Erro ao calcular o total facturado este mês.';
    }
  }

  async getTopClientsBySales() {
    if (!window.supabase) return 'Não foi possível aceder aos dados de clientes (Supabase não disponível).';
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session || !session.user) return 'Sessão de utilizador não encontrada.';
      const { data: invoices, error } = await window.supabase
        .from('invoices')
        .select('client_id, total_amount')
        .eq('user_id', session.user.id)
        .in('status', ['paid', 'sent']);
      if (error) throw error;
      const clientTotals = {};
      (invoices || []).forEach(inv => {
        if (!inv.client_id) return;
        clientTotals[inv.client_id] = (clientTotals[inv.client_id] || 0) + (parseFloat(inv.total_amount) || 0);
      });
      // Fetch client names
      const clientIds = Object.keys(clientTotals).sort((a, b) => clientTotals[b] - clientTotals[a]).slice(0, 5);
      if (clientIds.length === 0) return 'Nenhum cliente encontrado.';
      const { data: clients, error: clientError } = await window.supabase
        .from('clients')
        .select('customer_id, company_name')
        .in('customer_id', clientIds);
      if (clientError) throw clientError;
      const result = clientIds.map((id, i) => {
        const client = (clients || []).find(c => c.customer_id === id);
        return `${i + 1}. ${(client && client.company_name) || 'Cliente desconhecido'}: ${clientTotals[id].toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}`;
      }).join('\n');
      return `Top 5 clientes por valor de vendas:\n${result}`;
    } catch (e) {
      return 'Erro ao calcular os principais clientes por vendas.';
    }
  }

  async getTopClientsByQuantity() {
    if (!window.supabase) return 'Não foi possível aceder aos dados de clientes (Supabase não disponível).';
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session || !session.user) return 'Sessão de utilizador não encontrada.';
      // Fetch invoice items joined with invoices
      const { data: items, error } = await window.supabase
        .from('invoice_items')
        .select('invoice_id, quantity')
        .gte('quantity', 0);
      if (error) throw error;
      const { data: invoices, error: invError } = await window.supabase
        .from('invoices')
        .select('id, client_id, user_id, status')
        .eq('user_id', session.user.id)
        .in('status', ['paid', 'sent']);
      if (invError) throw invError;
      const invoiceMap = {};
      (invoices || []).forEach(inv => { invoiceMap[inv.id] = inv.client_id; });
      const clientQuantities = {};
      (items || []).forEach(item => {
        const clientId = invoiceMap[item.invoice_id];
        if (!clientId) return;
        clientQuantities[clientId] = (clientQuantities[clientId] || 0) + (parseFloat(item.quantity) || 0);
      });
      const clientIds = Object.keys(clientQuantities).sort((a, b) => clientQuantities[b] - clientQuantities[a]).slice(0, 5);
      if (clientIds.length === 0) return 'Nenhum cliente encontrado.';
      const { data: clients, error: clientError } = await window.supabase
        .from('clients')
        .select('customer_id, company_name')
        .in('customer_id', clientIds);
      if (clientError) throw clientError;
      const result = clientIds.map((id, i) => {
        const client = (clients || []).find(c => c.customer_id === id);
        return `${i + 1}. ${(client && client.company_name) || 'Cliente desconhecido'}: ${clientQuantities[id]} unidades`;
      }).join('\n');
      return `Top 5 clientes por quantidade de itens comprados:\n${result}`;
    } catch (e) {
      return 'Erro ao calcular os principais clientes por quantidade.';
    }
  }

  guideInvoiceCreation() {
    return `Para emitir uma nova factura no WALAKA, siga estes passos:\n1. Clique em "Nova Fatura".\n2. Preencha os campos obrigatórios:\n   - Cliente (selecione ou cadastre um novo)\n   - NUIT do cliente\n   - Data de emissão (não pode ser no futuro)\n   - Produtos/serviços (adicione itens, quantidades e valores)\n   - Impostos aplicáveis (IVA, ISPC, etc.)\n3. Revise o subtotal e o valor total.\n4. Clique em "Salvar" ou "Emitir".\nSe precisar de ajuda em algum campo específico, me informe!`;
  }

  suggestProducts() {
    if (this.products.length === 0) {
      return "Não encontrei produtos cadastrados no seu perfil. Cadastre produtos para agilizar a emissão de facturas.";
    }
    const topProducts = this.products.slice(0, 3).map(p => `- ${p.nome}`).join('\n');
    return `Sugestão de produtos/serviços mais usados:\n${topProducts}\nDeseja adicionar algum deles à nova factura?`;
  }

  suggestDiscounts() {
    return `Você pode oferecer desconto para pagamento antecipado ou criar pacotes de fidelização para clientes frequentes.\nDeseja aplicar um desconto nesta factura? Informe o percentual ou valor.`;
  }

  generalSupport() {
    return `Como posso ajudar? Exemplos:\n- Como exportar uma factura em PDF\n- Como enviar factura por email\n- Como cadastrar um novo cliente\n- Como configurar impostos\nSe sua dúvida for técnica ou não resolvida aqui, consulte a documentação oficial ou acione o suporte humano pelo menu "Ajuda".`;
  }

  suggestAutomations() {
    return `Notei que você emite facturas recorrentes para alguns clientes. Deseja automatizar o envio dessas facturas todo mês?\nResponda "sim" para configurar uma automação, ou especifique o padrão desejado (ex: dia do mês, valor fixo, etc.).`;
  }

  fallback() {
    return `Desculpe, não entendi sua solicitação. Por favor, reformule ou consulte o menu de ajuda para mais opções.`;
  }
}

window.walakaAssistant = new WalakaAssistant({
  userProfile: {},
  invoiceHistory: [],
  products: [
    { nome: "Consultoria", preco: 1000 },
    { nome: "Desenvolvimento Web", preco: 5000 },
    { nome: "Suporte Técnico", preco: 500 }
  ],
  settings: {}
});

// Chat UI injection
(function injectWalakaChat() {
  if (document.getElementById('walaka-chatbot')) return;
  const chatHtml = `
    <div id="walaka-chatbot" style="position:fixed;bottom:21px;right:21px;z-index:9999;width:340px;max-width:85vw;font-family:Inter,sans-serif;box-shadow:0 4px 22px rgba(0,0,0,0.18);border-radius:16px 16px 0 0;background:#fff;overflow:hidden;">
      <div style="background:#2b4a6f;color:#fff;padding:12px 16px;font-weight:600;display:flex;align-items:center;gap:8px;">
        <img src="assets/images/walaka-assistant.PNG" alt="Assistant" style="height:23px;width:23px;border-radius:50%;background:#fff;object-fit:cover;" /> WALAKA Assistant
        <span style="flex:1"></span>
        <button id="walaka-chatbot-close" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;">&times;</button>
      </div>
      <div id="walaka-chatbot-messages" style="height:260px;overflow-y:auto;padding:12px 8px 8px 8px;background:#f7fafd;"></div>
      <form id="walaka-chatbot-form" style="display:flex;gap:8px;padding:8px;background:#f7fafd;border-top:1px solid #e0e6ed;">
        <input id="walaka-chatbot-input" type="text" placeholder="Como posso ajudar?" style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid #c3cfe2;font-size:15px;outline:none;" autocomplete="off" />
        <button type="submit" style="background:#2b4a6f;color:#fff;border:none;border-radius:8px;padding:0 16px;font-size:15px;cursor:pointer;">Enviar</button>
      </form>
    </div>
    <button id="walaka-chatbot-toggle" style="position:fixed;bottom:40px;right:32px;z-index:9998;background:#2b4a6f;color:#fff;border:none;border-radius:50%;width:40px;height:40px;box-shadow:0 2px 8px rgba(0,0,0,0.18);font-size:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
      <img src="assets/images/walaka-assistant.PNG" alt="Assistant" style="height:21px;width:21px;border-radius:50%;background:#fff;object-fit:cover;" />
    </button>
  `;
  const div = document.createElement('div');
  div.innerHTML = chatHtml;
  document.body.appendChild(div);

  const chatbot = document.getElementById('walaka-chatbot');
  const toggleBtn = document.getElementById('walaka-chatbot-toggle');
  const closeBtn = document.getElementById('walaka-chatbot-close');
  chatbot.style.display = 'none';

  toggleBtn.onclick = () => {
    chatbot.style.display = 'block';
    toggleBtn.style.display = 'none';
  };
  closeBtn.onclick = () => {
    chatbot.style.display = 'none';
    toggleBtn.style.display = 'flex';
  };

  const messagesDiv = document.getElementById('walaka-chatbot-messages');
  const form = document.getElementById('walaka-chatbot-form');
  const input = document.getElementById('walaka-chatbot-input');

  function addMessage(content, sender = 'user', isTyping = false) {
    const msg = document.createElement('div');
    msg.style.margin = '8px 0';
    msg.style.textAlign = sender === 'user' ? 'right' : 'left';
    msg.innerHTML = `<span style="display:inline-block;max-width:80%;padding:8px 12px;border-radius:12px;background:${sender==='user'?'#e0e6ed':'#fff'};color:#222;font-size:15px;min-height:24px;">${content}</span>`;
    messagesDiv.appendChild(msg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    return msg;
  }

  // Typing animation for bot
  function showBotLoading() {
    const loadingMsg = addMessage('<span class="walaka-typing"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>', 'bot', true);
    let dots = 0;
    let interval = setInterval(() => {
      dots = (dots + 1) % 4;
      loadingMsg.querySelector('span').innerHTML = '.'.repeat(dots) || '&nbsp;';
    }, 250); // smoother, faster
    return { loadingMsg, interval };
  }

  // Live typing effect for bot response
  async function typeBotResponse(fullText, msgDiv) {
    const span = msgDiv.querySelector('span');
    span.innerHTML = '';
    for (let i = 0; i < fullText.length; i++) {
      span.innerHTML += fullText[i] === '\n' ? '<br>' : fullText[i];
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      await new Promise(r => setTimeout(r, 2 + Math.random() * 7)); // much faster typing
    }
  }

  form.onsubmit = async function(e) {
    e.preventDefault();
    const userMsg = input.value.trim();
    if (!userMsg) return;
    addMessage(userMsg, 'user');
    input.value = '';
    // Show loading animation
    const { loadingMsg, interval } = showBotLoading();
    // Get AI response
    const response = await window.walakaAssistant.handleMessage(userMsg);
    clearInterval(interval);
    loadingMsg.remove();
    // Show live typing effect
    const msgDiv = addMessage('', 'bot');
    await typeBotResponse(response, msgDiv);
  };

  // Welcome message
  setTimeout(() => addMessage('Olá! Eu sou o WALAKA Assistant. Como posso ajudar na sua facturação hoje?', 'bot'), 400);
})();
