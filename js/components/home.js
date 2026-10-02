/**
 * ============================================
 * 毛玻璃首页组件
 * - 沉浸式暖白背景（背景图 + 柔光遮罩）
 * - 顶部头像（萌宠猫 + 红点通知）
 * - 签到卡片（日历图标 + 日期）
 * - Learn / Review 双卡片（橙色强调数字）
 * - 底部图标导航（无文字）
 * ============================================
 */

const CAT_SVG = `<svg width="40" height="40" viewBox="0 0 64 64">
  <polygon points="14,22 16,40 32,34" fill="#f59e0b"/>
  <polygon points="50,22 48,40 32,34" fill="#f59e0b"/>
  <circle cx="32" cy="37" r="23" fill="#fbbf24"/>
  <circle cx="23" cy="34" r="3.3" fill="#451a03"/>
  <circle cx="41" cy="34" r="3.3" fill="#451a03"/>
  <circle cx="32" cy="41" r="2.2" fill="#b45309"/>
  <path d="M32 43.5 Q29 48 25 44 M32 43.5 Q35 48 39 44" stroke="#451a03" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M27 29 Q24 26 27 23 M37 29 Q40 26 37 23" stroke="#451a03" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</svg>`;

const CALENDAR_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

const CHECK_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

const FLAME_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4-3 6-3 11a4 4 0 0 0 8 0c0-2-1-3-1-4 1 1 2 2 2 4a6 6 0 0 1-12 0c0-6 5-7 6-11z"/></svg>`;

// 底部导航图标
const CAP_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></svg>`;
const BOOK_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
const GEAR_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>`;

/**
 * 格式化日期为 "09/23 Wed."
 */
function formatDate() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${mm}/${dd} ${weekdays[d.getDay()]}.`;
}

/**
 * 渲染首页
 * @param {Object} opts - { newCount, dueCount, checkedIn, streak }
 */
export function renderHome({ newCount, dueCount, learned = 0, reviewedToday = 0, checkedIn, streak, dataSource = '', dailyLimit = 30, orderMode = 'ordered', targetLevel = 'all', practiceMode = 'recognition' }) {
  const done = Math.min(reviewedToday, dailyLimit);
  const progress = dailyLimit ? Math.min(100, Math.round((done / dailyLimit) * 100)) : 0;
  const checkInIcon = checkedIn
    ? `<span class="checkin-icon checked">${CHECK_SVG}</span>`
    : `<span class="checkin-icon">${CALENDAR_SVG}</span>`;

  const checkInRight = checkedIn
    ? `<span class="checkin-badge">${FLAME_SVG}<span>连续 ${streak} 天</span></span>`
    : `<span class="checkin-hint">点击签到</span>`;

  return `
    <div class="home-bg"></div>

    <div class="home-screen">
      <!-- 顶部头像 -->
      <header class="home-header">
        <div class="home-avatar">
          ${CAT_SVG}
          <span class="home-badge">1</span>
        </div>
      </header>

      <!-- 签到卡片 -->
      <section class="home-section">
        <button class="checkin-card glass-card" data-action="check-in" aria-label="签到">
          ${checkInIcon}
          <span class="checkin-meta">
            <span class="checkin-title">${checkedIn ? '已签到' : '签到'}</span>
            <span class="checkin-date">${formatDate()}</span>
          </span>
          ${checkInRight}
        </button>
      </section>

      <section class="home-section today-goal glass-card" aria-label="今日学习进度">
        <div class="today-goal-head"><div><span class="eyebrow">今日目标</span><strong>${done} / ${dailyLimit} 词</strong></div><span class="today-percent">${progress}%</span></div>
        <div class="goal-track" role="progressbar" aria-valuemin="0" aria-valuemax="${dailyLimit}" aria-valuenow="${done}" aria-label="今日学习进度"><span style="width:${progress}%"></span></div>
        <div class="today-goal-foot"><span>${progress >= 100 ? '今日目标已完成' : `还差 ${dailyLimit - done} 词`}</span><span>已掌握 ${learned}</span></div>
      </section>

      <!-- Learn / Review 双卡片 -->
      <section class="home-section home-cards">
        <button class="home-card glass-card" data-action="start-learn" aria-label="学习新词">
          <span class="home-card-label">学习</span>
          <span class="home-card-num">${newCount}</span>
          <span class="home-card-sub">待学习新词</span>
        </button>
        <button class="home-card glass-card" data-action="start-review" aria-label="复习">
          <span class="home-card-label">复习</span>
          <span class="home-card-num">${dueCount}</span>
          <span class="home-card-sub">待复习</span>
        </button>
      </section>
      <section class="home-section study-settings" aria-label="学习范围、背诵顺序和练习模式">
        <label for="study-level">词书范围</label>
        <select id="study-level" class="order-select">
          <option value="all" ${targetLevel === 'all' ? 'selected' : ''}>全部词库</option>
          <option value="cet6" ${targetLevel === 'cet6' ? 'selected' : ''}>六级</option>
          <option value="toefl" ${targetLevel === 'toefl' ? 'selected' : ''}>托福</option>
          <option value="ielts" ${targetLevel === 'ielts' ? 'selected' : ''}>雅思</option>
          <option value="gre" ${targetLevel === 'gre' ? 'selected' : ''}>GRE</option>
        </select>
        <label for="order-mode">背诵顺序</label>
        <select id="order-mode" class="order-select">
          <option value="ordered" ${orderMode === 'ordered' ? 'selected' : ''}>按词库顺序</option>
          <option value="random" ${orderMode === 'random' ? 'selected' : ''}>乱序背诵</option>
        </select>
        <label for="practice-mode">练习模式</label>
        <select id="practice-mode" class="order-select">
          <option value="recognition" ${practiceMode === 'recognition' ? 'selected' : ''}>认识卡片</option>
          <option value="spelling" ${practiceMode === 'spelling' ? 'selected' : ''}>拼写回忆</option>
          <option value="listening" ${practiceMode === 'listening' ? 'selected' : ''}>听音拼写</option>
          <option value="cloze" ${practiceMode === 'cloze' ? 'selected' : ''}>例句填空</option>
        </select>
      </section>
      <p class="data-source">${dataSource} · 每日新词上限 ${dailyLimit}</p>
    </div>

    <!-- 底部图标导航 -->
    <nav class="home-nav glass-card">
      <button class="home-nav-btn active" data-action="nav-home" aria-label="学习">${CAP_SVG}</button>
      <button class="home-nav-btn" data-action="nav-notebook" aria-label="生词本">${BOOK_SVG}</button>
      <button class="home-nav-btn" data-action="nav-settings" aria-label="设置">${GEAR_SVG}</button>
    </nav>
  `;
}
