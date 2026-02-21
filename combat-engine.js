/**
 * Combat Engine v3 - PvP + PvE with Weapon Combos
 */

// ============ WEAPONS ============
const WEAPONS = {
  espada: { name: 'Espada de Acero', emoji: '⚔️', damage: 5, speed: 0, desc: '+5 Daño base' },
  hacha: { name: 'Hacha de Guerra', emoji: '🪓', damage: 7, speed: -1, desc: '+7 Daño, -1 Velocidad' },
  lanza: { name: 'Lanza de Combate', emoji: '🔱', damage: 4, speed: 2, desc: '+4 Daño, +2 Velocidad' },
  maza: { name: 'Maza Pesada', emoji: '🔨', damage: 8, speed: -2, desc: '+8 Daño, -2 Velocidad' },
  arco: { name: 'Arco Largo', emoji: '🏹', damage: 3, speed: 3, desc: '+3 Daño, +3 Velocidad' },
  daga: { name: 'Daga Envenenada', emoji: '🗡️', damage: 2, speed: 4, desc: '+2 Daño, +4 Velocidad' },
  martillo: { name: 'Martillo de Thor', emoji: '⚒️', damage: 10, speed: -3, desc: '+10 Daño, -3 Velocidad' },
  katana: { name: 'Katana Maldita', emoji: '⚔️', damage: 6, speed: 1, desc: '+6 Daño, +1 Velocidad' },
  tridente: { name: 'Tridente Marino', emoji: '🔱', damage: 5, speed: 2, desc: '+5 Daño, +2 Velocidad' },
  guadana: { name: 'Guadaña Oscura', emoji: '⚰️', damage: 9, speed: -2, desc: '+9 Daño, -2 Velocidad' },
};

// ============ ARMORS ============
const ARMORS = {
  cuero: { name: 'Armadura de Cuero', emoji: '🦺', defense: 3, speed: 0, hp: 0, desc: '+3 Defensa' },
  malla: { name: 'Cota de Malla', emoji: '🛡️', defense: 5, speed: -1, hp: 10, desc: '+5 Def, -1 Vel, +10 HP' },
  placas: { name: 'Placas de Acero', emoji: '🛡️', defense: 8, speed: -2, hp: 20, desc: '+8 Def, -2 Vel, +20 HP' },
  sombra: { name: 'Túnica de Sombras', emoji: '🧥', defense: 2, speed: 3, hp: 0, desc: '+2 Def, +3 Velocidad' },
  dragon: { name: 'Escamas de Dragón', emoji: '🐉', defense: 7, speed: -1, hp: 15, desc: '+7 Def, -1 Vel, +15 HP' },
};

// ============ ACCESSORIES ============
const ACCESSORIES = {
  anillo_fuerza: { name: 'Anillo de Fuerza', emoji: '💍', strength: 4, desc: '+4 Fuerza' },
  amuleto_vida: { name: 'Amuleto de Vida', emoji: '📿', hp: 30, desc: '+30 HP' },
  botas_velocidad: { name: 'Botas de Velocidad', emoji: '👢', speed: 5, desc: '+5 Velocidad' },
  capa_defensa: { name: 'Capa Protectora', emoji: '🧣', defense: 4, desc: '+4 Defensa' },
  corona_poder: { name: 'Corona de Poder', emoji: '👑', strength: 3, hp: 15, desc: '+3 Fuerza, +15 HP' },
};

