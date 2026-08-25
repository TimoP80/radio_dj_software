import React, { useState } from 'react';
import {
  Sparkles,
  CloudRain,
  Swords,
  Disc,
  Radio,
  X,
  Play,
  Loader2,
  CheckCircle2,
  CloudSun,
  MapPin,
  ExternalLink,
  Thermometer,
  Droplets,
  Wind,
  Newspaper,
} from 'lucide-react';
import {
  CityForecastData,
  InteractiveSegmentData,
  RadioStationState,
  RadioTrack,
} from '../types';
import { requestCityForecast, requestSegment } from '../services/djApi';

interface MiniSegmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationState: RadioStationState;
  onTriggerSegmentSpeech: (speech: string, title: string, track?: RadioTrack) => void;
}

const POPULAR_MODAL_CITIES = ['Tokyo', 'London', 'New York', 'Paris', 'Seattle', 'Sydney'];

export const MiniSegmentsModal: React.FC<MiniSegmentsModalProps> = ({
  isOpen,
  onClose,
  stationState,
  onTriggerSegmentSpeech,
}) => {
  const [selectedType, setSelectedType] = useState<
    'city_forecast' | 'weather_of_the_mood' | 'two_song_challenge' | 'the_vault' | 'station_id'
  >('city_forecast');
  const [cityInput, setCityInput] = useState('Tokyo');
  const [isLoading, setIsLoading] = useState(false);
  const [segmentResult, setSegmentResult] = useState<InteractiveSegmentData | null>(null);

  if (!isOpen) return null;

  const handleRunSegment = async (
    type: 'city_forecast' | 'weather_of_the_mood' | 'two_song_challenge' | 'the_vault' | 'station_id',
    customCity?: string
  ) => {
    setSelectedType(type);
    setIsLoading(true);
    try {
      if (type === 'city_forecast') {
        const cityToSearch = customCity || cityInput || 'Tokyo';
        const forecast = await requestCityForecast({
          city: cityToSearch,
          stationName: stationState.stationName,
        });

        setSegmentResult({
          title: forecast.title,
          spokenScript: forecast.spokenScript,
          stationId: forecast.stationId,
          cityForecast: forecast,
        });
      } else {
        const data = await requestSegment({
          segmentType: type,
          stationName: stationState.stationName,
          mood: stationState.mood,
          genre: stationState.currentGenre,
        });
        setSegmentResult(data);
      }
    } catch (err) {
      console.error('Failed to run segment:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBroadcastSegment = (data: InteractiveSegmentData, chosenTrack?: any) => {
    onTriggerSegmentSpeech(
      data.spokenScript,
      data.title,
      chosenTrack
        ? {
            id: `challenge-${Date.now()}`,
            title: chosenTrack.title,
            artist: chosenTrack.artist,
            genre: stationState.currentGenre,
            bpm: 115,
            durationSec: 210,
          }
        : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-950 border border-slate-800 p-6 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">DJ Nova On-Air Mini Segments</h2>
            <p className="text-xs text-slate-400">
              Run real-time search-grounded city forecasts, interactive song showdowns, and late-night bits
            </p>
          </div>
        </div>

        {/* Segment Selector Tabs */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            onClick={() => handleRunSegment('city_forecast')}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-2.5 text-center text-xs font-semibold transition border cursor-pointer ${
              selectedType === 'city_forecast'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <CloudSun className="h-4 w-4 text-amber-400" />
            <span>Live Forecast</span>
          </button>

          <button
            onClick={() => handleRunSegment('weather_of_the_mood')}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-2.5 text-center text-xs font-semibold transition border cursor-pointer ${
              selectedType === 'weather_of_the_mood'
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/10'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <CloudRain className="h-4 w-4 text-purple-400" />
            <span>Mood Weather</span>
          </button>

          <button
            onClick={() => handleRunSegment('two_song_challenge')}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-2.5 text-center text-xs font-semibold transition border cursor-pointer ${
              selectedType === 'two_song_challenge'
                ? 'bg-pink-500/15 text-pink-300 border-pink-500/40 shadow-sm shadow-pink-500/10'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Swords className="h-4 w-4 text-pink-400" />
            <span>2-Song Battle</span>
          </button>

          <button
            onClick={() => handleRunSegment('the_vault')}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-2.5 text-center text-xs font-semibold transition border cursor-pointer ${
              selectedType === 'the_vault'
                ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Disc className="h-4 w-4 text-indigo-400" />
            <span>Vinyl Vault</span>
          </button>

          <button
            onClick={() => handleRunSegment('station_id')}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-2.5 text-center text-xs font-semibold transition border cursor-pointer ${
              selectedType === 'station_id'
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Radio className="h-4 w-4 text-cyan-400" />
            <span>Station ID</span>
          </button>
        </div>

        {/* City Input for Live Forecast Mode */}
        {selectedType === 'city_forecast' && (
          <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-slate-900/60 border border-amber-500/30 p-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-400" />
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRunSegment('city_forecast');
                }}
                placeholder="Enter city name (e.g. Tokyo, London, Paris)..."
                className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-hidden"
              />
              <button
                onClick={() => handleRunSegment('city_forecast')}
                disabled={isLoading || !cityInput.trim()}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-950 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                Fetch Live Pulse
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-500 text-[10px] uppercase font-mono">Popular:</span>
              {POPULAR_MODAL_CITIES.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCityInput(c);
                    handleRunSegment('city_forecast', c);
                  }}
                  className="rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 px-2 py-0.5 text-slate-300 text-[11px] transition cursor-pointer"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="my-8 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            <p className="text-sm font-medium text-slate-300">
              DJ Nova is searching the live frequencies for grounded data...
            </p>
          </div>
        )}

        {/* Segment Result Card */}
        {!isLoading && segmentResult && (
          <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-slate-900/60 p-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400">
                🎙️ {segmentResult.title}
              </span>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700/50">
                READY TO BROADCAST
              </span>
            </div>

            {/* Script */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 text-sm italic text-slate-200 leading-relaxed">
              "{segmentResult.spokenScript}"
            </div>

            {/* Grounded City Forecast Details if available */}
            {segmentResult.cityForecast && (
              <div className="flex flex-col gap-3 rounded-xl bg-slate-950/90 border border-amber-500/20 p-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {segmentResult.cityForecast.temperature && (
                    <div className="rounded-lg bg-slate-900 border border-slate-800 p-2">
                      <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500 uppercase">
                        <Thermometer className="h-3 w-3 text-amber-400" /> Temp
                      </span>
                      <span className="font-bold text-amber-300 text-sm mt-0.5 block truncate">
                        {segmentResult.cityForecast.temperature}
                      </span>
                    </div>
                  )}
                  {segmentResult.cityForecast.condition && (
                    <div className="rounded-lg bg-slate-900 border border-slate-800 p-2">
                      <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500 uppercase">
                        <CloudSun className="h-3 w-3 text-cyan-400" /> Condition
                      </span>
                      <span className="font-bold text-cyan-300 text-xs mt-0.5 block truncate">
                        {segmentResult.cityForecast.condition}
                      </span>
                    </div>
                  )}
                  {segmentResult.cityForecast.humidity && (
                    <div className="rounded-lg bg-slate-900 border border-slate-800 p-2">
                      <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500 uppercase">
                        <Droplets className="h-3 w-3 text-blue-400" /> Humidity
                      </span>
                      <span className="font-semibold text-slate-200 text-xs mt-0.5 block truncate">
                        {segmentResult.cityForecast.humidity}
                      </span>
                    </div>
                  )}
                  {segmentResult.cityForecast.wind && (
                    <div className="rounded-lg bg-slate-900 border border-slate-800 p-2">
                      <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500 uppercase">
                        <Wind className="h-3 w-3 text-emerald-400" /> Wind
                      </span>
                      <span className="font-semibold text-slate-200 text-xs mt-0.5 block truncate">
                        {segmentResult.cityForecast.wind}
                      </span>
                    </div>
                  )}
                </div>

                {segmentResult.cityForecast.headlines && segmentResult.cityForecast.headlines.length > 0 && (
                  <div className="flex flex-col gap-1 rounded-lg bg-slate-900/60 p-2 text-xs">
                    <span className="flex items-center gap-1 text-[10px] font-mono uppercase text-slate-400">
                      <Newspaper className="h-3 w-3 text-purple-400" /> Local Headlines
                    </span>
                    {segmentResult.cityForecast.headlines.map((hl, i) => (
                      <div key={i} className="text-slate-300 text-xs flex items-center gap-1.5">
                        <span className="text-purple-400">•</span>
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                )}

                {segmentResult.cityForecast.sources && segmentResult.cityForecast.sources.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Verified Sources:</span>
                    {segmentResult.cityForecast.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center gap-1 rounded-md bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400 hover:text-purple-300 transition"
                      >
                        <span>{src.title}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Two Song Battle voting tracks if present */}
            {segmentResult.challengeTracks && segmentResult.challengeTracks.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase text-slate-400">
                  Pick the Winner to Play On-Air:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {segmentResult.challengeTracks.map((tr, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleBroadcastSegment(segmentResult, tr)}
                      className="flex flex-col items-start gap-1 rounded-2xl bg-slate-950/80 p-3.5 text-left border border-slate-800 hover:border-purple-500 transition group cursor-pointer"
                    >
                      <span className="text-xs font-bold text-white group-hover:text-purple-400">
                        {tr.title}
                      </span>
                      <span className="text-[11px] text-slate-400">by {tr.artist}</span>
                      <p className="text-[11px] text-purple-300 mt-1 italic">{tr.pitch}</p>
                      <span className="mt-2 flex items-center gap-1 text-[11px] font-bold text-purple-400">
                        <Play className="h-3 w-3" /> Drop This Track
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Data Card (Mood Weather) */}
            {segmentResult.interactiveData && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-xs">
                {segmentResult.interactiveData.temperature && (
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">VIBE TEMP</span>
                    <span className="font-bold text-amber-300">
                      {segmentResult.interactiveData.temperature}
                    </span>
                  </div>
                )}
                {segmentResult.interactiveData.condition && (
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">SKYLINE COND.</span>
                    <span className="font-bold text-cyan-300">
                      {segmentResult.interactiveData.condition}
                    </span>
                  </div>
                )}
                {segmentResult.interactiveData.advice && (
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">NOVA'S ADVICE</span>
                    <span className="font-medium text-white">
                      {segmentResult.interactiveData.advice}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Trigger Button */}
            <button
              onClick={() => handleBroadcastSegment(segmentResult)}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-purple-500/20 hover:opacity-90 active:scale-95 transition cursor-pointer"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>Broadcast Segment on Air</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


