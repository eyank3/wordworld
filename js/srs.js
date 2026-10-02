/**
 * ============================================
 * 间隔重复（SRS）引擎
 * - 忘记 / 困难 / 记住 / 简单四档反馈
 * - 兼容旧版 bubei_srs_v1 数据
 * - localStorage 持久化
 * ============================================
 */

const STORAGE_KEY = 'bubei_srs_v2';
const LEGACY_STORAGE_KEY = 'bubei_srs_v1';
// 索引 = 等级（level），单位：天。null 占位 level 0（未学）
const INTERVALS_DAYS = [null, 1, 2, 4, 7, 15, 30, 60];
const MAX_LEVEL = 7;
const MIN_INTERVAL = 10 * 60 * 1000; // 记错后 10 分钟再见

let store = load();

function normalizeStore(value) {
  if (!value || typeof value !== 'object') return { version: 2, records: {}, checkIn: null };
  const rawRecords = value.records && typeof value.records === 'object' ? value.records : {};
  const records = {};
  for (const [id, raw] of Object.entries(rawRecords)) {
    if (!raw || typeof raw !== 'object') continue;
    const level = Number(raw.level);
    if (!Number.isFinite(level) || level < 0) continue;
    records[id] = {
      ...raw,
      level: Math.min(Math.max(Math.round(level), 0), MAX_LEVEL),
      due: Number.isFinite(Number(raw.due)) ? Number(raw.due) : 0,
      times: Math.max(0, Number(raw.times) || 0),
      lapses: Math.max(0, Number(raw.lapses) || 0),
      hardCount: Math.max(0, Number(raw.hardCount) || 0),
    };
  }
  return {
    version: 2,
    records,
    checkIn: value.checkIn && typeof value.checkIn === 'object' ? value.checkIn : null,
  };
}

function load() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return normalizeStore(JSON.parse(current));
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    const migrated = legacy ? normalizeStore(JSON.parse(legacy)) : normalizeStore(null);
    if (legacy) localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    // 存储损坏时保持可学习，并在下次保存时覆盖为有效结构。
    return normalizeStore(null);
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // 存储满或隐私模式，忽略
  }
}

function getRecord(id) {
  if (!store.records[id]) {
    store.records[id] = { level: 0, due: 0, times: 0, lapses: 0, hardCount: 0, lastRating: null };
  }
  // 给旧版本记录补齐字段，不改变已有学习进度。
  const record = store.records[id];
  if (!('hardCount' in record)) record.hardCount = 0;
  if (!('lastRating' in record)) record.lastRating = null;
  return store.records[id];
}

function intervalMs(level) {
  return INTERVALS_DAYS[Math.min(level, MAX_LEVEL)] * 86400000;
}

/**
 * 认识 / 记住了：提升等级，按遗忘曲线延长间隔
 */
function applyRating(id, rating) {
  const r = getRecord(id);
  const now = Date.now();

  if (rating === 'forgot') {
    r.level = 1;
    r.due = now + MIN_INTERVAL;
    r.lapses = (r.lapses || 0) + 1;
  } else if (rating === 'hard') {
    r.level = r.level === 0 ? 1 : Math.max(1, r.level);
    // 困难不会把复习推得太远，最低 30 分钟。
    const base = intervalMs(r.level);
    r.due = now + Math.max(30 * 60 * 1000, Math.round(base * 0.6));
    r.hardCount = (r.hardCount || 0) + 1;
  } else if (rating === 'easy') {
    r.level = r.level === 0 ? 2 : Math.min(r.level + 2, MAX_LEVEL);
    r.due = now + intervalMs(r.level);
  } else {
    // 记住：正常提升一级。
    r.level = r.level === 0 ? 1 : Math.min(r.level + 1, MAX_LEVEL);
    r.due = now + intervalMs(r.level);
  }

  r.times = (r.times || 0) + 1;
  r.lastRating = rating;
  r.lastReviewedAt = now;
  save();
  return { ...r };
}

/** 记录四档反馈：forgot / hard / known / easy */
export function markAnswer(id, rating = 'known') {
  return applyRating(id, ['forgot', 'hard', 'known', 'easy'].includes(rating) ? rating : 'known');
}

// 旧事件名保留，避免已有页面或本地调试脚本失效。
export function markKnown(id) { return applyRating(id, 'known'); }

/**
 * 记错了：等级重置为 1，短间隔后重新出现
 */
export function markForgot(id) { return applyRating(id, 'forgot'); }

export function isNew(id) {
  return getRecord(id).level === 0;
}

