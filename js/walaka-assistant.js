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
    // Detect if running locally (localhost:3000 or 127.0.0.1:3000)
    let url;
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      url = "http://localhost:54321/functions/v1/walaka-assistant";
    } else {
      // For production, use relative path (works on walakasoftware.com and most static hosts)
      url = "/functions/v1/walaka-assistant";
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
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
    if (msg.includes('criar factura') || msg.includes('criar fatura') || msg.includes('nova factura') || msg.includes('nova fatura') || msg.includes('criar invoice')) {
      return `Passo a Passo para Criar uma Factura no WALAKA ERP:\n\n1. Aceda ao Dashboard após iniciar sessão.\n2. No menu lateral esquerdo, clique em "Facturas" (ou "Invoices").\n3. Clique no botão azul "Criar Factura" (ou "Create Invoice") no topo da página.\n4. Preencha o formulário da factura (cliente, detalhes, itens, revisão).\n5. Clique em "Criar Factura" para guardar. Depois pode exportar para PDF ou enviar por email.\n\nSe precisar de ajuda em algum passo, diga qual!`;
    }
    // Adicionar Cliente
    if (msg.includes('adicionar cliente') || msg.includes('novo cliente') || msg.includes('criar cliente')) {
      return `Para adicionar um novo cliente:\n\n1. No menu lateral, clique em "Clientes".\n2. Clique no botão "Adicionar Cliente" (ou "Add Client").\n3. Preencha os dados do cliente (nome, NUIT, contacto, etc).\n4. Clique em "Guardar" para salvar o cliente.\n\nPode também adicionar um cliente diretamente ao criar uma factura, clicando em "Novo Cliente" no formulário.`;
    }
    // Exportar PDF
    if (msg.includes('exportar pdf') || msg.includes('baixar pdf') || msg.includes('download pdf')) {
      return `Para exportar uma factura em PDF:\n\n1. Aceda ao menu "Facturas".\n2. Encontre a factura desejada na lista.\n3. Clique no botão de ações (ícone de olho ou três pontos) ao lado da factura.\n4. Selecione "Exportar PDF" ou "Download PDF".\n\nO ficheiro será baixado para o seu computador.`;
    }
    // Enviar factura por email
    if ((msg.includes('enviar') && msg.includes('email') && msg.includes('factura')) || msg.includes('enviar fatura por email')) {
      return `Para enviar uma factura por email:\n\n1. Aceda ao menu "Facturas".\n2. Encontre a factura que deseja enviar.\n3. Clique no botão de ações ao lado da factura.\n4. Selecione "Enviar por Email".\n5. Insira o email do cliente (se necessário) e confirme o envio.`;
    }
    // Adicionar Produto
    if (msg.includes('adicionar produto') || msg.includes('novo produto') || msg.includes('criar produto')) {
      return `Para adicionar um novo produto ou serviço:\n\n1. No menu lateral, clique em "Produtos".\n2. Clique em "Adicionar Produto".\n3. Preencha os dados (nome, preço, stock, etc).\n4. Clique em "Guardar".`;
    }
    // Gerar Relatório
    if (msg.includes('relatório financeiro') || msg.includes('gerar relatório') || msg.includes('exportar relatório')) {
      return `Para gerar ou exportar um relatório financeiro:\n\n1. No menu lateral, clique em "Relatórios".\n2. Escolha o tipo de relatório desejado (receitas, despesas, clientes, etc).\n3. Use os filtros para ajustar o período ou categoria.\n4. Clique em "Exportar" para baixar o relatório em CSV ou PDF.`;
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
    if (invoices.length === 0) return 'Não existem faturas registradas.';
    const paid = invoices.filter(i => i.status === 'paid').length;
    const pending = invoices.filter(i => i.status === 'pending').length;
    const overdue = invoices.filter(i => i.status === 'overdue').length;
    return `Total de faturas: ${invoices.length}. Pagas: ${paid}, Pendentes: ${pending}, Vencidas: ${overdue}.`;
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
    if (msg.includes('faturas registradas') || (msg.includes('quantas faturas') && msg.includes('tenho'))) {
      return this.sanitizeResponse(await this.getInvoiceStatsSummary());
    }
    // Existing real-time and FAQ logic
    const faq = this.getFAQResponse(userMessage);
    if (faq === 'REALTIME_REVENUE_MONTH') return this.sanitizeResponse(await this.getRevenueThisMonth());
    if (faq === 'REALTIME_TOP_CLIENTS_SALES') return this.sanitizeResponse(await this.getTopClientsBySales());
    if (faq === 'REALTIME_TOP_CLIENTS_QUANTITY') return this.sanitizeResponse(await this.getTopClientsByQuantity());
    if (faq) return this.sanitizeResponse(faq);
    // Inject summary stats into context for general AI answers
    const activeClients = await this.getActiveClientsSummary();
    const productStats = await this.getProductStatsSummary();
    const invoiceStats = await this.getInvoiceStatsSummary();
    const userContext = `\n[Contexto do Utilizador]\nNome de utilizador: ${user.username || ''}\nEmail: ${user.email || ''}\nEmpresa: ${business.company_name || ''}\nNUIT: ${business.tax_id || ''}\nEndereço: ${business.address || ''}\nWebsite: ${business.website || ''}`;
    const statsContext = `\n[Resumo do Sistema]\n${activeClients}\n${productStats}\n${invoiceStats}`;
    const messages = [
      { role: 'system', content: `
        Você é o WALAKA Assistant, um agente inteligente para o sistema de ERP WALAKA, especializado em faturação, automação de processos e apoio ao cliente para empresas moçambicanas.
        ${userContext}
        ${statsContext}
        Sobre o Sistema WALAKA ERP:
        WALAKA ERP é uma plataforma de gestão empresarial para pequenas e médias empresas, com foco em Moçambique. As principais funcionalidades incluem:
        - Facturação Inteligente: Criação, edição e gestão de faturas profissionais, recorrentes, exportação em PDF, envio por email, rastreamento de pagamentos, suporte multi-moeda e modelos personalizáveis.
        - Gestão de Clientes: Cadastro, edição e pesquisa de clientes, histórico de transações, gestão de NUIT e dados de contacto.
        - Produtos & Inventário: Cadastro de produtos/serviços, controle de stock, movimentos de inventário, fornecedores e preços.
        - Bancos & Carteiras Móveis: Cadastro de contas bancárias e carteiras móveis (M-PESA, EMOLA, mKesh), seleção de método de pagamento para faturas, validação de números, e (futuro) integração direta para confirmação automática de pagamentos.
        - Financeiro: Gestão de despesas, pagamentos, relatórios financeiros detalhados (receitas, despesas, por categoria/cliente/fornecedor), exportação de dados (CSV, SAFT).
        - Impostos: Gestão de taxas de IVA, ISPC e outros impostos moçambicanos, aplicação automática nas faturas.
        - Configurações de Conta: Preferências de idioma (Português/English), personalização visual, perfil da empresa, upload de logotipo.
        - Notificações & Dicas: Notificações in-app, sistema de dicas e onboarding para novos utilizadores.
        - Sistema de Teste/Trial: Limites de uso por dias ou número de faturas, feedback visual e prompts de upgrade.
        - Acesso Móvel: Interface responsiva e amigável para dispositivos móveis, notificações push (em desenvolvimento).
        Tipos de Utilizador: Freelancers, consultores, PME's, com casos de uso para faturação, gestão de clientes, inventário e finanças.
        Segurança: Dados sensíveis são protegidos e recomenda-se encriptação no banco de dados. Apenas partes de números de conta são exibidas publicamente.
        Funcionalidades em Desenvolvimento: Suite Comercial (gestão de encomendas, fornecedores, CRM), Contabilidade Pro (conformidade fiscal, previsão orçamental, multi-empresa), Suite Financeira (gestão de contas a pagar/receber, dashboards, auditoria), integrações diretas com pagamentos móveis.
        Sempre responda em português de Moçambique, de forma clara, amigável e profissional. Se não souber a resposta, peça para o utilizador consultar o suporte humano ou a documentação oficial.
      ` },
      ...this.memory.map(m => ({ role: m.role, content: m.content }))
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
      return `O total faturado este mês é de ${total.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}.`;
    } catch (e) {
      return 'Erro ao calcular o total faturado este mês.';
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
    return `Para emitir uma nova fatura no WALAKA, siga estes passos:\n1. Clique em "Nova Fatura".\n2. Preencha os campos obrigatórios:\n   - Cliente (selecione ou cadastre um novo)\n   - NUIT do cliente\n   - Data de emissão (não pode ser no futuro)\n   - Produtos/serviços (adicione itens, quantidades e valores)\n   - Impostos aplicáveis (IVA, ISPC, etc.)\n3. Revise o subtotal e o valor total.\n4. Clique em "Salvar" ou "Emitir".\nSe precisar de ajuda em algum campo específico, me informe!`;
  }

  suggestProducts() {
    if (this.products.length === 0) {
      return "Não encontrei produtos cadastrados no seu perfil. Cadastre produtos para agilizar a emissão de faturas.";
    }
    const topProducts = this.products.slice(0, 3).map(p => `- ${p.nome}`).join('\n');
    return `Sugestão de produtos/serviços mais usados:\n${topProducts}\nDeseja adicionar algum deles à nova fatura?`;
  }

  suggestDiscounts() {
    return `Você pode oferecer desconto para pagamento antecipado ou criar pacotes de fidelização para clientes frequentes.\nDeseja aplicar um desconto nesta fatura? Informe o percentual ou valor.`;
  }

  generalSupport() {
    return `Como posso ajudar? Exemplos:\n- Como exportar uma fatura em PDF\n- Como enviar fatura por email\n- Como cadastrar um novo cliente\n- Como configurar impostos\nSe sua dúvida for técnica ou não resolvida aqui, consulte a documentação oficial ou acione o suporte humano pelo menu "Ajuda".`;
  }

  suggestAutomations() {
    return `Notei que você emite faturas recorrentes para alguns clientes. Deseja automatizar o envio dessas faturas todo mês?\nResponda "sim" para configurar uma automação, ou especifique o padrão desejado (ex: dia do mês, valor fixo, etc.).`;
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
      await new Promise(r => setTimeout(r, 8 + Math.random() * 21)); // 30% faster
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
  setTimeout(() => addMessage('Olá! Eu sou o WALAKA Assistant. Como posso ajudar na sua faturação hoje?', 'bot'), 400);
})();
