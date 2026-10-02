/**
 * ============================================
 * 例句卡片组件
 * - 英文例句（目标词加粗）
 * - 中文翻译
 * - 发音按钮
 * ============================================
 */

const SPEAKER_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

/**
 * 将目标词在例句中加粗
 * @param {string} sentence - 英文例句
 * @param {string} word - 目标单词
 */
function highlightWord(sentence, word) {
  // 转义正则特殊字符
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 匹配目标词及其屈折变化（如 depends/depended/depending），避免把 depends 拆成 depend+s
  const regex = new RegExp(`\\b(${escaped}\\w*)`, 'gi');
  return esc(sentence).replace(regex, '<span class="target-word">$1</span>');
}

/**
 * 渲染例句卡片
 * @param {Object} example - { en, zh }
 * @param {string} word - 目标单词（用于高亮）
 */
export function renderExample(example, word) {
  const highlightedEn = highlightWord(example.en, word);

  return `
    <section class="px-5 pb-3">
      <div class="glass-card rounded-2xl p-4">
        <!-- 英文例句 -->
        <div class="flex items-start gap-2 mb-2">
          <button class="phonetic-btn btn-press text-blue-500 mt-0.5 shrink-0" data-action="speak-sentence" data-text="${esc(example.en)}" aria-label="例句发音">
            ${SPEAKER_ICON}
          </button>
          <p class="text-[14px] text-slate-600 leading-relaxed flex-1">
            ${highlightedEn}
          </p>
        </div>
        ${example.zh ? `<!-- 中文翻译 -->
        <p class="text-[13px] text-slate-400 leading-relaxed pl-7">${esc(example.zh)}</p>` : `<p class="example-source pl-7">英文例句来源：${esc(example.source || '词库')} · 暂无人工译文</p>`}
      </div>
    </section>
  `;
}
