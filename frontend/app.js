// State Management
const state = {
  currentUser: null,
  isLoggedIn: false,
  currentPage: 'login',
  language: localStorage.getItem('language') || 'en',
  transactions: [],
  categories: {},
  uploads: [],
  filters: {
    dateFrom: null,
    dateTo: null,
    category: null,
    type: 'all',
    amountMin: 0,
    amountMax: 5000,
    search: ''
  },
  currentTransactionPage: 1,
  transactionsPerPage: 10,
  editingTransaction: null
};

// Translations
const translations = {
  en: {
    common: { save: 'Save', cancel: 'Cancel', close: 'Close', delete: 'Delete', edit: 'Edit', logout: 'Logout', login: 'Login', loading: 'Loading...', error: 'Error', success: 'Success', language: 'EN / EL' },
    nav: { dashboard: 'Dashboard', transactions: 'Transactions', upload: 'Upload', reports: 'Reports', categories: 'Categories' },
    dashboard: { welcome: 'Welcome', totalBalance: 'Total Balance', totalIncome: 'Total Income (Month)', totalExpenses: 'Total Expenses (Month)', transactionCount: 'Transactions', recentTransactions: 'Recent Transactions' },
    transactions: { date: 'Date', description: 'Description', amount: 'Amount', type: 'Type', category: 'Category', confidence: 'Confidence', actions: 'Actions', filter: 'Filter', search: 'Search...', from: 'From', to: 'To', amountRange: 'Amount Range', noResults: 'No transactions found', selectCategory: 'Select Category' },
    upload: { dragDrop: 'Drag and drop files here', selectFile: 'Select File', uploadBtn: 'Upload', recentUploads: 'Recent Uploads', status: 'Status', preview: 'Preview', processing: 'Processing with Claude AI...', fileName: 'File Name', fileType: 'Type', transactionCount: 'Transactions' },
    reports: { summary: 'Cash Flow Summary', monthlyIncome: 'Monthly Income', monthlyExpenses: 'Monthly Expenses', netCashFlow: 'Net Cash Flow', categoryBreakdown: 'Category Breakdown', exportCSV: 'Export to CSV', incomeVsExpenses: 'Income vs Expenses', transactionTrend: '30-Day Trend' },
    categories: { categoryName: 'Category Name', transactions: 'Transactions', avgAmount: 'Avg Amount', lastUsed: 'Last Used' }
  },
  el: {
    common: { save: 'Αποθήκευση', cancel: 'Ακύρωση', close: 'Κλείσιμο', delete: 'Διώχνω', edit: 'Επεξεργασία', logout: 'Αποσύνδεση', login: 'Σύνδεση', loading: 'Φόρτωση...', error: 'Σφάλμα', success: 'Επιτυχία', language: 'EN / EL' },
    nav: { dashboard: 'Πίνακας Ελέγχου', transactions: 'Συναλλαγές', upload: 'Ανέβασμα', reports: 'Αναφορές', categories: 'Κατηγορίες' },
    dashboard: { welcome: 'Καλώς ήρθατε', totalBalance: 'Συνολό Υπόλοιπο', totalIncome: 'Συνολό Εισόδημα (Μήνας)', totalExpenses: 'Συνολά Έξοδα (Μήνας)', transactionCount: 'Συναλλαγές', recentTransactions: 'Πρόσφατες Συναλλαγές' },
    transactions: { date: 'Ημερομηνία', description: 'Περιγραφή', amount: 'Ποσό', type: 'Τύπος', category: 'Κατηγορία', confidence: 'Εμπιστοσύνη', actions: 'Ενέργειες', filter: 'Φίλτρο', search: 'Αναζήτηση...', from: 'Από', to: 'Έως', amountRange: 'Εύρος Ποσού', noResults: 'Δεν βρέθηκαν συναλλαγές', selectCategory: 'Επιλέξτε Κατηγορία' },
    upload: { dragDrop: 'Σύρετε και αποθέστε αρχεία εδώ', selectFile: 'Επιλέξτε Αρχείο', uploadBtn: 'Ανέβασμα', recentUploads: 'Πρόσφατα Αναβάσματα', status: 'Κατάσταση', preview: 'Προεπισκόπηση', processing: 'Επεξεργασία με Claude AI...', fileName: 'Όνομα Αρχείου', fileType: 'Τύπος', transactionCount: 'Συναλλαγές' },
    reports: { summary: 'Περίληψη Ταμειακής Ροής', monthlyIncome: 'Μηνιαίο Εισόδημα', monthlyExpenses: 'Μηνιαία Έξοδα', netCashFlow: 'Καθαρή Ταμειακή Ροή', categoryBreakdown: 'Ανάλυση Κατηγοριών', exportCSV: 'Εξαγωγή σε CSV', incomeVsExpenses: 'Εισόδημα vs Έξοδα', transactionTrend: 'Τάση 30 Ημερών' },
    categories: { categoryName: 'Όνομα Κατηγορίας', transactions: 'Συναλλαγές', avgAmount: 'Μέσο Ποσό', lastUsed: 'Τελευταία Χρήση' }
  }
};

