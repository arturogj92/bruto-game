// Avatar mapping: player slug → image file
const AVATAR_MAP = {
  arturo: 'bruto_guerrero.png',
  victor: 'bruto_mago.png',
  nacho: 'bruto_berserker.png',
  juan: 'bruto_arquero.png',
  rober: 'bruto_caballero.png',
  pollo: 'bruto_ninja.png'
};

const AVATAR_LABELS = {
  guerrero: 'Guerrero', mago: 'Mago', berserker: 'Berserker',
  arquero: 'Arquero', caballero: 'Caballero', ninja: 'Ninja'
};

function getAvatarUrl(playerSlugOrAvatar) {
  const file = AVATAR_MAP[playerSlugOrAvatar] || ('bruto_' + (playerSlugOrAvatar || 'guerrero') + '.png');
  return '/img/' + file;
}

const Views = {
  // Player Selection
  playerSelect(players) {
    return '<div class="screen active screen-select">' +
      '<div style="text-align:center; margin-bottom:12px;">' +
        '<div style="font-size:48px;">⚔️</div>' +
        '<h1 class="game-title" style="font-size:32px; margin:8px 0;">EL BRUTO</h1>' +
        '<p class="game-subtitle" style="font-size:12px;">Arena PvP & PvE</p>' +
      '</div>' +
      '<div class="player-grid">' +
        players.map(function(p) {
          var hasChar = !!p.character;
          var charCount = (p.characters || []).length;
          var imgUrl = getAvatarUrl(p.slug);
          return '<div class="player-card ' + (hasChar ? 'has-character' : '') + '" onclick="App.selectPlayer(\'' + p.slug + '\')">' +
            (hasChar ? '<div class="level-badge">Nv.' + p.character.level + '</div>' : '') +
            (charCount > 1 ? '<div class="char-count-badge">' + charCount + '/3</div>' : '') +
            '<div class="avatar-img-sm"><img src="' + imgUrl + '" alt="' + p.display_name + '"></div>' +
            '<div class="name">' + p.display_name + '</div>' +
            '<div class="status">' + (hasChar ? p.character.name + (charCount > 1 ? ' +' + (charCount-1) : '') : 'Sin personaje') + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div style="margin-top:20px; text-align:center; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">' +
        '<button class="btn btn-outline btn-sm" onclick="App.showLeaderboard()" style="width:auto;">🏆 Ranking</button>' +
        '<button class="btn btn-outline btn-sm" onclick="App.showTournament()" style="width:auto;">👑 Torneo</button>' +
      '</div>' +
    '</div>';
  },

  // Character Selection (when player has multiple characters)
  characterSelect(player, characters) {
    var imgUrl = getAvatarUrl(player.slug);
    var canCreate = characters.length < 3;
    var firstCharGold = characters.length > 0 ? (characters[0].gold || 0) : 0;
    var canAfford = firstCharGold >= 2500;

    return '<div class="screen active">' +
      '<div class="header">' +
        '<button class="header-back" onclick="App.goBack()">←</button>' +
        '<div class="header-title">👥 Personajes de ' + player.display_name + '</div>' +
        '<div></div>' +
      '</div>' +
      '<div class="char-select-list">' +
        characters.map(function(c) {
          return '<div class="char-select-card" onclick="App.selectCharacter(' + c.id + ')">' +
            '<div class="char-select-avatar"><img src="' + imgUrl + '" alt="' + c.name + '"></div>' +
            '<div class="char-select-info">' +
              '<div class="char-select-name">' + c.name + '</div>' +
              '<div class="char-select-stats">Nv.' + c.level + ' | 💪' + c.strength + ' 🛡️' + c.defense + ' ⚡' + c.speed + ' | ' + c.wins + 'V/' + c.losses + 'D</div>' +
              '<div class="char-select-gold">💰 ' + (c.gold || 0) + ' oro</div>' +
            '</div>' +
            '<div class="char-select-arrow">→</div>' +
          '</div>';
        }).join('') +
      '</div>' +
      (canCreate ? 
        '<div class="create-new-char" onclick="' + (characters.length === 0 || canAfford ? "App.showCreateCharacter()" : "") + '" style="' + (!canAfford && characters.length > 0 ? 'opacity:0.5;cursor:not-allowed;' : '') + '">' +
          '<div class="create-new-icon">➕</div>' +
          '<div class="create-new-text">' +
            '<div class="create-new-title">Crear nuevo personaje</div>' +
            '<div class="create-new-cost">' + (characters.length === 0 ? '¡Gratis!' : '💰 2.500 oro' + (!canAfford ? ' (necesitas ' + (2500 - firstCharGold) + ' más)' : '')) + '</div>' +
          '</div>' +
        '</div>'
      : '<div style="text-align:center;padding:16px;color:var(--text-dim);font-size:13px;">Máximo 3 personajes alcanzado</div>') +
    '</div>';
  },

  // Character Creation
  characterCreate(player) {
    return '<div class="screen active">' +
      '<div class="header">' +
        '<button class="header-back" onclick="App.goBack()">←</button>' +
        '<div class="header-title">⚔️ Crear Guerrero</div>' +
        '<div class="header-player"><strong>' + player.display_name + '</strong></div>' +
      '</div>' +
      '<div class="create-form">' +
        '<div class="preview-character">' +
          '<div class="preview-avatar-img"><img src="' + getAvatarUrl(player.slug) + '" alt="' + player.display_name + '"></div>' +
          '<div class="avatar-class">' + (AVATAR_LABELS[player.avatar] || 'Guerrero') + '</div>' +
          '<div class="preview-name" id="preview-name">Tu Guerrero</div>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Nombre del Guerrero</label>' +
          '<input type="text" id="char-name" placeholder="Ej: Thorin, Ragnar..." maxlength="20" oninput="document.getElementById(\'preview-name\').textContent = this.value || \'Tu Guerrero\'">' +
        '</div>' +
        '<button class="btn btn-gold" onclick="App.createCharacter()">⚔️ ¡CREAR GUERRERO!</button>' +
      '</div>' +
    '</div>';
  },

  // Main Hub - NOW WITH PVE BUTTON
  mainHub(player, character, defs) {
    var abilities = JSON.parse(character.abilities || '[]');
    var inventory = JSON.parse(character.inventory || '[]');
    var xpPct = character.level >= 50 ? 100 : (character.xp / character.xp_next * 100);
    var imgUrl = getAvatarUrl(player.slug);
    var effectiveStats = Views.calcEffective(character, defs);

    var abilitiesHtml = '';
    if (abilities.length > 0) {
      abilitiesHtml = '<div class="abilities-section">' +
        '<div class="abilities-title">⚡ Habilidades</div>' +
        abilities.map(function(a) {
          var def = defs && defs.abilities ? defs.abilities[a] : null;
          return '<span class="ability-tag">' + (def ? def.emoji : '⚡') + ' ' + (def ? def.name : a) + '</span>';
        }).join('') +
      '</div>';
    }

    return '<div class="screen active screen-character">' +
      '<div class="header">' +
        '<button class="header-back" onclick="App.goBack()">←</button>' +
        '<div class="header-title">⚔️ Arena</div>' +
        '<div class="header-right">' +
          '<button class="notif-bell" id="notif-bell" onclick="App.showChallenges()">' +
            '🔔<span class="notif-badge" id="notif-badge" style="display:none;">0</span>' +
          '</button>' +
          '<div class="header-player"><strong>' + player.display_name + '</strong></div>' +
        '</div>' +
      '</div>' +

      '<div class="stats-card">' +
        '<div class="stats-header">' +
          '<div class="stats-avatar-img"><img src="' + imgUrl + '" alt="' + character.name + '"></div>' +
          '<div class="stats-info">' +
            '<h2>' + character.name + '</h2>' +
            '<div class="stats-level">Nivel <strong>' + character.level + '</strong></div>' +
            '<div class="xp-bar"><div class="xp-fill" style="width:' + xpPct + '%"></div></div>' +
            '<div class="xp-text">' + character.xp + ' / ' + character.xp_next + ' XP</div>' +
            '<div class="gold-display"><span class="gold-icon">\u{1FA99}</span> <span class="gold-amount">' + (character.gold || 0) + '</span> oro</div>' +
          '</div>' +
        '</div>' +
        Views.statBar('❤️', 'Vida', effectiveStats.hp_max, 400, 'hp') +
        Views.statBar('💪', 'Fuerza', effectiveStats.strength, 60, 'str') +
        Views.statBar('🛡️', 'Defensa', effectiveStats.defense, 60, 'def') +
        Views.statBar('⚡', 'Velocidad', effectiveStats.speed, 60, 'spd') +
        '<div class="record-row">' +
          '<span class="wins">✅ ' + character.wins + 'V</span>' +
          '<span class="losses">❌ ' + character.losses + 'D</span>' +
        '</div>' +
        abilitiesHtml +
      '</div>' +

      '<div class="equip-card">' +
        '<div class="equip-title">🎒 Equipamiento</div>' +
        '<div class="equip-slots">' +
          Views.equipSlot('weapon', '⚔️ Arma', character.weapon, defs ? defs.weapons : null, inventory, character.id) +
          Views.equipSlot('armor', '🛡️ Armadura', character.armor, defs ? defs.armors : null, inventory, character.id) +
          Views.equipSlot('accessory', '💍 Accesorio', character.accessory, defs ? defs.accessories : null, inventory, character.id) +
        '</div>' +
      '</div>' +

      '<div class="action-grid">' +
        '<div class="action-card action-fight" onclick="App.matchmaking()">' +
          '<div class="action-icon">⚔️</div>' +
          '<div class="action-name">¡Lanzar Combate!</div>' +
          '<div class="action-desc">Matchmaking PvP</div>' +
        '</div>' +
        '<div class="action-card action-pve" onclick="App.showPveArena()">' +
          '<div class="action-icon">🏟️</div>' +
          '<div class="action-name">Arena PvE</div>' +
          '<div class="action-desc">Farmea XP</div>' +
        '</div>' +
        '<div class="action-card" onclick="App.showPVPSelect()">' +
          '<div class="action-icon">🎯</div>' +
          '<div class="action-name">Retar Jugador</div>' +
          '<div class="action-desc">Elige rival</div>' +
        '</div>' +
        '<div class="action-card action-challenge" onclick="App.showChallengeCreate()">' +
          '<div class="action-icon">🎲</div>' +
          '<div class="action-name">Retar con Apuesta</div>' +
          '<div class="action-desc">Reta y apuesta oro</div>' +
        '</div>' +
        '<div class="action-card" onclick="App.showLeaderboard()">' +
          '<div class="action-icon">🏆</div>' +
          '<div class="action-name">Ranking</div>' +
          '<div class="action-desc">Clasificación</div>' +
        '</div>' +
        '<div class="action-card" onclick="App.showTournament()">' +
          '<div class="action-icon">👑</div>' +
          '<div class="action-name">Torneo</div>' +
          '<div class="action-desc">Eliminatorio</div>' +
        '</div>' +
        '<div class="action-card action-market" onclick="App.showMarket()">' +
          '<div class="action-icon">🏪</div>' +
          '<div class="action-name">Mercado</div>' +
          '<div class="action-desc">Compra y vende</div>' +
        '</div>' +
        '<div class="action-card" onclick="App.showHistory()">' +
          '<div class="action-icon">📜</div>' +
          '<div class="action-name">Historial</div>' +
          '<div class="action-desc">Tus combates</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  },

  statBar(emoji, name, value, max, cls) {
    return '<div class="stat-row">' +
      '<div class="stat-name"><span class="emoji">' + emoji + '</span> ' + name + '</div>' +
      '<div class="stat-bar-container"><div class="stat-bar-fill ' + cls + '" style="width:' + Math.min(100, value/max*100) + '%"></div></div>' +
      '<div class="stat-value">' + value + '</div>' +
    '</div>';
  },

  equipSlot(slotType, label, equippedId, defsMap, inventory, charId) {
    var items = (inventory || []).filter(function(i) { return i.type === slotType; });
    var equipped = equippedId && defsMap ? defsMap[equippedId] : null;
    
    var selectHtml = '';
    if (items.length > 1) {
      selectHtml = '<select class="slot-select" onchange="App.equipItem(\'' + slotType + '\', this.value)">' +
        items.map(function(i) {
          var def = defsMap ? defsMap[i.id] : null;
          return '<option value="' + i.id + '"' + (i.id === equippedId ? ' selected' : '') + '>' + (def ? def.emoji + ' ' + def.name : i.id) + '</option>';
        }).join('') +
      '</select>';
    }

    return '<div class="equip-slot ' + (equipped ? 'equipped' : 'empty') + '">' +
      '<div class="slot-label">' + label + '</div>' +
      '<div class="slot-content">' +
        (equipped ?
          '<div class="slot-item">' + equipped.emoji + ' ' + equipped.name + '</div>' +
          '<div class="slot-desc">' + (equipped.desc || '') + '</div>' :
          '<div class="slot-empty">Vacío</div>') +
      '</div>' +
      selectHtml +
    '</div>';
  },

  calcEffective(char, defs) {
    var s = { hp_max: char.hp_max, strength: char.strength, defense: char.defense, speed: char.speed };
    if (char.weapon && defs && defs.weapons && defs.weapons[char.weapon]) {
      var w = defs.weapons[char.weapon]; s.strength += (w.damage||0); s.speed += (w.speed||0);
    }
    if (char.armor && defs && defs.armors && defs.armors[char.armor]) {
      var a = defs.armors[char.armor]; s.defense += (a.defense||0); s.speed += (a.speed||0); s.hp_max += (a.hp||0);
    }
    if (char.accessory && defs && defs.accessories && defs.accessories[char.accessory]) {
      var ac = defs.accessories[char.accessory]; s.strength += (ac.strength||0); s.defense += (ac.defense||0); s.speed += (ac.speed||0); s.hp_max += (ac.hp||0);
    }
    return s;
  },

  // ============ PVE ARENA ============
  pveArena(player, character, info) {
    var remaining = info.maxFights - info.fightsToday;
    var dangerColors = {
      'Fácil': '#44ff66',
      'Medio': '#ffcc00',
      'Difícil': '#ff8844',
      'Muy Difícil': '#ff4444'
    };

    var catchUpHtml = '';
    if (info.catchUpBonus > 0) {
      catchUpHtml = '<div class="pve-catchup">' +
        '<span class="catchup-badge">🚀 BONUS ACTIVO</span> ' +
        '<span class="catchup-text">' + info.catchUpReason + '</span>' +
      '</div>';
    }

    return '<div class="screen active">' +
      '<div class="header">' +
        '<button class="header-back" onclick="App.showHub()">←</button>' +
        '<div class="header-title">🏟️ Arena PvE</div>' +
        '<div class="header-player"><strong>' + character.name + '</strong> Nv.' + character.level + '</div>' +
      '</div>' +

      '<div class="pve-counter">' +
        '<div class="pve-counter-icon">⚔️</div>' +
        '<div class="pve-counter-text">' +
          '<span class="pve-count">' + info.fightsToday + '</span> / <span class="pve-max">' + info.maxFights + '</span> peleas esta hora' +
        '</div>' +
        '<div class="pve-counter-bar"><div class="pve-counter-fill" style="width:' + (info.fightsToday / info.maxFights * 100) + '%"></div></div>' +
      '</div>' +

      catchUpHtml +

      '<div class="pve-difficulty-grid">' +
        info.difficulties.map(function(d) {
          var dangerColor = dangerColors[d.danger] || '#fff';
          var isDisabled = remaining <= 0;
          return '<div class="pve-difficulty-card ' + (isDisabled ? 'disabled' : '') + '" ' +
            (isDisabled ? '' : 'onclick="App.fightPVE(\'' + d.id + '\')"') + '>' +
            '<div class="pve-diff-header">' +
              '<span class="pve-diff-emoji">' + d.emoji + '</span>' +
              '<span class="pve-diff-name">' + d.name + '</span>' +
            '</div>' +
            '<div class="pve-diff-stats">' +
              '<div class="pve-diff-danger" style="color:' + dangerColor + '">' + d.danger + '</div>' +
              '<div class="pve-diff-percent">' + d.statPercent + '% de tus stats</div>' +
            '</div>' +
            '<div class="pve-diff-xp">' +
              '<span class="pve-xp-label">XP Victoria:</span> ' +
              '<span class="pve-xp-value">+' + d.baseXP + '</span>' +
              (d.bonusXP > 0 ? ' <span class="pve-xp-bonus">+' + d.bonusXP + ' bonus</span>' : '') +
            '</div>' +
            '<div class="pve-diff-gold">' +
              '<span class="pve-gold-label">\u{1FA99} Oro:</span> ' +
              '<span class="pve-gold-value">' + (d.goldRange || '?') + '</span>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +

      (remaining <= 0 ? '<div class="pve-limit-msg">🚫 Límite diario alcanzado. ¡Vuelve mañana!</div>' : '') +

      '<div class="pve-info-box">' +
        '<div class="pve-info-title">ℹ️ Info Arena PvE</div>' +
        '<ul class="pve-info-list">' +
          '<li>Pelea contra NPCs para ganar XP</li>' +
          '<li>Perder NO quita XP</li>' +
          '<li>Máximo 15 peleas por día</li>' +
          '<li>10s de espera entre peleas</li>' +
          '<li>¡Los jugadores con menor nivel ganan bonus XP!</li>' +
        '</ul>' +
      '</div>' +
    '</div>';
  },

  // PvE Result Screen
  pveResultScreen(isWin, xpGained, character, leveledUp, fightsToday, maxFights, difficulty, goldGained) {
    var remaining = maxFights - fightsToday;
    return '<div class="victory-screen">' +
      '<div class="victory-crown">' + (isWin ? '🏆' : '💀') + '</div>' +
      '<div class="victory-text ' + (isWin ? '' : 'defeat-text') + '">' + (isWin ? '¡VICTORIA!' : '¡DERROTA!') + '</div>' +
      '<div class="victory-sub">' + (isWin ? '+' + xpGained + ' XP' : 'Sin pérdida de XP') + '</div>' +
      (leveledUp ? '<div class="level-up-text">⬆️ ¡NIVEL ' + character.level + '!</div>' : '') +
      '<div class="pve-result-counter">' + fightsToday + '/' + maxFights + ' peleas PvE esta hora (' + remaining + ' restantes)</div>' +
      '<div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:16px;">' +
        '<button class="btn btn-gold" onclick="App.closePveResult()" style="max-width:200px;">🏟️ Volver a Arena</button>' +
        '<button class="btn btn-outline" onclick="App.screenStack=[\'select\',\'hub\']; App.showHub();" style="max-width:200px;">🏠 Hub</button>' +
      '</div>' +
    '</div>';
  },

  // PVP Select
  pvpSelect(opponents, character) {
    return '<div class="screen active">' +
      '<div class="header">' +
        '<button class="header-back" onclick="App.showHub()">←</button>' +
        '<div class="header-title">🎯 Retar Jugador</div>' +
        '<div class="header-player"><strong>' + character.name + '</strong> Nv.' + character.level + '</div>' +
      '</div>' +
      (opponents.length === 0 ?
        '<div style="text-align:center; padding:40px; color:var(--text-dim);">' +
          '<div style="font-size:48px;">😴</div><p>No hay oponentes aún.</p>' +
        '</div>' :
        '<div class="opponent-list">' +
          opponents.map(function(opp) {
            var imgUrl = getAvatarUrl(opp.player_slug || opp.player_avatar);
            return '<div class="opponent-card" onclick="App.fightPVP(' + opp.id + ')">' +
              '<div class="opp-avatar-img"><img src="' + imgUrl + '" alt="' + opp.name + '"></div>' +
              '<div class="opp-info">' +
                '<div class="opp-name">' + opp.name + '</div>' +
                '<div class="opp-stats">Nv.' + opp.level + ' | 💪' + opp.strength + ' 🛡️' + opp.defense + ' ⚡' + opp.speed + ' | ' + opp.player_name + '</div>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>'
      ) +
    '</div>';
  },

  // Leaderboard
  leaderboard(characters) {
    var medals = ['🥇', '🥈', '🥉'];
    return '<div class="screen active">' +
      '<div class="header">' +
        '<button class="header-back" onclick="App.goBack()">←</button>' +
        '<div class="header-title">🏆 Ranking</div>' +
        '<div></div>' +
      '</div>' +
      (characters.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--text-dim);"><p>Aún no hay guerreros.</p></div>' :
        '<div class="leaderboard-list">' +
          characters.map(function(c, i) {
            var imgUrl = getAvatarUrl(c.player_slug || c.player_avatar);
            return '<div class="lb-entry">' +
              '<div class="lb-rank">' + (medals[i] || (i + 1)) + '</div>' +
              '<div class="lb-avatar-img"><img src="' + imgUrl + '" alt="' + c.name + '"></div>' +
              '<div class="lb-info">' +
                '<div class="lb-name">' + c.name + '</div>' +
                '<div class="lb-stats">' + c.player_name + ' · ' + c.wins + 'V/' + c.losses + 'D · 💪' + c.strength + ' 🛡️' + c.defense + ' ⚡' + c.speed + '</div>' +
              '</div>' +
              '<div class="lb-level">Nv.' + c.level + '</div>' +
            '</div>';
          }).join('') +
        '</div>'
      ) +
    '</div>';
  },

  // Result Screen (PvP)
  resultScreen(isWin, xpGained, character, leveledUp, goldGained) {
    return '<div class="victory-screen">' +
      '<div class="victory-crown">' + (isWin ? '🏆' : '💀') + '</div>' +
      '<div class="victory-text ' + (isWin ? '' : 'defeat-text') + '">' + (isWin ? '¡VICTORIA!' : '¡DERROTA!') + '</div>' +
      '<div class="victory-sub">+' + xpGained + ' XP</div>' +
      (goldGained ? '<div class="gold-reward">\u{1FA99} +' + goldGained + ' oro</div>' : '') +
      (leveledUp ? '<div class="level-up-text">⬆️ ¡NIVEL ' + character.level + '!</div>' : '') +
      '<button class="btn btn-gold" onclick="App.closeResult()" style="max-width:300px;">Continuar</button>' +
    '</div>';
  },

  // Level up choice modal
  levelUpChoiceModal(choices) {
    return '<div class="modal-overlay" id="levelup-modal">' +
      '<div class="modal-content">' +
        '<div class="modal-title">⬆️ ¡Subida de Nivel!</div>' +
        '<p style="color:var(--text-dim); font-size:13px; text-align:center; margin-bottom:16px;">Elige tu recompensa:</p>' +
        choices.map(function(c, i) {
          var typeBadge = c.type === 'weapon' ? '⚔️ ARMA' : c.type === 'ability' ? '⚡ HABILIDAD' : c.type === 'armor' ? '🛡️ ARMADURA' : c.type === 'accessory' ? '💍 ACCESORIO' : '📈 BOOST';
          return '<div class="ability-choice" onclick="App.selectLevelUpChoice(' + i + ')">' +
            '<div class="choice-type-badge ' + c.type + '">' + typeBadge + '</div>' +
            '<div class="ab-name">' + c.emoji + ' ' + c.name + '</div>' +
            '<div class="ab-desc">' + c.desc + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  },

  // Tournament
  tournament(data) {
    if (data.status === 'waiting') return Views.tournamentWaiting(data);
    return Views.tournamentBracket(data);
  },

  tournamentWaiting(data) {
    return '<div class="screen active">' +
      '<div class="header">' +
        '<button class="header-back" onclick="App.goBack()">←</button>' +
        '<div class="header-title">👑 Torneo</div>' +
        '<div></div>' +
      '</div>' +
      '<div class="tournament-section">' +
        '<div style="text-align:center; margin-bottom:24px;">' +
          '<div style="font-size:64px;">👑</div>' +
          '<h2 style="color:var(--gold); font-size:24px;">Torneo Eliminatorio</h2>' +
        '</div>' +
        '<div class="stats-card">' +
          '<h3 style="color:var(--gold); margin-bottom:12px;">Jugadores</h3>' +
          (data.chars || []).map(function(c) {
            return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">' +
              '<span style="color:var(--text-bright);">' + c.name + '</span>' +
              '<span style="color:var(--text-dim);">Nv.' + c.level + ' (' + c.player_name + ')</span>' +
            '</div>';
          }).join('') +
        '</div>' +
        ((data.chars||[]).length >= 2 ?
          '<button class="btn btn-gold" onclick="App.startTournament()" style="margin-top:16px;">⚔️ ¡INICIAR TORNEO!</button>' :
          '<p style="text-align:center;color:var(--text-dim);">Se necesitan al menos 2 jugadores.</p>') +
      '</div>' +
    '</div>';
  },

  tournamentBracket(data) {
    var matches = data.matches || [];
    var rounds = {};
    matches.forEach(function(m) { if (!rounds[m.round]) rounds[m.round] = []; rounds[m.round].push(m); });
    var roundNames = ['Cuartos', 'Semifinal', 'Final'];
    var numRounds = Object.keys(rounds).length;
    var champion = null;
    if (data.status === 'finished' && data.champion_id) {
      var champMatch = matches.find(function(m) { return m.winner_id === data.champion_id; });
      if (champMatch) champion = champMatch.winner;
    }

    var championHtml = '';
    if (champion) {
      championHtml = '<div class="tournament-champion">' +
        '<div class="champion-emoji">👑</div>' +
        '<div class="champion-text">🏆 ¡' + champion.name + ' es el CAMPEÓN! 🏆</div>' +
        '<button class="btn btn-outline btn-sm" onclick="App.resetTournament()" style="margin-top:16px; width:auto;">🔄 Nuevo Torneo</button>' +
      '</div>';
    }

    var sortedRounds = Object.keys(rounds).sort(function(a,b) { return a-b; });
    var bracketHtml = sortedRounds.map(function(round) {
      var rn = parseInt(round);
      var title = rn === numRounds - 1 ? 'Final' : rn === numRounds - 2 ? 'Semifinal' : (roundNames[rn] || 'Ronda ' + (rn+1));
      return '<div class="bracket-round">' +
        '<div class="round-title">' + title + '</div>' +
        rounds[round].map(function(m) {
          var playable = !m.played && m.char1_id && m.char2_id;
          return '<div class="bracket-match ' + (m.played?'played':'') + ' ' + (playable?'playable':'') + '"' +
            (playable ? ' onclick="App.playTournamentMatch(' + m.id + ')"' : '') + '>' +
            '<div class="bracket-fighter ' + (m.winner_id===m.char1_id?'winner':'') + ' ' + (m.played&&m.winner_id!==m.char1_id?'loser':'') + '">' +
              '<span class="bf-name">' + (m.char1 ? m.char1.name : 'BYE') + '</span>' +
            '</div>' +
            '<div class="bracket-vs">VS</div>' +
            '<div class="bracket-fighter ' + (m.winner_id===m.char2_id?'winner':'') + ' ' + (m.played&&m.winner_id!==m.char2_id?'loser':'') + '">' +
              '<span class="bf-name">' + (m.char2 ? m.char2.name : 'BYE') + '</span>' +
            '</div>' +
            (playable ? '<div style="text-align:center;font-size:11px;color:var(--gold);margin-top:4px;">▶ Tap para pelear</div>' : '') +
          '</div>';
        }).join('') +
      '</div>';
    }).join('');

    return '<div class="screen active">' +
      '<div class="header">' +
        '<button class="header-back" onclick="App.goBack()">←</button>' +
        '<div class="header-title">👑 Torneo</div>' +
        '<div></div>' +
      '</div>' +
      championHtml +
      '<div class="bracket-container"><div class="bracket">' + bracketHtml + '</div></div>' +
      (data.status !== 'finished' ?
        '<div style="text-align:center;margin-top:16px;">' +
          '<button class="btn btn-outline btn-sm" onclick="App.resetTournament()" style="width:auto;">🔄 Reiniciar</button>' +
        '</div>' : '') +
    '</div>';
  }
,
  comboBook(combos, discoveries, character) {
    const discoveredIds = new Set((discoveries || []).map(d => d.combo_id));
    const inventory = JSON.parse(character.inventory || '[]');
    const ownedWeapons = new Set(inventory.filter(i => i.type === 'weapon').map(i => i.id));
    
    return '<div class="screen active">' +
      '<div class="header">' +
        '<button class="header-back" onclick="App.goBack()">←</button>' +
        '<div class="header-title">📖 Libro de Combos</div>' +
        '<div></div>' +
      '</div>' +
      '<div class="combo-book-header">' +
        '<h2>📖 Combos de Armas</h2>' +
        '<div class="combo-counter">' + discoveredIds.size + '/' + combos.length + ' descubiertos</div>' +
      '</div>' +
      '<div class="combo-grid">' +
      combos.map(function(c) {
        var discovered = discoveredIds.has(c.id);
        return '<div class="combo-card ' + (discovered ? 'discovered' : 'locked') + '">' +
          '<div class="combo-name">' + (discovered ? c.emoji + ' ' + c.name : '🔒 ???') + '</div>' +
          '<div class="combo-weapons">' +
            c.weapons.map(function(w) {
              return '<span class="combo-weapon-tag ' + (ownedWeapons.has(w) ? 'owned' : '') + '">' + 
                (discovered ? w : '???') + '</span>';
            }).join('') +
          '</div>' +
          (discovered ? '<div class="combo-effect">' + c.desc + '</div>' : 
           '<div class="combo-locked-hint">Necesitas ' + c.weaponCount + ' armas específicas</div>') +
        '</div>';
      }).join('') +
      '</div>' +
    '</div>';
  }

,

  // ============ SELL ITEM FORM ============
  sellItemForm(character, defs) {
    var inventory = JSON.parse(character.inventory || '[]');
    var equipped = [character.weapon, character.weapon2, character.weapon3, character.weapon4, character.armor, character.accessory].filter(Boolean);
    var sellable = inventory.filter(function(i) {
      if (i.type === 'weapon') return !([character.weapon, character.weapon2, character.weapon3, character.weapon4].includes(i.id));
      if (i.type === 'armor') return character.armor !== i.id;
      if (i.type === 'accessory') return character.accessory !== i.id;
      return true;
    });
    if (sellable.length === 0) return '<p class="empty-text">No tienes items para vender (desequipa primero)</p>';
    return '<div class="sell-row">' +
      '<select id="sell-item-select" class="sell-select">' +
        '<option value="">-- Selecciona item --</option>' +
        sellable.map(function(i) {
          var def = null;
          if (i.type === 'weapon' && defs.weapons) def = defs.weapons[i.id];
          else if (i.type === 'armor' && defs.armors) def = defs.armors[i.id];
          else if (i.type === 'accessory' && defs.accessories) def = defs.accessories[i.id];
          var label = def ? def.emoji + ' ' + def.name : i.id;
          return '<option value="' + i.type + '|' + i.id + '">' + label + '</option>';
        }).join('') +
      '</select>' +
      '<input type="number" id="sell-price-input" class="sell-price" placeholder="Precio (10-9999)" min="10" max="9999">' +
      '<button class="btn btn-sm btn-gold" onclick="App.listItemForSale()">Vender</button>' +
    '</div>';
  },

  // ============ MARKET SCREEN ============
  marketScreen(shopData, marketplaceData, myListings, character, defs) {
    var activeTab = Views._marketTab || 'shop';
    var gold = character.gold || 0;

    var tabsHtml = '<div class="market-tabs">' +
      '<div class="market-tab ' + (activeTab === 'shop' ? 'active' : '') + '" onclick="App.switchMarketTab(\'shop\')">\u{1F9D9} Mercader</div>' +
      '<div class="market-tab ' + (activeTab === 'market' ? 'active' : '') + '" onclick="App.switchMarketTab(\'market\')">\u{1F4E6} Mercado</div>' +
    '</div>';

    var contentHtml = '';
    if (activeTab === 'shop') {
      contentHtml = '<div class="shop-section">' +
        '<div class="shop-npc-banner"><span class="shop-npc-emoji">\u{1F9D9}</span> <strong>Mercader Errante</strong> <span class="shop-rotation">Rota cada 6h</span></div>' +
        '<div class="shop-grid">' +
        (shopData.items || []).map(function(item) {
          var canBuy = gold >= item.price;
          var typeLabel = {weapon:'\u2694\uFE0F Arma',armor:'\u{1F6E1}\uFE0F Armadura',accessory:'\u{1F48D} Accesorio'}[item.type] || item.type;
          return '<div class="shop-card">' +
            '<div class="shop-type-badge">' + typeLabel + '</div>' +
            '<div class="shop-item-name">' + item.emoji + ' ' + item.name + '</div>' +
            '<div class="shop-item-desc">' + item.desc + '</div>' +
            '<div class="shop-item-price">\u{1FA99} ' + item.price + '</div>' +
            '<button class="btn btn-sm ' + (canBuy ? 'btn-gold' : 'btn-disabled') + '" ' +
              (canBuy ? "onclick=\"App.buyFromShop('" + item.type + "','" + item.id + "'," + item.price + ")\"" : 'disabled') + '>' +
              (canBuy ? 'Comprar' : 'Oro insuficiente') +
            '</button>' +
          '</div>';
        }).join('') +
        '</div></div>';
    } else {
      var otherListings = (marketplaceData || []).filter(function(l) { return l.seller_id !== character.id; });
      contentHtml = '<div class="marketplace-section">' +
        '<div class="mp-block"><h3>\u{1F4E6} Mis items en venta</h3>' +
        ((myListings || []).length === 0 ? '<p class="empty-text">No tienes items en venta</p>' :
          '<div class="listing-grid">' +
          (myListings || []).map(function(l) {
            var def = null;
            if (l.item_type === 'weapon' && defs.weapons) def = defs.weapons[l.item_id];
            else if (l.item_type === 'armor' && defs.armors) def = defs.armors[l.item_id];
            else if (l.item_type === 'accessory' && defs.accessories) def = defs.accessories[l.item_id];
            return '<div class="listing-card mine">' +
              '<div class="listing-item">' + (def ? def.emoji + ' ' + def.name : l.item_id) + '</div>' +
              '<div class="listing-price">\u{1FA99} ' + l.price + '</div>' +
              '<button class="btn btn-sm btn-outline" onclick="App.cancelListing(' + l.id + ')">Retirar</button>' +
            '</div>';
          }).join('') + '</div>') +
        '</div>' +
        '<div class="mp-block"><h3>\u{1F4B0} Poner a la venta</h3>' + Views.sellItemForm(character, defs) + '</div>' +
        '<div class="mp-block"><h3>\u{1F6D2} Mercado de Jugadores</h3>' +
        (otherListings.length === 0 ? '<p class="empty-text">No hay items en el mercado</p>' :
          '<div class="listing-grid">' +
          otherListings.map(function(l) {
            var def = null;
            if (l.item_type === 'weapon' && defs.weapons) def = defs.weapons[l.item_id];
            else if (l.item_type === 'armor' && defs.armors) def = defs.armors[l.item_id];
            else if (l.item_type === 'accessory' && defs.accessories) def = defs.accessories[l.item_id];
            var canBuy = gold >= l.price;
            return '<div class="listing-card">' +
              '<div class="listing-item">' + (def ? def.emoji + ' ' + def.name : l.item_id) + '</div>' +
              '<div class="listing-seller">' + (l.seller_player_name || 'Desconocido') + '</div>' +
              '<div class="listing-price">\u{1FA99} ' + l.price + '</div>' +
              '<button class="btn btn-sm ' + (canBuy ? 'btn-gold' : 'btn-disabled') + '" ' +
                (canBuy ? 'onclick="App.buyFromMarketplace(' + l.id + ')"' : 'disabled') + '>' +
                (canBuy ? 'Comprar' : 'Oro insuficiente') +
              '</button>' +
            '</div>';
          }).join('') + '</div>') +
        '</div></div>';
    }

    return '<div class="screen active">' +
      '<div class="header">' +
        '<button class="header-back" onclick="App.showHub()">\u2190</button>' +
        '<div class="header-title">\u{1F3EA} Mercado</div>' +
        '<div class="header-gold">\u{1FA99} ' + gold + '</div>' +
      '</div>' +
      tabsHtml +
      contentHtml +
    '</div>';
  }
,

  // ============ CHALLENGES / RETOS ============
  challengesModal(challenges, myCharId) {
    var incoming = challenges.filter(function(c) { return c.challenged_id === myCharId; });
    var outgoing = challenges.filter(function(c) { return c.challenger_id === myCharId; });

    var incomingHtml = incoming.length === 0 ?
      '<p class="empty-text">No tienes retos pendientes</p>' :
      incoming.map(function(c) {
        var timeAgo = Views.timeAgo(c.created_at);
        return '<div class="challenge-card incoming">' +
          '<div class="challenge-header">' +
            '<div class="challenge-avatar"><img src="' + getAvatarUrl(c.challenger_slug || c.challenger_avatar) + '" alt=""></div>' +
            '<div class="challenge-info">' +
              '<div class="challenge-name">' + c.challenger_name + '</div>' +
              '<div class="challenge-player">' + c.challenger_player + ' · Nv.' + c.challenger_level + '</div>' +
            '</div>' +
            '<div class="challenge-bet">' +
              '<div class="challenge-bet-label">Apuesta</div>' +
              '<div class="challenge-bet-amount">\u{1FA99} ' + c.bet_amount + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="challenge-time">' + timeAgo + '</div>' +
          '<div class="challenge-actions">' +
            '<div class="challenge-accept-row">' +
              '<label class="challenge-accept-label">Tu apuesta:</label>' +
              '<input type="number" class="challenge-bet-input" id="accept-bet-' + c.id + '" placeholder="0" min="0" value="' + c.bet_amount + '">' +
              '<span class="challenge-bet-hint">\u{1FA99}</span>' +
            '</div>' +
            '<div class="challenge-btn-row">' +
              '<button class="btn btn-sm btn-gold challenge-accept-btn" onclick="App.acceptChallenge(' + c.id + ')">⚔️ Aceptar</button>' +
              '<button class="btn btn-sm btn-outline challenge-decline-btn" onclick="App.declineChallenge(' + c.id + ')">❌ Rechazar</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');

    var outgoingHtml = outgoing.length === 0 ?
      '<p class="empty-text">No has enviado retos</p>' :
      outgoing.map(function(c) {
        var timeAgo = Views.timeAgo(c.created_at);
        return '<div class="challenge-card outgoing">' +
          '<div class="challenge-header">' +
            '<div class="challenge-avatar"><img src="' + getAvatarUrl(c.challenged_slug || c.challenged_avatar) + '" alt=""></div>' +
            '<div class="challenge-info">' +
              '<div class="challenge-name">' + c.challenged_name + '</div>' +
              '<div class="challenge-player">' + c.challenged_player + ' · Nv.' + c.challenged_level + '</div>' +
            '</div>' +
            '<div class="challenge-bet">' +
              '<div class="challenge-bet-label">Tu apuesta</div>' +
              '<div class="challenge-bet-amount">\u{1FA99} ' + c.bet_amount + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="challenge-time">Enviado ' + timeAgo + ' · Esperando respuesta...</div>' +
        '</div>';
      }).join('');

    return '<div class="modal-overlay" id="challenges-modal" onclick="if(event.target===this)App.closeChallenges()">' +
      '<div class="modal-content challenges-modal-content">' +
        '<div class="challenges-modal-header">' +
          '<h2>🎲 Retos</h2>' +
          '<button class="modal-close" onclick="App.closeChallenges()">✕</button>' +
        '</div>' +
        '<div class="challenges-tabs">' +
          '<div class="challenges-tab active" onclick="Views.switchChallengeTab(\'incoming\', this)">📥 Recibidos (' + incoming.length + ')</div>' +
          '<div class="challenges-tab" onclick="Views.switchChallengeTab(\'outgoing\', this)">📤 Enviados (' + outgoing.length + ')</div>' +
        '</div>' +
        '<div class="challenges-tab-content" id="challenges-incoming" style="display:block;">' +
          incomingHtml +
        '</div>' +
        '<div class="challenges-tab-content" id="challenges-outgoing" style="display:none;">' +
          outgoingHtml +
        '</div>' +
      '</div>' +
    '</div>';
  },

  challengeCreateScreen(opponents, character) {
    return '<div class="screen active">' +
      '<div class="header">' +
        '<button class="header-back" onclick="App.showHub()">←</button>' +
        '<div class="header-title">🎲 Crear Reto</div>' +
        '<div class="header-gold">\u{1FA99} ' + (character.gold || 0) + '</div>' +
      '</div>' +
      '<div class="challenge-create-info">' +
        '<p>Elige un rival y apuesta oro. El ganador se lleva todo.</p>' +
      '</div>' +
      (opponents.length === 0 ?
        '<div style="text-align:center; padding:40px; color:var(--text-dim);">' +
          '<div style="font-size:48px;">😴</div><p>No hay oponentes disponibles.</p>' +
        '</div>' :
        '<div class="challenge-bet-setup">' +
          '<label class="challenge-bet-setup-label">\u{1FA99} Tu apuesta de oro:</label>' +
          '<input type="number" id="challenge-bet-amount" class="challenge-bet-input-big" placeholder="0" min="0" max="' + (character.gold || 0) + '" value="0">' +
        '</div>' +
        '<div class="opponent-list">' +
          opponents.map(function(opp) {
            var imgUrl = getAvatarUrl(opp.player_slug || opp.player_avatar);
            return '<div class="opponent-card challenge-opponent" onclick="App.sendChallenge(' + opp.id + ')">' +
              '<div class="opp-avatar-img"><img src="' + imgUrl + '" alt="' + opp.name + '"></div>' +
              '<div class="opp-info">' +
                '<div class="opp-name">' + opp.name + '</div>' +
                '<div class="opp-stats">Nv.' + opp.level + ' | 💪' + opp.strength + ' 🛡️' + opp.defense + ' ⚡' + opp.speed + ' | ' + opp.player_name + '</div>' +
              '</div>' +
              '<div class="challenge-send-icon">🎲</div>' +
            '</div>';
          }).join('') +
        '</div>'
      ) +
    '</div>';
  },

  challengeResultScreen(result, myCharId) {
    var isWin = result.winnerId === myCharId;
    var myBet = result.challengedBet;
    var oppBet = result.challengerBet;
    // If I was the challenger
    if (result.challenger && result.challenger.id === myCharId) {
      myBet = result.challengerBet;
      oppBet = result.challengedBet;
    }
    var goldChange = isWin ? oppBet : -myBet;

    return '<div class="victory-screen">' +
      '<div class="victory-crown">' + (isWin ? '🏆' : '💀') + '</div>' +
      '<div class="victory-text ' + (isWin ? '' : 'defeat-text') + '">' + (isWin ? '¡VICTORIA!' : '¡DERROTA!') + '</div>' +
      '<div class="challenge-result-bets">' +
        '<div class="challenge-result-pot">Bote total: \u{1FA99} ' + result.totalPot + '</div>' +
        (goldChange > 0 ?
          '<div class="challenge-result-gold win">+' + goldChange + ' oro ganado</div>' :
          goldChange < 0 ?
          '<div class="challenge-result-gold lose">' + goldChange + ' oro perdido</div>' :
          '<div class="challenge-result-gold">Sin cambio de oro</div>') +
      '</div>' +
      '<button class="btn btn-gold" onclick="App.closeChallengeResult()" style="max-width:300px;">Continuar</button>' +
    '</div>';
  },

  timeAgo(dateStr) {
    var now = Date.now();
    var then = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z')).getTime();
    var diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'hace ' + diff + 's';
    if (diff < 3600) return 'hace ' + Math.floor(diff / 60) + 'min';
    if (diff < 86400) return 'hace ' + Math.floor(diff / 3600) + 'h';
    return 'hace ' + Math.floor(diff / 86400) + 'd';
  }

};

Views.switchChallengeTab = function(tab, el) {
  document.querySelectorAll('.challenges-tab').forEach(function(t) { t.classList.remove('active'); });
  el.classList.add('active');
  document.querySelectorAll('.challenges-tab-content').forEach(function(c) { c.style.display = 'none'; });
  document.getElementById('challenges-' + tab).style.display = 'block';
};


Views.historyScreen = function(history, character) {
  var NPC_EMOJIS = {
    campesino: '\u{1F9D1}\u200D\u{1F33E}',
    bandido: '\u{1F5E1}\uFE0F',
    gladiador: '\u2694\uFE0F',
    bestia: '\u{1F432}'
  };
  var NPC_LABELS = { campesino: 'Campesino', bandido: 'Bandido', gladiador: 'Gladiador', bestia: 'Bestia' };

  var entriesHtml = '';
  if (history.length === 0) {
    entriesHtml = '<div style="text-align:center; padding:40px; color:var(--text-dim);">' +
      '<div style="font-size:48px;">\u{1F4DC}</div><p>No hay combates registrados a\u00fan.</p>' +
      '<p style="font-size:12px;">\u00A1Pelea para llenar tu historial!</p>' +
    '</div>';
  } else {
    entriesHtml = '<div class="history-list">' +
      history.map(function(h) {
        var isChar1 = h.char1_id === character.id;
        var isWin = h.winner_id === character.id;
        var oppName = isChar1 ? h.char2_name : h.char1_name;
        var myXP = isChar1 ? h.char1_xp : h.char2_xp;
        var myGold = isChar1 ? h.char1_gold : h.char2_gold;
        var isPvE = h.is_pve === 1;
        var diffEmoji = isPvE && h.pve_difficulty ? (NPC_EMOJIS[h.pve_difficulty] || '\u{1F47E}') : '';
        var diffLabel = isPvE && h.pve_difficulty ? NPC_LABELS[h.pve_difficulty] || h.pve_difficulty : '';
        
        var date = h.created_at ? new Date(h.created_at + 'Z') : new Date();
        var dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

        return '<div class="history-entry ' + (isWin ? 'history-win' : 'history-loss') + '">' +
          '<div class="history-result-badge">' + (isWin ? '\u2705 WIN' : '\u274C LOSS') + '</div>' +
          '<div class="history-main">' +
            '<div class="history-opponent">' +
              (isPvE ? '<span class="history-pve-badge">' + diffEmoji + ' ' + diffLabel + '</span> ' : '') +
              '<span class="history-opp-name">' + (oppName || 'Desconocido') + '</span>' +
            '</div>' +
            '<div class="history-rewards">' +
              (myXP > 0 ? '<span class="history-xp">+' + myXP + ' XP</span>' : '') +
              (myGold !== 0 ? '<span class="history-gold ' + (myGold >= 0 ? 'positive' : 'negative') + '">\u{1FA99} ' + (myGold >= 0 ? '+' : '') + myGold + '</span>' : '') +
              (h.wager > 0 ? '<span class="history-wager">\u{1F3B2} ' + h.wager + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="history-date">' + dateStr + '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  return '<div class="screen active">' +
    '<div class="header">' +
      '<button class="header-back" onclick="App.showHub()">\u2190</button>' +
      '<div class="header-title">\u{1F4DC} Historial</div>' +
      '<div class="header-player"><strong>' + character.name + '</strong></div>' +
    '</div>' +
    '<div class="history-stats">' +
      '<span class="history-stat-item">\u2705 ' + (character.wins || 0) + ' V</span>' +
      '<span class="history-stat-item">\u274C ' + (character.losses || 0) + ' D</span>' +
      '<span class="history-stat-item">\u{1F4CA} ' + history.length + ' combates</span>' +
    '</div>' +
    entriesHtml +
  '</div>';
};
