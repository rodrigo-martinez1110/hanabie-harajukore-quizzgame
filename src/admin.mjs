const ADMIN_PASSWORD_STORAGE_KEY = 'hanabie-admin-password';

const loginForm = document.querySelector('#admin-login-form');
const passwordInput = document.querySelector('#admin-password');
const statusEl = document.querySelector('#admin-status');
const metricsEl = document.querySelector('#admin-metrics');
const countriesEl = document.querySelector('#admin-countries');
const languagesEl = document.querySelector('#admin-languages');
const ranksEl = document.querySelector('#admin-ranks');
const questionsEl = document.querySelector('#admin-questions');
const periodButtons = Array.from(document.querySelectorAll('[data-admin-period]'));

let currentPeriod = '7d';
let adminPassword = sessionStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY) || '';

if (adminPassword) {
  passwordInput.value = adminPassword;
  loadStats();
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  adminPassword = passwordInput.value.trim();
  if (!adminPassword) {
    statusEl.textContent = 'Digite a senha do painel.';
    return;
  }
  sessionStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, adminPassword);
  loadStats();
});

periodButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentPeriod = button.dataset.adminPeriod;
    periodButtons.forEach((item) => {
      item.classList.toggle('is-active', item === button);
    });
    if (adminPassword) {
      loadStats();
    }
  });
});

async function loadStats() {
  statusEl.textContent = 'Carregando dados...';

  try {
    const response = await fetch(`/api/admin-stats?period=${encodeURIComponent(currentPeriod)}`, {
      headers: {
        'x-admin-password': adminPassword
      }
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Nao foi possivel carregar o painel.');
    }

    renderSummary(payload.summary);
    statusEl.textContent = `Atualizado em ${new Date(payload.generatedAt).toLocaleString('pt-BR')}.`;
  } catch (error) {
    statusEl.textContent = `Erro: ${error.message}`;
  }
}

function renderSummary(summary) {
  const totals = summary.totals;
  metricsEl.innerHTML = [
    ['Jogadores unicos', totals.uniquePlayers],
    ['Partidas iniciadas', totals.gamesStarted],
    ['Partidas finalizadas', totals.gamesFinished],
    ['Scores enviados', totals.scoreSubmitted],
    ['Score medio', totals.averageScore],
    ['Melhor score', totals.bestScore],
    ['Precisao media', `${Math.round(totals.averageAccuracy * 100)}%`],
    ['Media respondidas', totals.averageAnswered]
  ].map(([label, value]) => `
    <article class="admin-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join('');

  renderCountList(countriesEl, summary.topCountries, 'code');
  renderCountList(languagesEl, summary.topLanguages, 'language');
  renderCountList(ranksEl, summary.topRanks, 'rank');
  questionsEl.innerHTML = summary.questionStats.length
    ? summary.questionStats.map((question) => `
      <li>
        <strong>${escapeHtml(question.id)}</strong>
        <span>${question.wrong} erros / ${question.total} respostas · ${Math.round(question.accuracy * 100)}% acerto · N${question.difficulty}</span>
      </li>
    `).join('')
    : '<li><span>Sem dados de perguntas ainda.</span></li>';
}

function renderCountList(element, rows, key) {
  element.innerHTML = rows.length
    ? rows.map((row) => `
      <li>
        <strong>${escapeHtml(row[key])}</strong>
        <span>${row.count}</span>
      </li>
    `).join('')
    : '<li><span>Sem dados ainda.</span></li>';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
