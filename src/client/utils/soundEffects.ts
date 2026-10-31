/**
 * Pure Web Audio API Sound Synthesizer
 * Produces crisp, organic sound effects for user actions and educational interactions
 * with zero external assets, zero network latency, and full browser compatibility.
 */

import { getSoundConfig } from './soundManager';

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  private isSilenced(): boolean {
    if (this.isMuted) return true;
    try {
      const config = getSoundConfig();
      if (config.isMuted || config.theme === 'muted') return true;
    } catch {
      // fallback
    }
    return false;
  }

  /**
   * Crisp, tactile mechanical microswitch click:
   * Used for button presses, selecting options, and toggling UI tabs.
   */
  public playClick(): void {
    if (this.isSilenced()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.035);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {}
  }

  /**
   * Smooth aerodynamic paper-flip swoosh:
   * Used when switching questions (السؤال التالي / السابق) or expanding cards.
   */
  public playSwoosh(): void {
    if (this.isSilenced()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Synthesize noise filtered by bandpass for smooth air swoosh
      const bufferSize = ctx.sampleRate * 0.12;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.06);
      filter.frequency.exponentialRampToValueAtTime(350, now + 0.12);
      filter.Q.setValueAtTime(2.5, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.13);
    } catch {}
  }

  /**
   * Pleasant double-tone bell chime:
   * Used when bookmarking/flagging a question for review.
   */
  public playBookmark(): void {
    if (this.isSilenced()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [659.25, 880]; // E5, A5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.001, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.06 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.24);
      });
    } catch {}
  }

  /**
   * Pencil graphite scratch sound:
   * Used when opening/closing the calculation scratchpad or math draft.
   */
  public playScratchpad(): void {
    if (this.isSilenced()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.04);
      osc.frequency.linearRampToValueAtTime(600, now + 0.09);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.11);
    } catch {}
  }

  /**
   * Realistic water droplet "تنقيط ماء" sound effect:
   * Features upward pitch chirp (620Hz -> 1420Hz) with exponential liquid resonance.
   */
  public playWaterDrop(): void {
    if (this.isSilenced()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Primary droplet bubble oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(1420, now + 0.038);
      osc.frequency.exponentialRampToValueAtTime(1080, now + 0.11);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.45, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);

      // Micro-harmonic overtone
      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();

      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(1600, now);
      overtone.frequency.exponentialRampToValueAtTime(2200, now + 0.025);

      overtoneGain.gain.setValueAtTime(0.001, now);
      overtoneGain.gain.linearRampToValueAtTime(0.12, now + 0.008);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      overtone.connect(overtoneGain);
      overtoneGain.connect(ctx.destination);

      overtone.start(now);
      overtone.stop(now + 0.09);
    } catch {}
  }

  /**
   * Triumphant ascending 4-note major chord (C5 -> E5 -> G5 -> C6):
   * Used for correct step answers and question mastery.
   */
  public playSuccess(): void {
    if (this.isSilenced()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.065);

        gain.gain.setValueAtTime(0.001, now + idx * 0.065);
        gain.gain.linearRampToValueAtTime(0.5, now + idx * 0.065 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.065 + 0.32);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.065);
        osc.stop(now + idx * 0.065 + 0.35);
      });
    } catch {}
  }

  /**
   * Warm gentle double-tone chime with harmonic shimmer:
   * Used when awarding conditional partial credit.
   */
  public playPartial(): void {
    if (this.isSilenced()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [587.33, 880.00]; // D5, A5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.38, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.38);
      });
    } catch {}
  }

  /**
   * Distinct yet soft electronic buzz with haptic pulse:
   * Used when selecting an incorrect option in training mode.
   */
  public playError(): void {
    if (this.isSilenced()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.28);

      // Amplitude modulation for buzz texture
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      mod.type = 'square';
      mod.frequency.setValueAtTime(35, now);
      modGain.gain.setValueAtTime(0.35, now);

      mod.connect(gain.gain);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.45, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      mod.start(now);
      osc.stop(now + 0.34);
      mod.stop(now + 0.34);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([80, 40, 100]);
        } catch {}
      }
    } catch {}
  }

  /**
   * Soft ambient pop on modal opening:
   */
  public playModal(): void {
    if (this.isSilenced()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.06);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  /**
   * Subtle paper sweep on clearing an answer:
   */
  public playClear(): void {
    if (this.isSilenced()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  /**
   * Celebratory fanfare on completing the exam:
   */
  public playSubmit(): void {
    if (this.isSilenced()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const fanfare = [
        { f: 523.25, t: 0, d: 0.15 },    // C5
        { f: 659.25, t: 0.15, d: 0.15 }, // E5
        { f: 783.99, t: 0.30, d: 0.2 },  // G5
        { f: 1046.5, t: 0.50, d: 0.45 }, // C6
      ];

      fanfare.forEach(({ f, t, d }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + t);

        gain.gain.setValueAtTime(0.001, now + t);
        gain.gain.linearRampToValueAtTime(0.5, now + t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + t);
        osc.stop(now + t + d + 0.05);
      });
    } catch {}
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }
}

export const soundEffects = new SoundEffectsManager();
export const playWaterDrop = () => soundEffects.playWaterDrop();
export const playClick = () => soundEffects.playClick();
export const playSwoosh = () => soundEffects.playSwoosh();
export const playBookmark = () => soundEffects.playBookmark();
export const playScratchpad = () => soundEffects.playScratchpad();
export const playSuccess = () => soundEffects.playSuccess();
export const playPartial = () => soundEffects.playPartial();
export const playError = () => soundEffects.playError();
export const playModal = () => soundEffects.playModal();
export const playClear = () => soundEffects.playClear();
export const playSubmit = () => soundEffects.playSubmit();