// ============ WEAPON COMBOS ============
const WEAPON_COMBOS = {
  estilo_dual: {
    id: 'estilo_dual', name: 'Estilo Dual', emoji: '⚔️🗡️',
    description: 'La espada y la daga se complementan en un baile mortal',
    weapons: ['espada', 'daga'],
    bonus: { type: 'stat', speedPercent: 0.15 },
    bonusDesc: '+15% velocidad de ataque'
  },
  fuerza_bruta: {
    id: 'fuerza_bruta', name: 'Fuerza Bruta', emoji: '🪓⚒️',
    description: 'Dos armas pesadas para aplastar a cualquier enemigo',
    weapons: ['hacha', 'martillo'],
    bonus: { type: 'stat', strengthPercent: 0.25, speedPercent: -0.10 },
    bonusDesc: '+25% daño, -10% velocidad'
  },
  cazador_letal: {
    id: 'cazador_letal', name: 'Cazador Letal', emoji: '🏹☠️',
    description: 'Flechas envenenadas que debilitan al enemigo',
    weapons: ['arco', 'daga'],
    bonus: { type: 'effect', effect: 'poison_combo', poisonDamage: 4, poisonDuration: 3 },
    bonusDesc: 'Ataques envenenan 3 turnos'
  },
  falange: {
    id: 'falange', name: 'Falange', emoji: '🔱🧣',
    description: 'La lanza tras el escudo, formación defensiva perfecta',
    weapons: ['lanza'],
    requireAccessory: 'capa_defensa',
    bonus: { type: 'stat', defensePercent: 0.30 },
    bonusDesc: '+30% defensa'
  },
  lluvia_proyectiles: {
    id: 'lluvia_proyectiles', name: 'Lluvia de Proyectiles', emoji: '🔱🏹',
    description: 'Un aluvión de ataques a distancia',
    weapons: ['tridente', 'arco'],
    bonus: { type: 'effect', effect: 'triple_attack', chance: 0.15 },
    bonusDesc: '15% de atacar 3 veces'
  },
  maestro_espadas: {
    id: 'maestro_espadas', name: 'Maestro de Espadas', emoji: '⚔️⚔️',
    description: 'Dos espadas en manos de un maestro, golpes certeros',
    weapons: ['espada', 'espada'],
    bonus: { type: 'stat', critPercent: 0.20 },
    bonusDesc: '+20% golpe crítico'
  },
  aplastamiento: {
    id: 'aplastamiento', name: 'Aplastamiento', emoji: '⚒️🔨',
    description: 'Golpes demoledores que dejan aturdido al rival',
    weapons: ['martillo', 'maza'],
    bonus: { type: 'effect', effect: 'stun_combo', chance: 0.20 },
    bonusDesc: '20% de aturdir 1 turno'
  },
  asesino: {
    id: 'asesino', name: 'Asesino', emoji: '🗡️🗡️',
    description: 'El primer golpe es devastador, silencioso y mortal',
    weapons: ['daga', 'daga'],
    bonus: { type: 'effect', effect: 'first_strike', multiplier: 2.5 },
    bonusDesc: 'Primer ataque hace x2.5 daño'
  },
  arsenal_completo: {
    id: 'arsenal_completo', name: 'Arsenal Completo', emoji: '🏆',
    description: 'Cuatro armas distintas equipadas, dominio total del combate',
    weapons: ['__any_4_distinct__'],
    bonus: { type: 'stat', strengthPercent: 0.10, defensePercent: 0.10, speedPercent: 0.10, hpPercent: 0.10 },
    bonusDesc: '+10% a todos los stats'
  },
  alcance_supremo: {
    id: 'alcance_supremo', name: 'Alcance Supremo', emoji: '🏹🔱',
    description: 'Ataque desde lejos, siempre el primero en golpear',
    weapons: ['arco', 'lanza'],
    bonus: { type: 'effect', effect: 'always_first' },
    bonusDesc: 'Ataca primero siempre'
  },
  sombra_mortal: {
    id: 'sombra_mortal', name: 'Sombra Mortal', emoji: '🗡️⚔️',
    description: 'La katana y la daga juntas, ataques desde las sombras',
    weapons: ['katana', 'daga'],
    bonus: { type: 'stat', speedPercent: 0.10, critPercent: 0.15 },
    bonusDesc: '+10% velocidad, +15% crítico'
  },
  segador: {
    id: 'segador', name: 'El Segador', emoji: '⚰️🔨',
    description: 'La guadaña y la maza, cosechando almas',
    weapons: ['guadana', 'maza'],
    bonus: { type: 'effect', effect: 'lifesteal_combo', lifeStealPercent: 0.15 },
    bonusDesc: 'Roba 15% del daño como vida'
  },
  berserker: {
    id: 'berserker', name: 'Berserker', emoji: '🪓⚔️',
    description: 'Hacha y espada, furia descontrolada',
    weapons: ['hacha', 'espada'],
    bonus: { type: 'stat', strengthPercent: 0.20, defensePercent: -0.15 },
    bonusDesc: '+20% daño, -15% defensa'
  },
  guardian: {
    id: 'guardian', name: 'Guardián Ancestral', emoji: '🔱⚒️',
    description: 'El tridente y el martillo protegen como los antiguos',
    weapons: ['tridente', 'martillo'],
    bonus: { type: 'stat', defensePercent: 0.15, hpPercent: 0.15 },
    bonusDesc: '+15% defensa, +15% HP'
  },
  viento_cortante: {
    id: 'viento_cortante', name: 'Viento Cortante', emoji: '⚔️🏹',
    description: 'Katana y arco, velocidad del viento',
    weapons: ['katana', 'arco'],
    bonus: { type: 'stat', speedPercent: 0.25 },
    bonusDesc: '+25% velocidad'
  },
  ejecutor: {
    id: 'ejecutor', name: 'El Ejecutor', emoji: '⚰️🪓',
    description: 'Guadaña y hacha, sentencia de muerte',
    weapons: ['guadana', 'hacha'],
    bonus: { type: 'effect', effect: 'execute', threshold: 0.20, bonusDamage: 0.50 },
    bonusDesc: 'Si enemigo <20% HP, +50% daño'
  }
};

