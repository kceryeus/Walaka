// Supabase initialization (ensure this is done only once)
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to initialize local storage for invoices
function initializeLocalStorage() {
  if (typeof localStorage !== 'undefined') {
    if (!localStorage.getItem('invoices')) {
      localStorage.setItem('invoices', JSON.stringify([]));
      console.log('Armazenamento local inicializado para faturas.');
    } else {
      console.log('O armazenamento local para faturas já existe.');
    }
  } else {
    console.error('O armazenamento local não é compatível com este navegador.');
  }
}

// Call this function when your script is loaded to ensure local storage is initialized
initializeLocalStorage();

function addInvoiceToLocalStorage(invoice) {
    let invoices = JSON.parse(localStorage.getItem('invoices')) || [];
    invoices.push(invoice);
    localStorage.setItem('invoices', JSON.stringify(invoices));
}

function getInvoicesFromLocalStorage() {
    return JSON.parse(localStorage.getItem('invoices')) || [];
}

function clearInvoicesFromLocalStorage() {
    localStorage.removeItem('invoices');
}

// Function to update invoice metrics
function updateInvoiceMetrics() {
  const invoices = getInvoicesFromLocalStorage();

  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(invoice => invoice.status === 'paid').length;
  const pendingInvoices = invoices.filter(invoice => invoice.status === 'pending').length;
  const overdueInvoices = invoices.filter(invoice => invoice.status === 'overdue').length;

  const paidPercentage = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;
  const pendingPercentage = totalInvoices > 0 ? (pendingInvoices / totalInvoices) * 100 : 0;
  const overduePercentage = totalInvoices > 0 ? (overdueInvoices / totalInvoices) * 100 : 0;

  // Calculate total revenue
  const totalRevenue = invoices.reduce((sum, invoice) => sum + (invoice.totalAmountPayable || 0), 0);

  // Calculate revenue this month
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const revenueThisMonth = invoices.filter(invoice => {
    const issueDate = new Date(invoice.issueDate);
    return issueDate.getMonth() === thisMonth && issueDate.getFullYear() === thisYear;
  }).reduce((sum, invoice) => sum + (invoice.totalAmountPayable || 0), 0);

  // Calculate average invoice amount
  const averageInvoiceAmount = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  document.getElementById('totalInvoicesCard').querySelector('.metric-value').textContent = totalInvoices;
  document.getElementById('paidInvoicesCard').querySelector('.metric-value').textContent = paidInvoices;
  document.getElementById('paidInvoicesCard').querySelector('.metric-footer .metric-label').textContent = `${paidPercentage.toFixed(1)}% of Total`;
  document.getElementById('pendingInvoicesCard').querySelector('.metric-value').textContent = pendingInvoices;
  document.getElementById('pendingInvoicesCard').querySelector('.metric-footer .metric-label').textContent = `${pendingPercentage.toFixed(1)}% of Total`;
  document.getElementById('overdueInvoicesCard').querySelector('.metric-value').textContent = overdueInvoices;
  document.getElementById('overdueInvoicesCard').querySelector('.metric-footer .metric-label').textContent = `${overduePercentage.toFixed(1)}% of Total`;

  // Add total revenue to the DOM
  document.getElementById('totalInvoicesCard').insertAdjacentHTML('afterend', `
    <div class="metric-card" id="totalRevenueCard">
      <div class="metric-header">
        <i class="fas fa-dollar-sign"></i>
        <span>Total Revenue</span>
      </div>
      <div class="metric-value">$${totalRevenue.toFixed(2)}</div>
      <div class="metric-footer">
        <span class="metric-label">All Time</span>
      </div>
    </div>
  `);

  // Add revenue this month to the DOM
  document.getElementById('totalRevenueCard').insertAdjacentHTML('afterend', `
    <div class="metric-card" id="revenueThisMonthCard">
      <div class="metric-header">
        <i class="fas fa-dollar-sign"></i>
        <span>Revenue This Month</span>
      </div>
      <div class="metric-value">$${revenueThisMonth.toFixed(2)}</div>
      <div class="metric-footer">
        <span class="metric-label">This Month</span>
      </div>
    </div>
  `);

  // Add average invoice amount to the DOM
  document.getElementById('revenueThisMonthCard').insertAdjacentHTML('afterend', `
    <div class="metric-card" id="averageInvoiceAmountCard">
      <div class="metric-header">
        <i class="fas fa-calculator"></i>
        <span>Average Invoice Amount</span>
      </div>
      <div class="metric-value">$${averageInvoiceAmount.toFixed(2)}</div>
      <div class="metric-footer">
        <span class="metric-label">Average</span>
      </div>
    </div>
  `);
}

