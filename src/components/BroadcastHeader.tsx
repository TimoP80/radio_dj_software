import React, { useEffect, useState } from 'react';
import {
  Radio,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Sparkles,
  Layers,
  Flame,
  RadioTower,
  Play,
  Pause,
  Edit2,
  Sliders,
  HardDrive,
  Clock,
  BellRing,
} from 'lucide-react';
import { GENRE_CONFIGS } from '../data/genrePresets';
import { GenreKey, RadioStationState } from '../types';
import { audioEngine } from '../services/audioEngine';

interface BroadcastHeaderProps {
  stationState: RadioStationState;
  onUpdateStationState: (partial: Partial<RadioStationState>) => void;
  onOpenCurator: () => void;
  onOpenSegments: () => void;
  onOpenLocalCrate: () => void;
  onTriggerTalk: (mode: 'open' | 'intro' | 'transition' | 'caller' | 'segment') => void;
  onTriggerStationID?: (manual?: boolean) => void;
  onGenreSelect: (genre: GenreKey) => void;
}

export const BroadcastHeader: React.FC<BroadcastHeaderProps> = ({
  stationState,
  onUpdateStationState,
  onOpenCurator,
  onOpenSegments,
  onOpenLocalCrate,
  onTriggerTalk,
  onTriggerStationID,
  onGenreSelect,
}) => {
  const [timeString, setTimeString] = useState('');
  const [isEditingStation, setIsEditingStation] = useState(false);
  const [tempStationName, setTempStationName] = useState(stationState.stationName);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeString(
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    audioEngine.setMasterVolume(val);
    onUpdateStationState({ volume: val, isMuted: false });
  };

  const handleToggleMute = () => {
    const muted = audioEngine.toggleMute();
    onUpdateStationState({ isMuted: muted });
  };

  const handleStationNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempStationName.trim()) {
      onUpdateStationState({ stationName: tempStationName.trim() });
    }
    setIsEditingStation(false);
  };

  // Format continuous airtime (HH:MM:SS)
  const formatAirtime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const intervalSec = stationState.stationIDIntervalSec || 900;
  const secondsUntilNextID =
    stationState.broadcastSeconds > 0
      ? intervalSec - (stationState.broadcastSeconds % intervalSec)
      : intervalSec;
  const nextIDCountdown = formatAirtime(secondsUntilNextID);

  const activeGenreConfig = GENRE_CONFIGS[stationState.currentGenre];

  return (
    <header
      id="broadcast-header"
      className="relative z-30 border-b border-slate-800 bg-[#020617]/90 backdrop-blur-md px-6 py-4"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        {/* Upper Header Row */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          {/* Left: Live Status & Station Title */}
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <div
                className={`w-3 h-3 rounded-full ${
                  stationState.isOnAir ? 'bg-red-500 animate-pulse' : 'bg-slate-600'
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {stationState.isOnAir ? 'Live Broadcast' : 'Station Standby'}
              </span>
              <span className="text-xs font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                {stationState.frequency}
              </span>

              {/* Continuous On-Air Broadcast Timer */}
              {stationState.isOnAir && (
                <div
                  className="flex items-center gap-1.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-mono font-semibold text-emerald-400"
                  title="Continuous On-Air Broadcast Time"
                >
                  <Clock className="h-3 w-3 text-emerald-400" />
                  <span>ON-AIR {formatAirtime(stationState.broadcastSeconds)}</span>
                </div>
              )}

              {/* 15-Minute Station ID Recurring Countdown & Trigger */}
              <button
                onClick={() => onTriggerStationID && onTriggerStationID(true)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-semibold transition cursor-pointer border ${
                  stationState.autoStationIDEnabled
                    ? 'bg-purple-950/60 border-purple-500/40 text-purple-300 hover:bg-purple-900/60 hover:text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
                title="Recurring Station ID Trigger: Plays signature radio jingle every 15 mins. Click to trigger manually now."
              >
                <Radio className="h-3 w-3 text-purple-400" />
                <span>ID IN {nextIDCountdown}</span>
                <span className="text-[9px] px-1 rounded bg-purple-500/20 text-purple-300">15m</span>
              </button>
            </div>

            {isEditingStation ? (
              <form onSubmit={handleStationNameSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempStationName}
                  onChange={(e) => setTempStationName(e.target.value)}
                  className="rounded-lg bg-slate-900 border border-purple-500/50 px-3 py-1 text-2xl font-black italic tracking-tighter text-white outline-hidden focus:ring-1 focus:ring-purple-400"
                  autoFocus
                  onBlur={() => setIsEditingStation(false)}
                />
              </form>
            ) : (
              <button
                onClick={() => {
                  setTempStationName(stationState.stationName);
                  setIsEditingStation(true);
                }}
                title="Click to rename station"
                className="group flex items-center gap-2 text-left"
              >
                <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                  {stationState.stationName.toUpperCase()}
                </h1>
                <Edit2 className="h-4 w-4 text-slate-600 opacity-0 group-hover:opacity-100 transition" />
              </button>
            )}
          </div>

          {/* Center/Actions: Segment & Curator Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* DJ Mic Activity Pill */}
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                stationState.isDJSpeaking
                  ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400 animate-pulse'
                  : 'bg-slate-900 border border-slate-800 text-slate-500'
              }`}
            >
              <Mic
                className={`h-3.5 w-3.5 ${
                  stationState.isDJSpeaking ? 'text-purple-400' : 'text-slate-500'
                }`}
              />
              <span className="hidden sm:inline">
                {stationState.isDJSpeaking ? 'Nova Speaking' : 'Mic Ready'}
              </span>
            </div>

            {/* Hard Drive Crate Launcher */}
            <button
              id="btn-open-local-crate"
              onClick={onOpenLocalCrate}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition active:scale-95 border ${
                stationState.audioSourceMode === 'local_library'
                  ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Open Hard Drive Music Crate"
            >
              <HardDrive className="h-3.5 w-3.5 text-purple-400" />
              <span>Crate</span>
              {stationState.localTracksCount > 0 && (
                <span className="rounded-full bg-purple-500/30 px-1.5 py-0.2 text-[10px] text-purple-200">
                  {stationState.localTracksCount}
                </span>
              )}
            </button>

            {/* Quick Segment Launcher */}
            <button
              id="btn-open-segments"
              onClick={onOpenSegments}
              className="flex items-center gap-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              <span>Segments</span>
            </button>

            {/* Set Curator Drawer Button */}
            <button
              id="btn-curate-set"
              onClick={onOpenCurator}
              className="flex items-center gap-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition active:scale-95"
            >
              <Layers className="h-3.5 w-3.5 text-pink-400" />
              <span>Curator</span>
            </button>

            {/* Master Volume */}
            <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-full px-3.5 py-1.5">
              <button
                id="btn-toggle-mute"
                onClick={handleToggleMute}
                className="text-slate-400 hover:text-white transition"
                title={stationState.isMuted ? 'Unmute' : 'Mute'}
              >
                {stationState.isMuted || stationState.volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-red-400" />
                ) : (
                  <Volume2 className="h-4 w-4 text-slate-300" />
                )}
              </button>
              <span className="text-[11px] font-bold uppercase text-slate-500">Vol</span>
              <input
                id="input-master-volume"
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={stationState.isMuted ? 0 : stationState.volume}
                onChange={handleVolumeChange}
                className="h-1 w-16 sm:w-20 cursor-pointer accent-purple-500 rounded-full bg-slate-800"
                title={`Volume: ${Math.round((stationState.isMuted ? 0 : stationState.volume) * 100)}%`}
              />
            </div>
          </div>

          {/* Right: Host info & Live Clock */}
          <div className="flex flex-col items-end shrink-0">
            <span className="text-sm font-medium text-slate-400">
              Host: <span className="text-purple-400 font-semibold">DJ Nova</span>
            </span>
            <span className="text-xs font-mono text-slate-500">{timeString}</span>
          </div>
        </div>

        {/* Bottom Genre Selector Tabs (Sleek Pills) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-slate-800/80">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 shrink-0 mr-1">
            Genre:
          </span>
          {(Object.keys(GENRE_CONFIGS) as GenreKey[]).map((gKey) => {
            const config = GENRE_CONFIGS[gKey];
            const isSelected = stationState.currentGenre === gKey;
            return (
              <button
                key={gKey}
                id={`btn-genre-${gKey}`}
                onClick={() => onGenreSelect(gKey)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition whitespace-nowrap active:scale-95 ${
                  isSelected
                    ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400 shadow-sm shadow-purple-500/10'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-transparent'
                }`}
              >
                <span>{config.label.split('&')[0].trim()}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