// ============ ABILITIES ============
const ABILITIES = {
  golpe_critico: {
    name: 'Golpe Crítico', emoji: '💥',
    desc: '25% de causar daño x2', type: 'passive', trigger: 'on_attack',
    chance: 0.25, effect: { damageMultiplier: 2.0 }
  },
  esquivar: {
    name: 'Esquivar', emoji: '💨',
    desc: '+20% probabilidad de esquiva', type: 'passive', trigger: 'on_defend',
    effect: { dodgeBonus: 0.20 }
  },
  contraataque: {
    name: 'Contraataque', emoji: '🔄',
    desc: '25% de contraatacar al ser golpeado', type: 'passive', trigger: 'on_hit',
    chance: 0.25, effect: { counterDamage: 0.6 }
  },
  curacion: {
    name: 'Curación', emoji: '💚',
    desc: 'Cura 25% HP al bajar de 30% (1 uso)', type: 'active', trigger: 'on_low_hp',
    uses: 1, effect: { healPercent: 0.25 }
  },
  furia: {
    name: 'Furia', emoji: '🔥',
    desc: '+60% daño bajo 25% HP', type: 'passive', trigger: 'on_attack',
    effect: { lowHpThreshold: 0.25, damageBonus: 0.60 }
  },
  doble_golpe: {
    name: 'Doble Golpe', emoji: '⚔️',
    desc: '20% de atacar dos veces', type: 'passive', trigger: 'on_attack',
    chance: 0.20, effect: { extraAttack: true }
  },
  vampirico: {
    name: 'Vampírico', emoji: '🧛',
    desc: 'Roba 20% del daño como vida', type: 'passive', trigger: 'on_attack',
    effect: { lifeSteal: 0.20 }
  },
  escudo: {
    name: 'Escudo Mágico', emoji: '🛡️',
    desc: 'Reduce todo daño un 20%', type: 'passive', trigger: 'on_defend',
    effect: { damageReduction: 0.20 }
  },
  veneno: {
    name: 'Veneno', emoji: '☠️',
    desc: 'Envenena al rival (5 daño/turno, 4 turnos)', type: 'active', trigger: 'on_first_hit',
    uses: 1, effect: { poisonDamage: 5, poisonDuration: 4 }
  },
  grito_guerra: {
    name: 'Grito de Guerra', emoji: '📢',
    desc: '+35% daño por 4 turnos (inicio)', type: 'active', trigger: 'on_start',
    uses: 1, effect: { damageBuffPercent: 0.35, buffDuration: 4 }
  },
  ultima_resistencia: {
    name: 'Última Resistencia', emoji: '⭐',
    desc: 'Sobrevive golpe letal con 1 HP (1 vez)', type: 'active', trigger: 'on_lethal',
    uses: 1, effect: { surviveLethal: true }
  },
  espinas: {
    name: 'Espinas', emoji: '🌵',
    desc: 'Devuelve 30% del daño recibido', type: 'passive', trigger: 'on_hit',
    effect: { thornsDamage: 0.30 }
  },
};

// ============ STAT BOOSTS ============
const STAT_BOOSTS = [
  { id: 'boost_str', name: '+5 Fuerza', emoji: '💪', stats: { strength: 5 } },
  { id: 'boost_def', name: '+5 Defensa', emoji: '🛡️', stats: { defense: 5 } },
  { id: 'boost_spd', name: '+5 Velocidad', emoji: '⚡', stats: { speed: 5 } },
  { id: 'boost_hp', name: '+25 HP', emoji: '❤️', stats: { hp_max: 25 } },
  { id: 'boost_str_hp', name: '+3 Fuerza +15 HP', emoji: '💪❤️', stats: { strength: 3, hp_max: 15 } },
  { id: 'boost_def_spd', name: '+3 Defensa +3 Velocidad', emoji: '🛡️⚡', stats: { defense: 3, speed: 3 } },
  { id: 'boost_all', name: '+2 Todos los stats', emoji: '⭐', stats: { strength: 2, defense: 2, speed: 2, hp_max: 10 } },
];

// ============ HELPER FUNCTIONS ============
function getEquippedWeapons(character) {
  const weapons = [];
  if (character.weapon) weapons.push(character.weapon);
  if (character.weapon2) weapons.push(character.weapon2);
  if (character.weapon3) weapons.push(character.weapon3);
  if (character.weapon4) weapons.push(character.weapon4);
  return weapons;
}

function getActiveCombos(character) {
  const equippedWeapons = getEquippedWeapons(character);
  if (equippedWeapons.length === 0) return [];

  const activeCombos = [];
  for (const [comboId, combo] of Object.entries(WEAPON_COMBOS)) {
    if (combo.weapons[0] === '__any_4_distinct__') {
      const uniqueWeapons = new Set(equippedWeapons);
      if (uniqueWeapons.size >= 4) activeCombos.push(combo);
      continue;
    }
    if (combo.requireAccessory && character.accessory !== combo.requireAccessory) continue;
    const required = [...combo.weapons];
    const available = [...equippedWeapons];
    let allFound = true;
    for (const req of required) {
      const idx = available.indexOf(req);
      if (idx === -1) { allFound = false; break; }
      available.splice(idx, 1);
    }
    if (allFound) activeCombos.push(combo);
  }
  return activeCombos;
}