// Function to handle form submission
async function handleInvoiceFormSubmit(event) {
  event.preventDefault(); // Prevent the default form submission

  // 1. Get form values
    const clientName = document.getElementById('clientName').value;
    const clientEmail = document.getElementById('clientEmail').value;
    const clientAddress = document.getElementById('clientAddress').value;
    const clientTaxId = document.getElementById('clientTaxId').value;
    const invoiceNumber = document.getElementById('invoiceNumber').value;
    const issueDate = document.getElementById('issueDate').value;
    const dueDate = document.getElementById('dueDate').value;
  const currency = document.getElementById('currency').value;
    const paymentTerms = document.getElementById('paymentTerms').value;
    const issuerName = document.getElementById('issuerName').value;
    const issuerNuit = document.getElementById('issuerNuit').value;
    const issuerAddress = document.getElementById('issuerAddress').value;
    const description = document.getElementById('description').value;
  const totalWithoutTaxes = parseFloat(document.getElementById('totalWithoutTaxes').value) || 0;
  const vatRate = parseFloat(document.getElementById('vatRate').value) || 0;
  const vatAmount = parseFloat(document.getElementById('vatAmount').value) || 0;
  const totalAmountPayable = parseFloat(document.getElementById('totalAmountPayable').value) || 0;
    const paymentConditions = document.getElementById('paymentConditions').value;
    const legalInfo = document.getElementById('legalInfo').value;
  const notes = document.getElementById('notes').value;

  // 2. Create invoice object
  const invoice = {
    id: invoiceNumber, // Use invoice number as ID
    clientName,
    clientEmail,
    clientAddress,
    clientTaxId,
    invoiceNumber,
    issueDate,
    dueDate,
    currency,
    paymentTerms,
    issuerName,
    issuerNuit,
    issuerAddress,
    description,
    totalWithoutTaxes,
    vatRate,
    vatAmount,
    totalAmountPayable,
    paymentConditions,
    legalInfo,
    notes,
    status: 'pending' // Default status
  };

  // 3. Save invoice to local storage
  addInvoiceToLocalStorage(invoice);

  // Also save to Supabase
  await insertInvoiceToSupabase(invoice);

  // 4. Refresh the invoice list (assuming you have a function to do this)
  await refreshInvoiceList();

  // 5. Update invoice metrics
  updateInvoiceMetrics();

  // 6. Close the modal
  closeModal();
}

// Function to insert invoice into Supabase
async function insertInvoiceToSupabase(invoice) {
        const { data, error } = await supabase
            .from('invoices')
            .insert([
                {
                    user_id: 'your-user-id', // Replace with the actual user ID
        issuer_name: invoice.issuerName,
        issuer_nuit: invoice.issuerNuit,
        issuer_address: invoice.issuerAddress,
        client_name: invoice.clientName,
        client_nuit: invoice.clientTaxId,
        client_address: invoice.clientAddress,
        invoice_number: invoice.invoiceNumber,
        issue_date: invoice.issueDate,
        description: invoice.description,
        total_without_taxes: invoice.totalWithoutTaxes,
        vat_rate: invoice.vatRate,
        vat_amount: invoice.vatAmount,
        total_amount_payable: invoice.totalAmountPayable,
        payment_conditions: invoice.paymentConditions,
        legal_info: invoice.legalInfo
                }
            ]);

        if (error) {
    console.error('Error inserting invoice into Supabase:', error);
    alert('Failed to create invoice in Supabase. See console for details.');
        } else {
    console.log('Invoice created successfully in Supabase:', data);
            alert('Invoice created successfully!');
        }
    }

// Add event listener to the form
document.getElementById('invoiceForm').addEventListener('submit', handleInvoiceFormSubmit);

