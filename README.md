# 不背单词 · WordWorld

一个面向英语考试词汇的本地单词学习网页，支持新词学习、间隔复习、生词收藏、词条拓展和多种主动回忆练习。

## 启动

Windows 用户双击 `启动学习页面.bat`，然后打开 `http://localhost:8000/index.html`。

也可以在项目目录运行：

```bash
python -m http.server 8000
```

再访问 `http://localhost:8000/index.html`。请通过本地服务器访问，不要直接双击 `index.html`，浏览器会阻止页面加载词库和 JavaScript 模块。

## 功能

- 四六级、考研、托福、雅思和 GRE 词汇范围
- 按顺序或完整乱序学习
- 认识卡片、拼写回忆、听音拼写和例句填空
- 忘记、困难、记住、简单四档间隔复习
- 收藏、生词本、签到、学习进度和本地学习记录导入导出
- 可点击查看词组搭配、派生、词形、词根及语义关系

学习记录保存在当前浏览器的本地存储中，不需要账号。

## 数据

运行所需的词库位于 `data/words-core.json` 和 `data/words-lexical.json`：核心词库先加载，搭配、派生、词形、词根和语义关系随后加载，适合移动网络环境。`data/words.json` 保留为完整词库兼容文件。数据来源和许可说明见 [`data/SOURCES.md`](data/SOURCES.md)。仓库不包含原始语料文件和本地历史词库备份；这些文件不是运行应用所需内容。

## 开发

项目使用原生 JavaScript ES modules，无需构建步骤。修改文件后刷新页面即可查看。词库校验脚本可通过 `npm run validate:words` 运行。
