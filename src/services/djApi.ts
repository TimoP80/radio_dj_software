import { CuratedSet, DJMessage, GenreKey, InteractiveSegmentData, RadioTrack, CityForecastData } from '../types';

export interface TalkRequestParams {
  mode: 'open' | 'intro' | 'transition' | 'caller' | 'segment' | 'custom';
  stationName: string;
  genre: string;
  mood: string;
  currentTrack?: RadioTrack;
  nextTrack?: RadioTrack;
  userMessage?: string;
  callerName?: string;
  segmentType?: string;
  history?: Array<{ sender: string; text: string }>;
}

export interface TalkResponse {
  spokenText: string;
  stationId: string;
  nowPlayingBanner?: string;
  trackInfo: RadioTrack;
  segmentTitle?: string;
  nextTease?: string;
}

export async function requestDJTalk(params: TalkRequestParams): Promise<TalkResponse> {
  const res = await fetch('/api/dj/talk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error('DJ Nova studio transmission error');
  }

  return await res.json();
}

export async function requestCuratedSet(params: {
  stationName: string;
  genre: string;
  mood: string;
  trackCount?: number;
  theme?: string;
  requestedArtists?: string[];
}): Promise<CuratedSet> {
  const res = await fetch('/api/dj/curate-set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error('Failed to generate set curation');
  }

  return await res.json();
}

export async function requestTTSAudio(
  text: string,
  voice: 'Zephyr' | 'Puck' | 'Fenrir' | 'Kore' = 'Zephyr',
  tone?: string
): Promise<{
  available: boolean;
  source?: 'gemini_tts' | 'cache' | 'fallback';
  reason?: string;
  audioBase64?: string;
  mimeType?: string;
  sampleRate?: number;
  voice?: string;
}> {
  try {
    const res = await fetch('/api/dj/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, tone }),
    });

    if (!res.ok) {
      return { available: false, source: 'fallback', reason: 'HTTP_ERROR' };
    }

    return await res.json();
  } catch (err) {
    return { available: false, source: 'fallback', reason: 'NETWORK_ERROR' };
  }
}

export async function requestSegment(params: {
  segmentType: string;
  stationName: string;
  mood?: string;
  genre?: string;
}): Promise<InteractiveSegmentData> {
  const res = await fetch('/api/dj/segment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error('Failed to load radio segment');
  }

  return await res.json();
}

export async function requestCityForecast(params: {
  city: string;
  type?: 'weather' | 'headlines' | 'both';
  stationName: string;
}): Promise<CityForecastData> {
  const res = await fetch('/api/dj/city-forecast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error('Failed to load live city forecast');
  }

  return await res.json();
}

