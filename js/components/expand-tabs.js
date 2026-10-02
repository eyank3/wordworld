const TABS = [['collocations', '词组搭配'], ['derivatives', '派生'], ['inflections', '词形'], ['roots', '词根'], ['semanticRelations', '近反义']];
const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const row = (word, meaning, label = '') => '<button type="button" class="lexical-row lexical-link" data-action="open-word-ref" data-ref-word="' + esc(word) + '" data-ref-meaning="' + esc(meaning) + '" data-ref-label="' + esc(label) + '" aria-label="查看 ' + esc(word) + ' 详情"><strong>' + esc(word) + '</strong><span>' + esc(label) + '</span><span>' + esc(meaning) + '</span><span class="lexical-arrow" aria-hidden="true">›</span></button>';
const LEVEL_LABELS = { cet4: '四级', cet6: '六级', postgraduate: '考研', toefl: '托福', ielts: '雅思', gre: 'GRE' };
const sourceLabel = source => source === 'OEWN-2025' ? 'WordNet' : source === 'ECDICT-exchange' ? '词形表' : source || '词典';
const evidenceLabel = evidence => Object.entries(evidence || {}).filter(([, value]) => value).map(([key]) => LEVEL_LABELS[key] || key.toUpperCase());
function content(word, key, lexicalStatus = 'ready') {
  const items = word[key] || [];
  if (!items.length) {
    if (lexicalStatus === 'loading') return '<p class="text-sm text-slate-500 py-4">词汇拓展正在加载…</p>';
    if (lexicalStatus === 'failed') return '<p class="text-sm text-slate-500 py-4">拓展内容暂时不可用，核心单词仍可正常学习。</p>';
    return '<p class="text-sm text-slate-500 py-4">暂无已收录内容，不自动猜测补全。</p>';
  }
  if (key === 'collocations') return '<p class="text-xs text-slate-500 mb-2">优先展示词典收录的固定搭配；“考试标签”仅在有明确证据时显示。</p>' + items.map(i => {
    const exams = evidenceLabel(i.examEvidence);
    const label = exams.length ? `考试：${exams.join('、')}` : sourceLabel(i.source);
    return row(i.phrase, i.meaning, label);
  }).join('');
  if (key === 'derivatives') return '<p class="text-xs text-slate-500 mb-2">同词族 · 按词性整理</p>' + ['n.', 'v.', 'adj.', 'adv.'].map(pos => {
    const group = items.filter(i => i.pos === pos);
    return group.length ? '<h3 class="font-semibold mt-3">' + esc(pos) + '</h3>' + group.map(i => row(i.word, i.meaning || i.definition, `${i.pos} · ${sourceLabel(i.source)}`)).join('') : '';
  }).join('');
  if (key === 'inflections') return items.map(i => row(i.word, (i.labels || []).join(' / '), sourceLabel(i.source))).join('');
  if (key === 'roots') return '<p class="text-xs text-slate-500 mb-2">词根只作为记忆线索，不代表所有同根词都能互换。</p>' + items.map(i => row(i.root, i.meaning, `词根 · ${sourceLabel(i.source)}`)).join('');
  return '<p class="text-xs text-slate-500 mb-2">按义项区分；近义词并非在所有语境下都能替换。</p>' + items.map(i => '<article class="lexical-sense"><p>' + esc(i.pos) + ' ' + esc(i.definition) + '</p>' + (i.synonyms?.length ? '<h4>近义</h4>' + i.synonyms.map(s => row(s.word, s.meaning)).join('') : '') + (i.antonyms?.length ? '<h4>反义</h4>' + i.antonyms.map(s => row(s.word, s.meaning)).join('') : '') + '</article>').join('');
}
export function renderExpandTabs(word, activeTab = 'collocations', { lexicalStatus = 'ready' } = {}) {
  const key = TABS.some(([k]) => k === activeTab) ? activeTab : 'collocations';
  return '<section class="px-5 pb-4"><div class="glass-card rounded-2xl overflow-hidden"><div class="px-4 pt-4 pb-3 min-h-[110px]" id="lexical-panel">' + content(word, key, lexicalStatus) + '</div><div class="flex border-t border-slate-200/60">' + TABS.map(([k,label]) => '<button class="tab-item flex-1 py-3 text-slate-500 ' + (key === k ? 'active' : '') + '" data-tab="' + k + '" aria-pressed="' + (key === k) + '" aria-controls="lexical-panel">' + label + '</button>').join('') + '</div><p class="lexical-source">来源：ECDICT · Open English WordNet 2025<br>' + (word.frequency?.rank ? '通用网页词频排名：' + word.frequency.rank + '（非考频）' : '未进入所用通用高频词表') + ' · <a href="data/SOURCES.md" target="_blank" rel="noopener">数据说明</a></p></div></section>';
}
