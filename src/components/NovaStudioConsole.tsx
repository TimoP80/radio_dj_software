import React, { useState } from 'react';
import {
  Mic,
  Volume2,
  Sparkles,
  Radio,
  Play,
  Flame,
  Music2,
  Share2,
  MessageSquare,
  Wand2,
  Zap,
  Layers,
  CloudSun,
  MapPin,
  Search,
  ExternalLink,
  Loader2,
  Wind,
  Droplets,
  Thermometer,
  Newspaper,
  ChevronDown,
  ChevronUp,
  VolumeX,
  Sliders,
  UserCheck,
} from 'lucide-react';
import {
  DJMessage,
  RadioStationState,
  SoundEffectType,
  CityForecastData,
} from '../types';
import { requestCityForecast } from '../services/djApi';

interface NovaStudioConsoleProps {
  latestDJMessage: DJMessage | null;
  stationState: RadioStationState;
  onTriggerTalk: (
    mode: 'open' | 'intro' | 'transition' | 'caller' | 'segment' | 'custom',
    customPrompt?: string
  ) => void;
  onTriggerSegmentSpeech?: (speech: string, title: string) => void;
  onTriggerStationID?: (manual?: boolean) => void;
  onToggleAutoStationID?: (enabled: boolean) => void;
  onPlaySFX: (type: SoundEffectType) => void;
  onStopSpeaking: () => void;
  onUpdateVoicePersona?: (persona: 'Zephyr' | 'Puck' | 'Fenrir' | 'Kore') => void;
  onTestVoice?: () => void;
}

const VOICE_PERSONAS: Array<{
  id: 'Zephyr' | 'Puck' | 'Fenrir' | 'Kore';
  name: string;
  vibe: string;
  tone: string;
  tag: string;
}> = [
  {
    id: 'Zephyr',
    name: 'Zephyr',
    vibe: 'Drive-Time Host',
    tone: 'Charismatic, punchy, confident, warm',
    tag: 'DEFAULT',
  },
  {
    id: 'Kore',
    name: 'Kore',
    vibe: 'Midnight Sultry',
    tone: 'Smooth, warm, intimate, late-night',
    tag: 'POPULAR',
  },
  {
    id: 'Puck',
    name: 'Puck',
    vibe: 'Festival Upbeat',
    tone: 'Bright, energetic, fast-paced, playful',
    tag: 'HIGH-ENERGY',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    vibe: 'Classic FM Host',
    tone: 'Deep, resonant, underground, authoritative',
    tag: 'DEEP TONE',
  },
];

const SOUNDBOARD_BUTTONS: Array<{
  type: SoundEffectType;
  label: string;
  emoji: string;
  hoverAccent: string;
}> = [
  { type: 'chime', label: 'On-Air Cue', emoji: '🔔', hoverAccent: 'hover:border-purple-500/50 hover:bg-purple-500/10' },
  { type: 'station_id', label: 'Station Riser', emoji: '🚀', hoverAccent: 'hover:border-pink-500/50 hover:bg-pink-500/10' },
  { type: 'vinyl_scratch', label: 'Vinyl Scratch', emoji: '💿', hoverAccent: 'hover:border-purple-500/50 hover:bg-purple-500/10' },
  { type: 'airhorn', label: 'Airhorn Blast', emoji: '📢', hoverAccent: 'hover:border-red-500/50 hover:bg-red-500/10' },
  { type: 'phone_ring', label: 'Hotline Ring', emoji: '☎️', hoverAccent: 'hover:border-emerald-500/50 hover:bg-emerald-500/10' },
  { type: 'tape_rewind', label: 'Tape Rewind', emoji: '📼', hoverAccent: 'hover:border-cyan-500/50 hover:bg-cyan-500/10' },
  { type: 'bass_drop', label: 'Sub Bass Drop', emoji: '💣', hoverAccent: 'hover:border-indigo-500/50 hover:bg-indigo-500/10' },
  { type: 'applause', label: 'Studio Cheer', emoji: '👏', hoverAccent: 'hover:border-yellow-500/50 hover:bg-yellow-500/10' },
];

const POPULAR_CITIES = [
  'Tokyo',
  'London',
  'New York',
  'Los Angeles',
  'Paris',
  'Seattle',
  'Sydney',
  'Berlin',
  'Miami',
];

