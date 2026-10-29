/** Procedural ride audio: bell, tyre hum, wind. No audio files. */

type Ctor = typeof AudioContext;

function getCtor(): Ctor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export class RideAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private tyreGain: GainNode | null = null;
  private tyreFilter: BiquadFilterNode | null = null;
  private muted = true;

  get isMuted() {
    return this.muted;
  }

  private ensure() {
    if (this.ctx) return this.ctx;
    const Ctor = getCtor();
    if (!Ctor) return null;
    try {
      const ctx = new Ctor();
      this.ctx = ctx;
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      this.master = master;

      const length = Math.floor(ctx.sampleRate * 2);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

      // wind bed
      const windSrc = ctx.createBufferSource();
      windSrc.buffer = buffer;
      windSrc.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = "lowpass";
      windFilter.frequency.value = 420;
      const windGain = ctx.createGain();
      windGain.gain.value = 0.0001;
      windSrc.connect(windFilter).connect(windGain).connect(master);
      windSrc.start();
      this.windGain = windGain;
      this.windFilter = windFilter;

      // tyre / chain hum
      const tyreSrc = ctx.createBufferSource();
      tyreSrc.buffer = buffer;
      tyreSrc.loop = true;
      const tyreFilter = ctx.createBiquadFilter();
      tyreFilter.type = "bandpass";
      tyreFilter.frequency.value = 180;
      tyreFilter.Q.value = 2.2;
      const tyreGain = ctx.createGain();
      tyreGain.gain.value = 0.0001;
      tyreSrc.connect(tyreFilter).connect(tyreGain).connect(master);
      tyreSrc.start();
      this.tyreGain = tyreGain;
      this.tyreFilter = tyreFilter;

      return ctx;
    } catch {
      return null;
    }
  }

  async unlock() {
    const ctx = this.ensure();
    if (!ctx) return false;
    try {
      if (ctx.state === "suspended") await ctx.resume();
    } catch {
      return false;
    }
    return true;
  }

  async setMuted(muted: boolean) {
    this.muted = muted;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    if (!muted) {
      try {
        if (ctx.state === "suspended") await ctx.resume();
      } catch {
        /* noop */
      }
    }
    this.master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.1);
  }

  /** speed 0..1 */
  setSpeed(ratio: number) {
    const ctx = this.ctx;
    if (!ctx || !this.windGain || !this.tyreGain || !this.windFilter || !this.tyreFilter) return;
    const r = Math.max(0, Math.min(1, ratio));
    const now = ctx.currentTime;
    this.windGain.gain.setTargetAtTime(this.muted ? 0 : r * r * 0.11, now, 0.2);
    this.windFilter.frequency.setTargetAtTime(380 + r * 900, now, 0.25);
    this.tyreGain.gain.setTargetAtTime(this.muted ? 0 : r * 0.05, now, 0.2);
    this.tyreFilter.frequency.setTargetAtTime(140 + r * 320, now, 0.2);
  }

  /** The cycle bell: two struck partials with a long shimmer. */
  bell() {
    const ctx = this.ensure();
    if (!ctx || this.muted || !this.master) return;
    const t = ctx.currentTime;
    [2140, 3210, 4480].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency * (1 + index * 0.001), t);
      const peak = 0.17 / (index + 1);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.5 - index * 0.3);
      osc.connect(gain).connect(this.master!);
      osc.start(t);
      osc.stop(t + 1.6);
    });
  }

  /** Soft confirmation chime for checkpoints and finds. */
  chime(high = false) {
    const ctx = this.ensure();
    if (!ctx || this.muted || !this.master) return;
    const t = ctx.currentTime;
    const base = high ? 880 : 587.33;
    [base, base * 1.5].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(frequency, t + index * 0.08);
      gain.gain.setValueAtTime(0.0001, t + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.09, t + index * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + index * 0.08 + 0.9);
      osc.connect(gain).connect(this.master!);
      osc.start(t + index * 0.08);
      osc.stop(t + index * 0.08 + 1);
    });
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
  }
}
