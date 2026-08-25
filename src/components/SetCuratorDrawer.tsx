import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  X,
  Play,
  Flame,
  Music2,
  Clock,
  Activity,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { CuratedSet, GenreKey, RadioStationState, RadioTrack } from '../types';
import { GENRE_CONFIGS } from '../data/genrePresets';
import { requestCuratedSet } from '../services/djApi';

interface SetCuratorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stationState: RadioStationState;
  onSelectTrackFromSet: (track: RadioTrack, transitionScript?: string) => void;
}

export const SetCuratorDrawer: React.FC<SetCuratorDrawerProps> = ({
  isOpen,
  onClose,
  stationState,
  onSelectTrackFromSet,
}) => {
  const [trackCount, setTrackCount] = useState(5);
  const [themeInput, setThemeInput] = useState('Midnight Neon Voyage');
  const [isLoading, setIsLoading] = useState(false);
  const [curatedSet, setCuratedSet] = useState<CuratedSet | null>(null);

  if (!isOpen) return null;

  const handleGenerateSet = async () => {
    setIsLoading(true);
    try {
      const activeGenreConfig = GENRE_CONFIGS[stationState.currentGenre];
      const result = await requestCuratedSet({
        stationName: stationState.stationName,
        genre: activeGenreConfig.label,
        mood: stationState.mood || 'Late Night Drive',
        trackCount,
        theme: themeInput,
      });
      setCuratedSet(result);
    } catch (err) {
      console.error('Error generating set:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-xs">
      <div className="relative flex h-full w-full max-w-xl flex-col bg-slate-950 border-l border-slate-800 p-6 shadow-2xl overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Drawer Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Curate Radio Set with DJ Nova</h2>
            <p className="text-xs text-slate-400">
              Build a 5–10 track cohesive broadcast set with bespoke transition scripts
            </p>
          </div>
        </div>

        {/* Generator Controls */}
        <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-slate-900/60 p-4 border border-slate-800">
          <div>
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Set Theme / Vibe Name
            </label>
            <input
              type="text"
              value={themeInput}
              onChange={(e) => setThemeInput(e.target.value)}
              placeholder="e.g. 3 AM Highway Drive, Rainy Loft, Sunset Deep Grooves"
              className="mt-1.5 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 outline-hidden focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/40"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Number of Tracks
            </span>
            <div className="flex items-center gap-1.5">
              {[3, 5, 8, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => setTrackCount(num)}
                  className={`rounded-lg px-3 py-1 text-xs font-mono font-bold transition ${
                    trackCount === num
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerateSet}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-purple-500/20 transition hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>DJ Nova is Curating Your Set...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Generate {trackCount}-Track Set</span>
              </>
            )}
          </button>
        </div>

        {/* Curated Set Output */}
        {curatedSet && (
          <div className="mt-6 flex flex-col gap-4">
            {/* Set Intro Card */}
            <div className="rounded-2xl bg-purple-500/10 p-4 border border-purple-500/30">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400">
                🎙️ DJ NOVA SET OPENER:
              </span>
              <p className="mt-1 text-xs sm:text-sm italic text-slate-200">
                "{curatedSet.introSpeech}"
              </p>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Curated Tracklist ({curatedSet.tracks.length} Tracks)
            </h3>

            {/* Tracks List */}
            <div className="flex flex-col gap-3">
              {curatedSet.tracks.map((track, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-2 rounded-2xl bg-slate-900/60 p-4 border border-slate-800 transition hover:border-purple-500/40 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-xs font-mono font-bold text-purple-400">
                        0{idx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition">
                          {track.title}
                        </h4>
                        <p className="text-xs text-slate-400">{track.artist}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectTrackFromSet(track, track.transitionScript)}
                      className="flex items-center gap-1 rounded-full bg-purple-600/20 border border-purple-500/30 px-3 py-1 text-xs font-bold text-purple-300 hover:bg-purple-600 hover:text-white transition"
                    >
                      <Play className="h-3 w-3" />
                      <span>Play</span>
                    </button>
                  </div>

                  {/* Transition Script */}
                  {track.transitionScript && (
                    <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5 text-xs text-slate-300">
                      <span className="font-mono font-semibold text-purple-400 mr-1.5">
                        DJ Nova Link:
                      </span>
                      <span className="italic">"{track.transitionScript}"</span>
                    </div>
                  )}

                  {/* Trivia / Fun Fact */}
                  {track.funFact && (
                    <p className="text-[11px] text-slate-500 font-sans">
                      💡 {track.funFact}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