export const NovaStudioConsole: React.FC<NovaStudioConsoleProps> = ({
  latestDJMessage,
  stationState,
  onTriggerTalk,
  onTriggerSegmentSpeech,
  onTriggerStationID,
  onToggleAutoStationID,
  onPlaySFX,
  onStopSpeaking,
  onUpdateVoicePersona,
  onTestVoice,
}) => {
  const [cityInput, setCityInput] = useState('Tokyo');
  const [isFetchingForecast, setIsFetchingForecast] = useState(false);
  const [forecastData, setForecastData] = useState<CityForecastData | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [isForecastExpanded, setIsForecastExpanded] = useState(true);
  const [isVoiceSelectorOpen, setIsVoiceSelectorOpen] = useState(false);

  const intervalSec = stationState.stationIDIntervalSec || 900;
  const currentIntervalSec =
    stationState.broadcastSeconds > 0
      ? stationState.broadcastSeconds % intervalSec
      : 0;
  const secondsUntilNextID =
    stationState.broadcastSeconds > 0
      ? intervalSec - currentIntervalSec
      : intervalSec;
  const progressPercent = Math.min(
    100,
    Math.round((currentIntervalSec / intervalSec) * 100)
  );

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  // Handle City Forecast with Google Search Grounding
  const handleGetCityForecast = async (targetCity?: string) => {
    const cityToFetch = (targetCity || cityInput).trim();
    if (!cityToFetch) return;

    setIsFetchingForecast(true);
    setForecastError(null);
    onPlaySFX('station_id');

    try {
      const data = await requestCityForecast({
        city: cityToFetch,
        stationName: stationState.stationName,
      });

      setForecastData(data);
      setIsForecastExpanded(true);

      // Automatically trigger DJ Nova to read the live grounded forecast over the air
      if (onTriggerSegmentSpeech) {
        onTriggerSegmentSpeech(data.spokenScript, data.title);
      } else {
        onTriggerTalk('segment', data.spokenScript);
      }
    } catch (err: any) {
      console.error('Failed to get city forecast:', err);
      setForecastError('Could not connect to live weather frequency. Please try again.');
    } finally {
      setIsFetchingForecast(false);
    }
  };

  return (
    <div
      id="nova-studio-console"
      className="flex flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-md"
    >
      {/* Header: DJ Identity & Mic Status */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20 ring-1 ring-white/20">
            <Mic className="h-5 w-5" />
            {stationState.isDJSpeaking && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500" />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">DJ Nova</h3>
              <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400">
                {stationState.voiceGender} VOICE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live broadcast engine • Real-time radio audio ducking & vocal DSP
            </p>
          </div>
        </div>

        {/* Mic / Ducking Indicator & Voice Settings Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsVoiceSelectorOpen(!isVoiceSelectorOpen)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition cursor-pointer ${
              isVoiceSelectorOpen
                ? 'bg-purple-600/30 border-purple-400 text-purple-200'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Configure DJ Nova Voice Persona & Synthesizer"
          >
            <Sliders className="h-3.5 w-3.5 text-purple-400" />
            <span>Voice Persona</span>
          </button>

          {stationState.isDJSpeaking ? (
            <button
              onClick={onStopSpeaking}
              className="flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-500/40 px-3 py-1 text-xs font-bold text-red-300 hover:bg-red-500/30 transition cursor-pointer"
              title="Cut DJ Mic"
            >
              <span>CUT MIC</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 px-3 py-1 text-xs font-mono text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>ON AIR</span>
            </div>
          )}
        </div>
      </div>

      {/* Voice Persona Selector & Audition Strip */}
      {isVoiceSelectorOpen && (
        <div className="flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900/90 to-slate-950/90 border border-purple-500/40 p-4 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Studio Voice Persona & Synthesizer
              </span>
            </div>
            <span className="text-[10px] font-mono text-purple-300">
              Broadcast DSP Chain: Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {VOICE_PERSONAS.map((p) => {
              const isSelected = stationState.voiceGender === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    if (onUpdateVoicePersona) {
                      onUpdateVoicePersona(p.id);
                    }
                  }}
                  className={`flex flex-col gap-1 rounded-xl p-3 text-left border transition cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600/25 border-purple-400 text-white shadow-md shadow-purple-500/10'
                      : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      {p.name}
                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-purple-500/20 text-purple-300">
                      {p.tag}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-purple-300/90">
                    {p.vibe}
                  </span>
                  <span className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                    {p.tone}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Voice Audition Action */}
          <div className="flex items-center justify-between pt-1 border-t border-purple-500/20">
            <p className="text-[11px] text-slate-400">
              Select persona to adapt vocal cadence, inflection, and radio presence.
            </p>
            {onTestVoice && (
              <button
                onClick={onTestVoice}
                disabled={stationState.isDJSpeaking}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-90 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Mic className="h-3 w-3" />
                <span>Test Mic / Audition</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Live Teleprompter / DJ Speech Bubble */}
      <div
        id="dj-speech-bubble"
        className={`relative flex flex-col gap-3 rounded-2xl p-6 transition-all duration-300 bg-slate-950/60 border ${
          stationState.isDJSpeaking
            ? 'border-purple-500/50 shadow-lg shadow-purple-500/10'
            : 'border-purple-500/20'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            DJ Nova Commentary
          </span>

          {/* Equalizer mini animation bars */}
          <div className="flex items-center gap-1">
            <span
              className={`w-1 rounded-full bg-purple-500 transition-all ${
                stationState.isDJSpeaking ? 'h-4 animate-pulse' : 'h-2 opacity-40'
              }`}
            />
            <span
              className={`w-1 rounded-full bg-purple-400 transition-all ${
                stationState.isDJSpeaking ? 'h-6 animate-pulse [animation-delay:150ms]' : 'h-3 opacity-40'
              }`}
            />
            <span
              className={`w-1 rounded-full bg-purple-600 transition-all ${
                stationState.isDJSpeaking ? 'h-7 animate-pulse [animation-delay:300ms]' : 'h-4 opacity-40'
              }`}
            />
            <span
              className={`w-1 rounded-full bg-pink-500 transition-all ${
                stationState.isDJSpeaking ? 'h-5 animate-pulse [animation-delay:75ms]' : 'h-2.5 opacity-40'
              }`}
            />
          </div>
        </div>

        {/* Spoken Text Dialogue */}
        <div className="min-h-[72px] text-base sm:text-lg leading-relaxed italic text-slate-200 font-sans">
          {latestDJMessage ? (
            <p>"{latestDJMessage.text}"</p>
          ) : (
            <p className="text-slate-500 not-italic">
              "You're tuned into Midnight Frequency. Hit any of the radio controls below or request a live City Forecast to have DJ Nova read grounded weather & headlines on air!"
            </p>
          )}
        </div>

        {/* Now Playing Banner formatted output */}
        {latestDJMessage?.nowPlayingBanner && (
          <div className="mt-1 rounded-xl bg-slate-900 border border-purple-500/20 px-3.5 py-1.5 text-xs font-mono text-purple-300">
            {latestDJMessage.nowPlayingBanner}
          </div>
        )}
      </div>

      {/* Live Grounded City Forecast & Headlines Section */}
      <div
        id="city-forecast-studio-card"
        className="flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-slate-950/90 to-purple-950/20 border border-purple-500/30 p-4 shadow-lg shadow-purple-900/10"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <CloudSun className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Live City Forecast & Headlines
                </span>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.2 text-[9px] font-mono font-bold text-emerald-400">
                  SEARCH GROUNDED
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                DJ Nova fetches real-time weather & city pulse via Google Search
              </p>
            </div>
          </div>

          {forecastData && (
            <button
              onClick={() => setIsForecastExpanded(!isForecastExpanded)}
              className="text-slate-400 hover:text-white p-1 transition cursor-pointer"
              title={isForecastExpanded ? 'Collapse' : 'Expand'}
            >
              {isForecastExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* City Input & Quick Tags */}
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                id="input-city-forecast"
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGetCityForecast();
                }}
                placeholder="Enter city (e.g. Tokyo, London, Seattle)..."
                className="w-full rounded-xl bg-slate-900/90 border border-slate-700/70 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-hidden transition"
              />
            </div>

            <button
              id="btn-get-city-forecast"
              onClick={() => handleGetCityForecast()}
              disabled={isFetchingForecast || !cityInput.trim()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-md shadow-amber-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
            >
              {isFetchingForecast ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <CloudSun className="h-3.5 w-3.5 fill-slate-950" />
                  <span>Get City Forecast</span>
                </>
              )}
            </button>
          </div>

          {/* Quick City Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-500 text-[10px] uppercase font-mono mr-1">Quick:</span>
            {POPULAR_CITIES.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCityInput(c);
                  handleGetCityForecast(c);
                }}
                disabled={isFetchingForecast}
                className={`rounded-lg px-2 py-0.5 font-medium transition cursor-pointer border ${
                  cityInput.toLowerCase() === c.toLowerCase()
                    ? 'bg-purple-600/30 text-purple-200 border-purple-500/40'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Error message if any */}
        {forecastError && (
          <div className="rounded-xl bg-red-950/40 border border-red-800/40 p-2.5 text-xs text-red-300">
            {forecastError}
          </div>
        )}

        {/* Search Grounded Result Card */}
        {forecastData && isForecastExpanded && (
          <div className="mt-2 flex flex-col gap-3 rounded-xl bg-slate-950/90 border border-amber-500/20 p-3.5 animate-in fade-in duration-300">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
                <h4 className="text-sm font-bold text-white">
                  {forecastData.cityName}
                </h4>
                <span className="text-[11px] text-amber-300/80 font-mono">
                  • {forecastData.title}
                </span>
              </div>
              <button
                onClick={() => {
                  if (onTriggerSegmentSpeech) {
                    onTriggerSegmentSpeech(forecastData.spokenScript, forecastData.title);
                  } else {
                    onTriggerTalk('segment', forecastData.spokenScript);
                  }
                }}
                disabled={stationState.isDJSpeaking}
                className="flex items-center gap-1.5 rounded-full bg-purple-600 hover:bg-purple-500 px-3 py-1 text-[11px] font-bold uppercase text-white shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                title="Broadcast this segment over the air again"
              >
                <Play className="h-3 w-3 fill-white" />
                <span>Re-Broadcast Segment</span>
              </button>
            </div>

            {/* Live Meteorological Data Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {forecastData.temperature && (
                <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-2">
                  <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500 uppercase">
                    <Thermometer className="h-3 w-3 text-amber-400" />
                    Temp
                  </span>
                  <span className="font-bold text-amber-300 text-sm mt-0.5 block truncate">
                    {forecastData.temperature}
                  </span>
                </div>
              )}

              {forecastData.condition && (
                <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-2">
                  <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500 uppercase">
                    <CloudSun className="h-3 w-3 text-cyan-400" />
                    Condition
                  </span>
                  <span className="font-bold text-cyan-300 text-xs mt-0.5 block truncate">
                    {forecastData.condition}
                  </span>
                </div>
              )}

              {forecastData.humidity && (
                <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-2">
                  <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500 uppercase">
                    <Droplets className="h-3 w-3 text-blue-400" />
                    Humidity
                  </span>
                  <span className="font-semibold text-slate-200 text-xs mt-0.5 block truncate">
                    {forecastData.humidity}
                  </span>
                </div>
              )}

              {forecastData.wind && (
                <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-2">
                  <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500 uppercase">
                    <Wind className="h-3 w-3 text-emerald-400" />
                    Wind / High-Low
                  </span>
                  <span className="font-semibold text-slate-200 text-xs mt-0.5 block truncate">
                    {forecastData.highLow || forecastData.wind}
                  </span>
                </div>
              )}
            </div>

            {/* Headlines from Search Grounding */}
            {forecastData.headlines && forecastData.headlines.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 p-2.5">
                <span className="flex items-center gap-1 text-[10px] font-mono uppercase text-slate-400">
                  <Newspaper className="h-3 w-3 text-purple-400" />
                  Live Grounded City Headlines
                </span>
                <ul className="flex flex-col gap-1 text-xs text-slate-300">
                  {forecastData.headlines.map((hl, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-purple-400 shrink-0 font-bold">•</span>
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* DJ Nova's On-Air Broadcast Script */}
            <div className="rounded-lg bg-purple-950/30 border border-purple-500/20 p-2.5 text-xs italic text-purple-200 leading-relaxed">
              <span className="text-[10px] font-mono font-bold uppercase not-italic text-purple-400 block mb-1">
                🎙️ On-Air Spoken Segment:
              </span>
              "{forecastData.spokenScript}"
            </div>

            {/* Grounding Search Citations */}
            {forecastData.sources && forecastData.sources.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  Verified Sources:
                </span>
                {forecastData.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-1 rounded-md bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400 hover:text-purple-300 hover:border-purple-500/40 transition max-w-[200px] truncate"
                    title={src.title}
                  >
                    <span className="truncate">{src.title}</span>
                    <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-70" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* DJ Action Hotkeys */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
          🎙️ DJ Nova Quick Talk-Ups
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            id="btn-dj-open-show"
            onClick={() => onTriggerTalk('open')}
            disabled={stationState.isDJSpeaking}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 p-3 text-center text-xs font-semibold text-slate-300 hover:text-white transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>Show Opener</span>
          </button>

          <button
            id="btn-dj-intro"
            onClick={() => onTriggerTalk('intro')}
            disabled={stationState.isDJSpeaking}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 p-3 text-center text-xs font-semibold text-slate-300 hover:text-white transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Music2 className="h-4 w-4 text-pink-400" />
            <span>Intro Track</span>
          </button>

          <button
            id="btn-dj-transition"
            onClick={() => onTriggerTalk('transition')}
            disabled={stationState.isDJSpeaking}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 p-3 text-center text-xs font-semibold text-slate-300 hover:text-white transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Zap className="h-4 w-4 text-amber-400" />
            <span>Smooth Link</span>
          </button>

          <button
            id="btn-dj-station-id"
            onClick={() => {
              if (onTriggerStationID) {
                onTriggerStationID(true);
              } else {
                onTriggerTalk('segment');
              }
            }}
            disabled={stationState.isDJSpeaking}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 p-3 text-center text-xs font-semibold text-purple-200 hover:text-white transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Radio className="h-4 w-4 text-purple-400" />
            <span>Station ID</span>
          </button>
        </div>
      </div>

      {/* 15-Minute Continuous Broadcast Station ID Automation Card */}
      <div className="flex flex-col gap-3 rounded-2xl border border-purple-500/20 bg-purple-950/20 p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
              <Radio className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">
                  Recurring 15m Station ID Jingle
                </span>
                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] font-mono font-bold uppercase text-purple-300">
                  {stationState.autoStationIDEnabled ? 'AUTOMATIC' : 'MANUAL ONLY'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Plays signature multi-stage radio jingle + liner every 15 continuous broadcast minutes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-trigger-station-id-now"
              onClick={() => onTriggerStationID && onTriggerStationID(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-purple-600/20 transition hover:opacity-90 active:scale-95 cursor-pointer"
              title="Play Station ID jingle and on-air station liner right now"
            >
              <Radio className="h-3.5 w-3.5" />
              <span>Trigger ID Jingle</span>
            </button>
          </div>
        </div>

        {/* Progress Bar & Countdown Timer */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">
              Next Jingle Cue:{' '}
              <span className="font-bold text-purple-300">
                {stationState.isOnAir ? `${formatCountdown(secondsUntilNextID)} remaining` : 'On Standby (Starts when On-Air)'}
              </span>
            </span>
            <span className="text-slate-500 font-semibold">
              Cycle: {formatCountdown(currentIntervalSec)} / 15:00 ({progressPercent}%)
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900 ring-1 ring-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Studio Soundboard SFX Matrix */}
      <div className="flex flex-col gap-2.5 border-t border-slate-800 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
            🎛️ Live Radio Soundboard
          </span>
          <span className="text-[10px] font-mono text-slate-500 uppercase">INSTANT CUES</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SOUNDBOARD_BUTTONS.map((btn) => (
            <button
              key={btn.type}
              id={`btn-sfx-${btn.type}`}
              onClick={() => onPlaySFX(btn.type)}
              className={`flex items-center gap-2 rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition active:scale-95 cursor-pointer ${btn.hoverAccent}`}
            >
              <span className="text-sm">{btn.emoji}</span>
              <span className="truncate">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

