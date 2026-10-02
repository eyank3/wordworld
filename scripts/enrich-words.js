/**
 * ============================================
 * 词库数据补充脚本
 * 为 words.json 补充：词根、近义词、词组搭配
 * 数据源：
 *   - 词根：内置拉丁/希腊词根字典匹配
 *   - 近义/词组：Datamuse API（免费无 key）
 * ============================================
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, '..', 'data', 'words.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'words.json');
const PROGRESS_PATH = path.join(__dirname, '..', 'data', '.enrich-progress.json');

// ===== 拉丁/希腊词根字典 =====
// 格式: { root: meaning }，root 用正则匹配
const ROOTS_DICT = [
  // 前缀
  { pattern: '^ab', root: 'ab-', meaning: '离开，偏离' },
  { pattern: '^ad', root: 'ad-', meaning: '向，靠近' },
  { pattern: '^amb', root: 'amb-', meaning: '周围，两' },
  { pattern: '^ante', root: 'ante-', meaning: '前面，先' },
  { pattern: '^anti', root: 'anti-', meaning: '反对，反' },
  { pattern: '^ben(e)?', root: 'bene-', meaning: '好，善' },
  { pattern: '^bi', root: 'bi-', meaning: '二，双' },
  { pattern: '^circum', root: 'circum-', meaning: '环绕' },
  { pattern: '^com', root: 'com-', meaning: '共同，一起' },
  { pattern: '^con', root: 'con-', meaning: '共同，一起' },
  { pattern: '^contra', root: 'contra-', meaning: '反对，相反' },
  { pattern: '^de', root: 'de-', meaning: '向下，离开，去除' },
  { pattern: '^dis', root: 'dis-', meaning: '分开，否定' },
  { pattern: '^ex', root: 'ex-', meaning: '向外，出去' },
  { pattern: '^fore', root: 'fore-', meaning: '前面，预先' },
  { pattern: '^in', root: 'in-', meaning: '进入，内' },
  { pattern: '^inter', root: 'inter-', meaning: '在…之间' },
  { pattern: '^intro', root: 'intro-', meaning: '向内' },
  { pattern: '^mal', root: 'mal-', meaning: '坏，恶' },
  { pattern: '^multi', root: 'multi-', meaning: '多' },
  { pattern: '^non', root: 'non-', meaning: '不，非' },
  { pattern: '^ob', root: 'ob-', meaning: '反对，逆，遮蔽' },
  { pattern: '^omni', root: 'omni-', meaning: '全，总' },
  { pattern: '^out', root: 'out-', meaning: '超过，在外' },
  { pattern: '^over', root: 'over-', meaning: '过度，在上' },
  { pattern: '^peri', root: 'peri-', meaning: '周围' },
  { pattern: '^poly', root: 'poly-', meaning: '多' },
  { pattern: '^post', root: 'post-', meaning: '后' },
  { pattern: '^pre', root: 'pre-', meaning: '前，先' },
  { pattern: '^pro', root: 'pro-', meaning: '向前，在前' },
  { pattern: '^re', root: 're-', meaning: '回，再，向后' },
  { pattern: '^retro', root: 'retro-', meaning: '向后' },
  { pattern: '^se', root: 'se-', meaning: '分开，离开' },
  { pattern: '^semi', root: 'semi-', meaning: '半' },
  { pattern: '^sub', root: 'sub-', meaning: '在下面，次' },
  { pattern: '^super', root: 'super-', meaning: '在上，超' },
  { pattern: '^sur', root: 'sur-', meaning: '超过，在上' },
  { pattern: '^sym', root: 'sym-', meaning: '共同' },
  { pattern: '^syn', root: 'syn-', meaning: '共同，一起' },
  { pattern: '^trans', root: 'trans-', meaning: '横过，跨越' },
  { pattern: '^tri', root: 'tri-', meaning: '三' },
  { pattern: '^un', root: 'un-', meaning: '不，否定' },
  { pattern: '^under', root: 'under-', meaning: '在下面，不足' },
  { pattern: '^uni', root: 'uni-', meaning: '一，单' },
  { pattern: '^with', root: 'with-', meaning: '向后，反对' },

  // 核心词根
  { pattern: 'ac', root: 'ac', meaning: '尖，酸，锐利' },
  { pattern: 'acr', root: 'acr', meaning: '尖，酸，锐利' },
  { pattern: 'act', root: 'act', meaning: '做，行动' },
  { pattern: 'ag', root: 'ag', meaning: '做，驱使，行动' },
  { pattern: 'agr', root: 'agr', meaning: '田地，农业' },
  { pattern: 'alter', root: 'alter', meaning: '改变，其他' },
  { pattern: 'am', root: 'am', meaning: '爱，喜爱' },
  { pattern: 'anim', root: 'anim', meaning: '生命，精神，心灵' },
  { pattern: 'ann', root: 'ann', meaning: '年' },
  { pattern: 'apt', root: 'apt', meaning: '适合，适应' },
  { pattern: 'aqu', root: 'aqu', meaning: '水' },
  { pattern: 'arch', root: 'arch', meaning: '统治，首脑，古老' },
  { pattern: 'art', root: 'art', meaning: '艺术，技巧' },
  { pattern: 'aster', root: 'aster', meaning: '星' },
  { pattern: 'astro', root: 'astro', meaning: '星' },
  { pattern: 'aud', root: 'aud', meaning: '听' },
  { pattern: 'aug', root: 'aug', meaning: '增加，增大' },
  { pattern: 'auto', root: 'auto', meaning: '自己' },
  { pattern: 'bio', root: 'bio', meaning: '生命' },
  { pattern: 'brev', root: 'brev', meaning: '短' },
  { pattern: 'cad', root: 'cad', meaning: '落下' },
  { pattern: 'cap', root: 'cap', meaning: '拿，抓，容纳' },
  { pattern: 'capt', root: 'capt', meaning: '拿，抓' },
  { pattern: 'ced', root: 'ced', meaning: '走，让步' },
  { pattern: 'ceed', root: 'ceed', meaning: '走' },
  { pattern: 'cent', root: 'cent', meaning: '百' },
  { pattern: 'cern', root: 'cern', meaning: '区别，分辨' },
  { pattern: 'chron', root: 'chron', meaning: '时间' },
  { pattern: 'cid', root: 'cid', meaning: '落下，发生' },
  { pattern: 'cis', root: 'cis', meaning: '切，杀' },
  { pattern: 'cit', root: 'cit', meaning: '唤起，引用' },
  { pattern: 'civi', root: 'civi', meaning: '公民' },
  { pattern: 'claim', root: 'claim', meaning: '喊叫，声明' },
  { pattern: 'clar', root: 'clar', meaning: '清楚，明白' },
  { pattern: 'clin', root: 'clin', meaning: '倾斜' },
  { pattern: 'clos', root: 'clos', meaning: '关闭' },
  { pattern: 'cogn', root: 'cogn', meaning: '知道，认识' },
  { pattern: 'commun', root: 'commun', meaning: '共同，公共' },
  { pattern: 'cord', root: 'cord', meaning: '心' },
  { pattern: 'corpor', root: 'corpor', meaning: '身体' },
  { pattern: 'cosm', root: 'cosm', meaning: '宇宙，秩序' },
  { pattern: 'cracy', root: 'cracy', meaning: '统治' },
  { pattern: 'crat', root: 'crat', meaning: '统治者' },
  { pattern: 'cre', root: 'cre', meaning: '制造，生长' },
  { pattern: 'cred', root: 'cred', meaning: '相信，信任' },
  { pattern: 'cruc', root: 'cruc', meaning: '十字' },
  { pattern: 'cur', root: 'cur', meaning: '关心，运行' },
  { pattern: 'curs', root: 'curs', meaning: '跑' },
  { pattern: 'cycl', root: 'cycl', meaning: '圆，环' },
  { pattern: 'dec', root: 'dec', meaning: '十' },
  { pattern: 'dic', root: 'dic', meaning: '说，宣称' },
  { pattern: 'dict', root: 'dict', meaning: '说，宣称' },
  { pattern: 'doc', root: 'doc', meaning: '教，教导' },
  { pattern: 'domin', root: 'domin', meaning: '统治，控制' },
  { pattern: 'duc', root: 'duc', meaning: '引导，带领' },
  { pattern: 'dur', root: 'dur', meaning: '持续，坚硬' },
  { pattern: 'ego', root: 'ego', meaning: '我，自己' },
  { pattern: 'equ', root: 'equ', meaning: '平等，相等' },
  { pattern: 'err', root: 'err', meaning: '漫游，犯错' },
  { pattern: 'fac', root: 'fac', meaning: '做，制造' },
  { pattern: 'fact', root: 'fact', meaning: '做，制造' },
  { pattern: 'fall', root: 'fall', meaning: '错误，欺骗' },
  { pattern: 'fend', root: 'fend', meaning: '打击，防御' },
  { pattern: 'fer', root: 'fer', meaning: '带来，承受' },
  { pattern: 'fess', root: 'fess', meaning: '说，承认' },
  { pattern: 'fid', root: 'fid', meaning: '信任，信仰' },
  { pattern: 'fig', root: 'fig', meaning: '形成，塑造' },
  { pattern: 'fin', root: 'fin', meaning: '结束，界限' },
  { pattern: 'firm', root: 'firm', meaning: '坚定，稳固' },
  { pattern: 'flect', root: 'flect', meaning: '弯曲' },
  { pattern: 'flex', root: 'flex', meaning: '弯曲' },
  { pattern: 'flu', root: 'flu', meaning: '流动' },
  { pattern: 'form', root: 'form', meaning: '形状，形成' },
  { pattern: 'fort', root: 'fort', meaning: '强，力量' },
  { pattern: 'fract', root: 'fract', meaning: '打破，碎裂' },
  { pattern: 'frag', root: 'frag', meaning: '打破，碎裂' },
  { pattern: 'fug', root: 'fug', meaning: '逃，避开' },
  { pattern: 'fund', root: 'fund', meaning: '底部，基础' },
  { pattern: 'fus', root: 'fus', meaning: '倾注，熔合' },
  { pattern: 'gen', root: 'gen', meaning: '出生，产生，种类' },
  { pattern: 'geo', root: 'geo', meaning: '地球，土地' },
  { pattern: 'grad', root: 'grad', meaning: '步，级' },
  { pattern: 'graph', root: 'graph', meaning: '写，画，记录' },
  { pattern: 'grat', root: 'grat', meaning: '感激，高兴' },
  { pattern: 'grav', root: 'grav', meaning: '重' },
  { pattern: 'greg', root: 'greg', meaning: '群，聚集' },
  { pattern: 'habit', root: 'habit', meaning: '居住，习惯' },
  { pattern: 'hap', root: 'hap', meaning: '运气，机会' },
  { pattern: 'her', root: 'her', meaning: '黏附，继承' },
  { pattern: 'hes', root: 'hes', meaning: '黏附' },
  { pattern: 'hibit', root: 'hibit', meaning: '持有，拥有' },
  { pattern: 'hosp', root: 'hosp', meaning: '客人，主人' },
  { pattern: 'human', root: 'human', meaning: '人，人类' },
  { pattern: 'hum', root: 'hum', meaning: '低，卑，地' },
  { pattern: 'hydr', root: 'hydr', meaning: '水' },
  { pattern: 'ign', root: 'ign', meaning: '火' },
  { pattern: 'integr', root: 'integr', meaning: '完整' },
  { pattern: 'it', root: 'it', meaning: '走，行' },
  { pattern: 'ject', root: 'ject', meaning: '投掷，扔' },
  { pattern: 'join', root: 'join', meaning: '连接，结合' },
  { pattern: 'junct', root: 'junct', meaning: '连接' },
  { pattern: 'jur', root: 'jur', meaning: '发誓，法律' },
  { pattern: 'just', root: 'just', meaning: '公正' },
  { pattern: 'labor', root: 'labor', meaning: '劳动，工作' },
  { pattern: 'laps', root: 'laps', meaning: '滑落，流逝' },
  { pattern: 'lat', root: 'lat', meaning: '带来，承载' },
  { pattern: 'later', root: 'later', meaning: '边，侧面' },
  { pattern: 'lav', root: 'lav', meaning: '洗' },
  { pattern: 'lect', root: 'lect', meaning: '选择，收集' },
  { pattern: 'leg', root: 'leg', meaning: '法律，读，选择' },
  { pattern: 'lev', root: 'lev', meaning: '举起，轻' },
  { pattern: 'liber', root: 'liber', meaning: '自由' },
  { pattern: 'lig', root: 'lig', meaning: '绑，约束' },
  { pattern: 'lingu', root: 'lingu', meaning: '语言' },
  { pattern: 'liter', root: 'liter', meaning: '文字，字母' },
  { pattern: 'loc', root: 'loc', meaning: '地方，位置' },
  { pattern: 'log', root: 'log', meaning: '说话，思想，学科' },
  { pattern: 'logy', root: 'logy', meaning: '学科，理论' },
  { pattern: 'loqu', root: 'loqu', meaning: '说话' },
  { pattern: 'luc', root: 'luc', meaning: '光，照亮' },
  { pattern: 'lumin', root: 'lumin', meaning: '光' },
  { pattern: 'lud', root: 'lud', meaning: '玩耍，演戏' },
  { pattern: 'magn', root: 'magn', meaning: '大，伟大' },
  { pattern: 'man', root: 'man', meaning: '手，停留' },
  { pattern: 'mand', root: 'mand', meaning: '命令，要求' },
  { pattern: 'mani', root: 'mani', meaning: '手' },
  { pattern: 'mar', root: 'mar', meaning: '海' },
  { pattern: 'mater', root: 'mater', meaning: '母亲' },
  { pattern: 'medi', root: 'medi', meaning: '中间' },
  { pattern: 'memor', root: 'memor', meaning: '记忆' },
  { pattern: 'ment', root: 'ment', meaning: '心思，精神' },
  { pattern: 'merc', root: 'merc', meaning: '贸易，报酬' },
  { pattern: 'meter', root: 'meter', meaning: '测量' },
  { pattern: 'migr', root: 'migr', meaning: '迁移' },
  { pattern: 'milit', root: 'milit', meaning: '士兵，战斗' },
  { pattern: 'min', root: 'min', meaning: '小，少，突出' },
  { pattern: 'mir', root: 'mir', meaning: '惊奇，注视' },
  { pattern: 'misc', root: 'misc', meaning: '混合' },
  { pattern: 'mit', root: 'mit', meaning: '送，发出' },
  { pattern: 'mob', root: 'mob', meaning: '动，移动' },
  { pattern: 'mod', root: 'mod', meaning: '方式，尺度' },
  { pattern: 'mon', root: 'mon', meaning: '忠告，提醒' },
  { pattern: 'mor', root: 'mor', meaning: '道德，习惯' },
  { pattern: 'morph', root: 'morph', meaning: '形状，形态' },
  { pattern: 'mort', root: 'mort', meaning: '死亡' },
  { pattern: 'mot', root: 'mot', meaning: '动，移动' },
  { pattern: 'muni', root: 'muni', meaning: '公共，服务' },
  { pattern: 'mut', root: 'mut', meaning: '改变，交换' },
  { pattern: 'nat', root: 'nat', meaning: '出生' },
  { pattern: 'nav', root: 'nav', meaning: '船，航行' },
  { pattern: 'nect', root: 'nect', meaning: '连接' },
  { pattern: 'neg', root: 'neg', meaning: '否认，否定' },
  { pattern: 'nihil', root: 'nihil', meaning: '无，虚无' },
  { pattern: 'nomin', root: 'nomin', meaning: '名字' },
  { pattern: 'norm', root: 'norm', meaning: '规范，标准' },
  { pattern: 'not', root: 'not', meaning: '标记，知道' },
  { pattern: 'nov', root: 'nov', meaning: '新' },
  { pattern: 'numer', root: 'numer', meaning: '数' },
  { pattern: 'nutri', root: 'nutri', meaning: '营养' },
  { pattern: 'onym', root: 'onym', meaning: '名字' },
  { pattern: 'oper', root: 'oper', meaning: '工作，操作' },
  { pattern: 'opt', root: 'opt', meaning: '选择，希望' },
  { pattern: 'ordin', root: 'ordin', meaning: '秩序，顺序' },
  { pattern: 'org', root: 'org', meaning: '组织，器官' },
  { pattern: 'pac', root: 'pac', meaning: '和平' },
  { pattern: 'pass', root: 'pass', meaning: '通过，忍受' },
  { pattern: 'pat', root: 'pat', meaning: '感情，忍受' },
  { pattern: 'path', root: 'path', meaning: '感情，疾病' },
  { pattern: 'patri', root: 'patri', meaning: '父亲，祖国' },
  { pattern: 'ped', root: 'ped', meaning: '脚，儿童' },
  { pattern: 'pel', root: 'pel', meaning: '驱使，推动' },
  { pattern: 'pend', root: 'pend', meaning: '悬挂，衡量' },
  { pattern: 'phil', root: 'phil', meaning: '爱，喜爱' },
  { pattern: 'phob', root: 'phob', meaning: '恐惧' },
  { pattern: 'phon', root: 'phon', meaning: '声音' },
  { pattern: 'photo', root: 'photo', meaning: '光' },
  { pattern: 'plic', root: 'plic', meaning: '折叠，弯' },
  { pattern: 'pon', root: 'pon', meaning: '放置' },
  { pattern: 'popul', root: 'popul', meaning: '人民' },
  { pattern: 'port', root: 'port', meaning: '搬运，携带' },
  { pattern: 'pos', root: 'pos', meaning: '放置' },
  { pattern: 'pot', root: 'pot', meaning: '能力，力量' },
  { pattern: 'preci', root: 'preci', meaning: '价值' },
  { pattern: 'press', root: 'press', meaning: '压' },
  { pattern: 'prim', root: 'prim', meaning: '第一，首要' },
  { pattern: 'pris', root: 'pris', meaning: '抓住，取' },
  { pattern: 'priv', root: 'priv', meaning: '私人，剥夺' },
  { pattern: 'prob', root: 'prob', meaning: '验证，测试' },
  { pattern: 'proach', root: 'proach', meaning: '靠近' },
  { pattern: 'prov', root: 'prov', meaning: '证明，测试' },
  { pattern: 'psych', root: 'psych', meaning: '心理，灵魂' },
  { pattern: 'punct', root: 'punct', meaning: '刺，点' },
  { pattern: 'pur', root: 'pur', meaning: '纯，清' },
  { pattern: 'put', root: 'put', meaning: '思考，计算' },
  { pattern: 'quest', root: 'quest', meaning: '寻求，询问' },
  { pattern: 'quir', root: 'quir', meaning: '寻求' },
  { pattern: 'rap', root: 'rap', meaning: '夺取，抓' },
  { pattern: 'rat', root: 'rat', meaning: '计算，推理' },
  { pattern: 'rect', root: 'rect', meaning: '直，正' },
  { pattern: 'reg', root: 'reg', meaning: '统治，引导' },
  { pattern: 'rid', root: 'rid', meaning: '笑' },
  { pattern: 'rog', root: 'rog', meaning: '要求，询问' },
  { pattern: 'rupt', root: 'rupt', meaning: '断裂' },
  { pattern: 'sacr', root: 'sacr', meaning: '神圣' },
  { pattern: 'sanct', root: 'sanct', meaning: '神圣' },
  { pattern: 'sci', root: 'sci', meaning: '知道' },
  { pattern: 'scrib', root: 'scrib', meaning: '写' },
  { pattern: 'script', root: 'script', meaning: '写' },
  { pattern: 'sect', root: 'sect', meaning: '切割' },
  { pattern: 'sed', root: 'sed', meaning: '坐' },
  { pattern: 'sens', root: 'sens', meaning: '感觉' },
  { pattern: 'sent', root: 'sent', meaning: '感觉，发送' },
  { pattern: 'sequ', root: 'sequ', meaning: '跟随' },
  { pattern: 'serv', root: 'serv', meaning: '服务，保持' },
  { pattern: 'sign', root: 'sign', meaning: '标记，信号' },
  { pattern: 'simil', root: 'simil', meaning: '相似' },
  { pattern: 'sist', root: 'sist', meaning: '站立' },
  { pattern: 'soci', root: 'soci', meaning: '同伴，联合' },
  { pattern: 'sol', root: 'sol', meaning: '单独，太阳' },
  { pattern: 'solv', root: 'solv', meaning: '松开，解决' },
  { pattern: 'somn', root: 'somn', meaning: '睡眠' },
  { pattern: 'soph', root: 'soph', meaning: '智慧' },
  { pattern: 'spec', root: 'spec', meaning: '看' },
  { pattern: 'spect', root: 'spect', meaning: '看' },
  { pattern: 'sper', root: 'sper', meaning: '希望' },
  { pattern: 'spher', root: 'spher', meaning: '球' },
  { pattern: 'spir', root: 'spir', meaning: '呼吸' },
  { pattern: 'stab', root: 'stab', meaning: '稳固' },
  { pattern: 'stat', root: 'stat', meaning: '站立，状态' },
  { pattern: 'strict', root: 'strict', meaning: '束缚，拉紧' },
  { pattern: 'stru', root: 'stru', meaning: '建造' },
  { pattern: 'sume', root: 'sume', meaning: '拿取，消耗' },
  { pattern: 'sur', root: 'sur', meaning: '确定，可靠' },
  { pattern: 'tact', root: 'tact', meaning: '接触' },
  { pattern: 'tain', root: 'tain', meaning: '保持，持有' },
  { pattern: 'techn', root: 'techn', meaning: '技术，技艺' },
  { pattern: 'tect', root: 'tect', meaning: '遮蔽，建造' },
  { pattern: 'tempor', root: 'tempor', meaning: '时间' },
  { pattern: 'tempt', root: 'tempt', meaning: '尝试' },
  { pattern: 'tend', root: 'tend', meaning: '伸展，趋向' },
  { pattern: 'tens', root: 'tens', meaning: '伸展，张力' },
  { pattern: 'tent', root: 'tent', meaning: '伸展，尝试' },
  { pattern: 'termin', root: 'termin', meaning: '界限，终点' },
  { pattern: 'terr', root: 'terr', meaning: '土地，恐吓' },
  { pattern: 'test', root: 'test', meaning: '测试，见证' },
  { pattern: 'the', root: 'the', meaning: '神' },
  { pattern: 'theo', root: 'theo', meaning: '神' },
  { pattern: 'therm', root: 'therm', meaning: '热' },
  { pattern: 'tim', root: 'tim', meaning: '恐惧，害怕' },
  { pattern: 'toler', root: 'toler', meaning: '忍受' },
  { pattern: 'tom', root: 'tom', meaning: '切割' },
  { pattern: 'tort', root: 'tort', meaning: '扭曲' },
  { pattern: 'tract', root: 'tract', meaning: '拉，拖' },
  { pattern: 'trib', root: 'trib', meaning: '给予，赋予' },
  { pattern: 'turb', root: 'turb', meaning: '扰乱' },
  { pattern: 'typ', root: 'typ', meaning: '类型，典型' },
  { pattern: 'uni', root: 'uni', meaning: '一，统一' },
  { pattern: 'urb', root: 'urb', meaning: '城市' },
  { pattern: 'vac', root: 'vac', meaning: '空' },
  { pattern: 'vad', root: 'vad', meaning: '走' },
  { pattern: 'val', root: 'val', meaning: '价值，强壮' },
  { pattern: 'vari', root: 'vari', meaning: '变化' },
  { pattern: 'ven', root: 'ven', meaning: '来' },
  { pattern: 'vent', root: 'vent', meaning: '来' },
  { pattern: 'ver', root: 'ver', meaning: '真实' },
  { pattern: 'verb', root: 'verb', meaning: '词，动词' },
  { pattern: 'vers', root: 'vers', meaning: '转向' },
  { pattern: 'vert', root: 'vert', meaning: '转向' },
  { pattern: 'vi', root: 'vi', meaning: '道路' },
  { pattern: 'via', root: 'via', meaning: '道路' },
  { pattern: 'vic', root: 'vic', meaning: '替代' },
  { pattern: 'vid', root: 'vid', meaning: '看' },
  { pattern: 'vis', root: 'vis', meaning: '看' },
  { pattern: 'vit', root: 'vit', meaning: '生命' },
  { pattern: 'viv', root: 'viv', meaning: '活，生命' },
  { pattern: 'voc', root: 'voc', meaning: '声音，叫' },
  { pattern: 'vok', root: 'vok', meaning: '叫喊，召唤' },
  { pattern: 'volv', root: 'volv', meaning: '卷，转' },
  { pattern: 'wis', root: 'wis', meaning: '知道，智慧' },
  { pattern: 'wit', root: 'wit', meaning: '知道，理解' },

  // 后缀
  { pattern: 'able$', root: '-able', meaning: '能…的，可…的' },
  { pattern: 'ible$', root: '-ible', meaning: '能…的' },
  { pattern: 'tion$', root: '-tion', meaning: '动作，状态（名词后缀）' },
  { pattern: 'sion$', root: '-sion', meaning: '动作，状态（名词后缀）' },
  { pattern: 'ment$', root: '-ment', meaning: '行为，结果（名词后缀）' },
  { pattern: 'ness$', root: '-ness', meaning: '状态，性质（名词后缀）' },
  { pattern: 'ity$', root: '-ity', meaning: '性质，状态（名词后缀）' },
  { pattern: 'ous$', root: '-ous', meaning: '有…特性的（形容词后缀）' },
  { pattern: 'ful$', root: '-ful', meaning: '充满…的（形容词后缀）' },
  { pattern: 'less$', root: '-less', meaning: '无…的（形容词后缀）' },
  { pattern: 'ize$', root: '-ize', meaning: '使…化（动词后缀）' },
  { pattern: 'ify$', root: '-ify', meaning: '使…成为（动词后缀）' },
  { pattern: 'ly$', root: '-ly', meaning: '以…方式（副词后缀）' },
  { pattern: 'er$', root: '-er', meaning: '做…的人/物（名词后缀）' },
  { pattern: 'or$', root: '-or', meaning: '做…的人/物（名词后缀）' },
  { pattern: 'ist$', root: '-ist', meaning: '从事…的人（名词后缀）' },
  { pattern: 'ism$', root: '-ism', meaning: '主义，学说（名词后缀）' },
  { pattern: 'al$', root: '-al', meaning: '关于…的（形容词后缀）' },
  { pattern: 'ic$', root: '-ic', meaning: '与…有关的（形容词后缀）' },
];

// 预编译词根正则
const compiledRoots = ROOTS_DICT.map(r => ({
  ...r,
  regex: new RegExp(r.pattern, 'i'),
}));

/**
 * 匹配单词的词根
 */
