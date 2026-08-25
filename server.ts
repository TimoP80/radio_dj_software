import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const DJ_NOVA_SYSTEM_PROMPT = `
You are "DJ Nova", an energetic, charismatic, and professional AI radio DJ. You host a live, interactive internet radio show on "Midnight Frequency" (or the station name chosen by the listener).

### Core Personality & Voice
- Warm, upbeat, slightly playful, and highly engaging.
- Speak in a natural, punchy radio-DJ style: smooth transitions, clever wordplay, short and punchy sentences, rhythmic cadence.
- Use light humor and occasional pop-culture references, but never force them.
- Always sound like you're talking directly to ONE person (the listener), not a stadium crowd.
- Keep energy high but not exhausting — match the vibe of the current genre/mood (e.g., lo-fi = relaxed & intimate, house/electronic = hypnotic and smooth, rock = edgier & energetic, pop = bright & fun, jazz = sultry & midnight cool).
- Write spoken radio dialogue using natural punctuation: ellipses... for pauses, emphasis with *asterisks* or UPPERCASE sparingly for punchy inflection.
- NEVER break character or mention you are an AI. Stay 100% in the live studio moment.

### Output Formatting
- When introducing or playing a song, include:
  🎵 Now playing: "Song Title" by Artist
- Keep spoken talk-ups around 15–40 seconds of crisp dialogue (approx 35–90 words).
- Include fun facts, lyric teasers, or personal "why I love this track" tidbits.
- If taking a request or reacting to a caller, give a real radio shoutout!
`;

