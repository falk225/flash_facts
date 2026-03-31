let selectedAccountId = null;
let accounts = [];

const AVATAR_COLORS = ['avatar-0', 'avatar-1', 'avatar-2', 'avatar-3', 'avatar-4'];

async function init() {
  accounts = await API.getAccounts();
  renderAccounts();
  updateActions();
}

function renderAccounts() {
  const grid = document.getElementById('account-grid');
  grid.innerHTML = '';

  accounts.forEach((acc, idx) => {
    const btn = document.createElement('button');
    btn.className = 'account-btn';
    btn.dataset.id = acc.id;

    const avatar = document.createElement('div');
    avatar.className = `avatar ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`;
    avatar.textContent = acc.name[0].toUpperCase();

    const nameSpan = document.createElement('span');
    nameSpan.textContent = acc.name;

    btn.appendChild(avatar);
    btn.appendChild(nameSpan);

    if (acc.id === selectedAccountId) btn.classList.add('selected');

    btn.addEventListener('click', () => selectAccount(acc.id));
    grid.appendChild(btn);
  });

  // Show/hide add form
  const addForm = document.getElementById('add-account-section');
  addForm.style.display = accounts.length < 5 ? 'flex' : 'none';
}

function selectAccount(id) {
  selectedAccountId = (selectedAccountId === id) ? null : id;
  renderAccounts();
  updateActions();
}

function updateActions() {
  const playBtn = document.getElementById('play-btn');
  const configBtn = document.getElementById('config-btn');
  const statsBtn = document.getElementById('stats-btn');
  const hasSelection = !!selectedAccountId;
  playBtn.disabled = !hasSelection;
  configBtn.disabled = !hasSelection;
  statsBtn.disabled = !hasSelection;
  playBtn.style.opacity = hasSelection ? '1' : '0.5';
  configBtn.style.opacity = hasSelection ? '1' : '0.5';
  statsBtn.style.opacity = hasSelection ? '1' : '0.5';
}

document.getElementById('play-btn').addEventListener('click', () => {
  if (selectedAccountId)
    window.location.href = `session.html?account=${selectedAccountId}`;
});

document.getElementById('config-btn').addEventListener('click', () => {
  if (selectedAccountId)
    window.location.href = `config.html?account=${selectedAccountId}`;
});

document.getElementById('stats-btn').addEventListener('click', () => {
  if (selectedAccountId)
    window.location.href = `stats.html?account=${selectedAccountId}`;
});

document.getElementById('add-account-btn').addEventListener('click', async () => {
  const input = document.getElementById('new-name-input');
  const name = input.value.trim();
  if (!name) return;
  const result = await API.createAccount(name);
  if (result.error) {
    alert(result.error);
    return;
  }
  input.value = '';
  accounts = await API.getAccounts();
  renderAccounts();
  updateActions();
});

document.getElementById('new-name-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('add-account-btn').click();
});

init();
