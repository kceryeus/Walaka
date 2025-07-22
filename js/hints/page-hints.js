// Page-specific hints configuration
const pageHintsConfig = {
    // Invoices page hints
    'invoices': {
        'createInvoiceBtn': {
            title: {
                en: "Create Invoice",
                pt: "Criar Factura"
            },
            description: {
                en: "Click here to create a new invoice",
                pt: "Clique aqui para criar uma nova factura"
            }
        },
        'invoiceList': {
            title: {
                en: "Invoice List",
                pt: "Lista de Facturas"
            },
            description: {
                en: "View and manage all your invoices here",
                pt: "Veja e gerencie todas as suas facturas aqui"
            }
        },
        'filterInvoices': {
            title: {
                en: "Filter Invoices",
                pt: "Filtrar Facturas"
            },
            description: {
                en: "Use these filters to find specific invoices",
                pt: "Use estes filtros para encontrar facturas específicas"
            }
        },
        'exportInvoices': {
            title: {
                en: "Export Data",
                pt: "Exportar Dados"
            },
            description: {
                en: "Export your invoice data in various formats",
                pt: "Exporte os seus dados de facturas em vários formatos"
            }
        },
        'invoiceMetrics': {
            title: 'Métricas',
            description: 'Resumo rápido da saúde financeira: Total, Pagas, Pendentes e Vencidas.'
        },
        'productName': {
            title: 'Nome do Produto',
            description: 'Digite o nome do produto ou serviço a ser facturado.'
        },
        'productQuantity': {
            title: 'Quantidade',
            description: 'Especifique a quantidade. O valor total será calculado automaticamente.'
        },
        'productPrice': {
            title: 'Preço',
            description: 'Digite o preço unitário. Impostos serão aplicados automaticamente.'
        },
        'saveProductBtn': {
            title: 'Salvar Produto',
            description: 'Salve os detalhes do produto na factura. Você pode editar depois.'
        },
        'creditNotesTab': {
            title: 'Notas de Crédito',
            description: 'Gerencie notas de crédito para ajustes e devoluções.'
        },
        'debitNotesTab': {
            title: 'Notas de Débito',
            description: 'Gerencie notas de débito para cobranças adicionais.'
        },
        'receiptsTab': {
            title: 'Recibos',
            description: 'Acesse e gerencie todos os recibos emitidos.'
        },
        'invoice-number': {
            title: 'Número da Fatura',
            description: 'Número sequencial único para cada factura. O sistema gera automaticamente, mas pode ser personalizado.'
        },
        'client-select': {
            title: 'Seleção de Cliente',
            description: 'Escolha o cliente para a factura. Se o cliente não existir, você pode adicionar um novo clicando em "Novo Cliente".'
        },
        'invoice-date': {
            title: 'Data da Fatura',
            description: 'Data de emissão da factura. Importante para controle fiscal e financeiro.'
        },
        'due-date': {
            title: 'Data de Vencimento',
            description: 'Data limite para pagamento. Defina prazos realistas considerando o fluxo de caixa do cliente.'
        },
        'product-select': {
            title: 'Seleção de Produto',
            description: 'Adicione produtos ou serviços à factura. Você pode ajustar quantidades e preços conforme necessário.'
        },
        'payment-terms': {
            title: 'Termos de Pagamento',
            description: 'Especifique as condições de pagamento, como método preferido e prazo de pagamento.'
        },
        'notes': {
            title: 'Observações',
            description: 'Adicione informações adicionais importantes, como instruções especiais ou termos específicos.'
        },
        'exportSaft': {
            title: 'Exportar SAFT',
            description: 'Gere o arquivo SAFT (Standard Audit File for Tax) para declaração fiscal. Inclui todas as transações do período selecionado.'
        },
        'exportCsv': {
            title: 'Exportar CSV',
            description: 'Exporte dados das facturas em formato CSV para análise em Excel ou outros programas. Escolha os campos a serem incluídos.'
        },
        'exportPeriod': {
            title: 'Período de Exportação',
            description: 'Selecione o período para exportação: Mês atual, Trimestre, Ano ou Personalizado.'
        },
        'exportOptions': {
            title: 'Opções de Exportação',
            description: 'Escolha entre exportar todas as facturas ou apenas as selecionadas. Configure filtros adicionais se necessário.'
        },
        'revenueDistribution': {
            title: 'Distribuição de Receitas',
            description: 'Visualize a distribuição de receitas por cliente, produto ou período. Útil para análise de desempenho.'
        },
        'revenueStatus': {
            title: 'Status das Receitas',
            description: 'Acompanhe o status das receitas: Recebidas, Pendentes, Vencidas ou Atrasadas.'
        },
        'revenueChart': {
            title: 'Gráfico de Receitas',
            description: 'Visualize a evolução das receitas ao longo do tempo. Compare períodos e identifique tendências.'
        },
        'revenueByClient': {
            title: 'Receitas por Cliente',
            description: 'Análise detalhada das receitas por cliente. Identifique os principais contribuintes para o facturamento.'
        },
        'revenueByProduct': {
            title: 'Receitas por Produto',
            description: 'Distribuição das receitas por produto ou serviço. Ajuda a identificar os itens mais rentáveis.'
        },
        'revenueMetrics': {
            title: 'Métricas de Receita',
            description: 'Indicadores-chave: Total de Receitas, Média por Fatura, Taxa de Crescimento e Margem de Lucro.'
        },
        'exportFormat': {
            title: 'Formato de Exportação',
            description: 'Escolha o formato: SAFT-PT (Portugal), SAFT-MOZ (Moçambique) ou CSV personalizado.'
        },
        'exportFields': {
            title: 'Campos para Exportação',
            description: 'Selecione quais campos incluir na exportação: Número da Fatura, Data, Cliente, Valor, Status, etc.'
        },
        'exportFilters': {
            title: 'Filtros de Exportação',
            description: 'Aplique filtros por data, cliente, valor ou status antes de exportar os dados.'
        },
        'revenueComparison': {
            title: 'Comparação de Receitas',
            description: 'Compare receitas entre períodos diferentes para análise de crescimento e sazonalidade.'
        },
        'revenueForecast': {
            title: 'Previsão de Receitas',
            description: 'Projeção de receitas futuras baseada no histórico e tendências atuais.'
        },
        'revenueAlerts': {
            title: 'Alertas de Receita',
            description: 'Configure alertas para metas de receita, quedas significativas ou oportunidades de crescimento.'
        }
    },

    // Dashboard page hints
    'dashboard': {
        'revenueChart': {
            title: 'Gráfico de Receitas Mensais',
            description: 'Visualize o desempenho financeiro do seu negócio. Use os botões "Mensal" e "Trimestral" para alternar a visualização.'
        },
        'invoiceStatusChart': {
            title: 'Status das Faturas',
            description: 'Distribuição das facturas por status: Pagas, Pendentes ou Vencidas. Clique nas legendas para filtrar.'
        },
        'invoiceStats': {
            title: 'Estatísticas de Faturas',
            description: 'Métricas principais: total de facturas, pagas, pendentes e vencidas. Atualizado em tempo real.'
        },
        'topClients': {
            title: 'Principais Clientes',
            description: 'Resumo dos clientes com melhor desempenho, baseado em engajamento e valor.'
        },
        'quickActions': {
            title: 'Ações Rápidas',
            description: 'Acesse rapidamente tarefas comuns: criar factura, adicionar cliente, adicionar produto ou exportar relatório.'
        },
        'newInvoiceCard': {
            title: 'Nova Fatura',
            description: 'Inicie o processo de criação de uma nova factura. Escolha entre factura normal ou recibo.'
        },
        'addClientCard': {
            title: 'Adicionar Cliente',
            description: 'Cadastre um novo cliente no sistema. Preencha os dados básicos e adicione mais informações depois.'
        },
        'addProductCard': {
            title: 'Adicionar Produto',
            description: 'Cadastre um novo produto no inventário. Inclua preço, estoque e impostos.'
        },
        'exportReportCard': {
            title: 'Exportar Relatório',
            description: 'Gere e baixe relatórios em diferentes formatos para análise de dados do negócio.'
        },
        'recentInvoicesTable': {
            title: 'Faturas Recentes',
            description: 'Lista das facturas mais recentes. Filtre por Status, Período ou Valor para encontrar facturas específicas.'
        },
        'statusFilter': {
            title: 'Filtro por Status',
            description: 'Filtre facturas por status: Todas, Pagas, Pendentes, Vencidas ou Canceladas.'
        },
        'dateRangeFilter': {
            title: 'Filtro por Data',
            description: 'Selecione um período específico: Hoje, Última Semana, Último Mês ou Personalizado.'
        },
        'amountFilter': {
            title: 'Filtro por Valor',
            description: 'Filtre facturas por faixa de valor. Defina valores mínimo e máximo.'
        },
        'languageToggle': {
            title: 'Alterar Idioma',
            description: 'Mude entre Português e Inglês para uma experiência personalizada.'
        },
        'revenue-metric': {
            title: 'Receitas',
            description: 'Mostra o total de receitas do período selecionado. Inclui todas as facturas pagas e recebimentos confirmados.'
        },
        'expenses-metric': {
            title: 'Despesas',
            description: 'Total de despesas registradas no período. Mantenha um registro detalhado para melhor controle financeiro.'
        },
        'profit-metric': {
            title: 'Lucro',
            description: 'Diferença entre receitas e despesas. Um indicador importante da saúde financeira do seu negócio.'
        },
        'pending-invoices': {
            title: 'Faturas Pendentes',
            description: 'Faturas emitidas que ainda não foram pagas. Acompanhe para melhor gestão do fluxo de caixa.'
        }
    },

    // Clients page hints
    'clients': {
        'addClientBtn': {
            title: 'Adicionar Cliente',
            description: 'Clique para abrir o formulário e adicionar um novo cliente ao banco de dados.'
        },
        'clientList': {
            title: 'Lista de Clientes',
            description: 'Visualize todos os clientes com suas informações principais.'
        },
        'clientSearch': {
            title: 'Pesquisar Clientes',
            description: 'Encontre clientes específicos por nome ou outros detalhes identificadores.'
        },
        'clientFilters': {
            title: 'Filtros de Cliente',
            description: 'Aplique filtros para refinar a lista por tipo de cliente ou status.'
        },
        'client-type': {
            title: 'Tipo de Cliente',
            description: 'Selecione "Empresa" para clientes corporativos ou "Individual" para pessoas físicas.'
        },
        'company-name': {
            title: 'Nome da Empresa',
            description: 'Digite o nome completo da empresa ou razão social. Ex: "Empresa XYZ, Lda"'
        },
        'customer-tax-id': {
            title: 'NIF/NUIT',
            description: 'Digite o número de identificação fiscal. Para empresas: 9 dígitos. Para indivíduos: número do BI.'
        },
        'contact': {
            title: 'Contato',
            description: 'Nome da pessoa de contato principal na empresa. Ex: "João Silva"'
        },
        'billing-address': {
            title: 'Endereço de Faturação',
            description: 'Endereço completo para envio de facturas. Inclua rua, número e complemento.'
        },
        'street-name': {
            title: 'Rua',
            description: 'Nome da rua ou avenida. Ex: "Avenida Principal"'
        },
        'address-detail': {
            title: 'Detalhe do Endereço',
            description: 'Informações adicionais como andar, sala, referências. Ex: "Edifício ABC, 2º Andar"'
        },
        'city': {
            title: 'Cidade',
            description: 'Nome da cidade onde está localizado o cliente.'
        },
        'postal-code': {
            title: 'Código Postal',
            description: 'Código postal da localização. Formato: XXXX-XXX'
        },
        'province': {
            title: 'Província',
            description: 'Nome da província ou estado onde está localizado o cliente.'
        },
        'country': {
            title: 'País',
            description: 'Nome do país. Por padrão: "Moçambique"'
        },
        'ship-to-address': {
            title: 'Endereço de Entrega',
            description: 'Endereço alternativo para entrega de mercadorias, se diferente do endereço de facturação.'
        },
        'building-number': {
            title: 'Número do Prédio',
            description: 'Número do edifício ou prédio. Ex: "123"'
        },
        'telephone': {
            title: 'Telefone',
            description: 'Número de telefone com código do país. Ex: "+258 84 123 4567"'
        },
        'fax': {
            title: 'Fax',
            description: 'Número de fax, se disponível. Formato: "+258 XX XXX XXXX"'
        },
        'email': {
            title: 'Email',
            description: 'Endereço de email para comunicação. Ex: "contato@empresa.com"'
        },
        'website': {
            title: 'Website',
            description: 'URL do site da empresa. Ex: "www.empresa.com"'
        }
    },

    // Products page hints
    'products': {
        'addProductBtn': {
            title: 'Adicionar Produto',
            description: 'Clique para abrir o formulário e adicionar um novo produto ao inventário.'
        },
        'productList': {
            title: 'Lista de Produtos',
            description: 'Visualize todos os produtos com detalhes como nome, preço e níveis de estoque.'
        },
        'productSearch': {
            title: 'Pesquisar Produtos',
            description: 'Encontre produtos específicos por nome ou outras palavras-chave.'
        },
        'productCategories': {
            title: 'Categorias',
            description: 'Organize produtos em categorias para gestão e relatórios mais eficientes.'
        },
        'productStock': {
            title: 'Gestão de Stock',
            description: 'Visualize e atualize níveis de estoque para seus produtos.'
        },
        'description': {
            title: 'Descrição do Produto',
            description: 'Nome completo e descritivo do produto. Ex: "Notebook Dell Latitude 5420"'
        },
        'price': {
            title: 'Preço',
            description: 'Preço de venda em Meticais (MZN). Use ponto para decimais. Ex: "15000.00"'
        },
        'tax-code': {
            title: 'Código Fiscal (SAT)',
            description: 'Código do produto conforme tabela do Sistema de Administração Tributária. Ex: "10101"'
        },
        'vat': {
            title: 'Taxa de IVA',
            description: 'Selecione a taxa de IVA aplicável: 16% (padrão), 5% (reduzida) ou Isento.'
        },
        'other-vat': {
            title: 'Outra Taxa de IVA',
            description: 'Digite uma taxa personalizada de IVA (entre 0% e 100%) se necessário.'
        },
        'industry': {
            title: 'Indústria (SAT)',
            description: 'Categoria da indústria conforme classificação do SAT. Ex: "Comércio", "Serviços"'
        },
        'product-code': {
            title: 'Código do Produto',
            description: 'Código interno único para identificação. Ex: "NB-DELL-5420"'
        },
        'unit': {
            title: 'Unidade',
            description: 'Unidade de medida do produto. Ex: "Unidade", "Kg", "Litro"'
        },
        'min-stock': {
            title: 'Estoque Mínimo',
            description: 'Quantidade mínima em estoque para gerar alerta. Ex: "5"'
        },
        'max-stock': {
            title: 'Estoque Máximo',
            description: 'Quantidade máxima recomendada em estoque. Ex: "50"'
        },
        'supplier': {
            title: 'Fornecedor',
            description: 'Nome do fornecedor principal do produto.'
        },
        'cost-price': {
            title: 'Preço de Custo',
            description: 'Preço de compra do produto em Meticais (MZN).'
        },
        'profit-margin': {
            title: 'Margem de Lucro',
            description: 'Percentual de lucro desejado. Ex: "20" para 20%'
        }
    },

    // General elements (applied to all pages)
    'general': {
        'sidebarMenu': {
            title: 'Menu Principal',
            description: 'Navegue entre as seções: Dashboard, Faturas, Clientes, Produtos e mais.'
        },
        'menuToggle': {
            title: 'Recolher Menu',
            description: 'Clique para recolher ou expandir o menu lateral.'
        },
        'userProfile': {
            title: 'Perfil do Usuário',
            description: 'Acesse seu perfil, configurações, ajuda ou faça logout.'
        },
        'notifications': {
            title: 'Notificações',
            description: 'Veja alertas sobre facturas vencidas, estoque baixo e outras notificações importantes.'
        }
    }
};

