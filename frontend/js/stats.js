const params = new URLSearchParams(window.location.search);
const accountId = params.get('account');

const OP_LABELS = {
  addition:       'Addition (+)',
  subtraction:    'Subtraction (−)',
  multiplication: 'Multiplication (×)',
  division:       'Division (÷)'
};

async function init() {
  if (!accountId) { window.location.href = '/'; return; }

  const [accounts, stats] = await Promise.all([
    API.getAccounts(),
    API.getStats(accountId)
  ]);

  const acc = accounts.find(a => a.id === accountId);
  if (!acc) { window.location.href = '/'; return; }

  document.getElementById('stats-user').textContent = acc.name + "'s Progress";

  renderSummary(stats);
  renderHistory(stats.history || []);
  renderProblemAreas(stats.problem_areas || {});
}

function renderSummary(stats) {
  document.getElementById('stat-sessions').textContent = stats.sessions_completed || 0;
  document.getElementById('stat-last').textContent = stats.last_session || '—';

  const history = stats.history || [];
  if (history.length > 0) {
    const avg = Math.round(history.reduce((s, h) => s + h.score_pct, 0) / history.length);
    document.getElementById('stat-avg').textContent = avg + '%';
  } else {
    document.getElementById('stat-avg').textContent = '—';
  }
}

function renderHistory(history) {
  const container = document.getElementById('history-chart');
  if (history.length === 0) {
    container.innerHTML = '<p class="no-data">No sessions yet. Play a round to see your history!</p>';
    return;
  }

  const recent = history.slice(-20);
  const bars = document.createElement('div');
  bars.className = 'history-bars';

  recent.forEach(h => {
    const bar = document.createElement('div');
    bar.className = 'history-bar';
    bar.style.height = Math.max(4, h.score_pct) + '%';
    bar.title = `${h.date}: ${h.score_pct}% (${h.first_try_correct}/${h.total_cards})`;
    bars.appendChild(bar);
  });

  container.innerHTML = '';
  container.appendChild(bars);
}

function renderProblemAreas(problemAreas) {
  const container = document.getElementById('problem-areas-container');
  container.innerHTML = '';

  let hasAny = false;

  for (const [opKey, facts] of Object.entries(problemAreas)) {
    if (Object.keys(facts).length === 0) continue;

    // Filter to facts with at least 1 attempt, sort by worst accuracy
    const rows = Object.entries(facts)
      .map(([label, data]) => ({
        label,
        attempts: data.attempts,
        correct: data.first_try_correct,
        pct: data.attempts > 0 ? Math.round(data.first_try_correct / data.attempts * 100) : 0
      }))
      .filter(r => r.attempts > 0)
      .sort((a, b) => a.pct - b.pct);

    if (rows.length === 0) continue;
    hasAny = true;

    const section = document.createElement('div');
    section.className = 'problem-areas-section';
    section.innerHTML = `<div class="section-title">${OP_LABELS[opKey] || opKey}</div>`;

    const table = document.createElement('table');
    table.className = 'problem-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Fact</th>
          <th>First-Try Rate</th>
          <th>Attempts</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement('tbody');
    rows.forEach(row => {
      const fillClass = row.pct < 50 ? 'low' : row.pct < 75 ? 'mid' : '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${row.label}</strong></td>
        <td>
          <div class="pct-bar">
            <div class="pct-track">
              <div class="pct-fill ${fillClass}" style="width: ${row.pct}%"></div>
            </div>
            <span class="pct-num">${row.pct}%</span>
          </div>
        </td>
        <td>${row.attempts}</td>
      `;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    section.appendChild(table);
    container.appendChild(section);
  }

  if (!hasAny) {
    container.innerHTML = '<p class="no-data">No problem area data yet. Complete a session to see which facts need more practice.</p>';
  }
}

document.getElementById('home-btn').addEventListener('click', () => {
  window.location.href = '/';
});

init();