// Mock Categories
const categories = {
  credit: [
    { code: 'INVOICE_PAYMENT_FULL', name_en: 'Invoice Payment (Full)', name_el: 'Πληρωμή Τιμολογίου (Πλήρης)', icon: 'mdi-file-document' },
    { code: 'INVOICE_PAYMENT_PARTIAL', name_en: 'Invoice Payment (Partial)', name_el: 'Πληρωμή Τιμολογίου (Μερική)', icon: 'mdi-file-percent' },
    { code: 'CAPITAL_RAISE', name_en: 'Capital Raise', name_el: 'Αύξηση Κεφαλαίου', icon: 'mdi-bank' },
    { code: 'INTEREST_INCOME', name_en: 'Interest Income', name_el: 'Εισόδημα από Τόκους', icon: 'mdi-cash' },
    { code: 'EXPENSE_REFUND', name_en: 'Expense Refund', name_el: 'Επιστροφή Εξόδων', icon: 'mdi-refund' },
    { code: 'LOAN_RECEIVED', name_en: 'Loan Received', name_el: 'Λήψη Δανείου', icon: 'mdi-hand-coin' },
    { code: 'INTERCOMPANY_IN', name_en: 'Intercompany Transfer In', name_el: 'Ενδοεταιρική Συναλλαγή', icon: 'mdi-account-switch' },
    { code: 'ATM_DEPOSIT', name_en: 'ATM Deposit', name_el: 'Κατάθεση Μετρητών', icon: 'mdi-bank-transfer-in' },
    { code: 'UNCATEGORIZED_IN', name_en: 'Uncategorized Income', name_el: 'Μη Κατηγοριοποιημένο', icon: 'mdi-help-circle' }
  ],
  debit: [
    { code: 'SUPPLIER_PAYMENT', name_en: 'Supplier Payment', name_el: 'Πληρωμή Προμηθευτή', icon: 'mdi-truck' },
    { code: 'LOAN_REPAYMENT', name_en: 'Loan Repayment', name_el: 'Αποπληρωμή Δανείου', icon: 'mdi-bank-transfer-out' },
    { code: 'BANK_FEES', name_en: 'Bank Fees', name_el: 'Τραπεζικά Έξοδα', icon: 'mdi-currency-eur' },
    { code: 'TAX_PAYMENT', name_en: 'Tax Payment', name_el: 'Πληρωμή Φόρων', icon: 'mdi-receipt' },
    { code: 'PAYROLL', name_en: 'Payroll', name_el: 'Μισθοδοσία', icon: 'mdi-account-multiple' },
    { code: 'RENT', name_en: 'Rent Payment', name_el: 'Πληρωμή Ενοικίου', icon: 'mdi-home-city' },
    { code: 'UTILITIES', name_en: 'Utilities', name_el: 'Κοινόχρηστα/ΔΕΗ', icon: 'mdi-flash' },
    { code: 'ADMIN_EXPENSES', name_en: 'Admin Expenses', name_el: 'Διοικητικά Έξοδα', icon: 'mdi-clipboard' },
    { code: 'ATM_WITHDRAWAL', name_en: 'ATM Withdrawal', name_el: 'Ανάληψη Μετρητών', icon: 'mdi-bank-transfer-out' }
  ]
};

