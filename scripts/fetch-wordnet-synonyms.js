/**
 * ============================================
 * 近义词重建脚本（WordNet 版）
 * 用 Princeton WordNet 3.1 (via wordpos) 提取真实同义词，
 * 替换之前 Datamuse rel_syn 产生的无关"关联词"。
 * 翻译 + 词频（frq）复用 ECDICT ecdict.csv。
 * ============================================
 */

const WordPOS = require('wordpos');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const wordpos = new WordPOS();

const WORDS_PATH = path.join(__dirname, '..', 'data', 'words.json');
const CSV_PATH = path.join(__dirname, '..', 'data', 'ecdict.csv');

const POS_PREFIX_RE = /^(vt\.|vi\.|v\.|n\.|a\.|adj\.|adv\.|pron\.|prep\.|conj\.|int\.|num\.|art\.|aux\.)\s*/i;

/**
 * 应用词性 → WordNet 词性字母
 * WordNet: n=v? no — v=verb, n=noun, a=adjective, r=adverb
 */
function posToWordnet(pos) {
  if (!pos) return null;
  const p = pos.toLowerCase();
  if (/^v/.test(p)) return 'v';
  if (/^n/.test(p)) return 'n';
  if (/^(a|adj)/.test(p)) return 'a';
  if (/^adv/.test(p)) return 'r';
  return null;
}

/**
 * 解析 CSV 行（引号感知）
 */
function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { result.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  result.push(cur);
  return result;
}

/**
 * 解析 ECDICT translation 为多个义项 [{ pos, meaning }]
 * pos 为 ECDICT 词性前缀（vt./vi./v./n./a./adj./adv. 等），仅保留中文义项
 */
function parseEntries(translation) {
  if (!translation) return [];
  const lines = translation.replace(/\\n/g, '\n').split('\n').map(s => s.trim()).filter(Boolean);
  const entries = [];
  for (const rawLine of lines) {
    let line = rawLine;
    let pos = '';
    // 循环剥离词性前缀，兼容 "vt.vi." "n.v." 等复合词性写法
    while (POS_PREFIX_RE.test(line)) {
      const m = line.match(POS_PREFIX_RE);
      if (!pos) pos = m[1].toLowerCase();
      line = line.replace(POS_PREFIX_RE, '');
    }
    const meaning = line.trim();
    if (meaning && /[\u4e00-\u9fff]/.test(meaning)) entries.push({ pos, meaning });
  }
  return entries;
}

/**
 * ECDICT 词性前缀 → WordNet 词性字母
 */
function posToWn(pos) {
  if (!pos) return null;
  if (/^v/.test(pos)) return 'v';
  if (/^n/.test(pos)) return 'n';
  if (/^a|^adj/.test(pos)) return 'a';
  if (/^adv/.test(pos)) return 'r';
  return null;
}

/**
 * 按 WordNet 词性从义项中挑最匹配的中文释义
 */
function pickMeaning(entries, wnPos) {
  if (!entries.length) return '';
  if (wnPos) {
    const hit = entries.find(e => posToWn(e.pos) === wnPos);
    if (hit) return hit.meaning;
  }
  return entries[0].meaning;
}

/**
 * WordPOS lookup Promise 包装
 */
function lookup(word) {
  return new Promise((resolve) => {
    wordpos.lookup(word, (results) => resolve(results || []));
  });
}

/**
 * 从 synsets 提取同义词候选
 * @returns {Array<{word: string, isPhrase: boolean}>}
 */
function extractCandidates(synsets, targetPos, originalWord) {
  const lowerOrig = originalWord.toLowerCase();
  const seen = new Set([lowerOrig]);
  const ordered = [];

  // 目标词性的 synset 排前
  const sorted = [...synsets].sort((a, b) => {
    const am = targetPos && a.pos === targetPos ? 0 : 1;
    const bm = targetPos && b.pos === targetPos ? 0 : 1;
    return am - bm;
  });

  for (const syn of sorted) {
    for (const s of syn.synonyms || []) {
      const clean = s.replace(/_/g, ' ');
      const lower = clean.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      ordered.push({ word: clean, pos: syn.pos, isPhrase: lower.includes(' ') || lower.includes('-') });
    }
  }
  return ordered;
}

/**
 * 读 CSV 构建 dict: word -> { entries, frq }
 * entries 为该词所有中文义项 [{ pos, meaning }]
 */