function matchRoots(word) {
  const lower = word.toLowerCase();
  const found = [];
  const seen = new Set();
  for (const r of compiledRoots) {
    if (r.regex.test(lower) && !seen.has(r.root)) {
      seen.add(r.root);
      found.push({ root: r.root, meaning: r.meaning });
    }
  }
  // 最多返回3个最相关的词根
  return found.slice(0, 3);
}

// ===== Datamuse API =====

/**
 * 查询单个词的同义词
 */
function fetchSynonyms(word) {
  return new Promise((resolve) => {
    const url = `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=5`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const arr = JSON.parse(data);
          resolve(arr.map(item => ({ word: item.word, meaning: '' })));
        } catch {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

/**
 * 查询单个词的相关词/词组搭配
 * 使用 rel_trg（触发词）和 rel_jjb（形容词-名词搭配）
 */
function fetchCollocations(word) {
  return new Promise((resolve) => {
    const url = `https://api.datamuse.com/words?rel_trg=${encodeURIComponent(word)}&max=5`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const arr = JSON.parse(data);
          // 转换为词组格式
          resolve(arr.map(item => ({
            phrase: `${word} ${item.word}`,
            meaning: '',
          })));
        } catch {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

/**
 * 查询单个词的常见搭配短语
 * 使用 rel_com 查找复合词/词组
 */
function fetchPhrases(word) {
  return new Promise((resolve) => {
    const url = `https://api.datamuse.com/words?rel_com=${encodeURIComponent(word)}&max=5`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const arr = JSON.parse(data);
          resolve(arr.map(item => ({
            phrase: `${word} ${item.word}`,
            meaning: '',
          })));
        } catch {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

// ===== 批量处理 =====

/**
 * 延迟函数
 */
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * 批量并发请求（每批5个，批间200ms间隔）
 */
async function batchProcess(words, startIdx, batchSize, processFn, label) {
  for (let i = startIdx; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    await Promise.all(batch.map((w, j) => processFn(w, i + j)));
    // 进度报告
    if ((i / batchSize) % 10 === 0) {
      console.log(`  ${label}: ${i}/${words.length} (${(i / words.length * 100).toFixed(1)}%)`);
    }
    await sleep(200);
  }
}

// ===== 主流程 =====

async function main() {
  // 加载词库
  const data = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));
  const words = data.words;
  console.log(`加载词库: ${words.length} 词`);

  // 加载进度
  let progress = { synonymsDone: 0, collocationsDone: 0, rootsDone: 0 };
  if (fs.existsSync(PROGRESS_PATH)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'));
    console.log(`恢复进度: synonyms=${progress.synonymsDone}, collocations=${progress.collocationsDone}, roots=${progress.rootsDone}`);
  }

  // 1. 补充词根（本地匹配，快速）
  if (progress.rootsDone < words.length) {
    console.log('\n--- 补充词根 ---');
    for (let i = progress.rootsDone; i < words.length; i++) {
      words[i].roots = matchRoots(words[i].word);
    }
    progress.rootsDone = words.length;
    fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress));
    const withRoots = words.filter(w => w.roots && w.roots.length > 0).length;
    console.log(`✓ 词根匹配完成: ${withRoots}/${words.length} 词有词根`);
  }

  // 2. 补充近义词（Datamuse API）
  if (progress.synonymsDone < words.length) {
    console.log('\n--- 补充近义词（Datamuse API）---');
    await batchProcess(
      words,
      progress.synonymsDone,
      5,
      async (w, idx) => {
        w.synonyms = await fetchSynonyms(w.word);
      },
      '近义词'
    );
    progress.synonymsDone = words.length;
    fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress));
    // 保存中间结果
    data.words = words;
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
    const withSyn = words.filter(w => w.synonyms && w.synonyms.length > 0).length;
    console.log(`✓ 近义词补充完成: ${withSyn}/${words.length} 词有近义`);
  }

  // 3. 补充词组搭配（Datamuse API）
  if (progress.collocationsDone < words.length) {
    console.log('\n--- 补充词组搭配（Datamuse API）---');
    await batchProcess(
      words,
      progress.collocationsDone,
      5,
      async (w, idx) => {
        // 同时查询触发词和复合词
        const [trg, com] = await Promise.all([
          fetchCollocations(w.word),
          fetchPhrases(w.word),
        ]);
        // 合并去重
        const seen = new Set();
        w.collocations = [...com, ...trg].filter(c => {
          if (seen.has(c.phrase)) return false;
          seen.add(c.phrase);
          return true;
        }).slice(0, 5);
      },
      '词组搭配'
    );
    progress.collocationsDone = words.length;
    fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress));
    const withCol = words.filter(w => w.collocations && w.collocations.length > 0).length;
    console.log(`✓ 词组搭配补充完成: ${withCol}/${words.length} 词有词组`);
  }

  // 保存最终结果
  data.words = words;
  // 更新 meta
  data.meta.enriched = true;
  data.meta.enrichmentSources = {
    roots: '内置拉丁/希腊词根字典',
    synonyms: 'Datamuse API (rel_syn)',
    collocations: 'Datamuse API (rel_com + rel_trg)',
  };
  data.meta.stats = {
    withRoots: words.filter(w => w.roots && w.roots.length > 0).length,
    withSynonyms: words.filter(w => w.synonyms && w.synonyms.length > 0).length,
    withCollocations: words.filter(w => w.collocations && w.collocations.length > 0).length,
    withDerivatives: words.filter(w => w.derivatives && w.derivatives.length > 0).length,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');

  // 清理进度文件
  if (fs.existsSync(PROGRESS_PATH)) fs.unlinkSync(PROGRESS_PATH);

  console.log('\n===== 补充完成 =====');
  console.log(`总词数: ${words.length}`);
  console.log(`有词根: ${data.meta.stats.withRoots} (${(data.meta.stats.withRoots / words.length * 100).toFixed(1)}%)`);
  console.log(`有近义: ${data.meta.stats.withSynonyms} (${(data.meta.stats.withSynonyms / words.length * 100).toFixed(1)}%)`);
  console.log(`有词组: ${data.meta.stats.withCollocations} (${(data.meta.stats.withCollocations / words.length * 100).toFixed(1)}%)`);
  console.log(`有派生: ${data.meta.stats.withDerivatives} (${(data.meta.stats.withDerivatives / words.length * 100).toFixed(1)}%)`);
}

main().catch(err => {
  console.error('❌ 出错:', err);
  process.exit(1);
});