// API endpoint for DJ Nova live banter & track introductions
app.post('/api/dj/talk', async (req, res) => {
  try {
    const {
      mode, // 'open' | 'intro' | 'transition' | 'caller' | 'segment' | 'custom'
      stationName = 'Midnight Frequency',
      genre = 'Synthwave & Lo-Fi',
      mood = 'Late Night Chill',
      currentTrack,
      nextTrack,
      userMessage,
      callerName = 'Caller on Line 1',
      segmentType,
      history = [],
    } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      // Fallback DJ response if no API key
      const fallbackResponses: Record<string, string> = {
        open: `Hey… you’re locked into ${stationName} with DJ Nova. The night’s just getting started, the signal is crystal clear, and the vibes are unmatched. What are we feeling tonight — something to vibe to, something to dance to, or got a special track on your mind?`,
        caller: `Line 1 is live! Shoutout to our friend checking in: "${userMessage || 'Sending love to the studio'}". I got you covered right here on ${stationName}. Let’s queue up something special for your late-night frequency…`,
        intro: `You're riding with DJ Nova on ${stationName}. Up next, we’re slipping into some pure sonic gold. 🎵 Now playing: "${currentTrack?.title || 'Midnight Reverie'}" by ${currentTrack?.artist || 'Nova Sound Collective'}. Let the bassline take over…`,
      };
      return res.json({
        spokenText: fallbackResponses[mode] || fallbackResponses.open,
        stationId: `104.7 ${stationName}`,
        trackInfo: currentTrack || {
          title: 'Midnight Reverie',
          artist: 'Nova Sound Collective',
          album: 'Frequency Shift',
          genre: genre,
          bpm: 110,
          funFact: 'Recorded during a 3 AM thunderstorm in Tokyo.',
          lyricTeaser: 'Neon lights reflect the dreams we left behind…',
        },
      });
    }

    const prompt = `
Station: "${stationName}"
Current Genre: "${genre}"
Mood: "${mood}"
Interaction Mode: "${mode}"
${userMessage ? `Listener Message/Caller: "${userMessage}" (from ${callerName})` : ''}
${currentTrack ? `Current Track: "${currentTrack.title}" by ${currentTrack.artist}` : ''}
${nextTrack ? `Next Track: "${nextTrack.title}" by ${nextTrack.artist}` : ''}
${segmentType ? `Special Segment: "${segmentType}"` : ''}

Generate DJ Nova's on-air spoken response, plus song metadata if selecting/playing a track.
Keep the speech punchy, authentic, charismatic, and formatted for radio delivery.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction: DJ_NOVA_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            spokenText: {
              type: Type.STRING,
              description: 'The spoken dialogue of DJ Nova with pauses (...), emphasis, and charismatic radio delivery.',
            },
            stationId: {
              type: Type.STRING,
              description: 'Radio station ID tag, e.g. "104.7 Midnight Frequency - All Vibes, No Static".',
            },
            nowPlayingBanner: {
              type: Type.STRING,
              description: 'Standard formatted now playing string: 🎵 Now playing: "Song Title" by Artist',
            },
            trackInfo: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                artist: { type: Type.STRING },
                album: { type: Type.STRING },
                genre: { type: Type.STRING },
                bpm: { type: Type.NUMBER },
                energyLevel: { type: Type.STRING },
                funFact: { type: Type.STRING },
                lyricTeaser: { type: Type.STRING },
                soundPalette: { type: Type.STRING, description: 'e.g. "Warm analog synth, 808 sub, tape delay"' },
              },
              required: ['title', 'artist', 'genre'],
            },
            segmentTitle: {
              type: Type.STRING,
              description: 'If a mini-segment was triggered, provide its punchy name.',
            },
            nextTease: {
              type: Type.STRING,
              description: 'A 5-word teaser for what is coming up next in the show.',
            },
          },
          required: ['spokenText', 'trackInfo', 'stationId'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/dj/talk:', error);
    res.status(500).json({
      error: 'DJ Nova station transmission glitch. Switching to backup turntable.',
      fallback: true,
    });
  }
});

// API endpoint for generating a full DJ set / playlist
app.post('/api/dj/curate-set', async (req, res) => {
  try {
    const {
      stationName = 'Midnight Frequency',
      genre = 'Synthwave & Electronic',
      mood = 'Late Night Drive',
      trackCount = 6,
      theme,
      requestedArtists = [],
    } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        setName: `${genre} Midnight Odyssey`,
        stationName,
        introSpeech: `DJ Nova here on ${stationName}! We’ve dialed in a seamless ${trackCount}-track voyage for your late-night cruise. Sit back and ride this sonic wave with me…`,
        tracks: [
          {
            title: 'Neon Horizon',
            artist: 'Kavinsky Drive',
            genre: genre,
            bpm: 118,
            durationSec: 210,
            funFact: 'Synthesized using original 1984 Juno-106 circuitry.',
            transitionScript: 'Fading out of that silky intro… now strap in as we hit the open highway.',
          },
          {
            title: 'Midnight Rain in Shibuya',
            artist: 'Tokyo Lo-Fi Club',
            genre: genre,
            bpm: 85,
            durationSec: 180,
            funFact: 'Samples actual binaural rain recordings taken outside Shibuya Station at 2 AM.',
            transitionScript: 'Let’s bring the tempo down real smooth… feel that warm rain against the neon.',
          },
          {
            title: 'Starlight Echoes',
            artist: 'Solaris 9',
            genre: genre,
            bpm: 124,
            durationSec: 240,
            funFact: 'Featured on the underground radio charts across 14 countries.',
            transitionScript: 'Feel that bass drum creeping up? DJ Nova is taking you straight to the cosmos.',
          },
        ],
      });
    }

    const prompt = `
Station: "${stationName}"
Genre: "${genre}"
Mood: "${mood}"
Number of Tracks: ${trackCount}
${theme ? `Theme: "${theme}"` : ''}
${requestedArtists.length > 0 ? `Requested Artists/Vibe: ${requestedArtists.join(', ')}` : ''}

Curate an incredible, cohesive radio set curated by DJ Nova.
For each track, provide authentic title, artist, BPM, genre tag, a fun trivia/fact, and DJ Nova's smooth on-air transition script into the track.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction: DJ_NOVA_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            setName: { type: Type.STRING },
            introSpeech: { type: Type.STRING },
            outroSpeech: { type: Type.STRING },
            tracks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  artist: { type: Type.STRING },
                  album: { type: Type.STRING },
                  genre: { type: Type.STRING },
                  bpm: { type: Type.NUMBER },
                  durationSec: { type: Type.NUMBER },
                  funFact: { type: Type.STRING },
                  lyricTeaser: { type: Type.STRING },
                  transitionScript: {
                    type: Type.STRING,
                    description: 'DJ Nova’s 10-25 second spoken radio link introducing this specific track.',
                  },
                },
                required: ['title', 'artist', 'genre', 'funFact', 'transitionScript'],
              },
            },
          },
          required: ['setName', 'introSpeech', 'tracks'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/dj/curate-set:', error);
    res.status(500).json({ error: 'Failed to curate set' });
  }
});

// In-memory cache for generated TTS audio to optimize quota and speed up repeated broadcasts
const ttsAudioCache = new Map<string, { audioBase64: string; mimeType: string; sampleRate: number; timestamp: number }>();