async function buildDict(neededWords) {
  const dict = new Map();
  const rl = readline.createInterface({
    input: fs.createReadStream(CSV_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });
  let first = true;
  for await (const line of rl) {
    if (first) { first = false; continue; }
    const f = parseCsvLine(line);
    const word = (f[0] || '').toLowerCase();
    if (!word || !neededWords.has(word)) continue;
    const translation = f[3] || '';
    const frq = parseInt(f[9], 10) || 0;
    const entries = parseEntries(translation);
    if (entries.length || frq) dict.set(word, { entries, frq });
  }
  return dict;
}

/**
 * 短语翻译：整词查 → 拆词取各词释义
 */
function phraseMeaning(phrase, dict, wnPos) {
  const full = dict.get(phrase.toLowerCase());
  if (full && full.entries.length) return pickMeaning(full.entries, wnPos);
  const parts = phrase.toLowerCase().split(/[\s-]+/).filter(Boolean);
  const m = parts.map(p => {
    const e = dict.get(p);
    return e && e.entries.length ? e.entries[0].meaning : '';
  }).filter(Boolean);
  return m.length ? m.join('；') : '';
}

async function main() {
  const data = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));
  console.log(`加载词库: ${data.words.length} 词`);

  // 第一步：为每个词提取 WordNet 同义词候选
  const allCandidates = []; // [{word, candidates}]
  const needSet = new Set();

  for (let i = 0; i < data.words.length; i++) {
    const w = data.words[i];
    const targetPos = posToWordnet(w.pos);
    let synsets;
    try {
      synsets = await lookup(w.word);
    } catch {
      synsets = [];
    }
    const candidates = extractCandidates(synsets, targetPos, w.word);
    allCandidates.push({ word: w.word, targetPos, candidates });
    for (const c of candidates) {
      needSet.add(c.word.toLowerCase());
      if (c.isPhrase) {
        for (const p of c.word.toLowerCase().split(/[\s-]+/)) if (p) needSet.add(p);
      }
    }
    if ((i + 1) % 500 === 0) console.log(`  WordNet 提取: ${i + 1}/${data.words.length}`);
  }
  console.log(`需要翻译/词频的词数: ${needSet.size}`);

  // 第二步：读 ECDICT 构建 dict
  const dict = await buildDict(needSet);
  console.log(`从 ECDICT 提取: ${dict.size} 词`);

  // 第三步：排序（词频降序，短语排后）并回填
  let filled = 0;
  let totalSyns = 0;
  for (let i = 0; i < data.words.length; i++) {
    const w = data.words[i];
    const { candidates, targetPos } = allCandidates[i];

    const ranked = candidates
      .map(c => {
        const e = dict.get(c.word.toLowerCase());
        const frq = e ? e.frq : 0;
        let meaning = '';
        if (!c.isPhrase) {
          meaning = e ? pickMeaning(e.entries, c.pos) : '';
        } else {
          meaning = phraseMeaning(c.word, dict, c.pos);
        }
        return { word: c.word, pos: c.pos, meaning, frq, isPhrase: c.isPhrase };
      })
      .sort((a, b) => {
        // 1. 与原词词性一致者优先
        const am = targetPos && a.pos === targetPos ? 0 : 1;
        const bm = targetPos && b.pos === targetPos ? 0 : 1;
        if (am !== bm) return am - bm;
        // 2. 短语排后
        if (a.isPhrase !== b.isPhrase) return a.isPhrase ? 1 : -1;
        // 3. 词频降序
        return b.frq - a.frq;
      });

    const final = ranked
      .slice(0, 5)
      .filter(r => r.meaning) // 至少要能给出中文
      .map(r => ({ word: r.word, meaning: r.meaning }));

    w.synonyms = final;
    if (final.length) filled++;
    totalSyns += final.length;
  }

  data.meta.synonymSource = {
    source: 'Princeton WordNet 3.1 (via wordpos)',
    frequencyRankedBy: 'ECDICT frq',
    wordsWithSynonyms: filled,
  };

  fs.writeFileSync(WORDS_PATH, JSON.stringify(data, null, 2), 'utf-8');
  console.log('\n===== 近义词重建完成 =====');
  console.log(`有近义词的词: ${filled}/${data.words.length}`);
  console.log(`近义词总条数: ${totalSyns}`);
}

main().catch(err => { console.error('❌ 出错:', err); process.exit(1); });