// Envolva seu código em uma função async para usar 'await'
async function fetchInvoices() {
  const { data: invoices, error } = await supabase
    .from('invoices') // Substitua 'invoices' pelo nome real da sua tabela
    .select('*'); // Selecione todas as colunas

  if (error) {
    console.error('Erro ao buscar faturas:', error);
    return []; // Retorne um array vazio ou lide com o erro conforme necessário
  }

  return invoices;
}

function displayInvoices(invoices) {
  const tableBody = document.querySelector('#invoicesTable tbody');
  tableBody.innerHTML = ''; // Limpe as linhas da tabela existentes

  if (invoices.length === 0) {
    document.getElementById('noResultsMessage').style.display = 'block';
    return;
  } else {
    document.getElementById('noResultsMessage').style.display = 'none';
  }

  invoices.forEach(invoice => {
    const row = document.createElement('tr');
    row.setAttribute('data-invoice', invoice.invoice_number); // Use os nomes de coluna reais
    row.setAttribute('data-client', invoice.client_name);
    row.setAttribute('data-date', invoice.issue_date);
    row.setAttribute('data-duedate', invoice.due_date);
    row.setAttribute('data-amount', invoice.total_amount_payable); // Use total_amount_payable
    row.setAttribute('data-status', invoice.status);

    row.innerHTML = `
      <td>${invoice.invoice_number}</td>
      <td>${invoice.client_name}</td>
      <td>${new Date(invoice.issue_date).toLocaleDateString()}</td>
      <td>${new Date(invoice.due_date).toLocaleDateString()}</td>
      <td>$${invoice.total_amount_payable ? invoice.total_amount_payable.toFixed(2) : '0.00'}</td>
      <td><span class="status ${invoice.status}">${invoice.status}</span></td>
      <td class="actions">
        <button class="action-btn view-btn" data-invoice="${invoice.invoice_number}" title="View">
          <i class="fas fa-eye"></i>
        </button>
        <button class="action-btn edit-btn" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn send-btn" title="Send">
          <i class="fas fa-paper-plane"></i>
        </button>
        <button class="action-btn more-btn" title="More">
          <i class="fas fa-ellipsis-v"></i>
        </button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

// Call this function when the page is loaded
window.addEventListener('load', async () => {
  const invoices = await fetchInvoices();
  displayInvoices(invoices);
});

let currentPage = 1;
const invoicesPerPage = 6; // Number of invoices to display per page
let allInvoices = []; // Store all invoices fetched from Supabase

// Function to fetch invoices from Supabase
async function fetchInvoices() {
  const { data: invoices, error } = await supabase
    .from('invoices') // Substitua 'invoices' pelo nome real da sua tabela
    .select('*'); // Selecione todas as colunas

  if (error) {
    console.error('Erro ao buscar faturas:', error);
    return []; // Retorne um array vazio ou lide com o erro conforme necessário
  }

  return invoices;
}

// Function to display invoices for the current page
function displayInvoices(invoices) {
  const tableBody = document.querySelector('#invoicesTable tbody');
  tableBody.innerHTML = ''; // Clear existing table rows

  const startIndex = (currentPage - 1) * invoicesPerPage;
  const endIndex = startIndex + invoicesPerPage;
  const invoicesToDisplay = invoices.slice(startIndex, endIndex);

  if (invoicesToDisplay.length === 0) {
    document.getElementById('noResultsMessage').style.display = 'block';
    return;
  } else {
    document.getElementById('noResultsMessage').style.display = 'none';
  }

  invoicesToDisplay.forEach(invoice => {
    const row = document.createElement('tr');
    row.setAttribute('data-invoice', invoice.invoice_number); // Use os nomes de coluna reais
    row.setAttribute('data-client', invoice.client_name);
    row.setAttribute('data-date', invoice.issue_date);
    row.setAttribute('data-duedate', invoice.due_date);
    row.setAttribute('data-amount', invoice.total_amount_payable); // Use total_amount_payable
    row.setAttribute('data-status', invoice.status);

    row.innerHTML = `
      <td>${invoice.invoice_number}</td>
      <td>${invoice.client_name}</td>
      <td>${new Date(invoice.issue_date).toLocaleDateString()}</td>
      <td>${new Date(invoice.due_date).toLocaleDateString()}</td>
      <td>$${invoice.total_amount_payable ? invoice.total_amount_payable.toFixed(2) : '0.00'}</td>
      <td><span class="status ${invoice.status}">${invoice.status}</span></td>
      <td class="actions">
        <button class="action-btn view-btn" data-invoice="${invoice.invoice_number}" title="View">
          <i class="fas fa-eye"></i>
        </button>
        <button class="action-btn edit-btn" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn send-btn" title="Send">
          <i class="fas fa-paper-plane"></i>
        </button>
        <button class="action-btn more-btn" title="More">
          <i class="fas fa-ellipsis-v"></i>
        </button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

// Function to update pagination controls
function updatePagination() {
  const totalPages = Math.ceil(allInvoices.length / invoicesPerPage);
  const pageInfo = document.querySelector('.pagination .page-info');
  pageInfo.textContent = `Showing ${((currentPage - 1) * invoicesPerPage) + 1}-${Math.min(currentPage * invoicesPerPage, allInvoices.length)} of ${allInvoices.length} invoices`;

  const paginationBtns = document.querySelectorAll('.pagination-btn');
  paginationBtns.forEach(btn => btn.classList.remove('active'));

  const currentPageBtn = document.querySelector(`.pagination-btn:nth-child(${currentPage + 1})`); // +1 because of the "previous" button
  if (currentPageBtn) {
    currentPageBtn.classList.add('active');
  }

  // Disable/enable previous/next buttons
  document.querySelector('.pagination-btn:first-child').disabled = currentPage === 1;
  document.querySelector('.pagination-btn:last-child').disabled = currentPage === totalPages;
}

// Function to handle page navigation
function goToPage(pageNumber) {
  currentPage = Math.max(1, Math.min(pageNumber, Math.ceil(allInvoices.length / invoicesPerPage))); // Ensure pageNumber is within valid range
  displayInvoices(allInvoices);
  updatePagination();
}

// Event listeners for pagination buttons
document.addEventListener('click', (event) => {
  if (event.target.classList.contains('pagination-btn')) {
    const btn = event.target;
    if (btn.textContent === '<i class="fas fa-chevron-left"></i>' || btn.querySelector('i.fas.fa-chevron-left')) {
      goToPage(currentPage - 1);
    } else if (btn.textContent === '<i class="fas fa-chevron-right"></i>' || btn.querySelector('i.fas.fa-chevron-right')) {
      goToPage(currentPage + 1);
    } else {
      goToPage(parseInt(btn.textContent));
    }
  }
});

// Event listener for "Go" button
document.getElementById('goToPageBtn').addEventListener('click', () => {
  const pageNumber = parseInt(document.getElementById('goToPage').value);
  goToPage(pageNumber);
});

// Initial setup when the page loads
window.addEventListener('load', async () => {
  allInvoices = await fetchInvoices(); // Store all invoices in the allInvoices array
  displayInvoices(allInvoices); // Display the initial page
  updatePagination(); // Update pagination controls
});

// Function to open the modal
function openModal() {
    console.log('openModal function called');
    document.getElementById('invoiceModal').style.display = 'block';
    document.querySelector('.modal-overlay').style.display = 'block';
}

// Function to close the modal
function closeModal() {
    console.log('closeModal function called');
    document.getElementById('invoiceModal').style.display = 'none';
    document.querySelector('.modal-overlay').style.display = 'none';
}

// Função para redirecionar para a página de criação de fatura
function redirectToCreateInvoice() {
    console.log('função redirectToCreateInvoice chamada');
    window.location.href = 'create-invoice.html';
    console.log('window.location.href definido para: create-invoice.html'); // Adicionado para depuração
}

// Adicionar listener de evento ao botão "Criar Fatura"
document.addEventListener('DOMContentLoaded', function() {
    const createInvoiceBtn = document.getElementById('createInvoiceBtn');
    if (createInvoiceBtn) {
        createInvoiceBtn.addEventListener('click', redirectToCreateInvoice);
        console.log('Listener de evento adicionado ao botão Criar Fatura');
    } else {
        console.error('Botão Criar Fatura não encontrado');
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Adicionar listener de evento para fechar o modal
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    } else {
        console.error('Botão fechar modal não encontrado');
    }

    // Função para adicionar uma nova linha de item à tabela de itens
    function addItemRow() {
        const itemsTable = document.getElementById('itemsTable').getElementsByTagName('tbody')[0];
        const newRow = itemsTable.insertRow(itemsTable.rows.length);
        newRow.classList.add('item-row');

        // Criar células
        let cell1 = newRow.insertCell(0);
        let cell2 = newRow.insertCell(1);
        let cell3 = newRow.insertCell(2);
        let cell4 = newRow.insertCell(3);
        let cell5 = newRow.insertCell(4);
        let cell6 = newRow.insertCell(5);

        // Adicionar elementos de entrada às células
        cell1.innerHTML = '<input type="text" class="item-description" placeholder="Enter item description">';
        cell2.innerHTML = '<input type="number" class="item-quantity" value="1" min="1" step="1">';
        cell3.innerHTML = '<input type="number" class="item-price" value="0.00" min="0" step="0.01">';
        cell4.innerHTML = '<span class="item-vat">0.00</span>';
        cell5.innerHTML = '<span class="item-total">0.00</span>';
        cell6.innerHTML = '<button type="button" class="remove-item-btn"><i class="fas fa-trash"></i></button>';

        // Adicionar listener de evento ao botão remover
        const removeButton = newRow.querySelector('.remove-item-btn');
        removeButton.addEventListener('click', function() {
            itemsTable.deleteRow(newRow.rowIndex - 1); // Excluir a linha
            updateTotals(); // Atualizar os totais
        });

        // Adicionar listeners de evento às entradas de quantidade e preço para atualizar os totais
        const quantityInput = newRow.querySelector('.item-quantity');
        const priceInput = newRow.querySelector('.item-price');

        quantityInput.addEventListener('change', updateTotals);
        priceInput.addEventListener('change', updateTotals);

        updateTotals(); // Atualizar os totais
    }

    // Adicionar listener de evento ao botão "Adicionar Item"
    const addItemBtn = document.getElementById('addItemBtn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', addItemRow);
    } else {
        console.error('Botão Adicionar Item não encontrado');
    }

    // Função para atualizar os totais (Subtotal, IVA, Total)
    function updateTotals() {
        let subtotal = 0;
        const itemRows = document.querySelectorAll('#itemsTable tbody tr.item-row');

        itemRows.forEach(row => {
            const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            const itemTotal = quantity * price;
            subtotal += itemTotal;

            row.querySelector('.item-total').textContent = itemTotal.toFixed(2);
        });

        const vatRate = 0.16; // Taxa de IVA de 16%
        const totalVat = subtotal * vatRate;
        const invoiceTotal = subtotal + totalVat;

        document.getElementById('subtotal').textContent = subtotal.toFixed(2);
        document.getElementById('totalVat').textContent = totalVat.toFixed(2);
        document.getElementById('invoiceTotal').textContent = invoiceTotal.toFixed(2);
    }

    // Função para gerar a visualização da fatura
    function previewInvoice() {
        // Obter os dados da fatura do formulário
        const clientName = document.getElementById('clientName').value;
        const invoiceNumber = document.getElementById('invoiceNumber').value;
        const issueDate = document.getElementById('issueDate').value;
        // ... obter outros valores do formulário ...

        // Criar o conteúdo de visualização da fatura (HTML)
        let invoicePreviewContent = `
            <h2>Visualização da Fatura</h2>
            <p>Nome do Cliente: ${clientName}</p>
            <p>Número da Fatura: ${invoiceNumber}</p>
            <p>Data de Emissão: ${issueDate}</p>
            // ... adicionar outros detalhes da fatura ...
        `;

        // Abrir a visualização em uma nova janela ou modal
        let previewWindow = window.open('', '_blank');
        previewWindow.document.write(invoicePreviewContent);
    }

    // Adicionar listener de evento ao botão "Visualizar"
    const previewInvoiceBtn = document.getElementById('previewInvoiceBtn');
    if (previewInvoiceBtn) {
        previewInvoiceBtn.addEventListener('click', previewInvoice);
    } else {
        console.error('Botão Visualizar não encontrado');
    }
});

// Function to prepare data for Invoice Distribution Chart
function prepareInvoiceDistributionData(invoices, period) {
  const today = new Date();
  let startDate;

  switch (period) {
    case 'weekly':
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
      break;
    case 'monthly':
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      break;
    case 'quarterly':
      startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
      break;
    default:
      startDate = new Date(0); // All time
  }

  const filteredInvoices = invoices.filter(invoice => new Date(invoice.issue_date) >= startDate);

  // Group invoices by week, month, or quarter
  const groupedInvoices = {};
  filteredInvoices.forEach(invoice => {
    let key;
    const issueDate = new Date(invoice.issue_date);
    switch (period) {
      case 'weekly':
        key = `Week of ${issueDate.toLocaleDateString()}`;
        break;
      case 'monthly':
        key = `${issueDate.toLocaleString('default', { month: 'long' })} ${issueDate.getFullYear()}`;
        break;
      case 'quarterly':
        const quarter = Math.floor((issueDate.getMonth() / 3));
        key = `Q${quarter + 1} ${issueDate.getFullYear()}`;
        break;
      default:
        key = 'All Time';
    }

    if (!groupedInvoices[key]) {
      groupedInvoices[key] = 0;
    }
    groupedInvoices[key]++;
  });

  const labels = Object.keys(groupedInvoices);
  const data = Object.values(groupedInvoices);

  return { labels, data };
}

// Function to create or update Invoice Distribution Chart
function updateInvoiceDistributionChart(invoices, period) {
  const chartData = prepareInvoiceDistributionData(invoices, period);
  const ctx = document.getElementById('invoiceDistributionChart').getContext('2d');

  if (window.invoiceDistributionChart) {
    window.invoiceDistributionChart.destroy();
  }

  window.invoiceDistributionChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: 'Number of Invoices',
        data: chartData.data,
        backgroundColor: '#548CFF',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Invoices'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Time Period'
          }
        }
      }
    }
  });
}

