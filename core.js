(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AyunCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const HABITS = ['bed', 'vitaminD', 'iron', 'contraceptive', 'water', 'english'];
  const TRAINING_GOALS = { bike: 4, strength: 3 };

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

  function emptyDay() {
    return {
      habits: {},
      trainings: [],
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
    const trainings = Array.isArray(source.trainings)
      ? [...new Set(source.trainings.filter(id => Object.prototype.hasOwnProperty.call(TRAINING_GOALS, id)))]
      : [];
    const food = ['nourishing', 'mixed', 'heavy'].includes(source.food) ? source.food : null;
    const mood = [1, 2, 3, 4, 5].includes(Number(source.mood)) ? Number(source.mood) : null;
    return {
      habits,
      trainings,
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

  function trainingXp(record) {
    const trainings = Array.isArray(record?.trainings) ? record.trainings : [];
    return trainings.reduce((sum, id) => sum + (id === 'bike' ? 25 : id === 'strength' ? 30 : 0), 0);
  }

  function totalDayXp(record) {
    return dayXp(record) + trainingXp(record);
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
      if (days?.[dateKey(d)]?.trainings?.includes(type)) count += 1;
    }
    return count;
  }

  function totalXp(days) {
    return Object.values(days || {}).reduce((sum, record) => sum + totalDayXp(record), 0);
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
    trainingXp,
    totalDayXp,
    daysUntil,
    consecutiveWonDays,
    weeklyTrainingCount,
    totalXp,
    levelFromXp,
    bestStreak
  };
});