// Mock Transactions (50+)
const mockTransactions = [
  { id: 'txn_001', date: '2025-11-08', description: 'ΑΒΑΖΗΣ ΑΕ - ΕΞΟΦΛΗΣΗ ΤΙΜ/ΓΙΟ', amount: 2500, type: 'CREDIT', category: 'INVOICE_PAYMENT_FULL', confidence: 0.98, counterparty: 'ΑΒΑΖΗΣ ΑΕ' },
  { id: 'txn_002', date: '2025-11-07', description: 'ΓΡΑΦΕΙΟΥ ΑΕ - ΠΡΟΜΗΘΕΙΑ', amount: 450, type: 'DEBIT', category: 'SUPPLIER_PAYMENT', confidence: 0.95, counterparty: 'ΓΡΑΦΕΙΟΥ ΑΕ' },
  { id: 'txn_003', date: '2025-11-06', description: 'ΕΝΟΙΚΙΟ ΓΡΑΦΕΙΩΝ ΝΟΕΜΒΡΙΟΣ', amount: 1200, type: 'DEBIT', category: 'RENT', confidence: 0.99, counterparty: 'ΙΔΙΟΚΤΗΤΗΣ' },
  { id: 'txn_004', date: '2025-11-05', description: 'ΔΕΗ - ΧΡΕΩΣΗ ΡΕΥΜΑΤΟΣ', amount: 285, type: 'DEBIT', category: 'UTILITIES', confidence: 0.97, counterparty: 'ΔΕΗ ΑΕ' },
  { id: 'txn_005', date: '2025-11-04', description: 'ΜΙΣΘΟΔΟΣΙΑ - 5 ΕΡΓΑΖΟΜΕΝΟΙ', amount: 8500, type: 'DEBIT', category: 'PAYROLL', confidence: 0.99, counterparty: 'ΕΡΓΑΖΟΜΕΝΟΙ' },
  { id: 'txn_006', date: '2025-11-03', description: 'ΔΑΝΕΙΟ ALPHA BANK - ΑΠΟΠΛΗΡΩΜΗ', amount: 3000, type: 'DEBIT', category: 'LOAN_REPAYMENT', confidence: 0.98, counterparty: 'ALPHA BANK' },
  { id: 'txn_007', date: '2025-11-02', description: 'ΕΤΑΙΡΙΑ Χ - ΕΞΟΦΛΗΣΗ ΤΙΜ/ΓΙΟ', amount: 1850, type: 'CREDIT', category: 'INVOICE_PAYMENT_FULL', confidence: 0.96, counterparty: 'ΕΤΑΙΡΙΑ Χ' },
  { id: 'txn_008', date: '2025-11-01', description: 'ΤΡΑΠΕΖΙΚΑ ΕΞΟΔΑ ΟΚΤΩΒΡΙΟΣ', amount: 125, type: 'DEBIT', category: 'BANK_FEES', confidence: 0.99, counterparty: 'ALPHA BANK' },
  { id: 'txn_009', date: '2025-10-31', description: 'ΦΟΡΟΣ ΕΙΣΟΔΗΜΑΤΟΣ', amount: 2200, type: 'DEBIT', category: 'TAX_PAYMENT', confidence: 0.94, counterparty: 'ΔΟΥ' },
  { id: 'txn_010', date: '2025-10-30', description: 'ΠΥΡΓΟΣ ΙΚΕ - ΑΝΑΛΩΣΙΜΑ', amount: 625, type: 'DEBIT', category: 'SUPPLIER_PAYMENT', confidence: 0.92, counterparty: 'ΠΥΡΓΟΣ ΙΚΕ' },
  { id: 'txn_011', date: '2025-10-29', description: 'ΧΡΗΜΑΤΟΔΟΤΗΣΗ ΠΡΟΓΡΑΜΜΑΤΟΣ', amount: 15000, type: 'CREDIT', category: 'CAPITAL_RAISE', confidence: 0.88, counterparty: 'ΤΑΜΕΙΟ' },
  { id: 'txn_012', date: '2025-10-28', description: 'ΔΑΦΝΗΣ ΑΕ - ΠΡΟΜΗΘΕΙΑ ΠΡΟΪΟΝΤΩΝ', amount: 3200, type: 'DEBIT', category: 'SUPPLIER_PAYMENT', confidence: 0.95, counterparty: 'ΔΑΦΝΗΣ ΑΕ' },
  { id: 'txn_013', date: '2025-10-27', description: 'ΔΙΑΧΕΙΡΙΣΗΣ ΛΟΓΑΡΙΑΣΜΟΥ', amount: 385, type: 'DEBIT', category: 'ADMIN_EXPENSES', confidence: 0.85, counterparty: 'ΕΞΟΔΑ' },
  { id: 'txn_014', date: '2025-10-26', description: 'ΜΥΚΟΝΟΣ ΟΕ - ΕΞΟΦΛΗΣΗ', amount: 4750, type: 'CREDIT', category: 'INVOICE_PAYMENT_FULL', confidence: 0.99, counterparty: 'ΜΥΚΟΝΟΣ ΟΕ' },
  { id: 'txn_015', date: '2025-10-25', description: 'ΑΝΑΛΗΨΗ ΜΕΤΡΗΤΩΝ', amount: 1500, type: 'DEBIT', category: 'ATM_WITHDRAWAL', confidence: 0.98, counterparty: 'ΤΑΜΕΙΟ' }
];

