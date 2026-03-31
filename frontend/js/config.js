const OPERATIONS = [
  { key: 'addition',       label: 'Addition',       symbol: '+' },
  { key: 'subtraction',    label: 'Subtraction',    symbol: '−' },
  { key: 'multiplication', label: 'Multiplication', symbol: '×' },
  { key: 'division',       label: 'Division',       symbol: '÷' },
];

const params = new URLSearchParams(window.location.search);
const accountId = params.get('account');
let configState = null;
let accountName = '';

async function init() {
  if (!accountId) { window.location.href = '/'; return; }

  const accounts = await API.getAccounts();
  const acc = accounts.find(a => a.id === accountId);
  if (!acc) { window.location.href = '/'; return; }
  accountName = acc.name;
  document.getElementById('user-name').textContent = acc.name + "'s Settings";

  configState = await API.getConfig(accountId);
  renderConfig();
}

function renderConfig() {
  const container = document.getElementById('config-container');
  container.innerHTML = '';

  OPERATIONS.forEach(op => {
    const opCfg = configState.operations[op.key] || { enabled: false, min: 0, max: 10 };
    const card = document.createElement('div');
    card.className = `op-card op-${op.key}${opCfg.enabled ? ' active' : ' disabled'}`;
    card.innerHTML = `
      <div class="op-card-header">
        <input type="checkbox" class="op-toggle" id="toggle-${op.key}" ${opCfg.enabled ? 'checked' : ''}>
        <span class="op-symbol">${op.symbol}</span>
        <span class="op-name">${op.label}</span>
      </div>
      <div class="range-row">
        <span class="range-label">Minimum</span>
        <input type="range" min="0" max="15" value="${opCfg.min}" id="min-${op.key}">
        <span class="range-value" id="min-val-${op.key}">${opCfg.min}</span>
      </div>
      <div class="range-row">
        <span class="range-label">Maximum</span>
        <input type="range" min="0" max="15" value="${opCfg.max}" id="max-${op.key}">
        <span class="range-value" id="max-val-${op.key}">${opCfg.max}</span>
      </div>
    `;
    container.appendChild(card);

    // Toggle
    card.querySelector(`#toggle-${op.key}`).addEventListener('change', (e) => {
      configState.operations[op.key].enabled = e.target.checked;
      card.classList.toggle('active', e.target.checked);
      card.classList.toggle('disabled', !e.target.checked);
    });

    // Min slider
    card.querySelector(`#min-${op.key}`).addEventListener('input', (e) => {
      let v = parseInt(e.target.value);
      const maxSlider = card.querySelector(`#max-${op.key}`);
      if (v > parseInt(maxSlider.value)) {
        maxSlider.value = v;
        configState.operations[op.key].max = v;
        document.getElementById(`max-val-${op.key}`).textContent = v;
      }
      configState.operations[op.key].min = v;
      document.getElementById(`min-val-${op.key}`).textContent = v;
    });

    // Max slider
    card.querySelector(`#max-${op.key}`).addEventListener('input', (e) => {
      let v = parseInt(e.target.value);
      const minSlider = card.querySelector(`#min-${op.key}`);
      if (v < parseInt(minSlider.value)) {
        minSlider.value = v;
        configState.operations[op.key].min = v;
        document.getElementById(`min-val-${op.key}`).textContent = v;
      }
      configState.operations[op.key].max = v;
      document.getElementById(`max-val-${op.key}`).textContent = v;
    });
  });
}

document.getElementById('save-btn').addEventListener('click', async () => {
  const result = await API.saveConfig(accountId, configState);
  if (result.error) {
    alert('Error saving: ' + result.error);
    return;
  }
  window.location.href = '/';
});

document.getElementById('cancel-btn').addEventListener('click', () => {
  window.location.href = '/';
});

init();
