export type SoundTheme = 'sports' | 'arcade' | 'soft' | 'muted';

export interface SoundConfig {
  theme: SoundTheme;
  isMuted: boolean;
  volume: number; // 0.0 to 1.0
}

export interface SoundPackDetails {
  name: string;
  description: string;
  correct: string;
  incorrect: string;
}

export const SOUND_PACKS: Record<SoundTheme, SoundPackDetails> = {
  sports: {
    name: 'التعليق الرياضي الحماسي (الافتراضي) ⚽',
    description: 'صوت صراخ "قووووووول!" عند الإجابة الصحيحة، وتعليق "لا لا لا لا / أوه!" عند الخاطئة',
    correct: '/sounds/sports-goal.mp3',
    incorrect: '/sounds/sports-missed.mp3',
  },
  arcade: {
    name: 'ألعاب الفيديو (Arcade / Gamified) 🎮',
    description: 'نغمات حماسية تشبه ألعاب الفيديو والجوائز',
    correct: '/sounds/arcade-correct.mp3',
    incorrect: '/sounds/arcade-incorrect.mp3',
  },
  soft: {
    name: 'نغمات ناعمة ورنانة (Soft Chime) 🔔',
    description: 'أصوات جرس هادئة ومناسبة للتركيز العالي',
    correct: '/sounds/soft-correct.mp3',
    incorrect: '/sounds/soft-incorrect.mp3',
  },
  muted: {
    name: 'وضع الهدوء (صامت) 🔇',
    description: 'إيقاف كافة المؤثرات الصوتية أثناء حل الامتحان',
    correct: '',
    incorrect: '',
  },
};

const STORAGE_KEY = 'medexam_sound_config';

export const getSoundConfig = (): SoundConfig => {
  if (typeof window === 'undefined') {
    return { theme: 'sports', isMuted: false, volume: 0.85 };
  }
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('awal_sound_config');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Fallback
    }
  }
  return {
    theme: 'sports', // الحزمة الرياضية هي الافتراضية
    isMuted: false,
    volume: 0.85,
  };
};

export const saveSoundConfig = (config: SoundConfig): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    localStorage.setItem('awal_sound_config', JSON.stringify(config));
  }
};

// Web Audio API Synthesizer & Speech Fallback to guarantee immediate audio playback
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playSynthesizedFeedback(theme: SoundTheme, type: 'correct' | 'incorrect', volume: number): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const vol = Math.max(0.6, Math.min(1.0, volume || 0.9));

  if (type === 'correct') {
    // Bright, loud, triumphant 4-note ascending chime (C5 -> E5 -> G5 -> C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.055);

      gain.gain.setValueAtTime(0.001, now + idx * 0.055);
      gain.gain.linearRampToValueAtTime(0.6 * vol, now + idx * 0.055 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.28);
    });
  } else {
    // Distinct "كرررررر" Electronic Error Buzz (Sawtooth wave + Square AM modulation at 35Hz)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.35);

    // Rapid amplitude modulation to produce "كرررررر" buzz texture
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    mod.type = 'square';
    mod.frequency.setValueAtTime(36, now);
    modGain.gain.setValueAtTime(0.45 * vol, now);

    mod.connect(gain.gain);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.6 * vol, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    mod.start(now);
    osc.stop(now + 0.4);
    mod.stop(now + 0.4);

    // Trigger device haptic vibration if available
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([100, 50, 100, 50, 150]);
      } catch {
        // Ignore
      }
    }
  }
}

export const playFeedbackSound = (type: 'correct' | 'incorrect'): void => {
  const config = getSoundConfig();

  if (config.isMuted || config.theme === 'muted') return;

  // Play instant synthesized audio using Web Audio API for zero latency and guaranteed playback
  playSynthesizedFeedback(config.theme, type, config.volume);
};