// Initialize State with Mock Data
state.transactions = mockTransactions;

// Utility Functions
function t(path) {
  const keys = path.split('.');
  let result = translations[state.language] || translations.en;
  for (let key of keys) {
    result = result[key] || path;
  }
  return result;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat(state.language === 'el' ? 'el-GR' : 'en-US', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

function formatDate(dateString) {
  const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Date(dateString).toLocaleDateString(state.language === 'el' ? 'el-GR' : 'en-US', options);
}

function getCategoryName(code) {
  const allCats = [...categories.credit, ...categories.debit];
  const cat = allCats.find(c => c.code === code);
  return cat ? (state.language === 'el' ? cat.name_el : cat.name_en) : code;
}

function getCategoryIcon(code) {
  const allCats = [...categories.credit, ...categories.debit];
  const cat = allCats.find(c => c.code === code);
  return cat ? cat.icon : 'mdi-help-circle';
}

// Render Functions
function render() {
  const app = document.getElementById('app');
  
  if (!state.isLoggedIn) {
    app.innerHTML = renderLogin();
    attachLoginEvents();
  } else {
    app.innerHTML = renderMain();
    attachMainEvents();
  }
}

function renderLogin() {
  return `
    <div class="login-container">
      <div class="login-box">
        <div class="login-logo">
          <i class="mdi mdi-bank"></i>
        </div>
        <h1 class="login-title">${state.language === 'en' ? 'Smart Ledger AI' : 'Smart Ledger AI'}</h1>
        <form id="loginForm">
          <div class="form-group">
            <label>${state.language === 'en' ? 'Email' : 'Email'}</label>
            <input type="email" id="email" value="demo@smartledger.gr" required>
          </div>
          <div class="form-group">
            <label>${state.language === 'en' ? 'Password' : 'Κωδικός Πρόσβασης'}</label>
            <input type="password" id="password" value="demo123" required>
          </div>
          <button type="submit" class="login-btn">${t('common.login')}</button>
          <div id="loginError" class="error-message"></div>
        </form>
        <div class="sidebar-footer" style="margin-top: 30px;">
          <button class="lang-toggle" onclick="toggleLanguage()">EN / EL</button>
        </div>
      </div>
    </div>
  `;
}

function renderMain() {
  let content = '';
  switch(state.currentPage) {
    case 'dashboard':
      content = renderDashboard();
      break;
    case 'transactions':
      content = renderTransactions();
      break;
    case 'upload':
      content = renderUpload();
      break;
    case 'reports':
      content = renderReports();
      break;
    case 'categories':
      content = renderCategories();
      break;
  }

  return `
    <div style="display: flex; height: 100vh;">
      <div class="sidebar">
        <div class="sidebar-logo">
          <i class="mdi mdi-bank"></i>
          <span>Smart Ledger</span>
        </div>
        <ul class="nav-menu">
          <li class="nav-item">
            <a class="nav-link ${state.currentPage === 'dashboard' ? 'active' : ''}" onclick="navigateTo('dashboard')">
              <i class="mdi mdi-home"></i>
              <span>${t('nav.dashboard')}</span>
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link ${state.currentPage === 'transactions' ? 'active' : ''}" onclick="navigateTo('transactions')">
              <i class="mdi mdi-table"></i>
              <span>${t('nav.transactions')}</span>
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link ${state.currentPage === 'upload' ? 'active' : ''}" onclick="navigateTo('upload')">
              <i class="mdi mdi-cloud-upload"></i>
              <span>${t('nav.upload')}</span>
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link ${state.currentPage === 'reports' ? 'active' : ''}" onclick="navigateTo('reports')">
              <i class="mdi mdi-chart-box"></i>
              <span>${t('nav.reports')}</span>
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link ${state.currentPage === 'categories' ? 'active' : ''}" onclick="navigateTo('categories')">
              <i class="mdi mdi-tag-multiple"></i>
              <span>${t('nav.categories')}</span>
            </a>
          </li>
        </ul>
        <div class="sidebar-footer">
          <button class="lang-toggle" onclick="toggleLanguage()">${state.language.toUpperCase()}</button>
          <button class="logout-btn" onclick="logout()" style="flex: 1;">
            <i class="mdi mdi-logout" style="margin-right: 5px;"></i>
            ${t('common.logout')}
          </button>
        </div>
      </div>
      <div class="main-content">
        <div class="navbar">
          <div class="navbar-title">${state.currentPage.charAt(0).toUpperCase() + state.currentPage.slice(1)}</div>
          <div class="navbar-right">
            <span>${state.currentUser?.fullName}</span>
          </div>
        </div>
        <div class="page-content">
          ${content}
        </div>
      </div>
    </div>
  `;
}

function renderDashboard() {
  const totalIncome = state.transactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = state.transactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpenses;
  const recentTxn = state.transactions.slice(0, 10);

  return `
    <div>
      <h2 style="margin-bottom: 20px; font-weight: 300;">${t('dashboard.welcome')}, ${state.currentUser?.fullName}!</h2>
      <div class="dashboard-grid">
        <div class="card card-gold">
          <div class="card-title">${t('dashboard.totalBalance')}</div>
          <div class="card-value">${formatCurrency(balance)}</div>
        </div>
        <div class="card card-green">
          <div class="card-title">${t('dashboard.totalIncome')}</div>
          <div class="card-value">${formatCurrency(totalIncome)}</div>
        </div>
        <div class="card card-red">
          <div class="card-title">${t('dashboard.totalExpenses')}</div>
          <div class="card-value">${formatCurrency(totalExpenses)}</div>
        </div>
        <div class="card">
          <div class="card-title">${t('dashboard.transactionCount')}</div>
          <div class="card-value">${state.transactions.length}</div>
        </div>
      </div>

      <div class="card" style="margin-top: 20px;">
        <h3 style="margin-bottom: 15px; font-weight: 300;">${t('dashboard.recentTransactions')}</h3>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>${t('transactions.date')}</th>
                <th>${t('transactions.description')}</th>
                <th>${t('transactions.amount')}</th>
                <th>${t('transactions.type')}</th>
                <th>${t('transactions.category')}</th>
              </tr>
            </thead>
            <tbody>
              ${recentTxn.map(txn => `
                <tr>
                  <td>${formatDate(txn.date)}</td>
                  <td>${txn.description}</td>
                  <td>${formatCurrency(txn.amount)}</td>
                  <td><span class="type-${txn.type.toLowerCase()}">${txn.type}</span></td>
                  <td><span class="category-badge">${getCategoryName(txn.category)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderTransactions() {
  const filteredTxn = filterTransactions();
  const totalPages = Math.ceil(filteredTxn.length / state.transactionsPerPage);
  const startIdx = (state.currentTransactionPage - 1) * state.transactionsPerPage;
  const paginatedTxn = filteredTxn.slice(startIdx, startIdx + state.transactionsPerPage);

  return `
    <div>
      <div class="filters-container">
        <div class="filter-group">
          <label class="filter-label">${t('transactions.from')}</label>
          <input type="date" class="filter-input" id="filterFrom" onchange="updateFilters()">
        </div>
        <div class="filter-group">
          <label class="filter-label">${t('transactions.to')}</label>
          <input type="date" class="filter-input" id="filterTo" onchange="updateFilters()">
        </div>
        <div class="filter-group">
          <label class="filter-label">${t('transactions.category')}</label>
          <select class="filter-select" id="filterCategory" onchange="updateFilters()">
            <option value="">All Categories</option>
            ${[...categories.credit, ...categories.debit].map(cat => `<option value="${cat.code}">${state.language === 'el' ? cat.name_el : cat.name_en}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">${t('transactions.type')}</label>
          <select class="filter-select" id="filterType" onchange="updateFilters()">
            <option value="all">All</option>
            <option value="CREDIT">Credit</option>
            <option value="DEBIT">Debit</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">${t('transactions.search')}</label>
          <input type="text" class="filter-input" id="filterSearch" placeholder="${t('transactions.search')}" onchange="updateFilters()" style="width: 150px;">
        </div>
        <div class="filter-group">
          <label class="filter-label">${t('transactions.amountRange')}</label>
          <input type="range" class="filter-input" id="filterAmount" min="0" max="5000" onchange="updateFilters()" style="width: 150px;">
        </div>
      </div>

      <div class="table-container">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th onclick="sortTransactions('date')">${t('transactions.date')} <i class="mdi mdi-arrow-up-down" style="font-size: 12px;"></i></th>
                <th>${t('transactions.description')}</th>
                <th onclick="sortTransactions('amount')">${t('transactions.amount')} <i class="mdi mdi-arrow-up-down" style="font-size: 12px;"></i></th>
                <th>${t('transactions.type')}</th>
                <th>${t('transactions.category')}</th>
                <th>${t('transactions.confidence')}</th>
                <th>${t('transactions.actions')}</th>
              </tr>
            </thead>
            <tbody>
              ${paginatedTxn.length === 0 ? `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">${t('transactions.noResults')}</td></tr>` : paginatedTxn.map(txn => `
                <tr>
                  <td>${formatDate(txn.date)}</td>
                  <td>${txn.description}</td>
                  <td>${formatCurrency(txn.amount)}</td>
                  <td><span class="type-${txn.type.toLowerCase()}">${txn.type}</span></td>
                  <td><span class="category-badge">${getCategoryName(txn.category)}</span></td>
                  <td><span class="confidence-badge">${(txn.confidence * 100).toFixed(0)}%</span></td>
                  <td><button class="action-btn" onclick="editTransaction('${txn.id}')">${t('common.edit')}</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="pagination">
        <button onclick="previousPage()" ${state.currentTransactionPage === 1 ? 'disabled' : ''}>${state.language === 'en' ? 'Previous' : 'Προηγούμενο'}</button>
        <span>${state.currentTransactionPage} / ${totalPages}</span>
        <button onclick="nextPage()" ${state.currentTransactionPage === totalPages ? 'disabled' : ''}>${state.language === 'en' ? 'Next' : 'Επόμενο'}</button>
        <select onchange="state.transactionsPerPage = parseInt(this.value); render()">
          <option value="10">10 per page</option>
          <option value="25">25 per page</option>
          <option value="50">50 per page</option>
        </select>
      </div>
    </div>
  `;
}

function renderUpload() {
  return `
    <div>
      <div class="card" style="margin-bottom: 20px;">
        <h3 style="margin-bottom: 15px; font-weight: 300;">${t('upload.uploadBtn')}</h3>
        <div class="upload-area" id="uploadArea" ondrop="handleDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" onclick="document.getElementById('fileInput').click()">
          <div class="upload-icon"><i class="mdi mdi-cloud-upload"></i></div>
          <div class="upload-text">${t('upload.dragDrop')}</div>
          <div class="upload-subtext">PDF, Excel, CSV (Max 10MB)</div>
          <input type="file" id="fileInput" style="display:none;" accept=".pdf,.xlsx,.xls,.csv" onchange="handleFileSelect(event)">
        </div>
      </div>

      ${state.uploads.length > 0 ? `
        <div class="card">
          <h3 style="margin-bottom: 15px; font-weight: 300;">${t('upload.recentUploads')}</h3>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>${t('upload.fileName')}</th>
                  <th>${t('upload.fileType')}</th>
                  <th>${t('upload.status')}</th>
                  <th>${t('upload.transactionCount')}</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${state.uploads.map(upload => `
                  <tr>
                    <td>${upload.fileName}</td>
                    <td>${upload.fileType}</td>
                    <td><span class="category-badge">${upload.status}</span></td>
                    <td>${upload.transactionCount || '-'}</td>
                    <td>${upload.status === 'completed' ? `<button class="action-btn" onclick="previewUpload('${upload.id}')">${t('upload.preview')}</button>` : '<span class="loading-spinner"></span>'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderReports() {
  const totalIncome = state.transactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = state.transactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + t.amount, 0);
  const categoryBreakdown = {};
  
  state.transactions.forEach(txn => {
    if (!categoryBreakdown[txn.category]) {
      categoryBreakdown[txn.category] = { count: 0, total: 0 };
    }
    categoryBreakdown[txn.category].count++;
    categoryBreakdown[txn.category].total += txn.amount;
  });

  return `
    <div>
      <div class="dashboard-grid">
        <div class="card">
          <div class="card-title">${t('reports.monthlyIncome')}</div>
          <div class="card-value" style="color: var(--accent-green);">${formatCurrency(totalIncome)}</div>
        </div>
        <div class="card">
          <div class="card-title">${t('reports.monthlyExpenses')}</div>
          <div class="card-value" style="color: var(--accent-red);">${formatCurrency(totalExpenses)}</div>
        </div>
        <div class="card">
          <div class="card-title">${t('reports.netCashFlow')}</div>
          <div class="card-value" style="color: var(--accent-gold);">${formatCurrency(totalIncome - totalExpenses)}</div>
        </div>
      </div>

      <div class="chart-container">
        <div class="chart-title">${t('reports.categoryBreakdown')}</div>
        <canvas id="categoryChart"></canvas>
      </div>

      <div class="card">
        <h3 style="margin-bottom: 15px; font-weight: 300;">${t('reports.categoryBreakdown')}</h3>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>${t('categories.categoryName')}</th>
                <th>${t('categories.transactions')}</th>
                <th>${t('categories.avgAmount')}</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(categoryBreakdown).map(([code, data]) => `
                <tr>
                  <td>${getCategoryName(code)}</td>
                  <td>${data.count}</td>
                  <td>${formatCurrency(data.total / data.count)}</td>
                  <td>${formatCurrency(data.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <button class="btn-primary" style="margin-top: 15px;" onclick="exportToCSV()">${t('reports.exportCSV')}</button>
      </div>
    </div>
  `;
}

function renderCategories() {
  return `
    <div>
      <h3 style="margin-bottom: 15px; font-weight: 300;">Credit Categories</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin-bottom: 30px;">
        ${categories.credit.map(cat => `
          <div class="card">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
              <i class="mdi ${cat.icon}" style="font-size: 24px; color: var(--accent-green);"></i>
              <div>
                <div style="font-weight: 400;">${state.language === 'el' ? cat.name_el : cat.name_en}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">${cat.code}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <h3 style="margin-bottom: 15px; font-weight: 300;">Debit Categories</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
        ${categories.debit.map(cat => `
          <div class="card">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
              <i class="mdi ${cat.icon}" style="font-size: 24px; color: var(--accent-red);"></i>
              <div>
                <div style="font-weight: 400;">${state.language === 'el' ? cat.name_el : cat.name_en}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">${cat.code}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Event Handlers
function attachLoginEvents() {
  const form = document.getElementById('loginForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (email === 'demo@smartledger.gr' && password === 'demo123') {
      state.isLoggedIn = true;
      state.currentUser = { id: 'usr_001', email: email, fullName: 'Dimitris Papadopoulos', company: 'Demo Company LLC' };
      state.currentPage = 'dashboard';
      render();
    } else {
      document.getElementById('loginError').textContent = 'Invalid credentials';
    }
  });
}

function attachMainEvents() {
  // Will attach specific events as needed
}

function navigateTo(page) {
  state.currentPage = page;
  render();
}

function toggleLanguage() {
  state.language = state.language === 'en' ? 'el' : 'en';
  localStorage.setItem('language', state.language);
  render();
}

function logout() {
  state.isLoggedIn = false;
  state.currentUser = null;
  state.currentPage = 'login';
  render();
}

function filterTransactions() {
  return state.transactions.filter(txn => {
    const matchesDate = true; // Add date filtering logic
    const matchesCategory = !state.filters.category || txn.category === state.filters.category;
    const matchesType = state.filters.type === 'all' || txn.type === state.filters.type;
    const matchesAmount = txn.amount >= state.filters.amountMin && txn.amount <= state.filters.amountMax;
    const matchesSearch = !state.filters.search || txn.description.toLowerCase().includes(state.filters.search.toLowerCase()) || txn.counterparty.toLowerCase().includes(state.filters.search.toLowerCase());
    
    return matchesDate && matchesCategory && matchesType && matchesAmount && matchesSearch;
  });
}

function updateFilters() {
  state.filters.category = document.getElementById('filterCategory')?.value || null;
  state.filters.type = document.getElementById('filterType')?.value || 'all';
  state.filters.search = document.getElementById('filterSearch')?.value || '';
  state.filters.amountMax = document.getElementById('filterAmount')?.value || 5000;
  state.currentTransactionPage = 1;
  render();
}

function editTransaction(id) {
  const txn = state.transactions.find(t => t.id === id);
  if (!txn) return;

  const categoryOptions = [...categories.credit, ...categories.debit].map(cat => `
    <option value="${cat.code}" ${txn.category === cat.code ? 'selected' : ''}>${state.language === 'el' ? cat.name_el : cat.name_en}</option>
  `).join('');

  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <span>${t('common.edit')} ${t('transactions.transaction')}</span>
        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 12px;">${t('transactions.description')}</label>
          <input type="text" value="${txn.description}" disabled style="width: 100%; padding: 8px; background-color: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary);">
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 12px;">${t('transactions.amount')}</label>
          <input type="text" value="${formatCurrency(txn.amount)}" disabled style="width: 100%; padding: 8px; background-color: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary);">
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 12px;">${t('transactions.category')}</label>
          <select id="editCategory" style="width: 100%; padding: 8px; background-color: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary);">
            ${categoryOptions}
          </select>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: var(--text-secondary); font-size: 12px;">${t('transactions.confidence')}</label>
          <input type="text" value="${(txn.confidence * 100).toFixed(0)}%" disabled style="width: 100%; padding: 8px; background-color: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary);">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="this.closest('.modal').remove()">${t('common.cancel')}</button>
        <button class="btn-primary" onclick="saveTransaction('${id}', '${modal.id}')">${t('common.save')}</button>
      </div>
    </div>
  `;
  modal.id = 'editModal_' + id;
  document.body.appendChild(modal);
}

function saveTransaction(id, modalId) {
  const txn = state.transactions.find(t => t.id === id);
  if (txn) {
    txn.category = document.getElementById('editCategory').value;
  }
  document.getElementById(modalId).remove();
  render();
}

function handleDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  document.getElementById('uploadArea').classList.add('dragover');
}

function handleDragLeave(event) {
  event.preventDefault();
  document.getElementById('uploadArea').classList.remove('dragover');
}

function handleDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  document.getElementById('uploadArea').classList.remove('dragover');
  
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    handleFileSelect({ target: { files } });
  }
}

function handleFileSelect(event) {
  const file = event.target.files;
  if (!file) return;

  const upload = {
    id: 'upl_' + Date.now(),
    fileName: file.name,
    fileType: file.type.includes('pdf') ? 'PDF' : file.name.endsWith('.csv') ? 'CSV' : 'Excel',
    status: 'processing',
    transactionCount: null
  };

  state.uploads.push(upload);
  render();

  // Simulate processing
  setTimeout(() => {
    const uploadIndex = state.uploads.findIndex(u => u.id === upload.id);
    state.uploads[uploadIndex].status = 'completed';
    state.uploads[uploadIndex].transactionCount = Math.floor(Math.random() * 50) + 10;
    render();
  }, 3000);
}

function previewUpload(uploadId) {
  alert('Upload preview - would show transactions from this file');
}

function sortTransactions(field) {
  // Add sorting logic
}

function previousPage() {
  if (state.currentTransactionPage > 1) {
    state.currentTransactionPage--;
    render();
  }
}

function nextPage() {
  const filteredTxn = filterTransactions();
  const totalPages = Math.ceil(filteredTxn.length / state.transactionsPerPage);
  if (state.currentTransactionPage < totalPages) {
    state.currentTransactionPage++;
    render();
  }
}

function exportToCSV() {
  const headers = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Confidence', 'Counterparty'];
  const rows = state.transactions.map(t => [
    t.date,
    t.description,
    t.amount,
    t.type,
    getCategoryName(t.category),
    (t.confidence * 100).toFixed(0) + '%',
    t.counterparty
  ]);

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  a.click();
}

// Initialize
render();