// ============ LEVEL UP ============
function generateLevelUpChoices(character) {
  const choices = [];
  const currentAbilities = JSON.parse(character.abilities || '[]');
  const currentInventory = JSON.parse(character.inventory || '[]');

  const weaponKeys = Object.keys(WEAPONS).filter(w => !currentInventory.some(i => i.type === 'weapon' && i.id === w));
  if (weaponKeys.length > 0) {
    const wKey = weaponKeys[Math.floor(Math.random() * weaponKeys.length)];
    const w = WEAPONS[wKey];
    choices.push({ type: 'weapon', id: wKey, name: w.name, emoji: w.emoji, desc: w.desc });
  }

  const abilityKeys = Object.keys(ABILITIES).filter(a => !currentAbilities.includes(a));
  if (abilityKeys.length > 0) {
    const aKey = abilityKeys[Math.floor(Math.random() * abilityKeys.length)];
    const a = ABILITIES[aKey];
    choices.push({ type: 'ability', id: aKey, name: a.name, emoji: a.emoji, desc: a.desc });
  }

  const r = Math.random();
  if (r < 0.5) {
    const boost = STAT_BOOSTS[Math.floor(Math.random() * STAT_BOOSTS.length)];
    choices.push({ type: 'boost', id: boost.id, name: boost.name, emoji: boost.emoji, desc: `Stats: ${Object.entries(boost.stats).map(([k,v]) => `+${v} ${k}`).join(', ')}` });
  } else if (r < 0.75) {
    const armorKeys = Object.keys(ARMORS).filter(a => !currentInventory.some(i => i.type === 'armor' && i.id === a));
    if (armorKeys.length > 0) {
      const aKey = armorKeys[Math.floor(Math.random() * armorKeys.length)];
      const a = ARMORS[aKey];
      choices.push({ type: 'armor', id: aKey, name: a.name, emoji: a.emoji, desc: a.desc });
    } else {
      const boost = STAT_BOOSTS[Math.floor(Math.random() * STAT_BOOSTS.length)];
      choices.push({ type: 'boost', id: boost.id, name: boost.name, emoji: boost.emoji, desc: `Stats: ${Object.entries(boost.stats).map(([k,v]) => `+${v} ${k}`).join(', ')}` });
    }
  } else {
    const accKeys = Object.keys(ACCESSORIES).filter(a => !currentInventory.some(i => i.type === 'accessory' && i.id === a));
    if (accKeys.length > 0) {
      const aKey = accKeys[Math.floor(Math.random() * accKeys.length)];
      const a = ACCESSORIES[aKey];
      choices.push({ type: 'accessory', id: aKey, name: a.name, emoji: a.emoji, desc: a.desc });
    } else {
      const boost = STAT_BOOSTS[Math.floor(Math.random() * STAT_BOOSTS.length)];
      choices.push({ type: 'boost', id: boost.id, name: boost.name, emoji: boost.emoji, desc: `Stats: ${Object.entries(boost.stats).map(([k,v]) => `+${v} ${k}`).join(', ')}` });
    }
  }

  while (choices.length < 3) {
    const boost = STAT_BOOSTS[Math.floor(Math.random() * STAT_BOOSTS.length)];
    if (!choices.find(c => c.id === boost.id)) {
      choices.push({ type: 'boost', id: boost.id, name: boost.name, emoji: boost.emoji, desc: `Stats: ${Object.entries(boost.stats).map(([k,v]) => `+${v} ${k}`).join(', ')}` });
    }
  }
  return choices.slice(0, 3);
}

function applyLevelUpChoice(character, choice) {
  const updates = {};
  const inventory = JSON.parse(character.inventory || '[]');
  const abilities = JSON.parse(character.abilities || '[]');

  switch(choice.type) {
    case 'weapon':
      inventory.push({ type: 'weapon', id: choice.id });
      updates.inventory = JSON.stringify(inventory);
      if (!character.weapon) updates.weapon = choice.id;
      else if (!character.weapon2) updates.weapon2 = choice.id;
      else if (!character.weapon3) updates.weapon3 = choice.id;
      else if (!character.weapon4) updates.weapon4 = choice.id;
      break;
    case 'armor':
      inventory.push({ type: 'armor', id: choice.id });
      updates.inventory = JSON.stringify(inventory);
      if (!character.armor) updates.armor = choice.id;
      break;
    case 'accessory':
      inventory.push({ type: 'accessory', id: choice.id });
      updates.inventory = JSON.stringify(inventory);
      if (!character.accessory) updates.accessory = choice.id;
      break;
    case 'ability':
      abilities.push(choice.id);
      updates.abilities = JSON.stringify(abilities);
      break;
    case 'boost': {
      const boost = STAT_BOOSTS.find(b => b.id === choice.id);
      if (boost) {
        for (const [stat, val] of Object.entries(boost.stats)) {
          updates[stat] = (character[stat] || 0) + val;
          if (stat === 'hp_max') updates.hp_base = (character.hp_base || character.hp_max) + val;
        }
      }
      break;
    }
  }
  return updates;
}

