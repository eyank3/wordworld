// Reproducible offline build. Sources live in data/sources; never infer derivation by suffix.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const data = JSON.parse(read('data/words.json'));
const original = read('data/words.json');
const priorData = fs.existsSync(path.join(root, 'data/words.before-integration.json')) ? JSON.parse(read('data/words.before-integration.json')) : null;
const priorRoots = new Map((priorData?.words || []).map(w => [w.id, w.roots || []]));
const entries = {}, synsets = {}, senses = new Map();
for (const file of fs.readdirSync(path.join(root, 'data/sources/oewn'))) {
  if (!file.endsWith('.json') || file === 'frames.json') continue;
  Object.assign(file.startsWith('entries-') ? entries : synsets, JSON.parse(read('data/sources/oewn/' + file)));
}
for (const [word, parts] of Object.entries(entries)) for (const [pos, entry] of Object.entries(parts)) {
  for (const sense of entry.sense || []) senses.set(sense.id, { word, pos: pos[0], ...sense });
}
const parseCSV = line => {
  let quoted = false, value = ''; const fields = [];
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted;
    } else if (line[i] === ',' && !quoted) { fields.push(value); value = ''; }
    else value += line[i];
  }
  return [...fields, value];
};
const dictionary = new Map();
for (const line of read('data/ecdict.csv').split(/\r?\n/).slice(1)) {
  const f = parseCSV(line);
  if (f[0]) dictionary.set(f[0].toLowerCase(), { translation: f[3] || '', exchange: f[10] || '' });
}
const gloss = (word, pos) => {
  const lines = (dictionary.get(word.toLowerCase())?.translation || '').replace(/\\n/g, '\n').split('\n');
  const pattern = { n: /^n\./, v: /^(vt|vi|v)\./, a: /^(a|adj)\./, s: /^(a|adj)\./, r: /^adv\./ }[pos];
  const line = pos ? lines.find(s => pattern?.test(s)) : lines[0];
  return (line || '').replace(/^(vt|vi|v|n|adj|a|adv)\.\s*/, '');
};
const rank = new Map(read('data/sources/google-10000-english.txt').trim().split(/\r?\n/).map((w, i) => [w, i + 1]));
const family = new Map();
const connect = (a, b) => { if (!family.has(a)) family.set(a, new Set()); family.get(a).add(b); };
for (const sense of senses.values()) for (const target of sense.derivation || []) {
  if (senses.has(target)) { connect(sense.id, target); connect(target, sense.id); }
}
const phraseIndex = new Map(data.words.map(w => [w.word.toLowerCase(), []]));
for (const [phrase] of dictionary) {
  const tokens = phrase.split(/\s+/);
  if (tokens.length < 2 || tokens.length > 7 || !/^[a-z][a-z .'-]+$/.test(phrase)) continue;
  for (const token of new Set(tokens)) if (phraseIndex.has(token)) {
    const meaning = gloss(phrase);
    if (meaning && /[\u4e00-\u9fff]/.test(meaning)) phraseIndex.get(token).push({ phrase, meaning, source: 'ECDICT', status: 'dictionary-attested', examEvidence: null });
  }
}
const labels = { n: 'n.', v: 'v.', a: 'adj.', s: 'adj.', r: 'adv.' };
const unique = items => [...new Map(items.map(x => [x.word + '|' + x.pos, x])).values()];
const order = (a, b) => (rank.get(a.word) || 100001) - (rank.get(b.word) || 100001) || a.word.localeCompare(b.word);
for (const word of data.words) {
  const lemma = word.word.toLowerCase();
  const own = Object.values(entries[lemma] || {}).flatMap(e => e.sense || []);
  const derived = [], relations = [], examples = [];
  for (const sense of own) {
    const syn = synsets[sense.synset];
    for (const example of syn?.example || []) {
      const text = typeof example === 'string' ? example : example?.text;
      if (text && text.length >= 8 && text.length <= 240) examples.push({ en: text.trim(), zh: '', source: 'OEWN-2025' });
    }
    for (const target of family.get(sense.id) || []) {
      const d = senses.get(target);
      if (d.word.toLowerCase() !== lemma) derived.push({ word: d.word, pos: labels[d.pos] || d.pos, meaning: gloss(d.word, d.pos), definition: synsets[d.synset]?.definition?.[0] || '', source: 'OEWN-2025', senseId: target, relation: 'derivation' });
    }
    if (!syn) continue;
    relations.push({ senseId: sense.id, pos: labels[syn.partOfSpeech] || syn.partOfSpeech, definition: syn.definition.join('; '), source: 'OEWN-2025', synonyms: syn.members.filter(m => typeof m === 'string' && m.toLowerCase() !== lemma).map(m => ({ word: m, meaning: gloss(m, syn.partOfSpeech) })).filter(x => x.word && x.word !== 'undefined').slice(0, 6), antonyms: (sense.antonym || []).map(id => senses.get(id)).filter(t => t && t.word && t.word !== 'undefined').map(t => ({ word: t.word, meaning: gloss(t.word, t.pos) })) });
  }
  word.derivatives = unique(derived).sort(order);
  word.semanticRelations = relations;
  word.examples = [...new Map(examples.map(example => [example.en.toLowerCase(), example])).values()].slice(0, 2);
  word.inflections = [];
  const names = { p: '过去式', d: '过去分词', i: '现在分词', '3': '第三人称单数', s: '复数', r: '比较级', t: '最高级' };
  for (const part of (dictionary.get(lemma)?.exchange || '').split('/')) {
    const [key, value] = part.split(':');
    if (names[key] && value) for (const form of value.split('|')) {
      const existing = word.inflections.find(f => f.word === form);
      if (existing) existing.labels.push(names[key]);
      else word.inflections.push({ word: form, labels: [names[key]], source: 'ECDICT-exchange' });
    }
  }
  word.collocations = (phraseIndex.get(lemma) || []).sort((a,b) => a.phrase.length - b.phrase.length || a.phrase.localeCompare(b.phrase)).slice(0, 8);
  word.frequency = { rank: rank.get(lemma) || null, source: 'google-10000-english', scope: 'general-web', examFrequency: null };
  word.synonyms = [];
  word.roots = priorRoots.get(word.id) || [];
}
const stats = Object.fromEntries(['examples', 'derivatives', 'inflections', 'collocations', 'semanticRelations'].map(k => [k, data.words.filter(w => w[k].length).length]));
data.meta.integration = { version: 3, sources: ['ECDICT', 'OEWN-2025', 'google-10000-english'], frequencySha256: crypto.createHash('sha256').update(read('data/sources/google-10000-english.txt')).digest('hex'), stats, note: 'Dictionary-attested phrases are not exam-frequency claims. Examples are dictionary-attested English sentences; missing Chinese translations remain empty.' };
const backup = path.join(root, 'data', 'words.before-integration.json');
if (!fs.existsSync(backup)) fs.copyFileSync(path.join(root, 'data/words.json'), backup);
const output = JSON.stringify(data, null, 2);
JSON.parse(output);
fs.writeFileSync(path.join(root, 'data/words.json'), output);
console.log(JSON.stringify({ total: data.words.length, ...stats, frequency: data.words.filter(w => w.frequency.rank).length }, null, 2));
