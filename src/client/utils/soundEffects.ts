/**
 * Pure Web Audio API Sound Synthesizer
 * Produces crisp, organic sound effects with zero external assets or network latency.
 */

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

  /**
   * Synthesizes a realistic water droplet "تنقيط ماء" sound effect:
   * Features an upward pitch chirp (600Hz -> 1450Hz) and exponential resonance decay,
   * matching the acoustic signature of a fresh water droplet.
   */
  public playWaterDrop(): void {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Primary droplet bubble oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Pitch inflection: quick upward sweep mimicking droplet cavity formation
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(1420, now + 0.038);
      osc.frequency.exponentialRampToValueAtTime(1080, now + 0.11);

      // Volume envelope: rapid attack + smooth liquid decay
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.45, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);

      // Micro-harmonic overtone for organic splash realism
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
    } catch (e) {
      // Audio playback fails silently in restrictive browser permissions
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }
}

export const soundEffects = new SoundEffectsManager();
export const playWaterDrop = () => soundEffects.playWaterDrop();
