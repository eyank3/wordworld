import { getReviewPreview } from '../srs.js';

/**
 * ============================================
 * 底部操作栏组件（固定在底部）
 * 四档反馈：忘记 / 困难 / 记住 / 简单
 * ============================================
 */

/**
 * 渲染底部操作栏
 */
export function renderActionBar({ word } = {}) {
  const preview = word ? getReviewPreview(word.id) : {};
  return `
    <div class="action-bar">
      <div class="answer-bar bg-white/90 backdrop-blur-md border-t border-slate-200/60 shadow-[0_-2px_12px_rgba(15,23,42,0.04)]" role="group" aria-label="记忆反馈">
        <button class="answer-btn answer-forgot" data-action="answer-forgot" title="忘记（快捷键 1）"><strong>忘记</strong><small>${preview.forgot || '10分钟后'}</small></button>
        <button class="answer-btn answer-hard" data-action="answer-hard" title="困难（快捷键 2）"><strong>困难</strong><small>${preview.hard || '30分钟后'}</small></button>
        <button class="answer-btn answer-known" data-action="answer-known" title="记住（快捷键 3）"><strong>记住</strong><small>${preview.known || '明天复习'}</small></button>
        <button class="answer-btn answer-easy" data-action="answer-easy" title="简单（快捷键 4）"><strong>简单</strong><small>${preview.easy || '2天起'}</small></button>
      </div>
    </div>
  `;
}
