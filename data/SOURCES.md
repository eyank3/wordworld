# 词库来源

- 中文释义、完整短语、词形：ECDICT，https://github.com/skywind3000/ECDICT 。只有整条短语释义才能用于搭配，不拼接单词翻译。
- 派生及分义项近反义：Open English WordNet 2025，https://github.com/globalwordnet/english-wordnet ，CC BY 4.0。署名：John P. McCrae 等 Open English WordNet 贡献者。本项目筛选并转换数据，中文译义来自 ECDICT。发布源：https://en-word.net/static/english-wordnet-2025-json.zip 。许可证：https://creativecommons.org/licenses/by/4.0/ 。
- 通用词频：first20hours/google-10000-english，https://github.com/first20hours/google-10000-english ，源自 Peter Norvig 对 Google 网页语料的统计。许可证见 sources/google-frequency-LICENSE.md。
- 英文例句：Open English WordNet 2025 的义项例句。当前例句保留英文原文；没有可靠中文译文时明确显示“暂无人工译文”，不自动生成翻译。

词典收录不等于高频搭配，也不等于考试常考。当前没有试卷频次数据，不显示“常考”标签。词频未命中用 null 表示，不代表罕见。派生依据词汇关系，不猜测后缀；缺失词性不强行补齐。旧版随机词组及未经证实的词根保存在备份中。

Wiktextract/compact-dictionaries 尚未导入；轻量数据缺少足够的派生关系和词形标签。当前 SRS 使用本项目的四档反馈算法，数据版本为 v2；尚未接入 Anki/FSRS，未复制这些应用代码。

## 重建

运行 node scripts/integrate-dictionaries.cjs。需要 data/ecdict.csv、data/sources/oewn/*.json、data/sources/google-10000-english.txt。保留首次整合前的 words.before-integration.json；重建不改变 word id，也不改写学习记录。完成后运行 npm run validate:words 检查重复 id、缺少释义和字段类型。
