/**
 * ============================================
 * ECDICT 词库抓取脚本
 * 从 skywind3000/ECDICT 下载 ecdict.csv
 * 按等级（cet6/toefl/ielts/gre）筛选并转换为应用格式
 * ============================================
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ===== 配置 =====
// 多个镜像源，依次尝试
const ECDICT_CSV_URLS = [
  'https://cdn.jsdelivr.net/gh/skywind3000/ECDICT@master/ecdict.csv',
  'https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv',
  'https://ghproxy.com/https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv',
];
const CSV_PATH = path.join(__dirname, '..', 'data', 'ecdict.csv');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'words.json');

// 需要抓取的等级标签
const TARGET_LEVELS = ['cet6', 'toefl', 'ielts', 'gre'];

// 每个等级最多抓取的单词数（避免词库过大）
const MAX_PER_LEVEL = {
  cet6: 2000,
  toefl: 2000,
  ielts: 1500,
  gre: 2000,
};

// ===== 工具函数 =====

/**
 * 简单的音节切分（Max Onset 简化版）
 * 在元音核之间插入圆点分隔，如 depend → de·pend
 */
function splitSyllables(word) {
  const vowels = 'aeiouy';
  const lower = word.toLowerCase();
  // 找出所有元音核的位置
  const nuclei = [];
  let i = 0;
  while (i < lower.length) {
    if (vowels.includes(lower[i])) {
      let j = i;
      while (j < lower.length && vowels.includes(lower[j])) j++;
      nuclei.push(i);
      i = j;
    } else {
      i++;
    }
  }
  if (nuclei.length <= 1) return word;

  // 在每个元音核之前（除第一个）找切分点
  const splits = [];
  for (let k = 1; k < nuclei.length; k++) {
    const prevEnd = nuclei[k - 1] + (nuclei[k] - nuclei[k - 1] === 1 ? 0 : 1);
    const curStart = nuclei[k];
    // 辅音簇：最多给前一个音节留1个辅音
    const consonants = curStart - prevEnd;
    let splitPos;
    if (consonants <= 1) {
      splitPos = prevEnd;
    } else {
      splitPos = curStart - 1; // 留一个辅音给当前音节
    }
    if (splitPos > 0 && splitPos < word.length) {
      splits.push(splitPos);
    }
  }

  // 拼接带圆点的形式
  let result = '';
  let last = 0;
  for (const pos of splits) {
    result += word.slice(last, pos) + '·';
    last = pos;
  }
  result += word.slice(last);
  return result;
}

// 词性前缀正则（匹配行首的 "vt." "n." "adj." 等）
const POS_PREFIX_RE = /^(vt\.|vi\.|v\.|n\.|adj\.|adv\.|pron\.|prep\.|conj\.|int\.|num\.|art\.|aux\.|modal\.)\s*/;

/**
 * 解析 ECDICT 的 pos 字段
 * 格式如 "n:46/v:54"，取占比最高的词性
 */
function parsePos(posStr) {
  if (!posStr) return '';
  const parts = posStr.split('/');
  const posMap = {
    n: 'n.', v: 'v.', vt: 'vt.', vi: 'vi.',
    adj: 'adj.', adv: 'adv.', pron: 'pron.',
    prep: 'prep.', conj: 'conj.', int: 'int.',
    num: 'num.', art: 'art.', aux: 'aux.'
  };
  let best = '';
  let bestRatio = 0;
  for (const part of parts) {
    const [code, ratio] = part.split(':');
    const r = parseInt(ratio, 10) || 0;
    if (r > bestRatio) {
      bestRatio = r;
      best = posMap[code] || code + '.';
    }
  }
  return best;
}

/**
 * 从释义行中提取词性前缀
 * @returns {{ pos: string, definitions: string[] }}
 */