export function isDue(id) {
  const r = getRecord(id);
  return r.level >= 1 && r.due <= Date.now();
}

export function getLevel(id) {
  return getRecord(id).level;
}

export function getRecordSnapshot(id) {
  return { ...getRecord(id) };
}

export function restoreRecord(id, snapshot) {
  if (!snapshot) delete store.records[id];
  else store.records[id] = { ...snapshot };
  save();
}

export function getNextReview(id) {
  const due = getRecord(id).due;
  if (!due) return null;
  return new Date(due);
}

function formatDelay(ms) {
  if (ms < 60 * 60 * 1000) return `${Math.max(1, Math.round(ms / 60000))}分钟后`;
  if (ms < 24 * 60 * 60 * 1000) return `${Math.max(1, Math.round(ms / 3600000))}小时后`;
  return `${Math.max(1, Math.round(ms / 86400000))}天后`;
}

/**
 * 预览四档反馈将安排的下次复习时间，不会修改当前记录。
 */
export function getReviewPreview(id) {
  const r = { ...getRecord(id) };
  const now = Date.now();
  const preview = {};
  const next = (rating) => {
    let level = r.level;
    let due;
    if (rating === 'forgot') {
      due = now + MIN_INTERVAL;
    } else if (rating === 'hard') {
      level = level === 0 ? 1 : Math.max(1, level);
      due = now + Math.max(30 * 60 * 1000, Math.round(intervalMs(level) * 0.6));
    } else if (rating === 'easy') {
      level = level === 0 ? 2 : Math.min(level + 2, MAX_LEVEL);
      due = now + intervalMs(level);
    } else {
      level = level === 0 ? 1 : Math.min(level + 1, MAX_LEVEL);
      due = now + intervalMs(level);
    }
    return formatDelay(due - now);
  };
  for (const rating of ['forgot', 'hard', 'known', 'easy']) preview[rating] = next(rating);
  return preview;
}

/**
 * 统计：新词数 / 到期复习数 / 已学数
 */
export function getStats(wordList) {
  const now = Date.now();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  let newCount = 0;
  let dueCount = 0;
  let learned = 0;
  let reviewedToday = 0;
  for (const w of wordList) {
    const r = store.records[w.id];
    if (!r || r.level === 0) {
      newCount++;
    } else {
      learned++;
      if (r.due <= now) dueCount++;
    }
    if (r?.lastReviewedAt) {
      const reviewed = new Date(r.lastReviewedAt);
      const reviewedKey = `${reviewed.getFullYear()}-${reviewed.getMonth()}-${reviewed.getDate()}`;
      if (reviewedKey === todayKey) reviewedToday++;
    }
  }
  return { newCount, dueCount, learned, reviewedToday };
}

/**
 * 待学习新词队列（level 0）
 */
export function getNewQueue(wordList, limit = Infinity) {
  return wordList.filter(w => isNew(w.id)).slice(0, limit);
}

/**
 * 待复习队列（已学且到期）
 */
export function getReviewQueue(wordList) {
  return wordList.filter(w => isDue(w.id));
}

export function getWrongQueue(wordList, ids) {
  const wanted = new Set(ids || []);
  return wordList.filter(w => wanted.has(w.id));
}

export function exportData() {
  return JSON.stringify({ ...store, exportedAt: new Date().toISOString() }, null, 2);
}

export function importData(raw) {
  let parsed;
  try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return false; }
  if (!parsed || typeof parsed !== 'object' || !parsed.records || typeof parsed.records !== 'object') return false;
  const next = normalizeStore(parsed);
  for (const [id, record] of Object.entries(next.records)) {
    if (!record || typeof record !== 'object' || !Number.isFinite(Number(record.level))) delete next.records[id];
  }
  store = next;
  save();
  return true;
}

// ===== 签到 =====

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isCheckedInToday() {
  return !!store.checkIn && store.checkIn.last === dateKey(new Date());
}

export function getCheckIn() {
  return store.checkIn;
}

/**
 * 切换签到状态（每日一次）。返回最新签到信息。
 */
export function toggleCheckIn() {
  const today = dateKey(new Date());
  if (store.checkIn && store.checkIn.last === today) {
    return store.checkIn; // 今天已签到
  }
  let streak = 1;
  if (store.checkIn) {
    const yesterday = dateKey(new Date(Date.now() - 86400000));
    streak = store.checkIn.last === yesterday ? store.checkIn.streak + 1 : 1;
  }
  store.checkIn = {
    last: today,
    streak,
    total: (store.checkIn ? store.checkIn.total : 0) + 1,
  };
  save();
  return store.checkIn;
}