// Initialize hints for the current page
document.addEventListener('DOMContentLoaded', () => {
    const hints = new WalakaHints();
    
    // Determine current page
    const currentPage = getCurrentPage();
    const pageHints = pageHintsConfig[currentPage];
    const generalHints = pageHintsConfig.general;

    if (pageHints) {
        // Register hints for the current page
        Object.entries(pageHints).forEach(([elementId, { title, description }]) => {
            if (document.getElementById(elementId)) {
                hints.addHint(elementId, title, description);
            }
        });

        // Register general hints
        Object.entries(generalHints).forEach(([elementId, { title, description }]) => {
            if (document.getElementById(elementId)) {
                hints.addHint(elementId, title, description);
            }
        });
    }
});

// Helper function to determine current page
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('invoices')) return 'invoices';
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('clients')) return 'clients';
    if (path.includes('products')) return 'products';
    return null;
}

class PageHints {
    constructor() {
        this.hints = {
            dashboard: [
                {
                    id: 'revenue-metric',
                    title: 'Receitas',
                    description: 'Mostra o total de receitas do período selecionado. Inclui todas as facturas pagas e recebimentos confirmados.'
                },
                {
                    id: 'expenses-metric',
                    title: 'Despesas',
                    description: 'Total de despesas registradas no período. Mantenha um registro detalhado para melhor controle financeiro.'
                },
                {
                    id: 'profit-metric',
                    title: 'Lucro',
                    description: 'Diferença entre receitas e despesas. Um indicador importante da saúde financeira do seu negócio.'
                },
                {
                    id: 'pending-invoices',
                    title: 'Faturas Pendentes',
                    description: 'Faturas emitidas que ainda não foram pagas. Acompanhe para melhor gestão do fluxo de caixa.'
                },
                {
                    id: 'revenue-chart',
                    title: 'Gráfico de Receitas',
                    description: 'Visualização da evolução das receitas ao longo do tempo. Útil para identificar tendências e sazonalidade.'
                },
                {
                    id: 'expenses-chart',
                    title: 'Gráfico de Despesas',
                    description: 'Acompanhamento das despesas por categoria. Ajude a identificar áreas onde é possível reduzir custos.'
                }
            ],
            invoices: [
                {
                    id: 'invoice-number',
                    title: 'Número da Fatura',
                    description: 'Número sequencial único para cada factura. O sistema gera automaticamente, mas pode ser personalizado.'
                },
                {
                    id: 'client-select',
                    title: 'Seleção de Cliente',
                    description: 'Escolha o cliente para a factura. Se o cliente não existir, você pode adicionar um novo clicando em "Novo Cliente".'
                },
                {
                    id: 'invoice-date',
                    title: 'Data da Fatura',
                    description: 'Data de emissão da factura. Importante para controle fiscal e financeiro.'
                },
                {
                    id: 'due-date',
                    title: 'Data de Vencimento',
                    description: 'Data limite para pagamento. Defina prazos realistas considerando o fluxo de caixa do cliente.'
                },
                {
                    id: 'product-select',
                    title: 'Seleção de Produto',
                    description: 'Adicione produtos ou serviços à factura. Você pode ajustar quantidades e preços conforme necessário.'
                },
                {
                    id: 'payment-terms',
                    title: 'Termos de Pagamento',
                    description: 'Especifique as condições de pagamento, como método preferido e prazo de pagamento.'
                },
                {
                    id: 'notes',
                    title: 'Observações',
                    description: 'Adicione informações adicionais importantes, como instruções especiais ou termos específicos.'
                }
            ],
            clients: [
                {
                    id: 'client-name',
                    title: 'Nome do Cliente',
                    description: 'Nome completo ou razão social do cliente. Use um formato consistente para melhor organização.'
                },
                {
                    id: 'client-email',
                    title: 'Email',
                    description: 'Email principal para comunicação. Importante para envio de facturas e notificações.'
                },
                {
                    id: 'client-phone',
                    title: 'Telefone',
                    description: 'Número de contato principal. Inclua código do país e DDD para clientes internacionais.'
                },
                {
                    id: 'client-address',
                    title: 'Endereço',
                    description: 'Endereço completo para correspondência e facturamento. Inclua CEP e país quando relevante.'
                },
                {
                    id: 'client-tax-id',
                    title: 'NIF/NIPC',
                    description: 'Número de identificação fiscal do cliente. Necessário para facturação e relatórios fiscais.'
                },
                {
                    id: 'client-category',
                    title: 'Categoria',
                    description: 'Classifique o cliente para melhor organização. Ex: Regular, VIP, Corporativo, etc.'
                },
                {
                    id: 'client-notes',
                    title: 'Observações',
                    description: 'Informações adicionais sobre o cliente, como preferências, histórico ou termos especiais.'
                }
            ],
            products: [
                {
                    id: 'product-name',
                    title: 'Nome do Produto',
                    description: 'Nome descritivo do produto ou serviço. Seja específico para facilitar a identificação.'
                },
                {
                    id: 'product-code',
                    title: 'Código',
                    description: 'Código único para identificação do produto. Útil para controle de estoque e referência rápida.'
                },
                {
                    id: 'product-description',
                    title: 'Descrição',
                    description: 'Detalhes do produto ou serviço. Inclua características principais e especificações técnicas.'
                },
                {
                    id: 'product-price',
                    title: 'Preço',
                    description: 'Preço de venda do produto. Considere custos, margem de lucro e preços de mercado.'
                },
                {
                    id: 'product-category',
                    title: 'Categoria',
                    description: 'Classificação do produto. Ajude na organização e relatórios de vendas por categoria.'
                },
                {
                    id: 'product-tax',
                    title: 'Imposto',
                    description: 'Taxa de imposto aplicável. Configure corretamente para cálculos fiscais precisos.'
                },
                {
                    id: 'product-stock',
                    title: 'Estoque',
                    description: 'Quantidade disponível em estoque. Mantenha atualizado para controle de inventário.'
                }
            ]
        };
    }

    initPageHints(pageName) {
        if (!this.hints[pageName]) return;

        const pageHints = this.hints[pageName];
        pageHints.forEach(hint => {
            const element = document.getElementById(hint.id);
            if (element && window.walakaHints) {
                window.walakaHints.addHint(hint.id, hint.title, hint.description);
            }
        });
    }
}

// Initialize page hints when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for WalakaHints to be initialized
    const checkWalakaHints = setInterval(() => {
        if (window.walakaHints) {
            clearInterval(checkWalakaHints);
            const pageHints = new PageHints();
            const currentPage = document.body.dataset.page;
            if (currentPage) {
                pageHints.initPageHints(currentPage);
            }
        }
    }, 100);
});
