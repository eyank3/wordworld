#!/usr/bin/env node
/**
 * 词库质量检查：用于每次更新 words.json 后快速发现结构错误、重复词和异常字段。
 * 只报告统计，不会修改词库。
 */
const fs = require('node:fs');
const path = require('node:path');

const file = path.resolve(__dirname, '..', 'data', 'words.json');
const errors = [];
let payload;
try {
  payload = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (error) {
  console.error(`无法读取词库：${error.message}`);
  process.exit(1);
}

if (!payload || !Array.isArray(payload.words)) errors.push('words 必须是数组');
const words = Array.isArray(payload?.words) ? payload.words : [];
const ids = new Set();
const spellings = new Set();
const stats = { examples: 0, collocations: 0, derivatives: 0, inflections: 0, semanticRelations: 0 };

for (const [index, word] of words.entries()) {
  if (!word || word.id == null || !String(word.word || '').trim()) {
    errors.push(`第 ${index + 1} 项缺少 id 或 word`);
    continue;
  }
  if (ids.has(String(word.id))) errors.push(`重复 id：${word.id}`);
  if (spellings.has(String(word.word).toLowerCase())) errors.push(`重复单词：${word.word}`);
  ids.add(String(word.id));
  spellings.add(String(word.word).toLowerCase());
  for (const key of Object.keys(stats)) {
    if (Array.isArray(word[key])) stats[key] += word[key].length;
    else if (word[key] != null) errors.push(`${word.word}.${key} 必须是数组`);
  }
  if (!Array.isArray(word.levels) || word.levels.length === 0) errors.push(`${word.word} 缺少词书标签`);
  if (!Array.isArray(word.definitions) || word.definitions.length === 0) errors.push(`${word.word} 缺少释义`);
}

console.log(`词库：${words.length} 词`);
console.log(`例句：${stats.examples} · 搭配：${stats.collocations} · 派生：${stats.derivatives} · 词形：${stats.inflections} · 近反义义项：${stats.semanticRelations}`);
console.log(`元数据版本：${payload?.meta?.integration?.version || '未标记'}`);

if (errors.length) {
  console.error(`发现 ${errors.length} 个结构问题：`);
  errors.slice(0, 30).forEach(error => console.error(`- ${error}`));
  if (errors.length > 30) console.error(`- 其余 ${errors.length - 30} 个问题未展开`);
  process.exit(1);
}
console.log('词库结构检查通过。');
