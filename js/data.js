/**
 * ============================================
 * Mock 词库数据
 * 包含 CET6 / TOEFL / IELTS / GRE 级别词汇
 * 后续可通过抓取脚本替换为真实词库
 * ============================================
 */

export const wordList = [
  {
    id: 1,
    word: 'depend',
    display: 'de·pend',
    level: 'cet6',
    phonetics: {
      us: 'dɪˈpend',
      uk: 'dɪˈpend',
    },
    pos: 'vi.',
    definitions: ['取决于', '依靠', '信赖', '确信'],
    examples: [
      {
        en: 'It depends on how much time you have.',
        zh: '这取决于你有多少时间。',
      },
    ],
    collocations: [
      { phrase: 'depend on', meaning: '依靠；取决于' },
      { phrase: 'depend upon', meaning: '依赖；信任' },
    ],
    derivatives: [
      { word: 'dependence', pos: 'n.', meaning: '依赖；信任' },
      { word: 'dependent', pos: 'adj.', meaning: '依赖的；从属的' },
      { word: 'independent', pos: 'adj.', meaning: '独立的' },
    ],
    roots: [
      { root: 'de-', meaning: '向下' },
      { root: 'pend', meaning: '悬挂（hang）' },
    ],
    synonyms: [
      { word: 'rely', meaning: '依赖；信任' },
      { word: 'count', meaning: '指望；依靠' },
      { word: 'trust', meaning: '信任；信赖' },
    ],
  },
  {
    id: 2,
    word: 'accommodate',
    display: 'ac·com·mo·date',
    level: 'toefl',
    phonetics: {
      us: 'əˈkɑːmədeɪt',
      uk: 'əˈkɒmədeɪt',
    },
    pos: 'vt.',
    definitions: ['容纳', '提供住宿', '使适应', '迁就'],
    examples: [
      {
        en: 'The hotel can accommodate up to 500 guests.',
        zh: '这家酒店最多可以容纳500位客人。',
      },
    ],
    collocations: [
      { phrase: 'accommodate oneself to', meaning: '适应；迁就' },
      { phrase: 'accommodate with', meaning: '为…提供便利' },
    ],
    derivatives: [
      { word: 'accommodation', pos: 'n.', meaning: '住宿；适应' },
      { word: 'accommodating', pos: 'adj.', meaning: '随和的；乐于助人的' },
    ],
    roots: [
      { root: 'ac-', meaning: '朝、向（ad- 变体）' },
      { root: 'commod', meaning: '合适；便利' },
      { root: '-ate', meaning: '动词后缀' },
    ],
    synonyms: [
      { word: 'adapt', meaning: '适应' },
      { word: 'lodge', meaning: '提供住宿' },
      { word: 'house', meaning: '容纳' },
    ],
  },
  {
    id: 3,
    word: 'ephemeral',
    display: 'ephemeral',
    level: 'gre',
    phonetics: {
      us: 'ɪˈfemərəl',
      uk: 'ɪˈfemərəl',
    },
    pos: 'adj.',
    definitions: ['短暂的', '瞬息的', '朝生暮死的'],
    examples: [
      {
        en: 'Fame is often ephemeral, lasting only a brief moment.',
        zh: '名声往往是短暂的，只持续片刻。',
      },
    ],
    collocations: [
      { phrase: 'ephemeral beauty', meaning: '转瞬即逝的美' },
      { phrase: 'ephemeral nature', meaning: '短暂的本质' },
    ],
    derivatives: [
      { word: 'ephemerality', pos: 'n.', meaning: '短暂性' },
      { word: 'ephemerally', pos: 'adv.', meaning: '短暂地' },
    ],
    roots: [
      { root: 'epi-', meaning: '在…之上' },
      { root: 'hemera', meaning: '一天（day）' },
      { root: '-al', meaning: '形容词后缀' },
    ],
    synonyms: [
      { word: 'transient', meaning: '短暂的' },
      { word: 'fleeting', meaning: '飞逝的' },
      { word: 'short-lived', meaning: '短命的' },
    ],
  },
  {
    id: 4,
    word: 'meticulous',
    display: 'me·tic·u·lous',
    level: 'gre',
    phonetics: {
      us: 'məˈtɪkjələs',
      uk: 'məˈtɪkjələs',
    },
    pos: 'adj.',
    definitions: ['一丝不苟的', '极细致的', '过细的'],
    examples: [
      {
        en: 'She kept meticulous records of every transaction.',
        zh: '她对每一笔交易都做了细致的记录。',
      },
    ],
    collocations: [
      { phrase: 'meticulous attention', meaning: '细致的关注' },
      { phrase: 'meticulous care', meaning: '无微不至的关怀' },
    ],
    derivatives: [
      { word: 'meticulously', pos: 'adv.', meaning: '一丝不苟地' },
      { word: 'meticulousness', pos: 'n.', meaning: '细致；严谨' },
    ],
    roots: [
      { root: 'metus', meaning: '恐惧（fear）' },
      { root: '-ulous', meaning: '易于…的' },
    ],
    synonyms: [
      { word: 'thorough', meaning: '彻底的' },
      { word: 'painstaking', meaning: '煞费苦心的' },
      { word: 'scrupulous', meaning: '小心谨慎的' },
    ],
  },
  {
    id: 5,
    word: 'profound',
    display: 'pro·found',
    level: 'ielts',
    phonetics: {
      us: 'prəˈfaʊnd',
      uk: 'prəˈfaʊnd',
    },
    pos: 'adj.',
    definitions: ['深刻的', '深远的', '渊博的'],
    examples: [
      {
        en: 'The book had a profound impact on how I view the world.',
        zh: '这本书对我看待世界的方式产生了深远的影响。',
      },
    ],
    collocations: [
      { phrase: 'profound effect', meaning: '深远的影响' },
      { phrase: 'profound knowledge', meaning: '渊博的知识' },
    ],
    derivatives: [
      { word: 'profoundly', pos: 'adv.', meaning: '深刻地' },
      { word: 'profundity', pos: 'n.', meaning: '深度；深奥' },
    ],
    roots: [
      { root: 'pro-', meaning: '向前；深入' },
      { root: 'found', meaning: '底部（bottom）' },
    ],
    synonyms: [
      { word: 'deep', meaning: '深的' },
      { word: 'thorough', meaning: '彻底的' },
      { word: 'intense', meaning: '强烈的' },
    ],
  },
];
