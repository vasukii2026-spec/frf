// =====================================================================
// STATE
// =====================================================================
let SETTINGS = {};
let ADMIN_TOKEN = sessionStorage.getItem('admin_token') || null;

function authHeaders(extra = {}) {
  return ADMIN_TOKEN ? { ...extra, Authorization: `Bearer ${ADMIN_TOKEN}` } : extra;
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeaders(opts.headers) },
    credentials: 'include',
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.url;
}

// =====================================================================
// THEME
// =====================================================================
function toggleTheme() {
  const html = document.documentElement;
  html.classList.toggle('dark');
  localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
}
(function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light') document.documentElement.classList.remove('dark');
  else document.documentElement.classList.add('dark');
})();

// =====================================================================
// TOAST
// =====================================================================
function showToast(title, msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-title').textContent = title;
  document.getElementById('toast-msg').textContent = msg;
  toast.classList.remove('toast-hidden');
  setTimeout(() => toast.classList.add('toast-hidden'), 3000);
}

// =====================================================================
// RENDER SITE CONTENT FROM SETTINGS
// =====================================================================
function whatsappLink(number, text) {
  const t = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${number}${t}`;
}

function renderSettings(s) {
  SETTINGS = s;
  document.title = s.company_name || 'Company Website';

  document.querySelectorAll('[data-field]').forEach((el) => {
    const key = el.getAttribute('data-field');
    if (s[key] !== undefined && s[key] !== null) el.textContent = s[key];
  });

  document.querySelectorAll('[data-field-src]').forEach((el) => {
    const key = el.getAttribute('data-field-src');
    if (s[key]) el.src = s[key];
  });

  document.querySelectorAll('[data-field-tel-href]').forEach((el) => {
    const phone = s.phone || '';
    el.href = `tel:${phone.replace(/\s/g, '')}`;
  });

  document.querySelectorAll('[data-field-whatsapp-href]').forEach((el) => {
    const kind = el.getAttribute('data-field-whatsapp-href');
    const text = kind === 'general' ? `Hello ${s.company_short_name || s.company_name || ''}, I would like to inquire about your services.` : '';
    el.href = whatsappLink(s.whatsapp_number, text);
  });

  animateCounter('stat-years-display', Number(s.stat_years) || 0);
  animateCounter('stat-projects-display', Number(s.stat_projects) || 0);
  animateCounter('stat-team-display', Number(s.stat_team) || 0);

  document.getElementById('footer-year').textContent = new Date().getFullYear();
}

function animateCounter(elId, target) {
  const el = document.getElementById(elId);
  if (!el) return;
  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 40));
  const timer = setInterval(() => {
    cur += step;
    if (cur >= target) { cur = target; clearInterval(timer); }
    el.textContent = cur;
  }, 30);
}

function renderClients(list) {
  const grid = document.getElementById('clients-grid');
  grid.innerHTML = '';
  if (!list.length) {
    grid.innerHTML = '<p class="text-sm text-gray-500 col-span-full text-center">No clients added yet.</p>';
    return;
  }
  list.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'glass rounded-xl p-4 flex items-center gap-3 border border-lime-500/10';
    div.innerHTML = `
      <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden border border-lime-500/20">
        ${c.img_url ? `<img src="${c.img_url}" class="w-full h-full object-contain p-1">` : `<i class="fas ${c.icon || 'fa-building'} text-navy-700"></i>`}
      </div>
      <div class="min-w-0">
        <p class="font-semibold text-sm truncate">${escapeHtml(c.name)}</p>
        <p class="text-xs text-gray-500 truncate">${escapeHtml(c.description || '')}</p>
      </div>`;
    grid.appendChild(div);
  });
}

function renderPortfolio(list) {
  const grid = document.getElementById('portfolio-grid');
  grid.innerHTML = '';
  if (!list.length) {
    grid.innerHTML = '<div class="portfolio-item"><div class="portfolio-placeholder"><i class="fas fa-image"></i><span class="text-xs">No projects yet</span></div></div>';
    return;
  }
  list.forEach((p) => {
    const div = document.createElement('div');
    div.className = 'portfolio-item';
    div.innerHTML = `<img src="${p.img_url}" alt="${escapeHtml(p.title || '')}" loading="lazy">`;
    grid.appendChild(div);
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// =====================================================================
// INITIAL LOAD
// =====================================================================
async function loadEverything() {
  try {
    const [settings, clients, portfolio] = await Promise.all([
      api('/api/site-settings'),
      api('/api/clients'),
      api('/api/portfolio'),
    ]);
    renderSettings(settings);
    renderClients(clients);
    renderPortfolio(portfolio);
  } catch (err) {
    console.error('Failed to load site data:', err);
    showToast('Could not load site data', err.message);
  } finally {
    const loader = document.getElementById('loader');
    if (loader) { loader.classList.add('loader-hidden'); setTimeout(() => loader.remove(), 600); }
  }
}

// =====================================================================
// SCROLL REVEAL + NAV
// =====================================================================
function initScrollEffects() {
  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('active'); });
  }, { threshold: 0.1 });
  revealEls.forEach((el) => io.observe(el));

  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('mobile-menu').classList.toggle('hidden');
  });
  document.querySelectorAll('#mobile-menu a').forEach((a) => {
    a.addEventListener('click', () => document.getElementById('mobile-menu').classList.add('hidden'));
  });
}

// =====================================================================
// CONTACT / CAREER FORMS
// =====================================================================
async function submitContact(e) {
  e.preventDefault();
  const name = document.getElementById('form-name').value.trim();
  const phone = document.getElementById('form-phone').value.trim();
  const email = document.getElementById('form-email').value.trim();
  const service = document.getElementById('form-service').value.trim();
  const message = document.getElementById('form-message').value.trim();
  try {
    await api('/api/contact', { method: 'POST', body: JSON.stringify({ name, phone, email, service, message }) });
    showToast('Inquiry Sent!', 'We received your message and will get back to you soon.');
    document.getElementById('contact-form').reset();
    const text = `New inquiry from ${SETTINGS.company_short_name || 'website'}\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nService: ${service}\nMessage: ${message}`;
    setTimeout(() => window.open(whatsappLink(SETTINGS.whatsapp_number, text), '_blank'), 600);
  } catch (err) {
    showToast('Something went wrong', err.message);
  }
}

async function submitCareer(e) {
  e.preventDefault();
  const name = document.getElementById('career-name').value.trim();
  const phone = document.getElementById('career-phone').value.trim();
  const email = document.getElementById('career-email').value.trim();
  const position = document.getElementById('career-position').value.trim();
  const qualification = document.getElementById('career-exp').value.trim();
  const message = document.getElementById('career-message').value.trim();
  try {
    await api('/api/career', { method: 'POST', body: JSON.stringify({ name, phone, email, position, qualification, message }) });
    showToast('Application Sent!', 'Thanks for applying — we will be in touch.');
    document.getElementById('career-form').reset();
    const text = `Career enquiry from ${SETTINGS.company_short_name || 'website'}\nName: ${name}\nPhone: ${phone}\nPosition: ${position}`;
    setTimeout(() => window.open(whatsappLink(SETTINGS.whatsapp_number, text), '_blank'), 600);
  } catch (err) {
    showToast('Something went wrong', err.message);
  }
}

// =====================================================================
// ADMIN: LOGIN / LOGOUT
// =====================================================================
function showLogin() { document.getElementById('loginModal').classList.add('open'); }
function closeLogin() { document.getElementById('loginModal').classList.remove('open'); }

async function doLogin() {
  const username = document.getElementById('admin-id').value.trim();
  const password = document.getElementById('admin-pass').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  try {
    const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    ADMIN_TOKEN = data.token;
    sessionStorage.setItem('admin_token', ADMIN_TOKEN);
    closeLogin();
    document.getElementById('admin-id').value = '';
    document.getElementById('admin-pass').value = '';
    openAdmin();
  } catch (err) {
    let msg = err.message || 'Invalid ID or password.';
    // Auto-diagnose: check the actual database/admin-user state so the
    // real cause shows up here instead of a generic "invalid" message.
    try {
      const health = await fetch('/api/health').then((r) => r.json());
      if (health.database === 'not configured') {
        msg = 'Server misconfigured: no database connection string set (see /api/health).';
      } else if (health.database === 'connection failed') {
        msg = `Cannot reach the database: ${health.error || 'unknown error'} (see /api/health).`;
      } else if (Array.isArray(health.tables_missing) && health.tables_missing.length) {
        msg = `Database tables not set up yet (missing: ${health.tables_missing.join(', ')}). See README "Fix the admin login on Neon".`;
      } else if (Array.isArray(health.admin_users) && health.admin_users.length === 0) {
        msg = 'No admin account exists yet. Use the /api/setup-admin endpoint (see README) to create one.';
      } else if (Array.isArray(health.admin_users) && health.admin_users.length && !health.admin_users.includes(username)) {
        msg = `No admin account named "${username}" exists. Existing username(s): ${health.admin_users.join(', ')}.`;
      } else {
        msg = 'Username exists but password is wrong. Use the /api/setup-admin endpoint (see README) to reset it.';
      }
    } catch (e) {
      // /api/health itself failed to respond — leave the original message.
    }
    errEl.textContent = msg;
    errEl.classList.remove('hidden');
  }
}

function doLogout() {
  ADMIN_TOKEN = null;
  sessionStorage.removeItem('admin_token');
  api('/api/auth/logout', { method: 'POST' }).catch(() => {});
  closeAdmin();
  showToast('Logged out', 'Your admin session has ended.');
}

// =====================================================================
// ADMIN PANEL
// =====================================================================
function openAdmin() {
  document.getElementById('adminPanel').classList.add('open');
  fillSiteSettingsForm();
  adminTab('content');
}
function closeAdmin() { document.getElementById('adminPanel').classList.remove('open'); }

function adminTab(name) {
  document.querySelectorAll('.admin-tab-panel').forEach((p) => p.classList.add('hidden'));
  document.querySelectorAll('.admin-tab-btn').forEach((b) => b.classList.remove('active'));
  document.getElementById(`admin-tab-${name}`).classList.remove('hidden');
  document.querySelector(`.admin-tab-btn[data-tab="${name}"]`).classList.add('active');
  if (name === 'portfolio') renderAdminPortfolio();
  if (name === 'clients') renderAdminClients();
  if (name === 'leads') renderAdminLeads();
}

function fillSiteSettingsForm() {
  const fields = [
    'company_name', 'company_short_name', 'hero_tagline', 'tagline', 'about_text',
    'phone', 'whatsapp_number', 'email', 'address', 'udyam_reg', 'gstin',
    'founder_name', 'founder_title', 'founder_bio', 'stat_years', 'stat_projects', 'stat_team',
  ];
  fields.forEach((f) => {
    const el = document.getElementById(`edit-${f}`);
    if (el) el.value = SETTINGS[f] ?? '';
  });
  document.getElementById('logo-preview-img').src = SETTINGS.logo_url || '/logo.PNG';
  document.getElementById('founder-preview-img').src = SETTINGS.founder_photo_url || '/founder.jpeg';
}

async function saveSiteSettings() {
  const fields = [
    'company_name', 'company_short_name', 'hero_tagline', 'tagline', 'about_text',
    'phone', 'whatsapp_number', 'email', 'address', 'udyam_reg', 'gstin',
    'founder_name', 'founder_title', 'founder_bio',
  ];
  const updates = {};
  fields.forEach((f) => {
    const el = document.getElementById(`edit-${f}`);
    if (el) updates[f] = el.value.trim();
  });
  ['stat_years', 'stat_projects', 'stat_team'].forEach((f) => {
    const el = document.getElementById(`edit-${f}`);
    if (el) updates[f] = parseInt(el.value, 10) || 0;
  });

  try {
    const logoFile = document.getElementById('logo-file-input').files[0];
    if (logoFile) updates.logo_url = await uploadFile(logoFile);
    const founderFile = document.getElementById('founder-file-input').files[0];
    if (founderFile) updates.founder_photo_url = await uploadFile(founderFile);

    const saved = await api('/api/site-settings', { method: 'PUT', body: JSON.stringify(updates) });
    renderSettings(saved);
    fillSiteSettingsForm();
    showToast('Saved!', 'Your changes are now live on the website.');
  } catch (err) {
    showToast('Save failed', err.message);
  }
}

// ---- Portfolio ----
async function renderAdminPortfolio() {
  const list = await api('/api/portfolio');
  const wrap = document.getElementById('admin-portfolio-list');
  wrap.innerHTML = '';
  list.forEach((p) => {
    const div = document.createElement('div');
    div.className = 'relative group';
    div.innerHTML = `
      <img src="${p.img_url}" class="admin-img-thumb">
      <button onclick="deletePortfolioItem(${p.id})" class="absolute top-1 right-1 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs"><i class="fas fa-trash"></i></button>`;
    wrap.appendChild(div);
  });
}

async function handlePortfolioUpload(files) {
  for (const file of files) {
    try {
      const url = await uploadFile(file);
      await api('/api/portfolio', { method: 'POST', body: JSON.stringify({ img_url: url }) });
    } catch (err) {
      showToast('Upload failed', err.message);
    }
  }
  renderAdminPortfolio();
  const list = await api('/api/portfolio');
  renderPortfolio(list);
  showToast('Portfolio updated', 'New photos are live.');
}

async function deletePortfolioItem(id) {
  if (!confirm('Remove this project photo?')) return;
  await api(`/api/portfolio/${id}`, { method: 'DELETE' });
  renderAdminPortfolio();
  const list = await api('/api/portfolio');
  renderPortfolio(list);
}

// ---- Clients ----
async function renderAdminClients() {
  const list = await api('/api/clients');
  const wrap = document.getElementById('admin-clients-list');
  wrap.innerHTML = '';
  list.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-3 glass rounded-lg p-2 border border-lime-500/10';
    div.innerHTML = `
      <div class="w-10 h-10 rounded-lg bg-white flex-shrink-0 flex items-center justify-center overflow-hidden">
        ${c.img_url ? `<img src="${c.img_url}" class="w-full h-full object-contain p-1">` : `<i class="fas ${c.icon || 'fa-building'}"></i>`}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold truncate">${escapeHtml(c.name)}</p>
        <p class="text-xs text-gray-500 truncate">${escapeHtml(c.description || '')}</p>
      </div>
      <button onclick="deleteClientItem(${c.id})" class="w-8 h-8 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg flex items-center justify-center flex-shrink-0"><i class="fas fa-trash text-xs"></i></button>`;
    wrap.appendChild(div);
  });
}

async function addClientFromAdmin() {
  const name = document.getElementById('client-name-input').value.trim();
  if (!name) { showToast('Missing name', 'Please enter a client name.'); return; }
  const description = document.getElementById('client-desc-input').value.trim();
  const fileInput = document.getElementById('client-img-input');
  try {
    let img_url = '';
    if (fileInput.files[0]) img_url = await uploadFile(fileInput.files[0]);
    await api('/api/clients', { method: 'POST', body: JSON.stringify({ name, description, img_url }) });
    document.getElementById('client-name-input').value = '';
    document.getElementById('client-desc-input').value = '';
    fileInput.value = '';
    renderAdminClients();
    const list = await api('/api/clients');
    renderClients(list);
    showToast('Client added', `${name} is now shown on the site.`);
  } catch (err) {
    showToast('Could not add client', err.message);
  }
}

async function deleteClientItem(id) {
  if (!confirm('Remove this client?')) return;
  await api(`/api/clients/${id}`, { method: 'DELETE' });
  renderAdminClients();
  const list = await api('/api/clients');
  renderClients(list);
}

// ---- Leads (contact + career submissions) ----
async function renderAdminLeads() {
  try {
    const [contacts, careers] = await Promise.all([api('/api/contact'), api('/api/career')]);
    const cWrap = document.getElementById('admin-contact-list');
    cWrap.innerHTML = contacts.length ? '' : '<p class="text-xs text-gray-500">No inquiries yet.</p>';
    contacts.forEach((c) => {
      const div = document.createElement('div');
      div.className = 'glass rounded-lg p-3 border border-lime-500/10 text-xs';
      div.innerHTML = `<p class="font-semibold">${escapeHtml(c.name)} — ${escapeHtml(c.phone)}</p>
        <p class="text-gray-500">${escapeHtml(c.email || '')} ${c.service ? '· ' + escapeHtml(c.service) : ''}</p>
        ${c.message ? `<p class="mt-1">${escapeHtml(c.message)}</p>` : ''}
        <p class="text-gray-400 mt-1">${new Date(c.created_at).toLocaleString()}</p>`;
      cWrap.appendChild(div);
    });

    const kWrap = document.getElementById('admin-career-list');
    kWrap.innerHTML = careers.length ? '' : '<p class="text-xs text-gray-500">No applications yet.</p>';
    careers.forEach((c) => {
      const div = document.createElement('div');
      div.className = 'glass rounded-lg p-3 border border-lime-500/10 text-xs';
      div.innerHTML = `<p class="font-semibold">${escapeHtml(c.name)} — ${escapeHtml(c.phone)}</p>
        <p class="text-gray-500">${escapeHtml(c.position || '')} ${c.qualification ? '· ' + escapeHtml(c.qualification) : ''}</p>
        <p class="text-gray-400 mt-1">${new Date(c.created_at).toLocaleString()}</p>`;
      kWrap.appendChild(div);
    });
  } catch (err) {
    showToast('Could not load inquiries', err.message);
  }
}

// ---- Account ----
async function changeAdminPass() {
  const newPassword = document.getElementById('new-admin-pass').value.trim();
  if (!newPassword || newPassword.length < 6) {
    showToast('Too short', 'Password must be at least 6 characters.');
    return;
  }
  try {
    await api('/api/auth/password', { method: 'PUT', body: JSON.stringify({ newPassword }) });
    document.getElementById('new-admin-pass').value = '';
    showToast('Password changed', 'Use your new password next time you log in.');
  } catch (err) {
    showToast('Could not change password', err.message);
  }
}

// =====================================================================
// BOOT
// =====================================================================
loadEverything();
initScrollEffects();
