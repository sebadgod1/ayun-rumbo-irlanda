(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AyunCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const HABITS = ['bed', 'vitaminD', 'iron', 'contraceptive', 'water', 'english'];
  const TRAINING_GOALS = { bike: 4, strength: 3 };
  const LEGACY_DEFAULT_MINUTES = { bike: 40, strength: 45 };
  const FOOD_XP = { nourishing: 10, mixed: 5, heavy: 0 };
  const WEEKLY_BALANCE_XP = 30;
  const WEEKLY_MOVEMENT_XP = 40;

  function dateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDate(key) {
    const [y, m, d] = String(key).split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function startOfWeek(date = new Date()) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const shift = (copy.getDay() + 6) % 7;
    copy.setDate(copy.getDate() - shift);
    return copy;
  }

  function weekKey(date = new Date()) {
    return dateKey(startOfWeek(date));
  }

  function clampMinutes(value) {
    const n = Math.round(Number(value) || 0);
    return Math.max(0, Math.min(600, n));
  }

  function emptyDay() {
    return {
      habits: {},
      trainings: [],
      trainingMinutes: { bike: 0, strength: 0 },
      food: null,
      mood: null,
      moodNote: '',
      reflection: ''
    };
  }

  function normalizeDay(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const habits = {};
    HABITS.forEach(id => { habits[id] = Boolean(source.habits?.[id]); });

    const legacyTrainings = Array.isArray(source.trainings)
      ? [...new Set(source.trainings.filter(id => Object.prototype.hasOwnProperty.call(TRAINING_GOALS, id)))]
      : [];

    const trainingMinutes = { bike: 0, strength: 0 };
    Object.keys(TRAINING_GOALS).forEach(id => {
      const explicit = clampMinutes(source.trainingMinutes?.[id]);
      trainingMinutes[id] = explicit || (legacyTrainings.includes(id) ? LEGACY_DEFAULT_MINUTES[id] : 0);
    });
    const trainings = Object.keys(TRAINING_GOALS).filter(id => trainingMinutes[id] > 0);

    const food = ['nourishing', 'mixed', 'heavy'].includes(source.food) ? source.food : null;
    const mood = [1, 2, 3, 4, 5].includes(Number(source.mood)) ? Number(source.mood) : null;
    return {
      habits,
      trainings,
      trainingMinutes,
      food,
      mood,
      moodNote: String(source.moodNote || '').slice(0, 300),
      reflection: String(source.reflection || '').slice(0, 600)
    };
  }

  function completedCount(record) {
    return HABITS.filter(id => Boolean(record?.habits?.[id])).length;
  }

  function dayPercent(record) {
    return Math.round((completedCount(record) / HABITS.length) * 100);
  }

  function dayWon(record) {
    return completedCount(record) === HABITS.length;
  }

  function dayXp(record) {
    const base = completedCount(record) * 10;
    return base + (dayWon(record) ? 20 : 0);
  }

  function sessionMinutes(record, type) {
    if (!Object.prototype.hasOwnProperty.call(TRAINING_GOALS, type)) return 0;
    const explicit = clampMinutes(record?.trainingMinutes?.[type]);
    if (explicit > 0) return explicit;
    return Array.isArray(record?.trainings) && record.trainings.includes(type)
      ? LEGACY_DEFAULT_MINUTES[type]
      : 0;
  }

  function trainingXpFor(type, minutes) {
    const m = clampMinutes(minutes);
    if (type === 'bike') {
      if (m >= 90) return 40;
      if (m >= 60) return 35;
      if (m >= 40) return 25;
      if (m >= 20) return 15;
      return 0;
    }
    if (type === 'strength') {
      if (m >= 60) return 35;
      if (m >= 45) return 30;
      if (m >= 30) return 20;
      if (m >= 15) return 10;
      return 0;
    }
    return 0;
  }

  function trainingXp(record) {
    return Object.keys(TRAINING_GOALS).reduce((sum, type) => sum + trainingXpFor(type, sessionMinutes(record, type)), 0);
  }

  function foodXp(record) {
    return FOOD_XP[record?.food] || 0;
  }

  function totalDayXp(record) {
    return dayXp(record) + trainingXp(record) + foodXp(record);
  }

  function daysUntil(target, now = new Date()) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    return Math.max(0, Math.ceil((end - start) / 86400000));
  }

  function consecutiveWonDays(days, todayKey = dateKey()) {
    let streak = 0;
    let cursor = parseDate(todayKey);
    while (true) {
      const key = dateKey(cursor);
      if (!dayWon(days?.[key])) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function weeklyTrainingCount(days, type, anchor = new Date()) {
    const start = startOfWeek(anchor);
    let count = 0;
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (sessionMinutes(days?.[dateKey(d)], type) > 0) count += 1;
    }
    return count;
  }

  function weeklyBalanceProgress(days, anchor = new Date()) {
    const start = startOfWeek(anchor);
    let logged = 0;
    let positive = 0;
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const food = days?.[dateKey(d)]?.food;
      if (['nourishing', 'mixed', 'heavy'].includes(food)) logged += 1;
      if (food === 'nourishing' || food === 'mixed') positive += 1;
    }
    const earned = logged >= 5 && positive >= 4;
    return { logged, positive, earned, xp: earned ? WEEKLY_BALANCE_XP : 0 };
  }

  function weeklyMovementProgress(days, anchor = new Date()) {
    const bike = weeklyTrainingCount(days, 'bike', anchor);
    const strength = weeklyTrainingCount(days, 'strength', anchor);
    const earned = bike >= TRAINING_GOALS.bike && strength >= TRAINING_GOALS.strength;
    return { bike, strength, earned, xp: earned ? WEEKLY_MOVEMENT_XP : 0 };
  }

  function uniqueWeekStarts(days) {
    return [...new Set(Object.keys(days || {}).map(key => weekKey(parseDate(key))))];
  }

  function totalWeeklyBonusXp(days) {
    return uniqueWeekStarts(days).reduce((sum, key) => {
      const anchor = parseDate(key);
      return sum + weeklyBalanceProgress(days, anchor).xp + weeklyMovementProgress(days, anchor).xp;
    }, 0);
  }

  function totalXp(days) {
    const daily = Object.values(days || {}).reduce((sum, record) => sum + totalDayXp(record), 0);
    return daily + totalWeeklyBonusXp(days);
  }

  function levelFromXp(xp) {
    const level = Math.floor(Math.max(0, xp) / 250) + 1;
    const current = Math.max(0, xp) % 250;
    return { level, current, next: 250, percent: Math.round((current / 250) * 100) };
  }

  function bestStreak(days) {
    const keys = Object.keys(days || {}).sort();
    let best = 0;
    let current = 0;
    let previous = null;
    keys.forEach(key => {
      if (!dayWon(days[key])) { current = 0; previous = null; return; }
      if (previous) {
        const gap = Math.round((parseDate(key) - parseDate(previous)) / 86400000);
        current = gap === 1 ? current + 1 : 1;
      } else current = 1;
      best = Math.max(best, current);
      previous = key;
    });
    return best;
  }

  return {
    HABITS,
    TRAINING_GOALS,
    FOOD_XP,
    WEEKLY_BALANCE_XP,
    WEEKLY_MOVEMENT_XP,
    dateKey,
    parseDate,
    startOfWeek,
    weekKey,
    emptyDay,
    normalizeDay,
    completedCount,
    dayPercent,
    dayWon,
    dayXp,
    sessionMinutes,
    trainingXpFor,
    trainingXp,
    foodXp,
    totalDayXp,
    daysUntil,
    consecutiveWonDays,
    weeklyTrainingCount,
    weeklyBalanceProgress,
    weeklyMovementProgress,
    totalWeeklyBonusXp,
    totalXp,
    levelFromXp,
    bestStreak
  };
});