function parseTranslationWithPos(translation) {
  if (!translation) return { pos: '', definitions: [] };
  // ECDICT 中换行可能是字面量 \n 或真实换行，统一处理
  const normalized = translation.replace(/\\n/g, '\n');
  const lines = normalized
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const definitions = [];
  let pos = '';
  for (const line of lines) {
    const match = line.match(POS_PREFIX_RE);
    if (match) {
      if (!pos) pos = match[1];
      definitions.push(line.replace(POS_PREFIX_RE, '').trim());
    } else {
      definitions.push(line);
    }
  }
  return { pos, definitions: definitions.slice(0, 5) };
}

/**
 * 规范化音标字符（ECDICT 中混用了西里尔字母）
 */
function normalizePhonetic(phonetic) {
  if (!phonetic) return '';
  return phonetic
    .replace(/ә/g, 'ə')    // 西里尔 schwa → IPA schwa
    .replace(/ɒ/g, 'ɒ')    // 保留
    .replace(/ʌ/g, 'ʌ')
    .replace(/ʊ/g, 'ʊ')
    .replace(/ɪ/g, 'ɪ')
    .replace(/ɔ/g, 'ɔ')
    .replace(/æ/g, 'æ')
    .replace(/ð/g, 'ð')
    .replace(/θ/g, 'θ')
    .replace(/ʃ/g, 'ʃ')
    .replace(/ʒ/g, 'ʒ')
    .replace(/ŋ/g, 'ŋ')
    .replace(/ˈ/g, 'ˈ')
    .replace(/ˌ/g, 'ˌ')
    .trim();
}

/**
 * 从 exchange 字段提取词形变化（作为派生词展示）
 * 格式: d:perceived/p:perceived/3:perceives/i:perceiving
 */
function parseExchange(exchange) {
  if (!exchange) return [];
  const typeMap = {
    p: '过去式', d: '过去分词', i: '现在分词',
    3: '第三人称单数', r: '比较级', t: '最高级', s: '复数'
  };
  const result = [];
  const parts = exchange.split('/');
  for (const part of parts) {
    const [type, word] = part.split(':');
    if (word && typeMap[type]) {
      result.push({ word, pos: typeMap[type], meaning: '' });
    }
  }
  return result;
}

/**
 * 判断单词属于哪些目标等级
 */
function matchLevels(tag) {
  if (!tag) return [];
  const tags = tag.toLowerCase().split(/\s+/);
  return TARGET_LEVELS.filter(l => tags.includes(l));
}

// ===== CSV 解析 =====

