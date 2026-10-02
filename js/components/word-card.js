/**
 * ============================================
 * 单词主展示区组件
 * - 单词名称（大号字体，带圆点分隔）
 * - 音标（美音/英音发音按钮）
 * - 词性与释义
 * ============================================
 */

// 发音图标
const SPEAKER_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
const LEVEL_LABELS = { cet4: '四级', cet6: '六级', postgraduate: '考研', toefl: '托福', ielts: '雅思', gre: 'GRE' };
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

/**
 * 渲染单词主展示区
 * @param {Object} word - 单词数据对象
 */
export function renderWordCard(word) {
  const { display, phonetics, pos, definitions } = word;
  const levels = (word.levels || (word.level ? [word.level] : [])).map(level => LEVEL_LABELS[level] || level.toUpperCase());
  const levelBadges = levels.length ? `<div class="word-levels" aria-label="词书标签">${levels.map(level => `<span>${esc(level)}</span>`).join('')}</div>` : '';
  const rank = word.frequency?.rank ? `<span class="word-frequency">通用词频 #${esc(word.frequency.rank)}</span>` : '';

  return `
    <section class="px-5 pt-7 pb-5">
      <!-- 单词名称 -->
      <div class="word-heading"><h1 class="word-display text-[40px] mb-2">${esc(display)}</h1>${levelBadges}${rank}</div>

      <!-- 音标 + 发音按钮 -->
      <div class="flex flex-wrap items-center gap-4 mb-4">
        <div class="flex items-center gap-1.5">
          <button class="phonetic-btn btn-press text-blue-500" data-action="speak" data-lang="us" aria-label="美音发音">
            ${SPEAKER_ICON}
          </button>
          <span class="text-[13px] text-slate-500 select-none">美 ${esc(phonetics?.us || '暂无')}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <button class="phonetic-btn btn-press text-blue-500" data-action="speak" data-lang="uk" aria-label="英音发音">
            ${SPEAKER_ICON}
          </button>
          <span class="text-[13px] text-slate-500 select-none">英 ${esc(phonetics?.uk || '暂无')}</span>
        </div>
      </div>

      <!-- 词性与释义 -->
      <div class="flex items-start gap-2">
        <span class="text-[13px] font-semibold text-blue-600 mt-1 shrink-0">${esc(pos)}</span>
        <p class="text-[15px] text-slate-800 leading-relaxed">
          ${(definitions || []).map(esc).join('；')}
        </p>
      </div>
    </section>
  `;
}