// ============ GET EFFECTIVE STATS ============
function getEffectiveStats(character) {
  const stats = {
    hp_max: character.hp_max,
    strength: character.strength,
    defense: character.defense,
    speed: character.speed,
  };

  // Apply ALL equipped weapons
  const equippedWeapons = getEquippedWeapons(character);
  for (const weaponId of equippedWeapons) {
    if (WEAPONS[weaponId]) {
      const w = WEAPONS[weaponId];
      stats.strength += (w.damage || 0);
      stats.speed += (w.speed || 0);
    }
  }

  // Apply armor
  if (character.armor && ARMORS[character.armor]) {
    const a = ARMORS[character.armor];
    stats.defense += (a.defense || 0);
    stats.speed += (a.speed || 0);
    stats.hp_max += (a.hp || 0);
  }

  // Apply accessory
  if (character.accessory && ACCESSORIES[character.accessory]) {
    const a = ACCESSORIES[character.accessory];
    stats.strength += (a.strength || 0);
    stats.defense += (a.defense || 0);
    stats.speed += (a.speed || 0);
    stats.hp_max += (a.hp || 0);
  }

  // Apply combo stat bonuses
  const activeCombos = getActiveCombos(character);
  for (const combo of activeCombos) {
    const b = combo.bonus;
    if (b.strengthPercent) stats.strength = Math.floor(stats.strength * (1 + b.strengthPercent));
    if (b.defensePercent) stats.defense = Math.floor(stats.defense * (1 + b.defensePercent));
    if (b.speedPercent) stats.speed = Math.floor(stats.speed * (1 + b.speedPercent));
    if (b.hpPercent) stats.hp_max = Math.floor(stats.hp_max * (1 + b.hpPercent));
  }

  return stats;
}

