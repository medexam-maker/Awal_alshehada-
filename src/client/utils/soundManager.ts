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
  const vol = Math.max(0.01, Math.min(1.0, volume));

  if (theme === 'sports') {
    if (type === 'correct') {
      // Stadium Whistle / Fanfare + Enthusiastic Goal Commentary
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.35); // C6

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.5 * vol, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);

      // Speech synthesis fallback for "قووووووول!"
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance('قووووووول!');
        utter.lang = 'ar-SA';
        utter.pitch = 1.3;
        utter.rate = 1.1;
        utter.volume = vol;
        window.speechSynthesis.speak(utter);
      }
    } else {
      // Stadium Crowd Groan / Ref Whistle
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.35);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.3 * vol, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);

      // Speech synthesis fallback for "أووووووه... لا لا لا!"
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance('أووووووه! لا لا لا!');
        utter.lang = 'ar-SA';
        utter.pitch = 0.8;
        utter.rate = 1.0;
        utter.volume = vol;
        window.speechSynthesis.speak(utter);
      }
    }
  } else if (theme === 'arcade') {
    if (type === 'correct') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0.001, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.25 * vol, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.13);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.25);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.3 * vol, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } else if (theme === 'soft') {
    if (type === 'correct') {
      [440, 554.37, 659.25].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.2 * vol, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.55);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2 * vol, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    }
  }
}

export const playFeedbackSound = (type: 'correct' | 'incorrect'): void => {
  const config = getSoundConfig();

  if (config.isMuted || config.theme === 'muted') return;

  const pack = SOUND_PACKS[config.theme] || SOUND_PACKS.sports;
  const soundUrl = type === 'correct' ? pack.correct : pack.incorrect;

  if (soundUrl) {
    const audio = new Audio(soundUrl);
    audio.volume = config.volume;
    audio.play().catch(() => {
      // Fallback to Web Audio / Speech Synthesis if local file fails to play
      playSynthesizedFeedback(config.theme, type, config.volume);
    });
  } else {
    playSynthesizedFeedback(config.theme, type, config.volume);
  }
};
