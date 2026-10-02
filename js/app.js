/**
 * ============================================
 * 不背单词 - 主应用逻辑
 * 负责：视图路由（首页 / 学习）、状态管理、事件分发、SRS 调度
 * ============================================
 */

import { wordList as mockWordList } from './data.js';
import { speak } from './utils/speech.js';
import { renderNavbar } from './components/navbar.js';
import { renderWordCard } from './components/word-card.js';
import { renderExample } from './components/example.js';
import { renderExpandTabs } from './components/expand-tabs.js?v=3';
import { renderActionBar } from './components/action-bar.js';
import { renderHome } from './components/home.js';
import * as srs from './srs.js';

// ===== 应用状态 =====
let wordList = []; // 运行时加载的真实词库
let wordMap = new Map(); // id -> word
let dataSource = '词库';
let lexicalStatus = 'idle'; // idle | loading | ready | failed
function readFavorites() {
  try { const value = JSON.parse(localStorage.getItem('bubei_favorites') || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
}

const state = {
  view: 'home',          // 'home' | 'study'
  mode: 'learn',         // 学习模式：'learn'（新词）| 'review'（复习）
  queue: [],             // 当前会话的单词 id 数组
  pos: 0,                // 当前在队列中的位置
  favorites: new Set(readFavorites()),  // 收藏的 word id
  history: [],           // 撤销栈（保存队列、计数和 SRS 记录快照）
  activeTab: 'collocations',
  detailId: null,
  detailWord: null,
  detailStack: [],
  detailTab: 'collocations',
  notebookScroll: 0,
  notebookQuery: '',
  notebookFilter: 'all',
  moreOpen: false,
  knownCount: 0,
  hardCount: 0,
  easyCount: 0,
  wrongCount: 0,
  wrongIds: new Set(),
  startedAt: 0,
  dailyLimit: Math.max(5, Math.min(100, Number(localStorage.getItem('bubei_daily_limit') || 30))),
  orderMode: localStorage.getItem('bubei_order_mode') === 'random' ? 'random' : 'ordered',
  targetLevel: ['all', 'cet6', 'toefl', 'ielts', 'gre'].includes(localStorage.getItem('bubei_target_level')) ? localStorage.getItem('bubei_target_level') : 'all',
  autoPlay: localStorage.getItem('bubei_auto_play') === 'true',
  speechAccent: localStorage.getItem('bubei_speech_accent') === 'uk' ? 'uk' : 'us',
  practiceMode: ['recognition', 'spelling', 'listening', 'cloze'].includes(localStorage.getItem('bubei_practice_mode')) ? localStorage.getItem('bubei_practice_mode') : 'recognition',
  practiceInput: '',
  practiceResult: null,
};

// ===== 数据加载 =====

function validateWordPayload(data) {
  return Boolean(data && Array.isArray(data.words) && data.words.length > 0 && data.words.every(w => w && w.id && w.word));
}

function validateLexicalPayload(data) {
  return Boolean(data && Array.isArray(data.words) && data.words.length > 0 && data.words.every(w => w && w.id));
}

async function fetchWordPayload(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * 先加载轻量核心词库，避免移动端等待完整词汇拓展数据。
 */
async function loadWordList() {
  try {
    const data = await fetchWordPayload('data/words-core.json?v=1');
    if (!validateWordPayload(data)) throw new Error('核心词库格式无效或为空');
    wordList = data.words;
    dataSource = '核心词库（快速加载）';
    lexicalStatus = 'loading';
    console.log(`✓ 已加载核心词库: ${wordList.length} 词`);
    return;
  } catch (err) {
    console.warn(`⚠ 核心词库加载失败，尝试完整词库: ${err.message}`);
    try {
      const data = await fetchWordPayload('data/words.json?v=4');
      if (!validateWordPayload(data)) throw new Error('完整词库格式无效或为空');
      wordList = data.words;
      dataSource = '完整词库';
      lexicalStatus = 'ready';
      console.log(`✓ 已加载完整词库: ${wordList.length} 词（来源: ${data.meta?.source || 'ECDICT'}）`);
      return;
    } catch (fallbackError) {
      console.warn(`⚠ 词库加载失败，使用 Mock 数据: ${fallbackError.message}`);
      wordList = mockWordList;
      dataSource = '示例词库（离线）';
      lexicalStatus = 'failed';
    }
  }
}

async function loadLexicalData() {
  if (lexicalStatus !== 'loading') return;
  try {
    const data = await fetchWordPayload('data/words-lexical.json?v=1');
    if (!validateLexicalPayload(data)) throw new Error('拓展词库格式无效或为空');
    const lexicalMap = new Map(data.words.map(item => [String(item.id), item]));
    for (const word of wordList) {
      const lexical = lexicalMap.get(String(word.id));
      if (lexical) Object.assign(word, lexical);
    }
    lexicalStatus = 'ready';
    dataSource = '完整词库';
    console.log(`✓ 已加载词汇拓展: ${data.words.length} 条`);
  } catch (err) {
    lexicalStatus = 'failed';
    dataSource = '核心词库（拓展加载失败）';
    console.warn(`⚠ 词汇拓展加载失败，核心学习仍可使用: ${err.message}`);
  }
  buildWordMap();
  if (state.view === 'home') renderHomeView();
  else render(false);
}

function buildWordMap() {
  wordMap = new Map(wordList.map(w => [w.id, w]));
}

function wordById(id) {
  return wordMap.get(id);
}

function studyWords() {
  if (state.targetLevel === 'all') return wordList;
  return wordList.filter(word => Array.isArray(word.levels) && word.levels.includes(state.targetLevel));
}

function currentWord() {
  return state.view === 'word-detail'
    ? (state.detailWord || wordById(state.detailId))
    : wordById(state.queue[state.pos]);
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function normalizeWordRef(value) {
  return String(value || '').trim().toLowerCase().replace(/[·'’]/g, '').replace(/\s+/g, ' ');
}

function makeRelatedWord(ref) {
  const label = ref.label || '关联词条';
  const meaning = ref.meaning || '暂无中文释义';
  const word = String(ref.word || '').trim();
  return {
    id: `related:${normalizeWordRef(word)}`,
    word,
    display: word,
    levels: [],
    phonetics: { us: '', uk: '' },
    pos: label.split(' · ')[0] || '相关词',
    definitions: [meaning],
    examples: [],
    collocations: [],
    derivatives: [],
    inflections: [],
    roots: [],
    synonyms: [],
    semanticRelations: [],
    frequency: { rank: null, scope: 'related-entry' },
    relatedSource: label,
  };
}

function findWordBySpelling(spelling) {
  const normalized = normalizeWordRef(spelling);
  return wordList.find(item => normalizeWordRef(item.word) === normalized) || null;
}

// ===== 轻提示 =====

function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.classList.remove('show');
  }, 1600);
}

// ===== 渲染 =====

function render(animate = true) {
  if (wordList.length === 0) {
    document.getElementById('app').innerHTML = `
      <div class="flex items-center justify-center h-screen text-slate-400">
        加载中...
      </div>
    `;
    return;
  }

  if (state.view === 'home') {
    renderHomeView();
    return;
  }

  if (state.view === 'complete') {
    renderComplete();
    return;
  }

  if (state.view === 'notebook') return renderNotebook();
  if (state.view === 'word-detail') return renderWordDetail();
  if (state.view === 'settings') return renderSettings();
  renderStudy(animate);
}

function renderHomeView() {
  const stats = srs.getStats(studyWords());
  const ci = srs.getCheckIn();
  document.getElementById('app').innerHTML = renderHome({
    newCount: stats.newCount,
    dueCount: stats.dueCount,
    learned: stats.learned,
    reviewedToday: stats.reviewedToday,
    checkedIn: srs.isCheckedInToday(),
    streak: ci ? ci.streak : 0,
    dataSource,
    dailyLimit: state.dailyLimit,
    orderMode: state.orderMode,
    targetLevel: state.targetLevel,
    practiceMode: state.practiceMode,
  });
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function practiceModeLabel(mode = state.practiceMode) {
  return ({ recognition: '认识卡片', spelling: '拼写回忆', listening: '听音拼写', cloze: '例句填空' })[mode] || '练习';
}

function practiceExample(word) {
  const example = word.examples?.find(item => item?.en)?.en;
  if (!example) return '';
  const safeSentence = escapeHTML(example);
  const safeWord = escapeHTML(word.word);
  const matcher = safeWord ? new RegExp(`\\b${escapeRegExp(safeWord)}\\w*`, 'i') : null;
  return matcher && matcher.test(safeSentence)
    ? safeSentence.replace(matcher, '<span class="practice-blank">______</span>')
    : safeSentence;
}

function renderPracticeCard(word) {
  const mode = state.practiceMode;
  const definitions = (word.definitions || []).slice(0, 2).map(escapeHTML).join('；') || '暂无中文释义';
  const prompt = mode === 'cloze' ? '根据例句补全目标单词' : mode === 'listening' ? '听发音后拼写单词' : '根据释义拼写单词';
  const example = mode === 'cloze' ? practiceExample(word) : '';
  const feedback = state.practiceResult === 'correct'
    ? '<p class="practice-feedback is-correct">回答正确，可以选择下方的复习难度。</p>'
    : state.practiceResult === 'incorrect'
      ? `<p class="practice-feedback is-wrong">还需要巩固，答案是 <strong>${escapeHTML(word.word)}</strong></p>`
      : state.practiceResult === 'revealed'
        ? `<p class="practice-feedback">答案：<strong>${escapeHTML(word.word)}</strong> · 看完后请选择记忆程度</p>`
        : '';
  return `<section class="practice-card glass-card" aria-label="${practiceModeLabel(mode)}">
    <div class="practice-mode-chip">${practiceModeLabel(mode)}</div>
    <h2>${prompt}</h2>
    ${mode === 'listening' ? `<button class="practice-listen" data-action="speak" data-lang="${state.speechAccent}" aria-label="播放单词发音">🔊 播放发音</button>` : ''}
    ${mode === 'cloze' && example ? `<p class="practice-example">${example}</p>` : ''}
    <p class="practice-definition"><span>释义</span>${definitions}</p>
    <label class="practice-answer-label" for="practice-answer">你的答案</label>
    <input id="practice-answer" class="practice-answer" type="text" inputmode="text" autocomplete="off" spellcheck="false" placeholder="输入英文单词" value="${escapeHTML(state.practiceInput)}" aria-describedby="practice-hint">
    <p id="practice-hint" class="practice-hint">可按 Enter 检查，或按下方按钮自评</p>
    <div class="practice-actions"><button class="practice-check" data-action="check-practice">检查答案</button><button class="practice-reveal" data-action="show-answer">查看答案</button></div>
    ${feedback}
  </section>`;
}

function renderPracticeExpansion(word) {
  if (state.practiceMode === 'recognition' || state.practiceResult) {
    return renderExpandTabs(word, state.activeTab, { lexicalStatus });
  }
  return '<section class="practice-locked glass-card" aria-live="polite"><span aria-hidden="true">🔒</span><span>检查答案后查看搭配、派生和词根</span></section>';
}

function renderStudy(animate = true) {
  if (state.pos >= state.queue.length) {
    finishSession();
    return;
  }

  const word = wordById(state.queue[state.pos]);
  if (!word) {
    state.pos++;
    renderStudy(animate);
    return;
  }

  const isFavorite = state.favorites.has(word.id);
  const canUndo = state.history.length > 0;

  const exampleSection = word.examples && word.examples.length > 0
    ? renderExample(word.examples[0], word.word)
    : '';

  const app = document.getElementById('app');
  const studySection = state.practiceMode === 'recognition'
    ? `${renderWordCard(word)}${exampleSection}${renderExpandTabs(word, state.activeTab, { lexicalStatus })}`
    : renderPracticeCard(word);
  app.innerHTML = `
    ${renderNavbar({ currentIndex: state.pos, total: state.queue.length, isFavorite, canUndo, orderMode: state.orderMode })}
    ${state.moreOpen ? renderQuickMenu() : ''}
    <main class="main-content ${animate ? 'word-enter' : ''}">
      ${studySection}
      ${state.practiceMode !== 'recognition' ? renderPracticeExpansion(word) : ''}
    </main>
    ${renderActionBar({ word })}
  `;
  if (state.autoPlay) setTimeout(() => speak(word.word, state.speechAccent), 80);
}

function renderQuickMenu() {
  return `<div class="quick-menu glass-card" role="dialog" aria-label="更多操作"><button data-action="spell">🔊 拼写发音</button><button data-action="proficiency">📊 查看熟练度</button><button data-action="learn-more">⧉ 复制单词</button><button data-action="close-more">关闭</button></div>`;
}

function switchTab(tabKey) {
  if (state.view === 'word-detail') state.detailTab = tabKey;
  else state.activeTab = tabKey;
  render(false);
}

// ===== 会话管理 =====

function startSession(mode) {
  // 以页面当前选择为准，避免下拉框改了但旧状态未同步。
  const selectedOrder = document.getElementById('order-mode')?.value;
  if (selectedOrder === 'random' || selectedOrder === 'ordered') {
    state.orderMode = selectedOrder;
    localStorage.setItem('bubei_order_mode', state.orderMode);
  }
  state.mode = mode;
  state.pos = 0;
  state.history = [];
  state.activeTab = 'collocations';
  state.moreOpen = false;
  state.detailStack = [];
  state.detailWord = null;
  state.wrongIds = new Set();
  state.practiceInput = '';
  state.practiceResult = null;
  state.knownCount = 0; state.hardCount = 0; state.easyCount = 0; state.wrongCount = 0;

  const availableWords = studyWords();

  if (mode === 'learn') {
    // 乱序模式必须先打乱完整的新词池，再截取每日数量；否则永远只会在词库开头取词。
    state.queue = srs.getNewQueue(availableWords).map(w => w.id);
  } else {
    state.queue = srs.getReviewQueue(availableWords).map(w => w.id);
  }

  if (state.orderMode === 'random') {
    // 先打乱完整词池，再按每日上限截取，避免只在 a 开头的前 30 个词中抽样。
    for (let i = state.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.queue[i], state.queue[j]] = [state.queue[j], state.queue[i]];
    }
  }

  if (mode === 'learn') state.queue = state.queue.slice(0, state.dailyLimit);

  if (state.queue.length === 0) {
    toast(mode === 'learn' ? '没有待学习的新词' : '没有待复习的单词');
    return;
  }

  state.view = 'study';
  state.startedAt = Date.now();
  render(true);
}

function startWrongReview() {
  const queue = srs.getWrongQueue(wordList, [...state.wrongIds]).map(w => w.id);
  if (!queue.length) { toast('本轮没有错词'); return; }
  state.mode = 'wrong';
  state.queue = queue;
  state.pos = 0;
  state.history = [];
  state.activeTab = 'collocations';
  state.moreOpen = false;
  state.detailStack = [];
  state.detailWord = null;
  state.practiceInput = '';
  state.practiceResult = null;
  state.knownCount = 0; state.hardCount = 0; state.easyCount = 0; state.wrongCount = 0;
  state.wrongIds = new Set();
  state.startedAt = Date.now();
  state.view = 'study';
  render(true);
}

function finishSession() {
  state.view = 'complete';
  render();
}

function renderComplete() {
  const stats = srs.getStats(studyWords());
  const modeLabel = state.mode === 'learn' ? '学习' : state.mode === 'wrong' ? '错词复习' : '复习';
  const answered = state.knownCount + state.hardCount + state.easyCount + state.wrongCount;
  const accuracy = answered ? Math.round(((state.knownCount + state.easyCount) / answered) * 100) : 0;
  const hasWrong = state.wrongIds.size > 0;
  document.getElementById('app').innerHTML = `
    <div class="complete-screen">
      <div class="complete-card glass-card">
        <div class="complete-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 class="complete-title">本轮${modeLabel}完成啦</h2>
        <p class="complete-sub">记住 ${state.knownCount} · 困难 ${state.hardCount} · 简单 ${state.easyCount} · 忘记 ${state.wrongCount}</p>
        <p class="complete-sub">正确率 ${accuracy}% · 用时 ${Math.max(1, Math.round((Date.now() - state.startedAt) / 60000))} 分钟</p>
        <p class="complete-sub">还剩 ${stats.newCount} 个新词待学 · ${stats.dueCount} 个待复习</p>
        <div class="complete-actions">
          ${hasWrong ? '<button class="complete-btn secondary" data-action="start-wrong-review">复习本轮错词</button>' : ''}
          <button class="complete-btn" data-action="nav-home">返回首页</button>
        </div>
      </div>
    </div>
  `;
}

function goHome() {
  state.view = 'home';
  state.detailStack = [];
  state.detailWord = null;
  render();
}

function snapshot() {
  return {
    pos: state.pos,
    queue: [...state.queue],
    knownCount: state.knownCount,
    hardCount: state.hardCount,
    easyCount: state.easyCount,
    wrongCount: state.wrongCount,
    wrongIds: [...state.wrongIds],
    wordId: state.queue[state.pos],
    srsRecord: state.queue[state.pos] ? srs.getRecordSnapshot(state.queue[state.pos]) : null,
    practiceInput: state.practiceInput,
    practiceResult: state.practiceResult,
  };
}

function restoreSnapshot(previous) {
  state.pos = previous.pos;
  state.queue = previous.queue;
  state.knownCount = previous.knownCount;
  state.hardCount = previous.hardCount;
  state.easyCount = previous.easyCount;
  state.wrongCount = previous.wrongCount;
  state.wrongIds = new Set(previous.wrongIds || []);
  state.practiceInput = previous.practiceInput || '';
  state.practiceResult = previous.practiceResult || null;
  if (previous.wordId) srs.restoreRecord(previous.wordId, previous.srsRecord);
}

function answerCurrent(rating) {
  if (state.view !== 'study') return;
  const word = currentWord();
  if (!word) return;
  state.history.push(snapshot());
  srs.markAnswer(word.id, rating);

  if (rating === 'forgot') {
    state.wrongCount++;
    state.wrongIds.add(word.id);
    state.queue.splice(state.pos, 1);
    state.queue.push(word.id);
  } else {
    if (rating === 'hard') state.hardCount++;
    else if (rating === 'easy') state.easyCount++;
    else state.knownCount++;
    state.pos++;
  }

  state.activeTab = 'collocations';
  state.practiceInput = '';
  state.practiceResult = null;
  render(true);
}

function normalizeAnswer(value) {
  return String(value || '').trim().toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '');
}

function checkPracticeAnswer() {
  if (state.view !== 'study') return;
  const word = currentWord();
  const input = document.getElementById('practice-answer')?.value || '';
  state.practiceInput = input;
  if (!input.trim()) {
    toast('先输入答案再检查');
    return;
  }
  state.practiceResult = normalizeAnswer(input) === normalizeAnswer(word?.word) ? 'correct' : 'incorrect';
  render(false);
  document.getElementById('practice-answer')?.focus();
}

function undo() {
  if (state.history.length === 0) return;
  const previous = state.history.pop();
  restoreSnapshot(previous);
  state.activeTab = 'collocations';
  render(true);
}

function toggleFavorite() {
  const word = currentWord();
  if (!word) return;
  if (!wordMap.has(word.id)) { toast('该关联词尚未收录到主词库'); return; }
  if (state.favorites.has(word.id)) {
    state.favorites.delete(word.id);
  } else {
    state.favorites.add(word.id);
  }
  localStorage.setItem('bubei_favorites', JSON.stringify([...state.favorites]));
  render(false);
  const starBtn = document.querySelector('[data-action="favorite"]');
  if (starBtn) {
    const svg = starBtn.querySelector('svg');
    if (svg) {
      svg.classList.add('star-pop');
      setTimeout(() => svg.classList.remove('star-pop'), 300);
    }
  }
}

function detailContext() {
  if (state.view === 'word-detail') {
    return { view: 'word-detail', detailId: state.detailId, detailWord: state.detailWord, detailTab: state.detailTab };
  }
  return { view: state.view === 'notebook' ? 'notebook' : 'study', notebookScroll: state.notebookScroll, activeTab: state.activeTab };
}

function openDetailWord(word) {
  state.detailStack.push(detailContext());
  state.detailId = word.id;
  state.detailWord = wordMap.has(word.id) ? null : word;
  state.detailTab = 'collocations';
  state.view = 'word-detail';
  state.moreOpen = false;
  render(false);
  window.scrollTo(0, 0);
}

function openWordReference(ref) {
  const spelling = String(ref.word || '').trim();
  if (!spelling) return;
  const known = findWordBySpelling(spelling);
  openDetailWord(known || makeRelatedWord(ref));
}

function backFromDetail() {
  const previous = state.detailStack.pop();
  if (!previous) {
    renderNotebook();
    return;
  }
  state.view = previous.view;
  state.detailId = previous.detailId || null;
  state.detailWord = previous.detailWord || null;
  state.detailTab = previous.detailTab || 'collocations';
  state.activeTab = previous.activeTab || state.activeTab;
  if (previous.view === 'notebook') {
    renderNotebook();
    window.scrollTo(0, previous.notebookScroll || 0);
  } else if (previous.view === 'word-detail') {
    renderWordDetail();
  } else {
    render(false);
  }
}

// ===== 事件分发 =====

document.getElementById('app').addEventListener('click', (e) => {
  const tabEl = e.target.closest('[data-tab]');
  if (tabEl) {
    switchTab(tabEl.dataset.tab);
    return;
  }

  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;

  const action = actionEl.dataset.action;
  const word = currentWord();

  switch (action) {
    // ---- 首页 ----
    case 'check-in': {
      srs.toggleCheckIn();
      renderHomeView();
      break;
    }
    case 'start-learn':
      startSession('learn');
      break;
    case 'start-review':
      startSession('review');
      break;
    case 'start-wrong-review':
      startWrongReview();
      break;
    case 'nav-home':
      goHome();
      break;
    case 'nav-notebook':
      renderNotebook();
      break;
    case 'open-favorite': {
      const selected = wordList.find(w => String(w.id) === actionEl.dataset.wordId);
      if (!selected) { toast('该单词暂不可用'); break; }
      state.notebookScroll = window.scrollY;
      openDetailWord(selected);
      document.querySelector('[data-action="back-detail"]')?.focus({ preventScroll: true });
      break;
    }
    case 'open-word-ref':
      openWordReference({ word: actionEl.dataset.refWord, meaning: actionEl.dataset.refMeaning, label: actionEl.dataset.refLabel });
      break;
    case 'back-notebook':
    case 'back-detail':
      backFromDetail();
      break;
    case 'nav-settings':
      renderSettings();
      break;
    case 'save-settings':
      localStorage.setItem('bubei_daily_limit', String(state.dailyLimit));
      localStorage.setItem('bubei_auto_play', String(state.autoPlay));
      localStorage.setItem('bubei_speech_accent', state.speechAccent);
      toast('设置已保存');
      setTimeout(goHome, 500);
      break;
    case 'export-data': {
      const blob = new Blob([srs.exportData()], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `bubei-learning-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      toast('学习记录已导出');
      break;
    }

    // ---- 学习 ----
    case 'next': // 兼容旧按钮：等同于“记住”
      answerCurrent('known');
      break;
    case 'wrong': // 兼容旧按钮：等同于“忘记”
      answerCurrent('forgot');
      break;
    case 'answer-forgot':
      answerCurrent('forgot');
      break;
    case 'answer-hard':
      answerCurrent('hard');
      break;
    case 'answer-known':
      answerCurrent('known');
      break;
    case 'answer-easy':
      answerCurrent('easy');
      break;
    case 'check-practice':
      checkPracticeAnswer();
      break;
    case 'show-answer':
      state.practiceResult = 'revealed';
      render(false);
      break;
    case 'undo':
      undo();
      break;
    case 'back':
      goHome();
      break;
    case 'favorite':
      toggleFavorite();
      break;
    case 'speak':
      if (word) speak(word.word, actionEl.dataset.lang || state.speechAccent);
      break;
    case 'speak-sentence':
      speak(actionEl.dataset.text, 'us');
      break;
    case 'spell':
      if (word) speak(word.word.split('').join(' '), 'us');
      break;

    case 'proficiency':
      if (word) toast(`熟练度 ${srs.getLevel(word.id)} 级`);
      break;
    case 'more':
      state.moreOpen = !state.moreOpen;
      render(false);
      break;
    case 'close-more':
      state.moreOpen = false;
      render(false);
      break;
    case 'learn-more':
      if (word) navigator.clipboard?.writeText(word.word).then(() => toast('已复制单词')).catch(() => toast('单词：' + word.word));
      break;
  }
});

function renderNotebook() {
  state.view = 'notebook';
  const query = state.notebookQuery.trim().toLowerCase();
  let favorites = [...state.favorites].map(wordById).filter(Boolean);
  if (query) favorites = favorites.filter(w => `${w.word} ${w.definitions?.join(' ') || ''}`.toLowerCase().includes(query));
  if (state.notebookFilter === 'examples') favorites = favorites.filter(w => w.examples?.length);
  if (state.notebookFilter === 'collocations') favorites = favorites.filter(w => w.collocations?.length);
  document.getElementById('app').innerHTML = `<main class="page-panel"><button class="back-link" data-action="nav-home">← 返回</button><div class="page-title-row"><h1>生词本</h1><span class="notebook-count">${favorites.length}</span></div><div class="notebook-tools"><label class="search-box"><span aria-hidden="true">⌕</span><input id="notebook-search" type="search" placeholder="搜索单词或释义" value="${escapeHTML(state.notebookQuery)}" aria-label="搜索生词本"></label><select id="notebook-filter" class="order-select" aria-label="筛选生词"><option value="all" ${state.notebookFilter === 'all' ? 'selected' : ''}>全部</option><option value="examples" ${state.notebookFilter === 'examples' ? 'selected' : ''}>有例句</option><option value="collocations" ${state.notebookFilter === 'collocations' ? 'selected' : ''}>有搭配</option></select></div>${favorites.length ? favorites.map(w => `<button type="button" class="glass-card notebook-item notebook-word" data-action="open-favorite" data-word-id="${escapeHTML(w.id)}" aria-label="查看 ${escapeHTML(w.word)} 详情"><strong>${escapeHTML(w.word)}</strong><span>${escapeHTML(w.definitions?.[0] || w.translation || w.meaning || '')}</span><span aria-hidden="true">›</span></button>`).join('') : '<p class="empty-state">没有匹配的收藏单词</p>'}</main>`;
}

function renderWordDetail() {
  const word = state.detailWord || wordById(state.detailId);
  if (!word) { backFromDetail(); toast('该单词暂不可用'); return; }
  const favorite = !state.detailWord && state.favorites.has(word.id);
  const previousView = state.detailStack.at(-1)?.view;
  const backLabel = previousView === 'study' ? '← 返回学习' : previousView === 'word-detail' ? '← 返回上一级' : '← 返回生词本';
  document.getElementById('app').innerHTML = `
    <nav class="detail-nav"><button class="back-link" data-action="back-detail">${backLabel}</button>
    ${state.detailWord ? '<span class="related-badge">关联词条</span>' : `<button class="nav-icon-btn" data-action="favorite" aria-pressed="${favorite}" aria-label="${favorite ? '取消收藏' : '收藏'}">${favorite ? '★ 已收藏' : '☆ 收藏'}</button>`}</nav>
    <main class="main-content">${renderWordCard(word)}
    ${word.examples?.length ? renderExample(word.examples[0], word.word) : ''}
    ${renderExpandTabs(word, state.detailTab, { lexicalStatus })}</main>`;
}

function renderSettings() {
  state.view = 'settings';
  document.getElementById('app').innerHTML = `<main class="page-panel"><button class="back-link" data-action="nav-home">← 返回</button><h1>设置</h1><label class="setting-row">每日新词数量 <input id="daily-limit" type="number" min="5" max="100" value="${state.dailyLimit}"></label><label class="setting-row">发音口音 <select id="speech-accent" class="order-select"><option value="us" ${state.speechAccent === 'us' ? 'selected' : ''}>美音</option><option value="uk" ${state.speechAccent === 'uk' ? 'selected' : ''}>英音</option></select></label><label class="setting-row setting-toggle">自动播放发音 <input id="auto-play" type="checkbox" ${state.autoPlay ? 'checked' : ''}></label><button class="complete-btn" data-action="save-settings">保存设置</button><section class="data-tools"><h2>学习记录</h2><p>换电脑或重装前，可以先导出备份。</p><div class="data-tool-actions"><button class="data-tool-btn" data-action="export-data">导出记录</button><label class="data-tool-btn">导入记录<input id="import-data" type="file" accept="application/json,.json" hidden></label></div></section><p class="data-source">${dataSource}</p></main>`;
}

document.addEventListener('keydown', e => {
  if (state.view !== 'study') return;
  if (e.key === 'Enter' && e.target?.id === 'practice-answer') {
    e.preventDefault();
    checkPracticeAnswer();
    return;
  }
  const shortcuts = { '1': 'answer-forgot', '2': 'answer-hard', '3': 'answer-known', '4': 'answer-easy' };
  if (shortcuts[e.key]) { document.querySelector(`[data-action="${shortcuts[e.key]}"]`)?.click(); return; }
  if (e.key === 'ArrowRight' || e.key === 'Enter') { document.querySelector('[data-action="answer-known"]')?.click(); return; }
  if (e.key === ' ') { e.preventDefault(); document.querySelector('[data-action="speak"]')?.click(); return; }
  if (e.key === 'ArrowLeft') document.querySelector('[data-action="undo"]')?.click();
});

document.getElementById('app').addEventListener('change', e => {
  if (e.target.id === 'daily-limit') state.dailyLimit = Math.max(5, Math.min(100, Number(e.target.value) || 30));
  if (e.target.id === 'order-mode') {
    state.orderMode = e.target.value === 'random' ? 'random' : 'ordered';
    localStorage.setItem('bubei_order_mode', state.orderMode);
  }
  if (e.target.id === 'practice-mode') {
    state.practiceMode = ['recognition', 'spelling', 'listening', 'cloze'].includes(e.target.value) ? e.target.value : 'recognition';
    localStorage.setItem('bubei_practice_mode', state.practiceMode);
    renderHomeView();
  }
  if (e.target.id === 'study-level') {
    state.targetLevel = ['all', 'cet6', 'toefl', 'ielts', 'gre'].includes(e.target.value) ? e.target.value : 'all';
    localStorage.setItem('bubei_target_level', state.targetLevel);
    renderHomeView();
  }
  if (e.target.id === 'speech-accent') state.speechAccent = e.target.value === 'uk' ? 'uk' : 'us';
  if (e.target.id === 'auto-play') state.autoPlay = Boolean(e.target.checked);
  if (e.target.id === 'notebook-filter') {
    state.notebookFilter = ['all', 'examples', 'collocations'].includes(e.target.value) ? e.target.value : 'all';
    renderNotebook();
  }
  if (e.target.id === 'import-data') {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(raw => {
      if (srs.importData(raw)) { toast('学习记录已导入'); renderSettings(); }
      else toast('文件格式不正确，未导入');
    }).catch(() => toast('读取文件失败'));
  }
});

document.getElementById('app').addEventListener('input', e => {
  if (e.target.id === 'practice-answer') {
    state.practiceInput = e.target.value;
    return;
  }
  if (e.target.id !== 'notebook-search') return;
  state.notebookQuery = e.target.value;
  renderNotebook();
  const input = document.getElementById('notebook-search');
  input?.focus();
  input?.setSelectionRange(state.notebookQuery.length, state.notebookQuery.length);
});

// ===== 初始化 =====
(async () => {
  await loadWordList();
  buildWordMap();
  render(true);
  loadLexicalData();
})();
