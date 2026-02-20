const API = {
  async get(url) {
    const res = await fetch(url);
    if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Error desconocido' })); throw new Error(err.error || 'Error del servidor'); }
    return res.json();
  },
  async post(url, data) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Error desconocido' })); throw new Error(err.error || 'Error del servidor'); }
    return res.json();
  },
  getPlayers() { return this.get('/api/players'); },
  getPlayer(slug) { return this.get(`/api/player/${slug}`); },
  createCharacter(slug, name) { return this.post(`/api/player/${slug}/character`, { name }); },
  getCharacter(id) { return this.get(`/api/character/${id}`); },
  getLeaderboard() { return this.get('/api/leaderboard'); },
  getDefinitions() { return this.get('/api/definitions'); },
  matchmaking(charId) { return this.post('/api/fight/matchmaking', { charId }); },
  fightPVP(charId, opponentId) { return this.post('/api/fight/pvp', { charId, opponentId }); },
  chooseLevelUp(charId, choiceIndex) { return this.post(`/api/character/${charId}/choose`, { choiceIndex }); },
  equipItem(charId, slot, itemId) { return this.post(`/api/character/${charId}/equip`, { slot, itemId }); },
  getFightHistory(charId) { return this.get(`/api/fights/${charId}`); },
  getTournament() { return this.get('/api/tournament'); },
  startTournament() { return this.post('/api/tournament/start'); },
  playTournamentMatch(matchId) { return this.post(`/api/tournament/match/${matchId}`); },
  resetTournament() { return this.post('/api/tournament/reset'); },
  adminReset() { return this.post('/api/admin/reset'); }
};
