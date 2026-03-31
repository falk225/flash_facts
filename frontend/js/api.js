const API = {
  async getAccounts() {
    const r = await fetch('/api/accounts');
    return r.json();
  },

  async createAccount(name) {
    const r = await fetch('/api/accounts', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name})
    });
    return r.json();
  },

  async deleteAccount(id) {
    const r = await fetch(`/api/accounts/${id}`, {method: 'DELETE'});
    return r.json();
  },

  async getConfig(id) {
    const r = await fetch(`/api/accounts/${id}/config`);
    return r.json();
  },

  async saveConfig(id, config) {
    const r = await fetch(`/api/accounts/${id}/config`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(config)
    });
    return r.json();
  },

  async saveSession(id, payload) {
    const r = await fetch(`/api/accounts/${id}/sessions`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    return r.json();
  },

  async getStats(id) {
    const r = await fetch(`/api/accounts/${id}/stats`);
    return r.json();
  },

  async getDraft(id) {
    const r = await fetch(`/api/accounts/${id}/session-draft`);
    return r.json();
  },

  async saveDraft(id, payload) {
    const r = await fetch(`/api/accounts/${id}/session-draft`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    return r.json();
  },

  async deleteDraft(id) {
    const r = await fetch(`/api/accounts/${id}/session-draft`, {method: 'DELETE'});
    return r.json();
  }
};
