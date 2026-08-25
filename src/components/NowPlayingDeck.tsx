import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Disc3,
  Flame,
  Radio,
  Sparkles,
  Info,
  Quote,
  Activity,
  Zap,
  HardDrive,
  FolderOpen,
  Calendar,
  Tag,
} from 'lucide-react';
import { RadioTrack, RadioStationState } from '../types';
import { GENRE_CONFIGS } from '../data/genrePresets';
import { AudioVisualizer } from './AudioVisualizer';
import { audioEngine } from '../services/audioEngine';

interface NowPlayingDeckProps {
  currentTrack: RadioTrack;
  isPlaying: boolean;
  stationState: RadioStationState;
  currentTime?: number;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onDJIntroTrack: () => void;
  onScratch: () => void;
  onSeek?: (seconds: number) => void;
  onOpenLocalCrate?: () => void;
}

export const NowPlayingDeck: React.FC<NowPlayingDeckProps> = ({
  currentTrack,
  isPlaying,
  stationState,
  currentTime = 0,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onDJIntroTrack,
  onScratch,
  onSeek,
  onOpenLocalCrate,
}) => {
  const [internalProgress, setInternalProgress] = useState(0);
  const duration = currentTrack.durationSec || 200;

  // Use currentTime if supplied (e.g. from real audio file timeupdate), else internal synth ticker
  const currentPos = currentTrack.isLocalFile ? currentTime : internalProgress;

  useEffect(() => {
    let interval: number;
    if (isPlaying && !currentTrack.isLocalFile) {
      interval = window.setInterval(() => {
        setInternalProgress((prev) => (prev >= duration ? 0 : prev + 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration, currentTrack.isLocalFile]);

  // Reset internal progress on track change
  useEffect(() => {
    setInternalProgress(0);
  }, [currentTrack.id]);

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSec = ratio * duration;

    if (onSeek) {
      onSeek(targetSec);
    }
    if (!currentTrack.isLocalFile) {
      setInternalProgress(targetSec);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const activeGenre = GENRE_CONFIGS[stationState.currentGenre];
  const isLocalTrack = !!currentTrack.isLocalFile;

  return (
    <div
      id="now-playing-deck"
      className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 shadow-2xl backdrop-blur-md"
    >
      {/* Dynamic Background Gradient Flare */}
      <div
        className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-purple-600/20 blur-3xl transition-all duration-700 pointer-events-none"
      />
      <div
        className="absolute -bottom-32 -right-32 h-72 w-72 rounded-full bg-pink-600/20 blur-3xl transition-all duration-700 pointer-events-none"
      />

      <div className="relative z-10 flex flex-col gap-6">
        {/* Upper: Album Art Turntable & Track Details */}
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          {/* Turntable Artwork Container */}
          <div
            className={`group relative flex h-48 w-48 sm:h-56 sm:w-56 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-2xl overflow-hidden ring-1 ring-white/10 ${
              isLocalTrack
                ? 'from-purple-900 via-indigo-900 to-pink-900 shadow-purple-500/25'
                : 'from-indigo-600 via-purple-600 to-pink-600 shadow-purple-500/20'
            }`}
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
              backgroundSize: '16px 16px',
            }}
          >
            {/* Spinning Vinyl Grooves */}
            <div
              className={`relative flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center rounded-full bg-slate-950 p-2 shadow-2xl ring-1 ring-slate-800 ${
                isPlaying ? 'animate-[spin_5s_linear_infinite]' : ''
              }`}
            >
              {/* Vinyl Groove Rings */}
              <div className="absolute inset-2 rounded-full border border-white/5" />
              <div className="absolute inset-4 rounded-full border border-white/5" />
              <div className="absolute inset-7 rounded-full border border-white/10" />

              {/* Center Record Label / Embedded Album Art */}
              <div className="relative flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 text-center text-white shadow-lg ring-2 ring-white/20">
                {currentTrack.albumArtUrl ? (
                  <img
                    src={currentTrack.albumArtUrl}
                    alt={currentTrack.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center p-2">
                    {isLocalTrack ? (
                      <HardDrive className="h-4 w-4 sm:h-5 sm:w-5 text-white/95" />
                    ) : (
                      <Disc3 className="h-4 w-4 sm:h-5 sm:w-5 text-white/95" />
                    )}
                    <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-white truncate max-w-[50px]">
                      {isLocalTrack ? (currentTrack.fileType || 'LOCAL') : (currentTrack.genre || 'NOVA')}
                    </span>
                  </div>
                )}
              </div>

              {/* Spindle Center Hole */}
              <div className="absolute h-3 w-3 rounded-full bg-slate-950 ring-1 ring-white/40" />
            </div>

            {/* Scratch trigger on turntable hover/click */}
            <button
              id="btn-vinyl-scratch"
              onClick={onScratch}
              title="Click to scratch the record"
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-slate-950/70 text-purple-300 text-xs font-bold font-mono tracking-wider transition backdrop-blur-xs cursor-pointer"
            >
              ⚡ SCRATCH RECORD
            </button>
          </div>

          {/* Track Details & Radio Banner */}
          <div className="flex flex-1 flex-col justify-between gap-3 text-center sm:text-left">
            <div>
              {/* Station Dial Pill / Source Indicator */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-purple-400 border border-purple-500/30">
                  <Radio className="h-3.5 w-3.5 animate-pulse" />
                  <span>NOW SPINNING • {stationState.stationName.toUpperCase()}</span>
                </div>

                {isLocalTrack ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-500/15 border border-pink-500/30 px-2.5 py-0.5 text-[11px] font-mono font-bold text-pink-300">
                    <HardDrive className="h-3 w-3 text-pink-400" />
                    HARD DRIVE AUDIO
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 text-[11px] font-mono font-bold text-purple-300">
                    <Zap className="h-3 w-3 text-purple-400" />
                    SYNTH GROOVE
                  </span>
                )}
              </div>

              {/* Song Title & Artist */}
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                {currentTrack.trackNo && (
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded">
                    #{currentTrack.trackNo < 10 ? `0${currentTrack.trackNo}` : currentTrack.trackNo}
                  </span>
                )}
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white line-clamp-1">
                  {currentTrack.title}
                </h2>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-base sm:text-xl text-purple-400 font-medium mt-1">
                <span>{currentTrack.artist}</span>
                {currentTrack.album && currentTrack.album !== 'Hard Drive Crate' && (
                  <span className="text-slate-400 text-sm font-normal flex items-center gap-1">
                    — <Disc3 className="h-3.5 w-3.5 text-purple-400 shrink-0 inline" />
                    <span>{currentTrack.album}</span>
                  </span>
                )}
                {currentTrack.year && (
                  <span className="text-slate-500 text-xs font-mono font-normal flex items-center gap-1 bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700/50">
                    <Calendar className="h-3 w-3" />
                    {currentTrack.year}
                  </span>
                )}
              </div>

              {/* Badges: Genre, BPM, Energy */}
              <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="rounded-full bg-slate-800/80 border border-slate-700/60 px-3 py-1 text-xs font-semibold text-slate-300">
                  {currentTrack.genre}
                </span>
                {currentTrack.bpm && (
                  <span className="flex items-center gap-1 rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-xs font-mono font-bold text-purple-300">
                    <Activity className="h-3 w-3" />
                    {currentTrack.bpm} BPM
                  </span>
                )}
                {currentTrack.fileType && (
                  <span className="rounded-full bg-slate-800/80 border border-slate-700/60 px-3 py-1 text-xs font-mono font-semibold text-purple-300">
                    {currentTrack.fileType}
                  </span>
                )}
                {currentTrack.energyLevel && (
                  <span className="flex items-center gap-1 rounded-full bg-slate-800/80 border border-slate-700/60 px-3 py-1 text-xs font-medium text-pink-300">
                    <Flame className="h-3 w-3 text-pink-400" />
                    {currentTrack.energyLevel}
                  </span>
                )}
              </div>
            </div>

            {/* Lyric Teaser */}
            {currentTrack.lyricTeaser && (
              <div className="flex items-start gap-2 rounded-xl bg-slate-950/60 border border-slate-800 p-2.5 text-xs text-slate-300">
                <Quote className="h-3.5 w-3.5 shrink-0 text-purple-400 mt-0.5" />
                <p className="italic line-clamp-2">"{currentTrack.lyricTeaser}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Fun Fact / Station Trivia Box */}
        {currentTrack.funFact && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-transparent p-3.5 text-xs text-slate-300 border border-purple-500/20">
            <Info className="h-4 w-4 shrink-0 text-purple-400 mt-0.5" />
            <div>
              <span className="font-bold text-purple-300 uppercase font-mono tracking-wider mr-1.5">
                NOVA'S VINYL NOTES:
              </span>
              <span>{currentTrack.funFact}</span>
            </div>
          </div>
        )}

        {/* Interactive Scrubber & Duration */}
        <div className="flex flex-col gap-2">
          <div
            onClick={handleProgressBarClick}
            className="group relative h-2 w-full overflow-hidden rounded-full bg-slate-800 cursor-pointer hover:h-2.5 transition-all"
            title="Click to seek"
          >
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-150"
              style={{ width: `${Math.min(100, (currentPos / duration) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-mono text-slate-500 uppercase tracking-wider">
            <span>{formatTime(currentPos)}</span>
            <span className="flex items-center gap-1 text-slate-400">
              {isLocalTrack ? (
                <>
                  <HardDrive className="h-3 w-3 text-pink-400" />
                  REAL DISK AUDIO • {currentTrack.fileName || 'LOCAL FILE'}
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3 text-purple-400" />
                  LIVE SYNTH GROOVE
                </>
              )}
            </span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Live Audio Visualizer Banner */}
        <AudioVisualizer
          isPlaying={isPlaying}
          isDJSpeaking={stationState.isDJSpeaking}
          color={activeGenre?.color || '#a855f7'}
          height={48}
        />

        {/* Transport Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-3">
            {/* Previous */}
            <button
              id="btn-prev-track"
              onClick={onPrevTrack}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white transition active:scale-95 cursor-pointer"
              title="Previous Track"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            {/* Play / Pause */}
            <button
              id="btn-play-pause"
              onClick={onTogglePlay}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-950 shadow-lg shadow-white/10 hover:scale-105 active:scale-95 transition cursor-pointer"
              title={isPlaying ? 'Pause Station Stream' : 'Play Live Broadcast'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>

            {/* Next Track */}
            <button
              id="btn-next-track"
              onClick={onNextTrack}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white transition active:scale-95 cursor-pointer"
              title="Skip to Next Track"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* Action Buttons: Hard Drive Crate & Nova Talk-up */}
          <div className="flex items-center gap-2">
            {onOpenLocalCrate && (
              <button
                id="btn-open-crate-deck"
                onClick={onOpenLocalCrate}
                className="flex items-center gap-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
                title="Manage music from your hard drive"
              >
                <HardDrive className="h-3.5 w-3.5 text-purple-400" />
                <span>Hard Drive Crate</span>
                {stationState.localTracksCount > 0 && (
                  <span className="ml-1 rounded-full bg-purple-500/20 px-1.5 py-0.2 text-[10px] text-purple-300">
                    {stationState.localTracksCount}
                  </span>
                )}
              </button>
            )}

            <button
              id="btn-dj-intro-track"
              onClick={onDJIntroTrack}
              disabled={stationState.isDJSpeaking}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-purple-500/20 transition hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>NOVA TALK-UP</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