// API endpoint for Text-to-Speech audio generation using Gemini TTS
app.post('/api/dj/tts', async (req, res) => {
  try {
    const { text, voice = 'Zephyr', tone = 'energetic radio DJ' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    // Clean text for speech synthesis (strip emoji, markdown, asterisks, brackets, and banner tags)
    const cleanText = text
      .replace(/🎵[^\n]+/g, '')
      .replace(/\[[^\]]+\]/g, '') // remove [stage directions]
      .replace(/\([^\)]+\)/g, '') // remove (parentheticals)
      .replace(/\*+/g, '') // remove markdown bold/italics
      .replace(/#{1,6}\s+/g, '') // remove markdown headers
      .replace(/https?:\/\/\S+/g, '') // remove raw URLs
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      return res.status(400).json({ error: 'Cleaned text is empty' });
    }

    // Check cache
    const cacheKey = `${voice}__${cleanText.toLowerCase()}`;
    if (ttsAudioCache.has(cacheKey)) {
      const cached = ttsAudioCache.get(cacheKey)!;
      return res.json({
        available: true,
        source: 'cache',
        audioBase64: cached.audioBase64,
        mimeType: cached.mimeType,
        sampleRate: cached.sampleRate,
        voice,
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json({
        available: false,
        source: 'fallback',
        reason: 'NO_API_KEY',
        message: 'No API key configured for server TTS; client Web Speech fallback enabled.',
      });
    }

    // Call Gemini TTS model (gemini-3.1-flash-tts-preview)
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [
        {
          parts: [
            {
              text: `Say in a warm, charismatic, polished radio DJ voice (${tone}): ${cleanText}`,
            },
          ],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice, // 'Zephyr', 'Puck', 'Fenrir', 'Kore', 'Charon'
            },
          },
        },
      },
    });

    let base64Audio = '';
    let mimeType = 'audio/pcm;rate=24000';

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        base64Audio = part.inlineData.data;
        if (part.inlineData.mimeType) {
          mimeType = part.inlineData.mimeType;
        }
        break;
      }
    }

    if (base64Audio) {
      // Store in memory cache (cap at 200 items)
      if (ttsAudioCache.size > 200) {
        const firstKey = ttsAudioCache.keys().next().value;
        if (firstKey) ttsAudioCache.delete(firstKey);
      }
      ttsAudioCache.set(cacheKey, {
        audioBase64: base64Audio,
        mimeType,
        sampleRate: 24000,
        timestamp: Date.now(),
      });

      return res.json({
        available: true,
        source: 'gemini_tts',
        audioBase64: base64Audio,
        mimeType,
        sampleRate: 24000,
        voice,
      });
    }

    return res.json({
      available: false,
      source: 'fallback',
      reason: 'NO_AUDIO_RETURNED',
      message: 'TTS generation returned no audio stream.',
    });
  } catch (error: any) {
    const isQuota = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    console.warn(`TTS generation notice (${isQuota ? 'Quota Limit' : 'Error'}):`, error?.message || error);

    return res.json({
      available: false,
      fallback: true,
      source: 'fallback',
      reason: isQuota ? 'QUOTA_EXHAUSTED' : 'SERVER_ERROR',
      error: error?.message,
    });
  }
});

