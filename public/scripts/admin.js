/* Admin page interactions: login, stats, list, delete */
let TOKEN = '';
let allReviews = [];
let currentFilter = 'all';
let pendingDeleteId = null;

function stars(n, max = 5) {
  if (!n) return '<span style="color:var(--text-muted)">—</span>';
  return '★'.repeat(n) + '<span class="empty">' + '★'.repeat(max - n) + '</span>';
}

function formatDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  return (
    d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
  );
}

async function loadStats() {
  try {
    const r = await fetch('/api/stats', { headers: { 'x-admin-token': TOKEN } });
    const d = await r.json();
    if (!d.ok) return;
    document.getElementById('sTotal').textContent = d.total ?? 0;
    document.getElementById('sAvg').textContent = d.avg_stars ? '★' + parseFloat(d.avg_stars).toFixed(1) : '—';
    document.getElementById('sNeg').textContent = d.negative ?? 0;
    document.getElementById('sFive').textContent = d.five_star ?? 0;
  } catch (e) {
    /* ignore */
  }
}

async function loadReviews() {
  document.getElementById('loadingState').style.display = 'block';
  document.getElementById('reviewsTable').style.display = 'none';
  document.getElementById('emptyState').style.display = 'none';

  try {
    const r = await fetch('/api/reviews', { headers: { 'x-admin-token': TOKEN } });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error);
    allReviews = d.reviews;
    renderReviews();
  } catch (e) {
    document.getElementById('loadingState').innerHTML = '<p style="color:var(--red)">Chyba: ' + e.message + '</p>';
  }
}

function renderReviews() {
  let reviews = allReviews;
  if (currentFilter === 'positive') reviews = reviews.filter((r) => r.overall_stars >= 4);
  if (currentFilter === 'negative') reviews = reviews.filter((r) => r.overall_stars < 4);

  document.getElementById('loadingState').style.display = 'none';

  if (!reviews.length) {
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('reviewsTable').style.display = 'none';
    return;
  }

  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('reviewsTable').style.display = 'table';

  const tbody = document.getElementById('reviewsTbody');
  tbody.innerHTML = reviews
    .map(
      (r) => `
    <tr class="${r.flagged ? 'flagged' : ''}">
      <td><span style="color:var(--text-muted);font-size:0.8rem">#${r.id}</span></td>
      <td class="date-cell">${formatDate(r.created_at)}</td>
      <td><span class="stars-display">${stars(r.overall_stars)}</span></td>
      <td class="email-cell">${r.email ? `<a href="mailto:${r.email}" style="color:var(--text-muted);text-decoration:none">${r.email}</a>` : ''}</td>
      <td class="msg-cell">${r.message ? escHtml(r.message) : ''}</td>
      <td>
        <span class="badge ${r.flagged ? 'badge-neg' : 'badge-pos'}">
          ${r.flagged ? '⚠ Negativní' : '✓ Pozitivní'}
        </span>
      </td>
      <td>
        <button class="btn-del" onclick="askDelete(${r.id})">Smazat</button>
      </td>
    </tr>
  `
    )
    .join('');
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function askDelete(id) {
  pendingDeleteId = id;
  document.getElementById('confirmOverlay').classList.add('show');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('confirmCancel').addEventListener('click', () => {
    document.getElementById('confirmOverlay').classList.remove('show');
    pendingDeleteId = null;
  });

  document.getElementById('confirmDel').addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    try {
      await fetch('/api/reviews/' + pendingDeleteId, {
        method: 'DELETE',
        headers: { 'x-admin-token': TOKEN },
      });
      allReviews = allReviews.filter((r) => r.id !== pendingDeleteId);
      renderReviews();
      loadStats();
    } catch (e) {
      alert('Chyba: ' + e.message);
    }
    document.getElementById('confirmOverlay').classList.remove('show');
    pendingDeleteId = null;
  });

  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderReviews();
    });
  });

  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadStats();
    loadReviews();
  });

  document.getElementById('loginBtn').addEventListener('click', tryLogin);
  document.getElementById('tokenInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryLogin();
  });

  async function tryLogin() {
    const val = document.getElementById('tokenInput').value.trim();
    if (!val) {
      document.getElementById('loginErr').textContent = 'Zadejte heslo.';
      return;
    }

    TOKEN = val;
    const r = await fetch('/api/stats', { headers: { 'x-admin-token': TOKEN } });
    const d = await r.json();
    if (!d.ok) {
      TOKEN = '';
      document.getElementById('loginErr').textContent = 'Nesprávné heslo.';
      return;
    }

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    document.getElementById('sTotal').textContent = d.total ?? 0;
    document.getElementById('sAvg').textContent = d.avg_stars ? '★' + parseFloat(d.avg_stars).toFixed(1) : '—';
    document.getElementById('sNeg').textContent = d.negative ?? 0;
    document.getElementById('sFive').textContent = d.five_star ?? 0;
    loadReviews();
  }

  document.getElementById('logoutBtn').addEventListener('click', () => {
    TOKEN = '';
    document.getElementById('app').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('tokenInput').value = '';
  });
});