// ============ COMBAT ============
function simulateCombat(fighter1, fighter2) {
  const log = [];
  const f1 = prepareFighter(fighter1);
  const f2 = prepareFighter(fighter2);

  log.push({
    type: 'intro',
    text: `⚔️ ¡${f1.name} (Nv.${f1.level}) VS ${f2.name} (Nv.${f2.level})!`,
    f1: { name: f1.name, hp: f1.hp, hp_max: f1.hp_max, level: f1.level },
    f2: { name: f2.name, hp: f2.hp, hp_max: f2.hp_max, level: f2.level }
  });

  // Log active combos
  for (const f of [f1, f2]) {
    for (const combo of f.activeCombos) {
      log.push({
        type: 'combo_activate',
        fighter: f.name,
        combo: combo.name,
        emoji: combo.emoji,
        text: `⚡ ¡${f.name} activa ${combo.emoji} ${combo.name}! ${combo.bonusDesc}`
      });
    }
  }

  // War cry at start
  for (const f of [f1, f2]) {
    if (f.abilitySet.has('grito_guerra') && f.abilityUses.grito_guerra > 0) {
      f.abilityUses.grito_guerra--;
      f.buffs.push({ type: 'grito_guerra', turns: 4, damageBonus: 0.35 });
      log.push({
        type: 'ability', fighter: f.name, ability: 'grito_guerra',
        text: `📢 ¡${f.name} lanza un GRITO DE GUERRA! +35% daño por 4 turnos`
      });
    }
  }

  // Apply combo poison at start (cazador_letal)
  for (const f of [f1, f2]) {
    const other = f === f1 ? f2 : f1;
    if (f.comboEffects.has('poison_combo')) {
      const cd = f.comboData['poison_combo'];
      other.poisoned = cd.poisonDuration;
      other.poisonDmg = cd.poisonDamage;
      log.push({
        type: 'ability', fighter: f.name, ability: 'combo_poison',
        text: `☠️ ¡${f.name} envenena a ${other.name} con ${f.activeCombos.find(c => c.bonus.effect === 'poison_combo').emoji} ${f.activeCombos.find(c => c.bonus.effect === 'poison_combo').name}!`
      });
    }
  }

  let turn = 0;
  const maxTurns = 40;

  // Pre-process: aura protectora
  if (f1.abilitySet.has("aura_protectora")) f1.damageReduction = 0.15;
  if (f2.abilitySet.has("aura_protectora")) f2.damageReduction = 0.15;

  while (f1.hp > 0 && f2.hp > 0 && turn < maxTurns) {
    turn++;
    // Regeneration heal at turn start
    for (const f of [f1, f2]) {
      if (f.hp > 0 && f.abilitySet.has("regeneracion")) {
        const regen = Math.floor(f.hp_max * 0.08);
        f.hp = Math.min(f.hp + regen, f.hp_max);
        if (regen > 0) log.push({ type: "heal", fighter: f.name, amount: regen, f1hp: f1.hp, f1hpMax: f1.hp_max, f2hp: f2.hp, f2hpMax: f2.hp_max, text: "💖 " + f.name + " regenera " + regen + " HP!" });
      }
      // Bendición divina check
      if (f.hp > 0 && f.hp / f.hp_max <= 0.50 && f.abilitySet.has("bendicion") && f.abilityUses.bendicion > 0) {
        f.abilityUses.bendicion--;
        const heal = Math.floor(f.hp_max * 0.35);
        f.hp = Math.min(f.hp + heal, f.hp_max);
        log.push({ type: "heal", fighter: f.name, amount: heal, f1hp: f1.hp, f1hpMax: f1.hp_max, f2hp: f2.hp, f2hpMax: f2.hp_max, text: "✨ ¡" + f.name + " recibe una BENDICIÓN DIVINA! +" + heal + " HP!" });
      }
    }
    let f1Speed = f1.speed + Math.random() * 5;
    let f2Speed = f2.speed + Math.random() * 5;

    // Alcance Supremo: always first
    if (f1.comboEffects.has('always_first')) f1Speed += 1000;
    if (f2.comboEffects.has('always_first')) f2Speed += 1000;

    const [attacker, defender] = f1Speed >= f2Speed ? [f1, f2] : [f2, f1];

    processTurn(attacker, defender, turn, log, f1, f2);
    if (defender.hp <= 0) break;

    if (!defender.stunned) {
      processTurn(defender, attacker, turn, log);
      if (attacker.hp <= 0) break;
    } else {
      defender.stunned = false;
      log.push({ type: 'stun', fighter: defender.name, text: `😵 ${defender.name} está aturdido!` });
    }

    // Poison ticks
    for (const f of [f1, f2]) {
      if (f.poisoned > 0) {
        const dmg = f.poisonDmg || 5;
        f.hp -= dmg;
        f.poisoned--;
        log.push({ type: 'poison', fighter: f.name, damage: dmg, f1hp: f1.hp, f1hpMax: f1.hp_max, f2hp: f2.hp, f2hpMax: f2.hp_max, text: `☠️ ${f.name} recibe ${dmg} daño por veneno!` });
        if (f.hp <= 0) break;
      }
    }

    // Decay buffs
    for (const f of [f1, f2]) {
      f.buffs = f.buffs.filter(b => { b.turns--; return b.turns > 0; });
    }

    if (turn % 3 === 0) {
      log.push({
        type: 'status',
        f1: { name: f1.name, hp: Math.max(0, f1.hp), hp_max: f1.hp_max },
        f2: { name: f2.name, hp: Math.max(0, f2.hp), hp_max: f2.hp_max }
      });
    }
  }

  if (f1.hp > 0 && f2.hp > 0) {
    const f1pct = f1.hp / f1.hp_max;
    const f2pct = f2.hp / f2.hp_max;
    if (f1pct < f2pct) f1.hp = 0;
    else if (f2pct < f1pct) f2.hp = 0;
    else Math.random() < 0.5 ? f1.hp = 0 : f2.hp = 0; // coin flip on exact tie
  }

  const winner = f1.hp > 0 ? f1 : f2;
  const loser = f1.hp > 0 ? f2 : f1;

  log.push({
    type: 'end',
    winner: winner.name, winner_id: winner.original_id,
    loser: loser.name, loser_id: loser.original_id,
    text: `🏆 ¡${winner.name} GANA el combate!`,
    f1: { name: f1.name, hp: Math.max(0, f1.hp), hp_max: f1.hp_max },
    f2: { name: f2.name, hp: Math.max(0, f2.hp), hp_max: f2.hp_max }
  });

  return { winner_id: winner.original_id, loser_id: loser.original_id, log, turns: turn };
}

function prepareFighter(data) {
  const abilities = typeof data.abilities === 'string' ? JSON.parse(data.abilities) : (data.abilities || []);
  const abilityUses = {};
  for (const ab of abilities) {
    const def = ABILITIES[ab];
    if (def && def.uses) abilityUses[ab] = def.uses;
  }

  const stats = getEffectiveStats(data);
  const activeCombos = getActiveCombos(data);

  const comboEffects = new Set();
  const comboData = {};
  for (const combo of activeCombos) {
    if (combo.bonus.effect) {
      comboEffects.add(combo.bonus.effect);
      comboData[combo.bonus.effect] = combo.bonus;
    }
    if (combo.bonus.critPercent) {
      comboData.critBonus = (comboData.critBonus || 0) + combo.bonus.critPercent;
    }
  }

  return {
    name: data.name,
    original_id: data.id,
    level: data.level || 1,
    hp: stats.hp_max,
    hp_max: stats.hp_max,
    strength: stats.strength,
    defense: stats.defense,
    speed: stats.speed,
    abilitySet: new Set(abilities),
    abilityUses,
    buffs: [],
    stunned: false,
    poisoned: 0,
    poisonDmg: 0,
    firstHitDone: false,
    activeCombos,
    comboEffects,
    comboData
  };
}

