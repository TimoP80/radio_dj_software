import { GenreKey, SoundEffectType } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private duckingGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Background procedural music loop state
  private isMusicPlaying = false;
  private currentGenre: GenreKey = 'synthwave';
  private timerId: number | null = null;
  private step = 0;
  private bpm = 118;

  // Real local hard drive audio playback state
  private localAudio: HTMLAudioElement | null = null;
  private localAudioSource: MediaElementAudioSourceNode | null = null;
  private isLocalPlaying = false;
  private currentLocalUrl: string | null = null;
  private onTimeUpdateCallback: ((currentTime: number, duration: number) => void) | null = null;
  private onTrackEndedCallback: (() => void) | null = null;

  // Track speech state for ducking
  private isDucking = false;
  private activeTTSNode: AudioBufferSourceNode | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  // Master volume control
  private masterVolume = 0.85;
  private isMuted = false;

  public init() {
    if (this.ctx) return;
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;

    this.ctx = new AudioCtxClass();

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    this.duckingGain = this.ctx.createGain();
    this.duckingGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.voiceGain = this.ctx.createGain();
    this.voiceGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.75, this.ctx.currentTime);

    // Audio Graph:
    // musicSource -> musicGain -> duckingGain -> masterGain -> analyser -> destination
    // voiceSource -> voiceGain -> masterGain -> analyser -> destination
    // sfxSource   -> sfxGain   -> masterGain -> analyser -> destination

    this.musicGain.connect(this.duckingGain);
    this.duckingGain.connect(this.masterGain);

    this.voiceGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Initialize HTML5 Audio element for playing real music from local hard drive
    if (typeof window !== 'undefined' && !this.localAudio) {
      this.localAudio = new Audio();
      this.localAudio.crossOrigin = 'anonymous';
      this.localAudio.preload = 'auto';

      this.localAudio.addEventListener('timeupdate', () => {
        if (this.localAudio && this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback(this.localAudio.currentTime, this.localAudio.duration || 0);
        }
      });

      this.localAudio.addEventListener('ended', () => {
        this.isLocalPlaying = false;
        this.isMusicPlaying = false;
        if (this.onTrackEndedCallback) {
          this.onTrackEndedCallback();
        }
      });

      this.localAudio.addEventListener('play', () => {
        this.isLocalPlaying = true;
        this.isMusicPlaying = true;
      });

      this.localAudio.addEventListener('pause', () => {
        this.isLocalPlaying = false;
      });

      // Route HTML5 Audio element through Web Audio musicGain so ducking and visualizers work!
      try {
        this.localAudioSource = this.ctx.createMediaElementSource(this.localAudio);
        this.localAudioSource.connect(this.musicGain);
      } catch (err) {
        console.warn('MediaElementSource error:', err);
      }
    }
  }

  public async resumeContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public setMasterVolume(val: number) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      const target = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.setMasterVolume(this.masterVolume);
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  // --- Dynamic Audio Ducking when DJ Nova Speaks ---
  public startSpeechDucking() {
    if (!this.ctx || !this.duckingGain) return;
    this.isDucking = true;
    // Duck music to ~20% volume smoothly
    this.duckingGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.duckingGain.gain.setTargetAtTime(0.22, this.ctx.currentTime, 0.15);
  }

  public stopSpeechDucking() {
    if (!this.ctx || !this.duckingGain) return;
    this.isDucking = false;
    // Swell music back up smoothly
    this.duckingGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.duckingGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.35);
  }

  // --- Soundboard Effects ---
  public playSFX(type: SoundEffectType) {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    switch (type) {
      case 'chime': {
        // Station on-air chime (pleasant 2-tone melodic bell)
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          if (!this.ctx || !this.sfxGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0, now + idx * 0.1);
          gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.1 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.7);
        });
        break;
      }
      case 'station_id': {
        this.playStationIDJingle();
        break;
      }
      case 'vinyl_scratch': {
        // Vinyl record backspin scratch
        const bufferSize = this.ctx.sampleRate * 0.35;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.3);
        filter.Q.value = 4;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(now);
        break;
      }
      case 'airhorn': {
        // Classic bouncy radio airhorn fanfare
        const pitches = [466.16, 466.16, 466.16, 554.37, 523.25];
        const times = [0, 0.12, 0.24, 0.42, 0.6];
        const durations = [0.09, 0.09, 0.14, 0.15, 0.35];

        pitches.forEach((freq, i) => {
          if (!this.ctx || !this.sfxGain) return;
          const t = now + times[i];
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc1.type = 'sawtooth';
          osc2.type = 'square';
          osc1.frequency.setValueAtTime(freq, t);
          osc2.frequency.setValueAtTime(freq * 1.008, t); // slight detune

          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + durations[i]);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.sfxGain);

          osc1.start(t);
          osc2.start(t + durations[i]);
          osc1.stop(t + durations[i]);
          osc2.stop(t + durations[i]);
        });
        break;
      }
      case 'phone_ring': {
        // Studio caller line ring (US standard 440+480 Hz)
        [440, 480].forEach((freq) => {
          if (!this.ctx || !this.sfxGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          // Ring-ring pattern
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.setValueAtTime(0, now + 0.4);
          gain.gain.setValueAtTime(0.18, now + 0.6);
          gain.gain.setValueAtTime(0, now + 1.0);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 1.1);
        });
        break;
      }
      case 'tape_rewind': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(3200, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
      case 'bass_drop': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.8);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.85);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.9);
        break;
      }
      case 'applause': {
        const bufferSize = this.ctx.sampleRate * 1.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.Q.value = 1.2;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(now);
        break;
      }
    }
  }

  // --- Signature Broadcast Station ID Jingle ---
  public async playStationIDJingle(onEnded?: () => void): Promise<void> {
    await this.resumeContext();
    if (!this.ctx || !this.sfxGain) {
      if (onEnded) onEnded();
      return;
    }

    const now = this.ctx.currentTime;
    // Duck music so Station ID sounds punchy and broadcast-ready
    this.startSpeechDucking();

    // 1. Futuristic FM Laser Sweep / Riser (0.0s -> 0.7s)
    const sweepOsc = this.ctx.createOscillator();
    const sweepFilter = this.ctx.createBiquadFilter();
    const sweepGain = this.ctx.createGain();

    sweepOsc.type = 'sawtooth';
    sweepOsc.frequency.setValueAtTime(110, now);
    sweepOsc.frequency.exponentialRampToValueAtTime(1174, now + 0.65);

    sweepFilter.type = 'lowpass';
    sweepFilter.frequency.setValueAtTime(320, now);
    sweepFilter.frequency.exponentialRampToValueAtTime(4500, now + 0.65);
    sweepFilter.Q.value = 6;

    sweepGain.gain.setValueAtTime(0.28, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

    sweepOsc.connect(sweepFilter);
    sweepFilter.connect(sweepGain);
    sweepGain.connect(this.sfxGain);

    sweepOsc.start(now);
    sweepOsc.stop(now + 0.72);

    // 2. Signature 4-Tone Melodic Radio Bells (0.2s -> 1.8s)
    // C5 (523.25), E5 (659.25), G5 (783.99), B5 (987.77), High C6 (1046.5)
    const bellNotes = [523.25, 659.25, 783.99, 987.77, 1046.5];
    const bellDelays = [0.15, 0.32, 0.48, 0.64, 0.82];

    bellNotes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + bellDelays[idx];

      // Primary bell sine
      const oscSine = this.ctx.createOscillator();
      const oscTri = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();

      oscSine.type = 'sine';
      oscTri.type = 'triangle';
      oscSine.frequency.setValueAtTime(freq, t);
      oscTri.frequency.setValueAtTime(freq * 2.003, t); // harmonic sparkle

      bGain.gain.setValueAtTime(0, t);
      bGain.gain.linearRampToValueAtTime(idx === 4 ? 0.35 : 0.22, t + 0.02);
      bGain.gain.exponentialRampToValueAtTime(0.001, t + (idx === 4 ? 1.4 : 0.8));

      oscSine.connect(bGain);
      oscTri.connect(bGain);
      bGain.connect(this.sfxGain);

      oscSine.start(t);
      oscTri.start(t);
      oscSine.stop(t + 1.5);
      oscTri.stop(t + 1.5);
    });

    // 3. Warm Retro Brass Swell Chord (0.5s -> 2.2s)
    const brassFreqs = [130.81, 196.0, 246.94, 329.63, 392.0]; // Cmaj7/9 voicing
    brassFreqs.forEach((freq) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + 0.5;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, t);
      filter.frequency.exponentialRampToValueAtTime(2800, t + 0.35);
      filter.frequency.exponentialRampToValueAtTime(600, t + 1.6);
      filter.Q.value = 3;

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.7);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 1.75);
    });

    // 4. Sub-Bass Broadcast Accent (0.6s -> 1.8s)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130, now + 0.6);
    subOsc.frequency.exponentialRampToValueAtTime(42, now + 1.3);

    subGain.gain.setValueAtTime(0, now + 0.6);
    subGain.gain.linearRampToValueAtTime(0.4, now + 0.65);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now + 0.6);
    subOsc.stop(now + 1.85);

    // 5. Analog High-End Shimmer Sparkle Cascade (1.0s -> 2.4s)
    const shimmerNotes = [1567.98, 1975.53, 2349.32, 3135.96];
    shimmerNotes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + 1.0 + i * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.55);
    });

    // Restore music after jingle completes
    setTimeout(() => {
      this.stopSpeechDucking();
      if (onEnded) onEnded();
    }, 2600);
  }

  // --- Procedural Music Synthesizer & Grooving Beats ---
  public startMusic(genre: GenreKey = 'synthwave') {
    this.resumeContext();
    // Stop any local audio currently playing when switching to synth radio
    this.pauseLocalTrack();

    this.currentGenre = genre;
    this.isMusicPlaying = true;
    this.isLocalPlaying = false;
    this.step = 0;

    // Set tempo per genre
    const bpmMap: Record<GenreKey, number> = {
      synthwave: 118,
      lofi: 82,
      deephouse: 124,
      jazz: 90,
      indierock: 126,
      neosoul: 86,
      pop: 116,
      ambient: 64,
    };
    this.bpm = bpmMap[genre] || 110;

    if (this.timerId) {
      clearInterval(this.timerId);
    }

    const intervalMs = (60000 / this.bpm) / 4; // 16th note steps
    this.timerId = window.setInterval(() => {
      this.playStep();
      this.step = (this.step + 1) % 64;
    }, intervalMs);
  }

  public stopProceduralMusic() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    this.stopProceduralMusic();
    this.pauseLocalTrack();
  }

  public setGenre(genre: GenreKey) {
    this.currentGenre = genre;
    if (this.isMusicPlaying && !this.isLocalPlaying) {
      this.startMusic(genre);
    }
  }

  public getIsPlaying(): boolean {
    return this.isMusicPlaying || this.isLocalPlaying;
  }

  // --- Real Local Hard Drive Audio Playback ---
  public async playLocalTrack(url: string, startTime = 0): Promise<void> {
    await this.resumeContext();
    // Stop procedural synth music loop when playing local track
    this.stopProceduralMusic();

    if (!this.localAudio) {
      this.init();
    }

    if (!this.localAudio) return;

    if (this.currentLocalUrl !== url) {
      this.localAudio.src = url;
      this.currentLocalUrl = url;
      this.localAudio.load();
    }

    if (startTime > 0) {
      this.localAudio.currentTime = startTime;
    }

    try {
      await this.localAudio.play();
      this.isLocalPlaying = true;
      this.isMusicPlaying = true;
    } catch (err) {
      console.warn('Local audio play error:', err);
    }
  }

  public pauseLocalTrack() {
    if (this.localAudio) {
      this.localAudio.pause();
    }
    this.isLocalPlaying = false;
  }

  public async resumeLocalTrack(): Promise<void> {
    await this.resumeContext();
    this.stopProceduralMusic();
    if (this.localAudio) {
      try {
        await this.localAudio.play();
        this.isLocalPlaying = true;
        this.isMusicPlaying = true;
      } catch (err) {
        console.warn('Resume local audio error:', err);
      }
    }
  }

  public seekLocalTrack(seconds: number) {
    if (this.localAudio) {
      this.localAudio.currentTime = Math.max(0, Math.min(seconds, this.localAudio.duration || seconds));
    }
  }

  public getLocalCurrentTime(): number {
    return this.localAudio?.currentTime || 0;
  }

  public getLocalDuration(): number {
    return this.localAudio?.duration || 0;
  }

  public getIsLocalPlaying(): boolean {
    return this.isLocalPlaying;
  }

  public setOnTimeUpdate(callback: (currentTime: number, duration: number) => void) {
    this.onTimeUpdateCallback = callback;
  }

  public setOnTrackEnded(callback: () => void) {
    this.onTrackEndedCallback = callback;
  }

  private playStep() {
    if (!this.ctx || !this.musicGain || !this.isMusicPlaying) return;
    const now = this.ctx.currentTime;
    const s = this.step;

    // Trigger drums, bass, and harmonic chords based on genre
    switch (this.currentGenre) {
      case 'synthwave':
        this.playSynthwaveStep(now, s);
        break;
      case 'lofi':
        this.playLofiStep(now, s);
        break;
      case 'deephouse':
        this.playDeepHouseStep(now, s);
        break;
      case 'jazz':
        this.playJazzStep(now, s);
        break;
      case 'neosoul':
        this.playNeoSoulStep(now, s);
        break;
      case 'indierock':
        this.playIndieRockStep(now, s);
        break;
      case 'pop':
        this.playPopStep(now, s);
        break;
      case 'ambient':
        this.playAmbientStep(now, s);
        break;
    }
  }

  // Synthesis helpers
  private triggerKick(time: number, vol = 0.45) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.22);
  }

  private triggerSnare(time: number, vol = 0.28) {
    if (!this.ctx || !this.musicGain) return;
    // Tone + Noise
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(90, time + 0.08);
    oscGain.gain.setValueAtTime(vol * 0.6, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    osc.connect(oscGain);
    oscGain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.16);

    const bufferSize = this.ctx.sampleRate * 0.18;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 900;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(vol, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.musicGain);
    noise.start(time);
  }

  private triggerHat(time: number, open = false, vol = 0.12) {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = this.ctx.sampleRate * (open ? 0.25 : 0.05);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6500;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (open ? 0.22 : 0.045));
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(time);
  }

  private triggerSynthNote(time: number, freq: number, duration = 0.2, type: OscillatorType = 'sawtooth', vol = 0.15) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, time);
    filter.frequency.exponentialRampToValueAtTime(400, time + duration);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  private triggerChord(time: number, freqs: number[], duration = 0.6, vol = 0.08) {
    freqs.forEach((f) => {
      this.triggerSynthNote(time, f, duration, 'sine', vol);
      this.triggerSynthNote(time, f * 0.998, duration, 'triangle', vol * 0.5);
    });
  }

  // Genre pattern generators
  private playSynthwaveStep(time: number, step: number) {
    const s16 = step % 16;
    // 4-on-the-floor kick
    if (s16 % 4 === 0) this.triggerKick(time, 0.45);
    // Snare on 4 and 12
    if (s16 === 4 || s16 === 12) this.triggerSnare(time, 0.3);
    // 16th hats
    this.triggerHat(time, s16 % 4 === 2, s16 % 2 === 0 ? 0.12 : 0.06);

    // 80s rolling bassline (Am -> F -> C -> G progression)
    const chordIdx = Math.floor(step / 16);
    const bassNotes = [110, 87.31, 65.41, 98]; // A2, F2, C2, G2
    const currentBass = bassNotes[chordIdx];
    // 16th arpeggio octaves
    const octave = s16 % 2 === 0 ? 1 : 2;
    this.triggerSynthNote(time, currentBass * (octave === 1 ? 0.5 : 1), 0.12, 'sawtooth', 0.18);

    // Synth pad stab on 0 and 8
    if (s16 === 0) {
      const chords = [
        [220, 261.63, 329.63, 392], // Am7
        [174.61, 220, 261.63, 329.63], // Fmaj7
        [130.81, 164.81, 196, 246.94], // Cmaj7
        [196, 246.94, 293.66, 349.23], // G7
      ];
      this.triggerChord(time, chords[chordIdx], 0.7, 0.08);
    }
  }

  private playLofiStep(time: number, step: number) {
    const s16 = step % 16;
    // Laid-back boom-bap kick
    if (s16 === 0 || s16 === 6 || s16 === 10) this.triggerKick(time, 0.35);
    // Rimshot / Snare on 4 and 12 with light swing
    if (s16 === 4 || s16 === 12) this.triggerSnare(time, 0.22);
    // Chill hats
    if (s16 % 2 === 0) this.triggerHat(time, s16 === 8, 0.08);

    // Warm Rhodes chords on step 0 and 8
    const chordIdx = Math.floor(step / 16);
    if (s16 === 0 || s16 === 8) {
      const lofiChords = [
        [261.63, 311.13, 392.0, 466.16], // Cm7
        [233.08, 293.66, 349.23, 440.0], // Bbmaj7
        [207.65, 261.63, 311.13, 392.0], // Abmaj7
        [196.0, 246.94, 293.66, 349.23], // G7b9
      ];
      this.triggerChord(time, lofiChords[chordIdx], 1.2, 0.09);
    }

    // Sub bass
    if (s16 === 0 || s16 === 6) {
      const bassNotes = [65.41, 58.27, 51.91, 49.0];
      this.triggerSynthNote(time, bassNotes[chordIdx], 0.45, 'sine', 0.28);
    }
  }

  private playDeepHouseStep(time: number, step: number) {
    const s16 = step % 16;
    // Solid 4/4 Kick
    if (s16 % 4 === 0) this.triggerKick(time, 0.48);
    // Clap / Snare on 4, 12
    if (s16 === 4 || s16 === 12) this.triggerSnare(time, 0.25);
    // Offbeat Open Hi-hat on 2, 6, 10, 14
    if (s16 % 4 === 2) this.triggerHat(time, true, 0.16);

    // Bouncy off-beat bass
    const chordIdx = Math.floor(step / 16);
    const bassline = [73.42, 82.41, 87.31, 73.42]; // D, E, F, D
    if (s16 % 2 === 1) {
      this.triggerSynthNote(time, bassline[chordIdx], 0.15, 'square', 0.14);
    }

    // Deep house stabs
    if (s16 === 3 || s16 === 9 || s16 === 14) {
      this.triggerChord(time, [293.66, 349.23, 440, 523.25], 0.22, 0.1);
    }
  }

  private playJazzStep(time: number, step: number) {
    const s16 = step % 16;
    // Swing cymbal pattern
    if (s16 === 0 || s16 === 4 || s16 === 6 || s16 === 8 || s16 === 12 || s16 === 14) {
      this.triggerHat(time, s16 === 6 || s16 === 14, 0.1);
    }
    // Soft brush snare
    if (s16 === 4 || s16 === 12) this.triggerSnare(time, 0.12);
    // Feathered kick on downbeats
    if (s16 === 0 || s16 === 8) this.triggerKick(time, 0.18);

    // Walking acoustic bass
    const chordIdx = Math.floor(step / 16);
    const walkNotes = [65.41, 73.42, 82.41, 87.31];
    if (s16 % 4 === 0) {
      this.triggerSynthNote(time, walkNotes[(chordIdx + s16 / 4) % 4], 0.35, 'triangle', 0.22);
    }

    // Jazz piano voicings
    if (s16 === 0) {
      const jazzChords = [
        [261.63, 329.63, 392, 493.88, 587.33], // Cmaj9
        [220, 261.63, 329.63, 392, 493.88], // Am9
        [293.66, 349.23, 440, 523.25, 659.25], // Dm9
        [196, 246.94, 293.66, 349.23, 440], // G13
      ];
      this.triggerChord(time, jazzChords[chordIdx], 1.6, 0.07);
    }
  }

  private playNeoSoulStep(time: number, step: number) {
    const s16 = step % 16;
    if (s16 === 0 || s16 === 10) this.triggerKick(time, 0.35);
    if (s16 === 4 || s16 === 12) this.triggerSnare(time, 0.22);
    if (s16 % 2 === 0) this.triggerHat(time, false, 0.08);

    const chordIdx = Math.floor(step / 16);
    if (s16 === 0 || s16 === 6) {
      const chords = [
        [311.13, 392, 466.16, 587.33], // Ebmaj9
        [293.66, 349.23, 440, 523.25], // Dm7
        [261.63, 311.13, 392, 466.16], // Cm7
        [233.08, 293.66, 349.23, 440], // Bbmaj7
      ];
      this.triggerChord(time, chords[chordIdx], 0.9, 0.1);
    }
    if (s16 === 0 || s16 === 6 || s16 === 12) {
      const bass = [77.78, 73.42, 65.41, 58.27];
      this.triggerSynthNote(time, bass[chordIdx], 0.3, 'sine', 0.26);
    }
  }

  private playIndieRockStep(time: number, step: number) {
    const s16 = step % 16;
    if (s16 === 0 || s16 === 8 || s16 === 10) this.triggerKick(time, 0.42);
    if (s16 === 4 || s16 === 12) this.triggerSnare(time, 0.3);
    this.triggerHat(time, s16 % 4 === 2, 0.12);

    const chordIdx = Math.floor(step / 16);
    const guitarChords = [
      [164.81, 246.94, 329.63, 392], // Em
      [130.81, 196, 261.63, 329.63], // C
      [146.83, 220, 293.66, 369.99], // D
      [123.47, 185, 246.94, 329.63], // Bm
    ];
    if (s16 % 2 === 0) {
      this.triggerChord(time, guitarChords[chordIdx], 0.25, 0.08);
    }
  }

  private playPopStep(time: number, step: number) {
    const s16 = step % 16;
    if (s16 % 4 === 0) this.triggerKick(time, 0.42);
    if (s16 === 4 || s16 === 12) this.triggerSnare(time, 0.28);
    if (s16 % 2 === 0) this.triggerHat(time, s16 === 14, 0.12);

    const chordIdx = Math.floor(step / 16);
    const chords = [
      [261.63, 329.63, 392], // C
      [196, 246.94, 293.66], // G
      [220, 261.63, 329.63], // Am
      [174.61, 220, 261.63], // F
    ];
    if (s16 === 0 || s16 === 6 || s16 === 10) {
      this.triggerChord(time, chords[chordIdx], 0.35, 0.09);
    }
  }

  private playAmbientStep(time: number, step: number) {
    const s16 = step % 16;
    const chordIdx = Math.floor(step / 16);
    if (s16 === 0) {
      const ambientChords = [
        [174.61, 261.63, 329.63, 392, 523.25], // Fmaj9
        [220, 293.66, 329.63, 440, 587.33], // Am11
        [196, 246.94, 293.66, 392, 493.88], // Gsus4
        [130.81, 196, 261.63, 329.63, 392], // Cmaj9
      ];
      this.triggerChord(time, ambientChords[chordIdx], 2.8, 0.08);
      // Gentle sub hum
      this.triggerSynthNote(time, [43.65, 55, 49, 32.7][chordIdx], 3.0, 'sine', 0.25);
    }
  }

  // --- DJ Voice Speech & TTS Playback ---
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private hasInitializedVoices = false;

  public initVoices(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.hasInitializedVoices && this.cachedVoices.length > 0) return;

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        this.cachedVoices = v;
        this.hasInitializedVoices = true;
      }
    };

    loadVoices();
    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  // Find the most realistic, human-sounding voice matching the selected DJ persona
  public getBestVoiceForPersona(persona: 'Zephyr' | 'Puck' | 'Fenrir' | 'Kore' = 'Zephyr'): SpeechSynthesisVoice | null {
    this.initVoices();
    const voices = this.cachedVoices.length > 0 ? this.cachedVoices : (window.speechSynthesis?.getVoices() || []);
    if (!voices || voices.length === 0) return null;

    const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
    const candidatePool = englishVoices.length > 0 ? englishVoices : voices;

    // Score voices by quality indicators and persona preferences
    const scored = candidatePool.map((voice) => {
      let score = 0;
      const name = voice.name.toLowerCase();

      // Highest bonus for realistic Neural / Natural / Premium cloud & OS voices
      if (name.includes('natural')) score += 120;
      if (name.includes('neural')) score += 120;
      if (name.includes('online')) score += 90;
      if (name.includes('google')) score += 80;
      if (name.includes('enhanced') || name.includes('premium')) score += 85;
      if (name.includes('siri') || name.includes('wavenet')) score += 95;

      // Heavy penalty for flat robotic synthesizers
      if (name.includes('espeak') || name.includes('whisper') || name.includes('klatt') || name.includes('croak') || name.includes('kal_diphone')) {
        score -= 200;
      }

      // Persona matching
      switch (persona) {
        case 'Zephyr': // Warm, deep, charismatic male drive-time host
          if (name.includes('guy') || name.includes('christopher') || name.includes('george') || name.includes('david') || name.includes('daniel') || name.includes('alex') || name.includes('tom')) {
            score += 60;
          }
          if (name.includes('male') && !name.includes('female')) score += 30;
          break;
        case 'Kore': // Sultry, smooth, warm evening host
          if (name.includes('jenny') || name.includes('aria') || name.includes('samantha') || name.includes('ava') || name.includes('victoria') || name.includes('serena') || name.includes('zira')) {
            score += 60;
          }
          if (name.includes('female')) score += 30;
          break;
        case 'Puck': // Lively, upbeat, bright festival DJ
          if (name.includes('steffan') || name.includes('roger') || name.includes('junior') || name.includes('fred') || name.includes('oliver')) {
            score += 60;
          }
          break;
        case 'Fenrir': // Deep classic FM radio voice
          if (name.includes('arthur') || name.includes('oliver') || name.includes('brian') || name.includes('reed') || name.includes('richard')) {
            score += 60;
          }
          if (name.includes('male')) score += 30;
          break;
      }

      // Default preferred system voices
      if (voice.default) score += 15;

      return { voice, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.voice || candidatePool[0] || null;
  }

  // Play studio-mastered Gemini Neural TTS PCM Audio
  public async playBase64PCM(
    base64Data: string,
    sampleRate = 24000,
    onEnd?: () => void
  ): Promise<void> {
    await this.resumeContext();
    if (!this.ctx || !this.voiceGain) return;

    this.startSpeechDucking();

    // Decode base64 to 16-bit PCM (Little-Endian)
    const binary = atob(base64Data);
    const numSamples = Math.floor(binary.length / 2);
    const float32Array = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const lowByte = binary.charCodeAt(i * 2);
      const highByte = binary.charCodeAt(i * 2 + 1);
      let val = (highByte << 8) | lowByte;
      if (val >= 0x8000) val -= 0x10000;
      float32Array[i] = val / 32768.0;
    }

    const audioBuffer = this.ctx.createBuffer(1, float32Array.length, sampleRate);
    audioBuffer.copyToChannel(float32Array, 0);

    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;

    // --- Broadcast Studio Vocal Chain ---
    // 1. Highpass (sub-rumble filter)
    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 85;
    highpass.Q.value = 0.7;

    // 2. Warmth parametric EQ (radio announcer chest resonance)
    const warmth = this.ctx.createBiquadFilter();
    warmth.type = 'peaking';
    warmth.frequency.value = 220;
    warmth.gain.value = 2.6;
    warmth.Q.value = 1.1;

    // 3. Broadcast Presence boost (FM clarity & articulation)
    const presence = this.ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 3600;
    presence.gain.value = 3.8;
    presence.Q.value = 1.2;

    // 4. Air band high-shelf (silky top-end sheen)
    const airShelf = this.ctx.createBiquadFilter();
    airShelf.type = 'highshelf';
    airShelf.frequency.value = 10000;
    airShelf.gain.value = 1.8;

    // 5. Studio Vocal Compressor (tight, punchy broadcast consistency)
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
    compressor.knee.setValueAtTime(10, this.ctx.currentTime);
    compressor.ratio.setValueAtTime(3.8, this.ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    compressor.release.setValueAtTime(0.2, this.ctx.currentTime);

    // Audio Graph: source -> highpass -> warmth -> presence -> airShelf -> compressor -> voiceGain
    source.connect(highpass);
    highpass.connect(warmth);
    warmth.connect(presence);
    presence.connect(airShelf);
    airShelf.connect(compressor);
    compressor.connect(this.voiceGain);

    this.activeTTSNode = source;

    return new Promise((resolve) => {
      source.onended = () => {
        this.stopSpeechDucking();
        if (onEnd) onEnd();
        resolve();
      };
      source.start();
    });
  }

  // Enhanced speech synthesis fallback with natural radio prosody & persona matching
  public speakWithWebSpeech(
    text: string,
    persona: 'Zephyr' | 'Puck' | 'Fenrir' | 'Kore' = 'Zephyr',
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    if (!('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel();

    // Clean text thoroughly for natural speech
    const cleanText = text
      .replace(/🎵[^\n]+/g, '')
      .replace(/\[[^\]]+\]/g, '')
      .replace(/\([^\)]+\)/g, '')
      .replace(/\*+/g, '')
      .replace(/#{1,6}\s+/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    this.currentUtterance = utterance;

    // Match best high-quality voice
    const matchedVoice = this.getBestVoiceForPersona(persona);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    // Persona-tailored pitch, cadence, and energetic radio pacing
    switch (persona) {
      case 'Zephyr': // Confident, charismatic, warm drive-time radio pace
        utterance.rate = 1.06;
        utterance.pitch = 0.98;
        break;
      case 'Kore': // Smooth, intimate, sultry midnight frequency
        utterance.rate = 1.02;
        utterance.pitch = 1.03;
        break;
      case 'Puck': // Upbeat, bright, lively electronic festival vibe
        utterance.rate = 1.12;
        utterance.pitch = 1.08;
        break;
      case 'Fenrir': // Deep, resonant classic rock & underground FM presence
        utterance.rate = 0.98;
        utterance.pitch = 0.92;
        break;
      default:
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
    }

    let hasStarted = false;

    utterance.onstart = () => {
      hasStarted = true;
      this.startSpeechDucking();
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.stopSpeechDucking();
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      this.stopSpeechDucking();
      if (onEnd) onEnd();
    };

    // Trigger speech
    window.speechSynthesis.speak(utterance);

    // Fallback safety timeout in case browser speech gets stuck
    setTimeout(() => {
      if (!hasStarted && window.speechSynthesis.speaking) {
        this.startSpeechDucking();
      }
    }, 200);
  }

  public stopSpeaking() {
    if (this.activeTTSNode) {
      try {
        this.activeTTSNode.stop();
      } catch (e) {}
      this.activeTTSNode = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.stopSpeechDucking();
  }
}

export const audioEngine = new AudioEngine();
// Initialize speech voices proactively on module load
if (typeof window !== 'undefined') {
  audioEngine.initVoices();
}