// Function to prepare data for Revenue by Status Chart
function prepareRevenueByStatusData(invoices) {
  const revenueByStatus = {
    paid: 0,
    pending: 0,
    overdue: 0
  };

  invoices.forEach(invoice => {
    switch (invoice.status) {
      case 'paid':
        revenueByStatus.paid += invoice.total_amount_payable || 0;
        break;
      case 'pending':
        revenueByStatus.pending += invoice.total_amount_payable || 0;
        break;
      case 'overdue':
        revenueByStatus.overdue += invoice.total_amount_payable || 0;
        break;
    }
  });

  return {
    labels: ['Paid', 'Pending', 'Overdue'],
    data: [revenueByStatus.paid, revenueByStatus.pending, revenueByStatus.overdue]
  };
}

// Function to create or update Revenue by Status Chart
function updateRevenueByStatusChart(invoices) {
  const chartData = prepareRevenueByStatusData(invoices);
  const ctx = document.getElementById('revenueByStatusChart').getContext('2d');

  if (window.revenueByStatusChart) {
    window.revenueByStatusChart.destroy();
  }

  window.revenueByStatusChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: 'Revenue',
        data: chartData.data,
        backgroundColor: ['#3bb077', '#f7b924', '#e55353'],
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    }
  });
}

// Add event listeners to chart period buttons
document.addEventListener('DOMContentLoaded', () => {
  // Invoice Distribution Chart
  document.querySelectorAll('.chart-actions .chart-period-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.chart-actions .chart-period-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const period = this.id.replace('Btn', '').toLowerCase();
      updateInvoiceDistributionChart(allInvoices, period);
    });
  });

  // Revenue by Status Chart - No period selection, so directly update the chart
  updateRevenueByStatusChart(allInvoices);
});

// Call this function when the page is loaded (after fetching invoices)
window.addEventListener('load', async () => {
  allInvoices = await fetchInvoices(); // Store all invoices in the allInvoices array
  displayInvoices(allInvoices); // Display the initial page
  updatePagination(); // Update pagination controls

  // Initialize charts
  updateInvoiceDistributionChart(allInvoices, 'weekly'); // Default period is weekly
  updateRevenueByStatusChart(allInvoices);
});

