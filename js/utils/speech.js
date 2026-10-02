/**
 * ============================================
 * 语音发音工具 - 基于 Web Speech API
 * 支持美音 (en-US) 和英音 (en-GB)
 * ============================================
 */

// 缓存 SpeechSynthesis 实例
const synth = window.speechSynthesis || window.webkitSpeechSynthesis;

// 缓存语音列表（避免重复加载）
let voiceCache = null;

/**
 * 加载可用语音列表
 */
function loadVoices() {
  if (voiceCache) return voiceCache;
  voiceCache = synth ? synth.getVoices() : [];
  return voiceCache;
}

// Chrome 需要监听 voiceschanged 事件才能获取语音列表
if (synth) {
  synth.onvoiceschanged = () => {
    voiceCache = synth.getVoices();
  };
}

/**
 * 朗读文本
 * @param {string} text - 要朗读的文本
 * @param {string} lang - 语言代码：'us' → en-US, 'uk' → en-GB
 */
export function speak(text, lang = 'us') {
  if (!synth) {
    console.warn('当前浏览器不支持语音合成');
    return;
  }

  // 取消正在进行的朗读
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const langCode = lang === 'uk' ? 'en-GB' : 'en-US';
  utterance.lang = langCode;
  utterance.rate = 0.9;  // 稍慢便于听清
  utterance.pitch = 1;

  // 尝试匹配对应语言的语音
  const voices = loadVoices();
  const matchedVoice = voices.find(v => v.lang === langCode);
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  synth.speak(utterance);
}
