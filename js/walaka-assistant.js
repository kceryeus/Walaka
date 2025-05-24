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
    const apiKey = "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";
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "qwen/qwen3-30b-a3b:free",
          messages: messages
        })
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

  // Substituir handleMessage para usar IA
  async handleMessage(userMessage) {
    this.memory.push({ role: 'user', content: userMessage });
    const messages = [
      { role: 'system', content: `Você é o WALAKA Assistant, um agente inteligente para o sistema de ERP WALAKA. Sua função é atuar como um assistente virtual especializado em faturação, automação de processos e apoio ao cliente. Responda sempre em português de Moçambique, de forma clara, amigável e profissional.` },
      ...this.memory.map(m => ({ role: m.role, content: m.content }))
    ];
    const aiResponse = await this.callOpenRouter(messages);
    this.memory.push({ role: 'assistant', content: aiResponse });
    return aiResponse;
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
    <div id="walaka-chatbot" style="position:fixed;bottom:24px;right:24px;z-index:9999;width:340px;max-width:95vw;font-family:Inter,sans-serif;box-shadow:0 4px 24px rgba(0,0,0,0.18);border-radius:16px 16px 0 0;background:#fff;overflow:hidden;">
      <div style="background:#2b4a6f;color:#fff;padding:12px 16px;font-weight:600;display:flex;align-items:center;gap:8px;">
        <i class="fas fa-robot"></i> WALAKA Assistant
        <span style="flex:1"></span>
        <button id="walaka-chatbot-close" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;">&times;</button>
      </div>
      <div id="walaka-chatbot-messages" style="height:260px;overflow-y:auto;padding:12px 8px 8px 8px;background:#f7fafd;"></div>
      <form id="walaka-chatbot-form" style="display:flex;gap:8px;padding:8px;background:#f7fafd;border-top:1px solid #e0e6ed;">
        <input id="walaka-chatbot-input" type="text" placeholder="Como posso ajudar?" style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid #c3cfe2;font-size:15px;outline:none;" autocomplete="off" />
        <button type="submit" style="background:#2b4a6f;color:#fff;border:none;border-radius:8px;padding:0 16px;font-size:15px;cursor:pointer;">Enviar</button>
      </form>
    </div>
    <button id="walaka-chatbot-toggle" style="position:fixed;bottom:24px;right:24px;z-index:9998;background:#2b4a6f;color:#fff;border:none;border-radius:50%;width:56px;height:56px;box-shadow:0 2px 8px rgba(0,0,0,0.18);font-size:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
      <i class="fas fa-robot"></i>
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

  function formatBold(text) {
    // Converte **texto** para <b>texto</b> e ### para quebra de linha dupla
    return text
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/###/g, '<br><br>');
  }

  function addMessage(content, sender = 'user') {
    const msg = document.createElement('div');
    msg.style.margin = '8px 0';
    msg.style.textAlign = sender === 'user' ? 'right' : 'left';
    // Aplica o formatBold para destacar em bold
    msg.innerHTML = `<span style="display:inline-block;max-width:80%;padding:8px 12px;border-radius:12px;background:${sender==='user'?'#e0e6ed':'#fff'};color:#222;font-size:15px;">${formatBold(content)}</span>`;
    messagesDiv.appendChild(msg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  form.onsubmit = async function(e) {
    e.preventDefault();
    const userMsg = input.value.trim();
    if (!userMsg) return;
    addMessage(userMsg, 'user');
    input.value = '';
    const response = await window.walakaAssistant.handleMessage(userMsg);
    setTimeout(() => addMessage(response, 'bot'), 400);
  };

  // Welcome message
  setTimeout(() => addMessage('Olá! Eu sou o WALAKA Assistant. Como posso ajudar na sua faturação hoje?', 'bot'), 400);
})();