/**
 * 解析一行 CSV（处理引号内逗号的情况）
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

// ===== 主流程 =====

function downloadFromUrl(url) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(CSV_PATH);
    const req = https.get(url, (res) => {
      // 处理重定向
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        res.resume();
        if (redirectUrl) {
          downloadFromUrl(redirectUrl).then(resolve).catch(reject);
        } else {
          reject(new Error('重定向但无 location'));
        }
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('下载超时'));
    });
  });
}

async function downloadCsv() {
  if (fs.existsSync(CSV_PATH)) {
    const stats = fs.statSync(CSV_PATH);
    console.log(`✓ 已存在 ecdict.csv (${(stats.size / 1024 / 1024).toFixed(1)} MB)，跳过下载`);
    return;
  }
  for (let i = 0; i < ECDICT_CSV_URLS.length; i++) {
    const url = ECDICT_CSV_URLS[i];
    console.log(`⌛ 正在下载 ecdict.csv (尝试 ${i + 1}/${ECDICT_CSV_URLS.length}): ${url}`);
    try {
      await downloadFromUrl(url);
      const stats = fs.statSync(CSV_PATH);
      console.log(`✓ 下载完成 (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
      return;
    } catch (err) {
      console.log(`  ✗ 失败: ${err.message}`);
      // 清理不完整的文件
      if (fs.existsSync(CSV_PATH)) fs.unlinkSync(CSV_PATH);
    }
  }
  throw new Error('所有下载源均失败，请检查网络连接');
}

async function processCsv() {
  console.log('⌛ 正在解析并筛选词库 ...');

  // 按等级分组存储
  const levelWords = { cet6: [], toefl: [], ielts: [], gre: [] };
  const seenWords = new Set(); // 去重
  let idCounter = 1;
  let totalLines = 0;

  const rl = readline.createInterface({
    input: fs.createReadStream(CSV_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  let isFirstLine = true;
  let headers = [];

  for await (const line of rl) {
    totalLines++;
    if (isFirstLine) {
      headers = parseCsvLine(line).map(h => h.trim());
      isFirstLine = false;
      continue;
    }

    const fields = parseCsvLine(line);
    if (fields.length < headers.length) continue;

    const record = {};
    headers.forEach((h, idx) => {
      record[h] = fields[idx] || '';
    });

    const word = record.word;
    if (!word || seenWords.has(word)) continue;

    const levels = matchLevels(record.tag);
    if (levels.length === 0) continue;

    // 只处理纯字母单词（过滤词组、缩写等）
    if (!/^[a-zA-Z]+$/.test(word)) continue;
    // 过滤过短或过长的词
    if (word.length < 3 || word.length > 20) continue;

    const rawPhonetic = record.phonetic || '';
    const phonetic = normalizePhonetic(rawPhonetic);

    // 优先从 pos 字段解析，回退到从释义行提取
    let pos = parsePos(record.pos);
    const { pos: posFromTrans, definitions } = parseTranslationWithPos(record.translation);
    if (!pos && posFromTrans) pos = posFromTrans;
    if (definitions.length === 0) continue; // 没有释义的跳过

    seenWords.add(word);

    const wordEntry = {
      id: idCounter++,
      word: word,
      display: splitSyllables(word),
      level: levels[0], // 主等级取第一个匹配
      levels: levels,    // 所有匹配的等级
      phonetics: {
        us: phonetic,
        uk: phonetic,
      },
      pos: pos,
      definitions: definitions,
      examples: [],
      collocations: [],
      derivatives: parseExchange(record.exchange),
      roots: [],
      synonyms: [],
    };

    // 加入所有匹配的等级
    for (const lvl of levels) {
      if (levelWords[lvl].length < MAX_PER_LEVEL[lvl]) {
        levelWords[lvl].push(wordEntry);
      }
    }
  }

  console.log(`✓ 解析完成，共扫描 ${totalLines} 行`);
  return levelWords;
}

// ===== 生成输出 =====

function generateOutput(levelWords) {
  // 合并所有等级的单词，去重（按 id）
  const allWords = [];
  const seenIds = new Set();

  // 按等级顺序合并：cet6 → toefl → ielts → gre
  for (const lvl of TARGET_LEVELS) {
    for (const w of levelWords[lvl]) {
      if (!seenIds.has(w.id)) {
        seenIds.add(w.id);
        allWords.push(w);
      }
    }
  }

  // 重新分配连续 id
  allWords.forEach((w, idx) => {
    w.id = idx + 1;
  });

  const output = {
    meta: {
      source: 'skywind3000/ECDICT',
      levels: TARGET_LEVELS,
      counts: {
        cet6: levelWords.cet6.length,
        toefl: levelWords.toefl.length,
        ielts: levelWords.ielts.length,
        gre: levelWords.gre.length,
      },
      total: allWords.length,
      note: '从 ECDICT ecdict.csv 抓取，按 cet6/toefl/ielts/gre 标签筛选',
    },
    words: allWords,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✓ 词库已生成: ${OUTPUT_PATH}`);
  console.log(`  CET6: ${levelWords.cet6.length} 词`);
  console.log(`  TOEFL: ${levelWords.toefl.length} 词`);
  console.log(`  IELTS: ${levelWords.ielts.length} 词`);
  console.log(`  GRE: ${levelWords.gre.length} 词`);
  console.log(`  总计（去重后）: ${allWords.length} 词`);
}

// ===== 执行 =====

(async () => {
  try {
    await downloadCsv();
    const levelWords = await processCsv();
    generateOutput(levelWords);
    console.log('\n✅ 全部完成！');
  } catch (err) {
    console.error('❌ 出错:', err.message);
    process.exit(1);
  }
})();
