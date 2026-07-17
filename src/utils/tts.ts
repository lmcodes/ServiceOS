import { VoiceSettings } from '@/types/firestore';

const TH_LETTER_MAP: Record<string, string> = {
  A: 'เอ', B: 'บี', C: 'ซี', D: 'ดี', E: 'อี', F: 'เอฟ', G: 'จี', H: 'เอช', I: 'ไอ',
  J: 'เจ', K: 'เค', L: 'แอล', M: 'เอ็ม', N: 'เอ็น', O: 'โอ', P: 'พี', Q: 'คิว', R: 'อาร์',
  S: 'เอส', T: 'ที', U: 'ยู', V: 'วี', W: 'ดับเบิลยู', X: 'เอ็กซ์', Y: 'วาย', Z: 'ซี'
};

const TH_DIGIT_MAP: Record<string, string> = {
  '0': 'ศูนย์', '1': 'หนึ่ง', '2': 'สอง', '3': 'สาม', '4': 'สี่',
  '5': 'ห้า', '6': 'หก', '7': 'เจ็ด', '8': 'แปด', '9': 'เก้า'
};

function formatQueueNumberForSpeech(number: string, lang: string): string {
  const isThai = lang.toLowerCase().startsWith('th');
  const chars = number.toUpperCase().split('');
  
  if (isThai) {
    const phoneticChars = chars.map(c => {
      if (TH_LETTER_MAP[c]) return TH_LETTER_MAP[c];
      if (TH_DIGIT_MAP[c]) return TH_DIGIT_MAP[c];
      return c;
    });
    return phoneticChars.join(' ');
  }
  
  return chars.join(' ');
}

interface QueueTask {
  text: string;
  settings: VoiceSettings;
}

const audioQueue: QueueTask[] = [];
let isPlaying = false;

/**
 * Main function to push a ticket announcement to the playback queue
 */
export function speakQueue(ticketNumber: string, counterName: string, settings: VoiceSettings): void {
  if (!settings || !settings.ttsEnabled) return;

  // Format template
  let text = settings.ttsTemplate || 'หมายเลข {{number}} เชิญที่ช่องบริการ {{counter}}';
  
  const formattedNumber = formatQueueNumberForSpeech(ticketNumber, settings.ttsLanguage);
  
  text = text.replace('{{number}}', formattedNumber);
  text = text.replace('{{counter}}', counterName);

  // Push to queue
  audioQueue.push({ text, settings });
  
  // Trigger queue processing
  processQueue();
}

/**
 * Sequentially process tasks in the audio queue
 */
async function processQueue(): Promise<void> {
  if (isPlaying) return;
  if (audioQueue.length === 0) return;

  isPlaying = true;
  const task = audioQueue.shift();

  if (task) {
    const repeat = Math.max(1, task.settings.repeatCount || 1);
    for (let i = 0; i < repeat; i++) {
      try {
        await playSpeech(task.text, task.settings);
      } catch (error) {
        console.error('[TTS] Failed to play announcement:', error);
      }
    }
  }

  isPlaying = false;
  // Proceed with next task
  processQueue();
}

/**
 * Route to corresponding speech synthesis engine
 */
async function playSpeech(text: string, settings: VoiceSettings): Promise<void> {
  const engine = settings.ttsEngine || 'browser';
  
  switch (engine) {
    case 'google-cloud':
      await playSpeechGoogle(text, settings);
      break;
    case 'openai':
      await playSpeechOpenAI(text, settings);
      break;
    case 'custom-api':
      await playSpeechCustom(text, settings);
      break;
    case 'browser':
    default:
      await playSpeechBrowser(text, settings);
      break;
  }
}

/**
 * 1. Browser SpeechSynthesis Engine
 */
function playSpeechBrowser(text: string, settings: VoiceSettings): Promise<void> {
  return new Promise((resolve, reject) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      reject(new Error('Browser SpeechSynthesis is not supported'));
      return;
    }

    // Cancel any active speechSynthesis before speaking
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = settings.ttsLanguage || 'th-TH';
    utterance.volume = settings.ttsVolume ?? 1.0;

    if (settings.ttsVoice) {
      const voices = synth.getVoices();
      const voice = voices.find(v => v.name === settings.ttsVoice || v.lang === settings.ttsLanguage);
      if (voice) {
        utterance.voice = voice;
      }
    }

    utterance.onend = () => {
      resolve();
    };
    
    utterance.onerror = (e) => {
      reject(e);
    };

    synth.speak(utterance);
  });
}

/**
 * 2. Google Cloud Text-to-Speech Engine
 */
async function playSpeechGoogle(text: string, settings: VoiceSettings): Promise<void> {
  const apiKey = settings.ttsApiKey;
  if (!apiKey) {
    throw new Error('Google Cloud TTS API Key is missing');
  }

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: settings.ttsLanguage || 'th-TH',
        name: settings.ttsVoice || 'th-TH-Standard-A',
      },
      audioConfig: {
        audioEncoding: 'MP3',
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Google Cloud TTS request failed');
  }

  const data = await response.json();
  if (!data.audioContent) {
    throw new Error('No audio content returned from Google Cloud TTS');
  }

  await playAudioBase64(data.audioContent, settings.ttsVolume);
}

/**
 * 3. OpenAI TTS Engine
 */
async function playSpeechOpenAI(text: string, settings: VoiceSettings): Promise<void> {
  const apiKey = settings.ttsApiKey;
  if (!apiKey) {
    throw new Error('OpenAI API Key is missing');
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: settings.ttsVoice || 'alloy',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'OpenAI TTS request failed');
  }

  const blob = await response.blob();
  await playAudioBlob(blob, settings.ttsVolume);
}

/**
 * 4. Custom API Engine
 */
async function playSpeechCustom(text: string, settings: VoiceSettings): Promise<void> {
  if (!settings.ttsCustomUrl) {
    throw new Error('Custom API URL is missing');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (settings.ttsApiKey) {
    headers['Authorization'] = `Bearer ${settings.ttsApiKey}`;
  }

  const response = await fetch(settings.ttsCustomUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      text,
      language: settings.ttsLanguage,
      voice: settings.ttsVoice
    }),
  });

  if (!response.ok) {
    throw new Error(`Custom API TTS request failed with status: ${response.status}`);
  }

  const blob = await response.blob();
  await playAudioBlob(blob, settings.ttsVolume);
}

/**
 * Play audio from base64 string
 */
function playAudioBase64(base64: string, volume: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes.buffer], { type: 'audio/mp3' });
      playAudioBlob(blob, volume).then(resolve).catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Play audio from Blob
 */
function playAudioBlob(blob: Blob, volume: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.volume = volume ?? 1.0;
    
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    
    audio.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    
    audio.play().catch((err) => {
      URL.revokeObjectURL(url);
      reject(err);
    });
  });
}
