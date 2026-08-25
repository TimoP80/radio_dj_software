export type GenreKey =
  | 'synthwave'
  | 'lofi'
  | 'deephouse'
  | 'jazz'
  | 'indierock'
  | 'neosoul'
  | 'pop'
  | 'ambient';

export interface GenreConfig {
  key: GenreKey;
  label: string;
  sublabel: string;
  defaultBpm: number;
  color: string;
  accentColor: string;
  gradient: string;
  vibeDescription: string;
}

export interface RadioTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre: string;
  bpm: number;
  durationSec: number;
  currentTimeSec?: number;
  funFact?: string;
  lyricTeaser?: string;
  energyLevel?: string;
  soundPalette?: string;
  transitionScript?: string;
  coverArtSeed?: string;
  albumArtUrl?: string;
  year?: string | number;
  trackNo?: number;
  // Hard drive / local music properties
  isLocalFile?: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}

export interface DJMessage {
  id: string;
  timestamp: string;
  sender: 'nova' | 'listener' | 'station' | 'system';
  callerName?: string;
  text: string;
  audioBase64?: string;
  nowPlayingBanner?: string;
  track?: RadioTrack;
  segmentTitle?: string;
  isSpoken?: boolean;
}

export interface CuratedSet {
  setName: string;
  stationName: string;
  introSpeech: string;
  outroSpeech?: string;
  tracks: RadioTrack[];
}

export interface RadioStationState {
  stationName: string;
  frequency: string; // e.g. "104.7 FM"
  isOnAir: boolean;
  isMuted: boolean;
  volume: number; // 0 to 1
  currentGenre: GenreKey;
  mood: string;
  isDJSpeaking: boolean;
  voiceGender: 'Zephyr' | 'Puck' | 'Fenrir' | 'Kore';
  voiceMuted: boolean;
  musicMuted: boolean;
  duckingAmount: number; // 0 to 1
  activeSegment: string | null;
  // Audio playback source
  audioSourceMode: 'synth' | 'local_library';
  localTracksCount: number;
  activeLocalIndex: number;
  // Continuous broadcast & recurring Station ID (every 15 min)
  broadcastSeconds: number;
  autoStationIDEnabled: boolean;
  stationIDIntervalSec: number; // 900 seconds (15 minutes)
  lastStationIDSec: number;
}

export type SoundEffectType =
  | 'chime'
  | 'vinyl_scratch'
  | 'station_id'
  | 'airhorn'
  | 'phone_ring'
  | 'tape_rewind'
  | 'bass_drop'
  | 'applause';

export interface GroundingSource {
  title: string;
  url: string;
}

export interface CityForecastData {
  cityName: string;
  title: string;
  spokenScript: string;
  stationId?: string;
  temperature?: string;
  condition?: string;
  forecastSummary?: string;
  highLow?: string;
  humidity?: string;
  wind?: string;
  headlines?: string[];
  djTip?: string;
  sources?: GroundingSource[];
}

export interface InteractiveSegmentData {
  title: string;
  spokenScript: string;
  stationId?: string;
  challengeTracks?: Array<{
    title: string;
    artist: string;
    pitch: string;
  }>;
  interactiveData?: {
    badge?: string;
    headline?: string;
    detail?: string;
    temperature?: string;
    condition?: string;
    advice?: string;
  };
  cityForecast?: CityForecastData;
}
