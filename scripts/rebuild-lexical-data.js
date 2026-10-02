/**
 * 清理词组搭配，并从 ECDICT exchange + 词库词性重建派生词。
 * 用法：node scripts/rebuild-lexical-data.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORDS_PATH = path.join(ROOT, 'data', 'words.json');
const CSV_PATH = path.join(ROOT, 'data', 'ecdict.csv');
const BACKUP_PATH = path.join(ROOT, 'data', `words.before-lexical-cleanup-${Date.now()}.json`);

function parseCsvLine(line) {
  const out = []; let cur = ''; let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur); return out;
}

function posKind(pos = '') {
  const p = pos.toLowerCase();
  if (/^(vt|vi|v)\b/.test(p)) return 'verb';
  if (/^n\b/.test(p)) return 'noun';
  if (/^(a|adj)\b/.test(p)) return 'adjective';
  if (/^adv\b/.test(p)) return 'adverb';
  return '';
}

function exchangeForms(exchange) {
  const result = [];
  for (const part of String(exchange || '').split('/')) {
    const m = part.match(/^([dpi3]):(.+)$/);
    if (!m) continue;
    const pos = { d: '过去式', p: '过去分词', i: '现在分词', 3: '第三人称单数' }[m[1]];
    for (const word of m[2].split('|')) if (word) result.push({ word: word.toLowerCase(), pos });
  }
  return result;
}

function isInflectionMeaning(meaning = '') {
  return /过去式|过去分词|现在分词|第三人称单数|复数形式/.test(meaning);
}

function cleanCollocations(word, collocations) {
  const seen = new Set();
  return (collocations || []).filter(item => {
    const phrase = String(item.phrase || '').trim().toLowerCase();
    const parts = phrase.split(/\s+/);
    if (!phrase || parts.length < 2 || parts[0] !== word.toLowerCase()) return false;
    if (isInflectionMeaning(item.meaning)) return false;
    // Datamuse rel_trg 经常给出单个词形或无搭配意义的关联词。
    if (parts.length === 2 && /^(sank|happened|halted|cleansed|abbreviations|abnormalities)$/i.test(parts[1])) return false;
    if (seen.has(phrase)) return false;
    seen.add(phrase); return true;
  }).slice(0, 5);
}

function familyCandidates(word) {
  const w = word.toLowerCase();
  const suffixes = [
    ['tion', 'noun'], ['sion', 'noun'], ['ment', 'noun'], ['ness', 'noun'], ['ity', 'noun'],
    ['ance', 'noun'], ['ence', 'noun'], ['al', 'noun'], ['er', 'noun'], ['or', 'noun'],
    ['ive', 'adjective'], ['ous', 'adjective'], ['ful', 'adjective'], ['less', 'adjective'],
    ['able', 'adjective'], ['ible', 'adjective'], ['ly', 'adverb'],
  ];
  const stems = new Set([w]);
  if (w.endsWith('e')) stems.add(w.slice(0, -1));
  if (w.endsWith('y')) stems.add(w.slice(0, -1) + 'i');
  const candidates = [];
  for (const stem of stems) for (const [suffix, kind] of suffixes) candidates.push({ word: stem + suffix, kind });
  return candidates;
}

function main() {
  const data = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8'));
  const words = data.words || [];
  const byWord = new Map(words.map(w => [String(w.word).toLowerCase(), w]));
  const exchanges = new Map();
  let lines = fs.readFileSync(CSV_PATH, 'utf8').split(/\r?\n/);
  for (const line of lines.slice(1)) {
    const fields = parseCsvLine(line); const word = String(fields[0] || '').toLowerCase();
    if (word) exchanges.set(word, exchangeForms(fields[10]));
  }

  fs.copyFileSync(WORDS_PATH, BACKUP_PATH);
  let removedCollocations = 0; let addedDerivatives = 0;
  for (const w of words) {
    const original = w.collocations || [];
    w.collocations = cleanCollocations(w.word, original);
    removedCollocations += original.length - w.collocations.length;

    const derivatives = []; const seen = new Set([`${String(w.word).toLowerCase()}|headword`]);
    const add = (entry) => {
      const key = entry.word.toLowerCase();
      const identity = `${key}|${entry.pos || ''}`;
      if (!key || seen.has(identity)) return;
      seen.add(identity);
      if (!entry.meaning && /过去式|过去分词|现在分词|第三人称单数/.test(entry.pos || '')) entry.meaning = `（${w.word}的${entry.pos}）`;
      derivatives.push(entry);
    };
    for (const form of exchanges.get(String(w.word).toLowerCase()) || []) add(form);
    for (const candidate of familyCandidates(w.word)) {
      const target = byWord.get(candidate.word);
      if (!target || posKind(target.pos) !== candidate.kind) continue;
      add({ word: target.word, pos: target.pos, meaning: (target.definitions || []).slice(0, 1).join('；') });
    }
    w.derivatives = derivatives.slice(0, 12);
    addedDerivatives += w.derivatives.length;
  }
  data.meta = data.meta || {};
  data.meta.lexicalCleanup = { source: 'ECDICT exchange + local wordlist', removedCollocations, rebuiltDerivatives: addedDerivatives };
  fs.writeFileSync(WORDS_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log(`完成：移除 ${removedCollocations} 条疑似错误搭配；重建派生词 ${addedDerivatives} 条。`);
  console.log(`原文件备份：${BACKUP_PATH}`);
}

main();