function processTurn(attacker, defender, turn, log, f1, f2) {
  // Dodge check
  let dodgeChance = 0.08 + (defender.speed - attacker.speed) * 0.006;
  if (defender.abilitySet.has('esquivar')) dodgeChance += 0.20;
  dodgeChance = Math.max(0.03, Math.min(dodgeChance, 0.45));

  if (Math.random() < dodgeChance) {
    log.push({
      type: 'dodge', attacker: attacker.name, defender: defender.name,
      text: `💨 ${defender.name} esquiva el ataque de ${attacker.name}!`
    });
    return;
  }

  // Base damage
  let damage = Math.floor(attacker.strength * 2.2 + Math.random() * attacker.strength * 0.8);

  let isCritical = false;
  let extraEffects = [];

  // Asesino combo: first strike x2.5
  if (!attacker.firstHitDone && attacker.comboEffects.has('first_strike')) {
    const mult = attacker.comboData['first_strike'].multiplier || 2.5;
    damage = Math.floor(damage * mult);
    extraEffects.push('🗡️🗡️ ¡GOLPE ASESINO!');
  }

  // Golpe crítico ability + combo crit bonus
  let critChance = 0;
  if (attacker.abilitySet.has('golpe_critico')) critChance += 0.25;
  if (attacker.comboData.critBonus) critChance += attacker.comboData.critBonus;
  if (critChance > 0 && Math.random() < critChance) {
    damage = Math.floor(damage * 2.0);
    isCritical = true;
    extraEffects.push('💥 ¡CRÍTICO!');
  }

  // Furia (low HP)
  if (attacker.abilitySet.has('furia') && attacker.hp / attacker.hp_max <= 0.25) {
    damage = Math.floor(damage * 1.6);
    extraEffects.push('🔥 ¡FURIA!');
  }

  // Execute combo: bonus damage when defender is low HP
  if (attacker.comboEffects.has('execute')) {
    const cd = attacker.comboData['execute'];
    if (defender.hp / defender.hp_max <= cd.threshold) {
      damage = Math.floor(damage * (1 + cd.bonusDamage));
      extraEffects.push('⚰️ ¡EJECUCIÓN!');
    }
  }

  // Grito de guerra buff
  const warBuff = attacker.buffs.find(b => b.type === 'grito_guerra');
  if (warBuff) damage = Math.floor(damage * (1 + warBuff.damageBonus));

  // Escudo defense
  if (defender.abilitySet.has('escudo')) damage = Math.floor(damage * 0.80);

  // Aura protectora
  if (defender.damageReduction) damage = Math.floor(damage * (1 - defender.damageReduction));
  // Defense reduction
  const defReduction = defender.defense * 0.7;
  damage = Math.max(1, Math.floor(damage - defReduction));

  // Last stand check
  if (defender.hp - damage <= 0 && defender.abilitySet.has('ultima_resistencia') && 
      defender.abilityUses.ultima_resistencia > 0) {
    defender.abilityUses.ultima_resistencia--;
    damage = defender.hp - 1;
    log.push({
      type: 'ability', fighter: defender.name, ability: 'ultima_resistencia',
      text: `⭐ ¡${defender.name} activa ÚLTIMA RESISTENCIA! Sobrevive con 1 HP!`
    });
  }

  defender.hp -= damage;

  // Veneno on first hit (ability)
  if (!attacker.firstHitDone && attacker.abilitySet.has('veneno') && attacker.abilityUses.veneno > 0) {
    attacker.abilityUses.veneno--;
    defender.poisoned = 4;
    defender.poisonDmg = 5;
    extraEffects.push('☠️ ¡ENVENENADO!');
    attacker.firstHitDone = true;
  }
  attacker.firstHitDone = true;

  // Stun combo
  if (attacker.comboEffects.has('stun_combo')) {
    const cd = attacker.comboData['stun_combo'];
    if (Math.random() < cd.chance) {
      defender.stunned = true;
      extraEffects.push('😵 ¡ATURDIDO!');
    }
  }

  // Healing check
  if (defender.hp > 0 && defender.hp / defender.hp_max <= 0.30 &&
      defender.abilitySet.has('curacion') && defender.abilityUses.curacion > 0) {
    defender.abilityUses.curacion--;
    const heal = Math.floor(defender.hp_max * 0.25);
    defender.hp = Math.min(defender.hp + heal, defender.hp_max);
    log.push({
      type: 'heal', fighter: defender.name, amount: heal,
      text: `💚 ¡${defender.name} se CURA ${heal} HP!`
    });
  }

  const attackEmojis = ['⚔️', '🗡️', '🪓', '💪', '👊'];
  const emoji = attackEmojis[Math.floor(Math.random() * attackEmojis.length)];
  log.push({
    type: 'attack', attacker: attacker.name, defender: defender.name,
    damage, isCritical, effects: extraEffects,
    defenderHp: Math.max(0, defender.hp), defenderHpMax: defender.hp_max,
    attackerHp: attacker.hp, attackerHpMax: attacker.hp_max,
    text: `${emoji} ${attacker.name} golpea a ${defender.name} por ${damage}! ${extraEffects.join(' ')}`
  });

  // Vampiric ability
  if (attacker.abilitySet.has('vampirico')) {
    const heal = Math.floor(damage * 0.20);
    attacker.hp = Math.min(attacker.hp + heal, attacker.hp_max);
    if (heal > 0) {
      log.push({ type: 'lifesteal', fighter: attacker.name, amount: heal, f1hp: f1.hp, f1hpMax: f1.hp_max, f2hp: f2.hp, f2hpMax: f2.hp_max, text: `🧛 ${attacker.name} roba ${heal} HP!` });
    }
  }

  // Lifesteal combo (segador)
  if (attacker.comboEffects.has('lifesteal_combo')) {
    const cd = attacker.comboData['lifesteal_combo'];
    const heal = Math.floor(damage * cd.lifeStealPercent);
    attacker.hp = Math.min(attacker.hp + heal, attacker.hp_max);
    if (heal > 0) {
      log.push({ type: 'lifesteal', fighter: attacker.name, amount: heal, f1hp: f1.hp, f1hpMax: f1.hp_max, f2hp: f2.hp, f2hpMax: f2.hp_max, text: `⚰️ ${attacker.name} drena ${heal} HP!` });
    }
  }

  // Espinas
  if (defender.hp > 0 && defender.abilitySet.has('espinas')) {
    const thornsDmg = Math.floor(damage * 0.30);
    attacker.hp -= thornsDmg;
    log.push({ type: 'thorns', fighter: defender.name, target: attacker.name, damage: thornsDmg, f1hp: f1.hp, f1hpMax: f1.hp_max, f2hp: f2.hp, f2hpMax: f2.hp_max, text: `🌵 Espinas devuelven ${thornsDmg} daño!` });
  }

  // Counterattack
  if (defender.hp > 0 && defender.abilitySet.has('contraataque') && Math.random() < 0.25) {
    const counterDmg = Math.max(1, Math.floor(defender.strength * 1.2));
    attacker.hp -= counterDmg;
    log.push({ type: 'counter', fighter: defender.name, target: attacker.name, damage: counterDmg, f1hp: f1.hp, f1hpMax: f1.hp_max, f2hp: f2.hp, f2hpMax: f2.hp_max, text: `🔄 ¡${defender.name} CONTRAATACA por ${counterDmg}!` });
  }

  // Double strike ability
  if (attacker.abilitySet.has('doble_golpe') && Math.random() < 0.20 && defender.hp > 0) {
    const secondDmg = Math.max(1, Math.floor(damage * 0.5));
    defender.hp -= secondDmg;
    log.push({ type: 'double_strike', attacker: attacker.name, defender: defender.name, damage: secondDmg, f1hp: f1.hp, f1hpMax: f1.hp_max, f2hp: f2.hp, f2hpMax: f2.hp_max, text: `⚔️⚔️ ¡${attacker.name} golpea DOS VECES! +${secondDmg}!` });
  }

  // Triple attack combo (lluvia_proyectiles)
  if (attacker.comboEffects.has('triple_attack') && defender.hp > 0) {
    const cd = attacker.comboData['triple_attack'];
    if (Math.random() < cd.chance) {
      const hit2 = Math.max(1, Math.floor(damage * 0.4));
      const hit3 = Math.max(1, Math.floor(damage * 0.3));
      defender.hp -= (hit2 + hit3);
      log.push({ type: 'double_strike', attacker: attacker.name, defender: defender.name, damage: hit2 + hit3, f1hp: f1.hp, f1hpMax: f1.hp_max, f2hp: f2.hp, f2hpMax: f2.hp_max, text: `🔱🏹 ¡${attacker.name} lanza LLUVIA DE PROYECTILES! +${hit2 + hit3}!` });
    }
  }
}

// ============ XP ============
function getXPForLevel(level) {
  return Math.floor(100 * Math.pow(1.3, level - 1));
}

function levelUp(character) {
  const newLevel = character.level + 1;
  const changes = {
    level: newLevel,
    xp_next: getXPForLevel(newLevel),
    hp_max: character.hp_max + Math.floor(8 + Math.random() * 8),
    strength: character.strength + Math.floor(1 + Math.random() * 2),
    defense: character.defense + Math.floor(1 + Math.random() * 2),
    speed: character.speed + Math.floor(1 + Math.random() * 2),
  };
  changes.hp_base = changes.hp_max;
  const choices = generateLevelUpChoices(character);
  changes.pending_choices = JSON.stringify(choices);
  return { changes };
}

function getAbilityDefs() {
  return ABILITIES;
}

module.exports = {
  simulateCombat, levelUp, getXPForLevel, getAbilityDefs,
  generateLevelUpChoices, applyLevelUpChoice, getEffectiveStats,
  getEquippedWeapons, getActiveCombos,
  ABILITIES, WEAPONS, ARMORS, ACCESSORIES, STAT_BOOSTS, WEAPON_COMBOS
};