// API endpoint for live grounded city forecast and news segment
app.post('/api/dj/city-forecast', async (req, res) => {
  try {
    const { city = 'Tokyo', type = 'both', stationName = 'Midnight Frequency' } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        cityName: city,
        title: `Live City Pulse: ${city}`,
        spokenScript: `Checking in on the weather and nightlife over in ${city} for all our listeners tuning in from across the globe! Looking at clear midnight skies, a cool 68 degrees, and calm winds. Stay smooth out there on ${stationName}!`,
        stationId: `104.7 ${stationName}`,
        temperature: '68°F / 20°C',
        condition: 'Clear Night Sky',
        forecastSummary: 'Mild evening with smooth breezy conditions throughout the night.',
        highLow: 'High 74°F / Low 62°F',
        humidity: '58%',
        wind: '8 mph SW',
        headlines: [
          `Nightlife and culture buzzing across ${city}`,
          `Local transit and late-night routes running on schedule`,
        ],
        djTip: `Grab a warm coffee or cold brew and keep the volume dialed in right here.`,
        sources: [
          { title: `${city} Live Weather & City Pulse`, url: `https://www.google.com/search?q=${encodeURIComponent(city + ' weather headlines')}` }
        ],
      });
    }

    const prompt = `
You are DJ Nova, the charismatic, smooth, energetic host of the radio station "${stationName}".
Use Google Search Grounding to fetch the REAL, CURRENT LIVE WEATHER and FRESH LOCAL HEADLINES / HAPPENINGS for the city: "${city}".

Generate a real-time on-air radio segment for DJ Nova where you read the live city forecast, current temperature, atmospheric conditions, and any notable local news/culture headlines for the people in ${city}.

Requirements:
1. "cityName": formatted clean city name (e.g. "${city}").
2. "title": catchy radio segment headline, e.g. "Live City Forecast & Pulse: ${city}".
3. "spokenScript": DJ Nova's on-air spoken broadcast script (approx 45-85 words, charismatic, punchy, radio cadence with ellipses (...) and upbeat DJ flair). DJ Nova directly addresses listeners in ${city} or anyone imagining being there, mentioning the exact live temperature, conditions, and news highlights.
4. "temperature": current real temperature, e.g. "68°F (20°C)".
5. "condition": current real weather condition, e.g. "Scattered clouds, light breeze".
6. "forecastSummary": 1-2 sentence real-time forecast summary.
7. "highLow": e.g. "High 75°F / Low 58°F".
8. "humidity": e.g. "62%".
9. "wind": e.g. "10 mph NE".
10. "headlines": array of 2 to 3 real current local news or cultural headlines from the search.
11. "djTip": DJ Nova's witty radio tip for locals tonight.

Output MUST be valid JSON matching this structure:
{
  "cityName": string,
  "title": string,
  "spokenScript": string,
  "stationId": string,
  "temperature": string,
  "condition": string,
  "forecastSummary": string,
  "highLow": string,
  "humidity": string,
  "wind": string,
  "headlines": string[],
  "djTip": string
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction: DJ_NOVA_SYSTEM_PROMPT,
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
      },
    });

    // Extract search grounding sources if present
    const sources: Array<{ title: string; url: string }> = [];
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const groundingChunks = (candidates[0] as any)?.groundingMetadata?.groundingChunks;
      if (Array.isArray(groundingChunks)) {
        for (const chunk of groundingChunks) {
          if (chunk.web?.uri) {
            sources.push({
              title: chunk.web.title || `${city} Web Source`,
              url: chunk.web.uri,
            });
          }
        }
      }
    }

    let parsed: any = {};
    try {
      let rawText = response.text || '{}';
      rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      console.warn('JSON parsing from grounded response warning:', parseErr);
      parsed = {
        cityName: city,
        title: `Live City Forecast: ${city}`,
        spokenScript: response.text?.slice(0, 300) || `Checking the live pulse on ${city}!`,
      };
    }

    if (sources.length > 0) {
      parsed.sources = sources.slice(0, 5);
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/dj/city-forecast:', error);
    res.status(500).json({ error: 'Failed to fetch live city forecast' });
  }
});

// API endpoint for interactive mini-segments
app.post('/api/dj/segment', async (req, res) => {
  try {
    const { segmentType, stationName = 'Midnight Frequency', mood = 'Chill', genre = 'Lo-Fi' } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        title: 'Late Night Mood Forecast',
        spokenScript: `Looking out the studio window into the late-night skyline… we've got a 100% chance of smooth vibes and zero static precipitation. Keep those headphones snug!`,
        interactiveData: {
          temperature: '72° and Groovy',
          condition: 'Clear Skies & Deep Bass',
          advice: 'Ideal conditions for rolling the windows down.',
        },
      });
    }

    let segmentPrompt = '';
    if (segmentType === 'weather_of_the_mood') {
      segmentPrompt = `Generate a witty, poetic radio DJ "Mood Weather Forecast" for the listener on station "${stationName}". Include an interactive temperature, conditions, and DJ Nova forecast advice.`;
    } else if (segmentType === 'two_song_challenge') {
      segmentPrompt = `Generate a "Two-Song Radio Showdown" on station "${stationName}". DJ Nova presents 2 contrasting tracks in "${genre}" and asks the listener to pick which one drops next!`;
    } else if (segmentType === 'the_vault') {
      segmentPrompt = `Generate "The Vinyl Vault" secret trivia segment on station "${stationName}". DJ Nova pulls an obscure, incredible music fact about an iconic record.`;
    } else {
      segmentPrompt = `Generate a charismatic radio station ID and jingle tease for station "${stationName}" hosted by DJ Nova.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: segmentPrompt,
      config: {
        systemInstruction: DJ_NOVA_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            spokenScript: { type: Type.STRING },
            stationId: { type: Type.STRING },
            challengeTracks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  artist: { type: Type.STRING },
                  pitch: { type: Type.STRING },
                },
                required: ['title', 'artist', 'pitch'],
              },
            },
            interactiveData: {
              type: Type.OBJECT,
              properties: {
                badge: { type: Type.STRING },
                headline: { type: Type.STRING },
                detail: { type: Type.STRING },
              },
            },
          },
          required: ['title', 'spokenScript'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/dj/segment:', error);
    res.status(500).json({ error: 'Failed to generate segment' });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎙️ DJ Nova Broadcast Server on air at http://0.0.0.0:${PORT}`);
  });
}

startServer();
