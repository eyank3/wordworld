/**
 * ============================================
 * 顶部导航栏组件
 * 左侧：返回箭头 + 进度（23/50）
 * 右侧：撤销、收藏、拼写、熟练度、更多
 * ============================================
 */

// 内联 SVG 图标（避免外部依赖）
const ICONS = {
  back: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
  undo: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
  starOutline: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  starFilled: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  spell: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
  proficiency: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  more: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/><circle cx="5" cy="12" r="1.8"/></svg>`,
};

/**
 * 渲染顶部导航栏
 * @param {Object} state - { currentIndex, total, isFavorite, canUndo }
 */
export function renderNavbar(state) {
  const { currentIndex, total, isFavorite, canUndo, orderMode = 'ordered' } = state;
  const progress = ((currentIndex + 1) / total) * 100;

  return `
    <nav class="sticky top-0 z-40 bg-white/60 backdrop-blur-md border-b border-slate-200/60">
      <div class="flex items-center justify-between px-2.5 py-1.5">
        <!-- 左侧：返回 + 进度 -->
        <div class="flex items-center gap-1">
          <button class="nav-icon-btn btn-press text-slate-600" data-action="back" aria-label="返回">
            ${ICONS.back}
          </button>
          <span class="progress-text text-sm text-slate-700 select-none px-1.5">
            ${currentIndex + 1}<span class="text-slate-400 font-normal">/${total}</span>
          </span>
          <span class="order-badge" title="本轮背诵顺序">${orderMode === 'random' ? '乱序' : '顺序'}</span>
        </div>

        <!-- 右侧：操作按钮组 -->
        <div class="flex items-center gap-0.5">
          <button class="nav-icon-btn btn-press ${canUndo ? 'text-slate-600' : 'text-slate-300'}" data-action="undo" aria-label="撤销" ${!canUndo ? 'disabled' : ''}>
            ${ICONS.undo}
          </button>
          <button class="nav-icon-btn btn-press ${isFavorite ? 'text-red-500' : 'text-slate-400'}" data-action="favorite" aria-label="收藏">
            ${isFavorite ? ICONS.starFilled : ICONS.starOutline}
          </button>
          <button class="nav-icon-btn btn-press text-slate-400" data-action="more" aria-label="更多">
            ${ICONS.more}
          </button>
        </div>
      </div>
      <!-- 进度条 -->
      <div class="h-0.5 bg-slate-200/50" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${currentIndex + 1}" aria-label="学习进度">
        <div class="progress-bar-fill h-full bg-blue-500 rounded-r" style="width: ${progress}%"></div>
      </div>
    </nav>
  `;
}
