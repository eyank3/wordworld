/**
 * ============================================
 * 词库翻译补充脚本
 * 从 ECDICT 的 ecdict.csv 提取中文释义，
 * 回填到 words.json 的派生词 / 近义词 / 词组搭配 的 meaning 字段
 * ============================================
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CSV_PATH = path.join(__dirname, '..', 'data', 'ecdict.csv');
const WORDS_PATH = path.join(__dirname, '..', 'data', 'words.json');

// 词性前缀（用于从释义首行剥离）
const POS_PREFIX_RE = /^(vt\.|vi\.|v\.|n\.|a\.|adj\.|adv\.|pron\.|prep\.|conj\.|int\.|num\.|art\.|aux\.)\s*/i;

/**
 * 解析一行 CSV（引号感知，处理字段内逗号）
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = false; }
      } else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

/**
 * 从 ECDICT translation 字段提炼干净的中文释义
 * 取第一行，剥离词性前缀与空白
 */
function cleanMeaning(translation) {
  if (!translation) return '';
  const normalized = translation.replace(/\\n/g, '\n');
  const lines = normalized.split('\n').map(s => s.trim()).filter(Boolean);
  if (lines.length === 0) return '';
  const first = lines[0].replace(POS_PREFIX_RE, '').trim();
  return first;
}

/**
 * 构建需要翻译的词集合
 */
function collectNeededWords(data) {
  const set = new Set();
  for (const w of data.words) {
    for (const d of w.derivatives || []) { if (d.word) set.add(d.word.toLowerCase()); }
    for (const s of w.synonyms || []) { if (s.word) set.add(s.word.toLowerCase()); }
    for (const c of w.collocations || []) {
      // 整个短语 + 每个组成词
      if (c.phrase) {
        const words = c.phrase.toLowerCase().split(/\s+/).filter(Boolean);
        for (const word of words) set.add(word);
      }
    }
  }
  return set;
}

/**
 * 从 CSV 流式读取，构建 词 → 释义 映射（仅收录需要的词）
 */
async function buildDictionary(neededWords) {
  const dict = new Map();
  const rl = readline.createInterface({
    input: fs.createReadStream(CSV_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let isFirst = true;
  for await (const line of rl) {
    if (isFirst) { isFirst = false; continue; } // 跳过表头
    const fields = parseCsvLine(line);
    const word = (fields[0] || '').toLowerCase();
    if (!word || !neededWords.has(word)) continue;
    const translation = fields[3] || '';
    const meaning = cleanMeaning(translation);
    if (meaning) dict.set(word, meaning);
  }
  return dict;
}

/**
 * 回填翻译
 */
function fillTranslations(data, dict) {
  let filledDer = 0, filledSyn = 0, filledCol = 0;

  for (const w of data.words) {
    // 派生词
    for (const d of w.derivatives || []) {
      if (d.word) {
        const m = dict.get(d.word.toLowerCase()) || '';
        d.meaning = m;
        if (m) filledDer++;
      }
    }
    // 近义词
    for (const s of w.synonyms || []) {
      if (s.word) {
        const m = dict.get(s.word.toLowerCase()) || '';
        s.meaning = m;
        if (m) filledSyn++;
      }
    }
    // 词组搭配：整体查，否则拆词取第二词起的释义
    for (const c of w.collocations || []) {
      if (!c.phrase) continue;
      let m = dict.get(c.phrase.toLowerCase()) || '';
      if (!m) {
        const words = c.phrase.toLowerCase().split(/\s+/).filter(Boolean);
        const rest = words.slice(1);
        m = rest.map(x => dict.get(x)).filter(Boolean).join('；');
      }
      c.meaning = m;
      if (m) filledCol++;
    }
  }

  return { filledDer, filledSyn, filledCol };
}

async function main() {
  const data = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf-8'));
  console.log(`加载词库: ${data.words.length} 词`);

  const needed = collectNeededWords(data);
  console.log(`需要翻译的独立词数: ${needed.size}`);

  const dict = await buildDictionary(needed);
  console.log(`从 ECDICT 提取到释义: ${dict.size} 词`);

  const { filledDer, filledSyn, filledCol } = fillTranslations(data, dict);
  console.log(`派生词回填: ${filledDer}`);
  console.log(`近义词回填: ${filledSyn}`);
  console.log(`词组搭配回填: ${filledCol}`);

  data.meta.translations = {
    source: 'ECDICT ecdict.csv',
    derivativesFilled: filledDer,
    synonymsFilled: filledSyn,
    collocationsFilled: filledCol,
  };

  fs.writeFileSync(WORDS_PATH, JSON.stringify(data, null, 2), 'utf-8');
  console.log('\n✅ 翻译补充完成');
}

main().catch(err => { console.error('❌ 出错:', err); process.exit(1); });