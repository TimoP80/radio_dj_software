import React, { useEffect, useState, useRef } from 'react';
import {
  Radio,
  Sparkles,
  PhoneCall,
  Volume2,
  VolumeX,
  Flame,
  Layers,
  Zap,
  Disc3,
  Play,
  Pause,
  Headphones,
  HardDrive,
} from 'lucide-react';
import {
  DJMessage,
  GenreKey,
  RadioStationState,
  RadioTrack,
  SoundEffectType,
} from './types';
import { GENRE_CONFIGS, INITIAL_TRACKS } from './data/genrePresets';
import { audioEngine } from './services/audioEngine';
import { requestDJTalk, requestTTSAudio } from './services/djApi';
import { BroadcastHeader } from './components/BroadcastHeader';
import { NowPlayingDeck } from './components/NowPlayingDeck';
import { NovaStudioConsole } from './components/NovaStudioConsole';
import { ListenerHotline } from './components/ListenerHotline';
import { SetCuratorDrawer } from './components/SetCuratorDrawer';
import { MiniSegmentsModal } from './components/MiniSegmentsModal';
import { LocalLibraryDrawer } from './components/LocalLibraryDrawer';

export default function App() {
  const [stationState, setStationState] = useState<RadioStationState>({
    stationName: 'Midnight Frequency',
    frequency: '104.7 FM',
    isOnAir: false,
    isMuted: false,
    volume: 0.85,
    currentGenre: 'synthwave',
    mood: 'Late Night Electric Chill',
    isDJSpeaking: false,
    voiceGender: 'Zephyr',
    voiceMuted: false,
    musicMuted: false,
    duckingAmount: 0.78,
    activeSegment: null,
    audioSourceMode: 'synth',
    localTracksCount: 0,
    activeLocalIndex: 0,
    broadcastSeconds: 0,
    autoStationIDEnabled: true,
    stationIDIntervalSec: 900, // 15 minutes (900 seconds)
    lastStationIDSec: 0,
  });

  const [currentTrack, setCurrentTrack] = useState<RadioTrack>(
    INITIAL_TRACKS.synthwave[0]
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [localTracks, setLocalTracks] = useState<RadioTrack[]>([]);
  const [messages, setMessages] = useState<DJMessage[]>([]);
  const [isCuratorOpen, setIsCuratorOpen] = useState(false);
  const [isSegmentsOpen, setIsSegmentsOpen] = useState(false);
  const [isLocalCrateOpen, setIsLocalCrateOpen] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [hasStartedShow, setHasStartedShow] = useState(false);

  // Reference to stationState and localTracks to avoid stale closures in audio callbacks
  const stateRef = useRef(stationState);
  stateRef.current = stationState;

  const localTracksRef = useRef(localTracks);
  localTracksRef.current = localTracks;

  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;

  // Initialize audioEngine time update and track ended listeners
  useEffect(() => {
    audioEngine.setOnTimeUpdate((time, dur) => {
      setCurrentTime(time);
    });

    audioEngine.setOnTrackEnded(() => {
      // Auto-advance to next track when playing local hard drive files
      if (stateRef.current.audioSourceMode === 'local_library' && localTracksRef.current.length > 0) {
        const nextIdx = (stateRef.current.activeLocalIndex + 1) % localTracksRef.current.length;
        const nextTrack = localTracksRef.current[nextIdx];
        if (nextTrack && nextTrack.fileUrl) {
          setStationState((prev) => ({ ...prev, activeLocalIndex: nextIdx }));
          setCurrentTrack(nextTrack);
          audioEngine.playLocalTrack(nextTrack.fileUrl);
          // Optional on-air DJ talk-up on transition
          triggerDJTalk('intro', undefined, undefined, nextTrack);
        }
      }
    });
  }, []);

  // Trigger Signature Radio Station ID Jingle & On-Air ID Liner
  const triggerStationID = (manual = false) => {
    const { stationName, frequency } = stateRef.current;

    // Play signature multi-layered broadcast jingle with audio ducking
    audioEngine.playStationIDJingle();

    const elapsedMin = Math.max(1, Math.round(stateRef.current.broadcastSeconds / 60));
    setStationState((prev) => ({
      ...prev,
      lastStationIDSec: prev.broadcastSeconds,
    }));

    const liners = [
      `You're locked into ${stationName}, ${frequency} on your FM dial. Non-stop music, zero commercial interruptions.`,
      `This is ${stationName} at ${frequency}. The heartbeat of the city's late-night frequency.`,
      `Station Identification: ${stationName}, ${frequency}. High definition sound broadcasting across the airwaves.`,
      `104.7 FM, ${stationName}. Where the night comes alive with continuous curated rhythms.`,
    ];
    const chosenLiner = liners[Math.floor(Math.random() * liners.length)];

    const newMsg: DJMessage = {
      id: `station-id-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      sender: 'station',
      text: `📻 [STATION ID BROADCAST] ${stationName} • ${frequency} — ${
        manual
          ? 'Live On-Air Station Identification Jingle'
          : `${elapsedMin} Minutes Continuous Broadcast Milestone`
      }`,
      segmentTitle: `Station ID • ${frequency}`,
    };

    setMessages((prev) => [newMsg, ...prev]);

    // Layer DJ Nova's Station ID liner over the jingle tail
    setTimeout(() => {
      speakDJDialogue(chosenLiner);
    }, 1300);
  };

  // Continuous broadcast time counter & 15-minute recurring Station ID trigger
  useEffect(() => {
    if (!stationState.isOnAir) return;

    const interval = setInterval(() => {
      setStationState((prev) => {
        const nextSec = prev.broadcastSeconds + 1;
        const intervalSec = prev.stationIDIntervalSec || 900; // 15 minutes (900s)

        // Check if continuous broadcast hit the 15-minute milestone
        if (prev.autoStationIDEnabled && nextSec > 0 && nextSec % intervalSec === 0) {
          setTimeout(() => {
            triggerStationID(false);
          }, 0);
        }

        return {
          ...prev,
          broadcastSeconds: nextSec,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [stationState.isOnAir]);

  // Speak DJ Nova dialogue through Gemini TTS or browser speech
  const speakDJDialogue = async (text: string, onDone?: () => void) => {
    setStationState((prev) => ({ ...prev, isDJSpeaking: true }));

    try {
      // 1. Attempt Gemini TTS from server
      const ttsResult = await requestTTSAudio(
        text,
        stateRef.current.voiceGender,
        'energetic, smooth radio DJ'
      );

      if (ttsResult.available && ttsResult.audioBase64) {
        await audioEngine.playBase64PCM(
          ttsResult.audioBase64,
          24000,
          () => {
            setStationState((prev) => ({ ...prev, isDJSpeaking: false }));
            if (onDone) onDone();
          }
        );
        return;
      }
    } catch (err) {
      console.warn('Server TTS unavailable, using Web Speech fallback:', err);
    }

    // 2. Fallback to high-definition Web Speech API with persona matching & audio ducking
    audioEngine.speakWithWebSpeech(
      text,
      stateRef.current.voiceGender,
      () => setStationState((prev) => ({ ...prev, isDJSpeaking: true })),
      () => {
        setStationState((prev) => ({ ...prev, isDJSpeaking: false }));
        if (onDone) onDone();
      }
    );
  };

  // Trigger DJ Nova spoken talk-up / banter / caller response
  const triggerDJTalk = async (
    mode: 'open' | 'intro' | 'transition' | 'caller' | 'segment' | 'custom',
    userMessage?: string,
    callerName?: string,
    customTrack?: RadioTrack
  ) => {
    audioEngine.playSFX('chime');

    const targetTrack = customTrack || currentTrackRef.current;

    try {
      const talkData = await requestDJTalk({
        mode,
        stationName: stateRef.current.stationName,
        genre: targetTrack.isLocalFile
          ? `Real Hard Drive Music (${targetTrack.genre || 'Local Audio'})`
          : GENRE_CONFIGS[stateRef.current.currentGenre].label,
        mood: targetTrack.isLocalFile
          ? `Playing user's personal music files from disk (${targetTrack.title} by ${targetTrack.artist})`
          : stateRef.current.mood,
        currentTrack: targetTrack,
        userMessage,
        callerName,
      });

      // Preserve local file properties if current track is a local disk file
      if (talkData.trackInfo && (mode === 'intro' || mode === 'transition')) {
        setCurrentTrack((prev) => {
          if (targetTrack.isLocalFile) {
            return {
              ...prev,
              funFact: talkData.trackInfo.funFact || prev.funFact,
              lyricTeaser: talkData.trackInfo.lyricTeaser || prev.lyricTeaser,
              energyLevel: talkData.trackInfo.energyLevel || prev.energyLevel,
            };
          }
          return {
            ...prev,
            ...talkData.trackInfo,
            id: `track-${Date.now()}`,
          };
        });
      }

      const newMsg: DJMessage = {
        id: `msg-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        sender: 'nova',
        text: talkData.spokenText,
        nowPlayingBanner: talkData.nowPlayingBanner || `🎵 Now playing: "${targetTrack.title}" by ${targetTrack.artist}`,
        track: targetTrack,
        segmentTitle: talkData.segmentTitle,
      };

      setMessages((prev) => [newMsg, ...prev]);

      // Speak dialogue
      speakDJDialogue(talkData.spokenText);
    } catch (err) {
      console.error('Error triggering DJ Talk:', err);
      // Fallback message
      const fallbackText = targetTrack.isLocalFile
        ? `You’re locked into ${stateRef.current.stationName} with DJ Nova! Spinning this fresh cut from the hard drive crate: "${targetTrack.title}" by ${targetTrack.artist}. Turn the volume up!`
        : `You’re locked into ${stateRef.current.stationName} with DJ Nova. The night’s just getting started and the signal is crystal clear!`;

      const newMsg: DJMessage = {
        id: `msg-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        sender: 'nova',
        text: fallbackText,
      };
      setMessages((prev) => [newMsg, ...prev]);
      speakDJDialogue(fallbackText);
    }
  };

  // Toggle live music playback (handles both procedural synth and local disk files)
  const handleTogglePlay = async () => {
    if (isPlaying) {
      audioEngine.stopMusic();
      setIsPlaying(false);
      setStationState((prev) => ({ ...prev, isOnAir: false }));
    } else {
      if (stationState.audioSourceMode === 'local_library' && currentTrack.fileUrl && currentTrack.isLocalFile) {
        await audioEngine.playLocalTrack(currentTrack.fileUrl, currentTime);
      } else {
        audioEngine.startMusic(stationState.currentGenre);
      }

      setIsPlaying(true);
      setStationState((prev) => ({ ...prev, isOnAir: true }));

      if (!hasStartedShow) {
        setHasStartedShow(true);
        triggerDJTalk('open');
      }
    }
  };

  // Switch genre dial (switches to synth mode)
  const handleGenreSelect = (genreKey: GenreKey) => {
    const config = GENRE_CONFIGS[genreKey];
    setStationState((prev) => ({
      ...prev,
      currentGenre: genreKey,
      mood: config.sublabel,
      audioSourceMode: 'synth',
    }));

    audioEngine.setGenre(genreKey);

    // Pick starter track for that genre
    const tracks = INITIAL_TRACKS[genreKey] || INITIAL_TRACKS.synthwave;
    const starter = tracks[0];
    setCurrentTrack(starter);
    setCurrentTime(0);

    // Audio SFX + DJ Nova genre change banter
    audioEngine.playSFX('station_id');
    triggerDJTalk('transition', undefined, undefined, starter);
  };

  // Next Track (handles local playlist or synth tracks)
  const handleNextTrack = () => {
    audioEngine.playSFX('vinyl_scratch');

    if (stationState.audioSourceMode === 'local_library' && localTracks.length > 0) {
      const nextIdx = (stationState.activeLocalIndex + 1) % localTracks.length;
      const nextTrack = localTracks[nextIdx];
      setStationState((prev) => ({ ...prev, activeLocalIndex: nextIdx }));
      setCurrentTrack(nextTrack);
      setCurrentTime(0);

      if (isPlaying && nextTrack.fileUrl) {
        audioEngine.playLocalTrack(nextTrack.fileUrl);
      }
      triggerDJTalk('intro', undefined, undefined, nextTrack);
    } else {
      const tracks = INITIAL_TRACKS[stationState.currentGenre] || INITIAL_TRACKS.synthwave;
      const currentIndex = tracks.findIndex((t) => t.title === currentTrack.title);
      const nextIndex = (currentIndex + 1) % tracks.length;
      const next = tracks[nextIndex];
      setCurrentTrack(next);
      setCurrentTime(0);

      triggerDJTalk('intro', undefined, undefined, next);
    }
  };

  // Previous Track
  const handlePrevTrack = () => {
    audioEngine.playSFX('tape_rewind');

    if (stationState.audioSourceMode === 'local_library' && localTracks.length > 0) {
      const prevIdx = (stationState.activeLocalIndex - 1 + localTracks.length) % localTracks.length;
      const prevTrack = localTracks[prevIdx];
      setStationState((prev) => ({ ...prev, activeLocalIndex: prevIdx }));
      setCurrentTrack(prevTrack);
      setCurrentTime(0);

      if (isPlaying && prevTrack.fileUrl) {
        audioEngine.playLocalTrack(prevTrack.fileUrl);
      }
    } else {
      const tracks = INITIAL_TRACKS[stationState.currentGenre] || INITIAL_TRACKS.synthwave;
      const currentIndex = tracks.findIndex((t) => t.title === currentTrack.title);
      const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
      const prev = tracks[prevIndex];
      setCurrentTrack(prev);
      setCurrentTime(0);
    }
  };

  // Seek bar position in local track
  const handleSeek = (seconds: number) => {
    if (currentTrack.isLocalFile) {
      audioEngine.seekLocalTrack(seconds);
    }
    setCurrentTime(seconds);
  };

  // Handle turntable scratch
  const handleScratch = () => {
    audioEngine.playSFX('vinyl_scratch');
  };

  // Local music file addition from hard drive
  const handleAddLocalTracks = (newTracks: RadioTrack[]) => {
    setLocalTracks((prev) => {
      const combined = [...prev, ...newTracks];
      setStationState((st) => ({
        ...st,
        localTracksCount: combined.length,
      }));
      return combined;
    });

    // If no track is currently playing or user just added their first files, set first new track as active
    if (localTracks.length === 0 && newTracks.length > 0) {
      const first = newTracks[0];
      handleSelectLocalTrack(first);
    }
  };

  // Select and play a specific local track from the crate
  const handleSelectLocalTrack = async (track: RadioTrack) => {
    const idx = localTracks.findIndex((t) => t.id === track.id);
    setStationState((prev) => ({
      ...prev,
      audioSourceMode: 'local_library',
      activeLocalIndex: idx >= 0 ? idx : 0,
    }));
    setCurrentTrack(track);
    setCurrentTime(0);

    if (track.fileUrl) {
      await audioEngine.playLocalTrack(track.fileUrl);
      setIsPlaying(true);
      setStationState((prev) => ({ ...prev, isOnAir: true }));
      triggerDJTalk('intro', undefined, undefined, track);
    }
  };

  // Remove track from local crate
  const handleRemoveLocalTrack = (trackId: string) => {
    setLocalTracks((prev) => {
      const filtered = prev.filter((t) => t.id !== trackId);
      setStationState((st) => ({
        ...st,
        localTracksCount: filtered.length,
        activeLocalIndex: Math.min(st.activeLocalIndex, Math.max(0, filtered.length - 1)),
      }));
      return filtered;
    });
  };

  // Clear all local tracks
  const handleClearLocalTracks = () => {
    setLocalTracks([]);
    setStationState((prev) => ({
      ...prev,
      localTracksCount: 0,
      activeLocalIndex: 0,
      audioSourceMode: 'synth',
    }));
    audioEngine.stopMusic();
    setIsPlaying(false);
    setCurrentTrack(INITIAL_TRACKS[stationState.currentGenre][0]);
  };

  // Switch audio source mode: Synth vs Local Crate
  const handleSwitchAudioMode = async (mode: 'synth' | 'local_library') => {
    if (mode === 'local_library') {
      if (localTracks.length > 0) {
        const track = localTracks[stationState.activeLocalIndex] || localTracks[0];
        setStationState((prev) => ({ ...prev, audioSourceMode: 'local_library' }));
        setCurrentTrack(track);
        setCurrentTime(0);
        if (isPlaying && track.fileUrl) {
          await audioEngine.playLocalTrack(track.fileUrl);
        }
      } else {
        // Open local crate drawer so user can upload files
        setIsLocalCrateOpen(true);
      }
    } else {
      setStationState((prev) => ({ ...prev, audioSourceMode: 'synth' }));
      const starter = INITIAL_TRACKS[stationState.currentGenre][0];
      setCurrentTrack(starter);
      setCurrentTime(0);
      if (isPlaying) {
        audioEngine.startMusic(stationState.currentGenre);
      }
    }
  };

  // Soundboard Trigger
  const handlePlaySFX = (type: SoundEffectType) => {
    audioEngine.playSFX(type);
  };

  // Listener Message / SMS
  const handleSendListenerMessage = (text: string, callerName?: string) => {
    audioEngine.playSFX('phone_ring');

    const userMsg: DJMessage = {
      id: `usr-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      sender: 'listener',
      callerName: callerName || 'Alex on Line 1',
      text,
    };

    setMessages((prev) => [userMsg, ...prev]);

    // DJ Nova on-air response
    setTimeout(() => {
      triggerDJTalk('caller', text, callerName);
    }, 600);
  };

  // Call the station live hotline
  const handleCallStation = () => {
    audioEngine.playSFX('phone_ring');
    setIsCalling(true);

    const callMsg: DJMessage = {
      id: `call-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      sender: 'system',
      text: '☎️ [CALL LINE 1 CONNECTED] Listener called the live broadcast booth.',
    };
    setMessages((prev) => [callMsg, ...prev]);

    setTimeout(() => {
      triggerDJTalk(
        'caller',
        'Hey DJ Nova! Calling in live to the studio, loving the late night signal tonight!',
        'Caller on Line 1'
      );
    }, 800);
  };

  const handleEndCall = () => {
    setIsCalling(false);
    audioEngine.playSFX('chime');
  };

  const handleSelectTrackFromSet = (track: RadioTrack, transitionScript?: string) => {
    setCurrentTrack(track);
    setIsCuratorOpen(false);

    if (transitionScript) {
      const msg: DJMessage = {
        id: `set-trk-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        sender: 'nova',
        text: transitionScript,
        nowPlayingBanner: `🎵 Now playing: "${track.title}" by ${track.artist}`,
        track,
      };
      setMessages((prev) => [msg, ...prev]);
      speakDJDialogue(transitionScript);
    } else {
      triggerDJTalk('intro', undefined, undefined, track);
    }
  };

  const handleTriggerSegmentSpeech = (
    speech: string,
    title: string,
    track?: RadioTrack
  ) => {
    audioEngine.playSFX('station_id');

    if (track) {
      setCurrentTrack(track);
    }

    const msg: DJMessage = {
      id: `seg-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      sender: 'nova',
      text: speech,
      segmentTitle: title,
      nowPlayingBanner: track
        ? `🎵 Now playing: "${track.title}" by ${track.artist}`
        : undefined,
      track,
    };

    setMessages((prev) => [msg, ...prev]);
    speakDJDialogue(speech);
  };

  const latestDJMessage = messages.find((m) => m.sender === 'nova') || null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {/* Top Station Broadcast Header */}
      <BroadcastHeader
        stationState={stationState}
        onUpdateStationState={(partial) =>
          setStationState((prev) => ({ ...prev, ...partial }))
        }
        onOpenCurator={() => setIsCuratorOpen(true)}
        onOpenSegments={() => setIsSegmentsOpen(true)}
        onOpenLocalCrate={() => setIsLocalCrateOpen(true)}
        onTriggerTalk={triggerDJTalk}
        onTriggerStationID={triggerStationID}
        onGenreSelect={handleGenreSelect}
      />

      {/* Main Studio Broadcast Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Welcome / On-Air Banner if not yet started */}
        {!hasStartedShow && !isPlaying && (
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40 p-8 text-center shadow-2xl backdrop-blur-md">
            <div className="mx-auto max-w-2xl flex flex-col items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30">
                <Headphones className="h-6 w-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome to <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{stationState.stationName}</span> with DJ Nova
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                The live, interactive AI internet radio station that adapts to your genre, spins real MP3/WAV/FLAC music from your hard drive, takes live calls, and drops on-air banter with live audio ducking.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                <button
                  id="btn-start-broadcast"
                  onClick={handleTogglePlay}
                  className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-purple-600/30 transition hover:opacity-90 active:scale-95 border border-purple-400/30 cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-white" />
                  <span>START LIVE BROADCAST</span>
                </button>
                <button
                  id="btn-open-crate-welcome"
                  onClick={() => setIsLocalCrateOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-200 hover:text-white transition active:scale-95 cursor-pointer"
                >
                  <HardDrive className="h-4 w-4 text-purple-400" />
                  <span>LOAD HARD DRIVE MUSIC</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Studio Layout: Left (Turntable + DJ Console) | Right (Studio Hotline & Chat) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Now Playing Turntable Deck & DJ Nova Console (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <NowPlayingDeck
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              stationState={stationState}
              currentTime={currentTime}
              onTogglePlay={handleTogglePlay}
              onNextTrack={handleNextTrack}
              onPrevTrack={handlePrevTrack}
              onDJIntroTrack={() => triggerDJTalk('intro')}
              onScratch={handleScratch}
              onSeek={handleSeek}
              onOpenLocalCrate={() => setIsLocalCrateOpen(true)}
            />

            <NovaStudioConsole
              latestDJMessage={latestDJMessage}
              stationState={stationState}
              onTriggerTalk={triggerDJTalk}
              onTriggerSegmentSpeech={handleTriggerSegmentSpeech}
              onTriggerStationID={triggerStationID}
              onToggleAutoStationID={(enabled) =>
                setStationState((prev) => ({ ...prev, autoStationIDEnabled: enabled }))
              }
              onPlaySFX={handlePlaySFX}
              onUpdateVoicePersona={(persona) => {
                setStationState((prev) => ({ ...prev, voiceGender: persona }));
                audioEngine.playSFX('chime');
              }}
              onTestVoice={() => {
                const personaName = stationState.voiceGender;
                const auditionText = `Microphone check one two! You're locked into ${stationState.stationName} with DJ Nova on the ${personaName} broadcast frequency. Levels are crisp, audio ducking is primed, let's keep the music flowing!`;
                audioEngine.playSFX('station_id');
                const msg: DJMessage = {
                  id: `mic-test-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  sender: 'nova',
                  text: auditionText,
                  segmentTitle: `Studio Mic Check • ${personaName} Voice`,
                };
                setMessages((prev) => [msg, ...prev]);
                speakDJDialogue(auditionText);
              }}
              onStopSpeaking={() => {
                audioEngine.stopSpeaking();
                setStationState((prev) => ({ ...prev, isDJSpeaking: false }));
              }}
            />
          </div>

          {/* Right Column: Studio Hotline, Live Caller Lines, Requests (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <ListenerHotline
              messages={messages}
              isDJSpeaking={stationState.isDJSpeaking}
              onSendListenerMessage={handleSendListenerMessage}
              onCallStation={handleCallStation}
              isCalling={isCalling}
              onEndCall={handleEndCall}
            />
          </div>
        </div>
      </main>

      {/* Hard Drive Music Crate Drawer */}
      <LocalLibraryDrawer
        isOpen={isLocalCrateOpen}
        onClose={() => setIsLocalCrateOpen(false)}
        localTracks={localTracks}
        activeTrackId={stationState.audioSourceMode === 'local_library' ? currentTrack.id : null}
        isPlaying={isPlaying}
        audioSourceMode={stationState.audioSourceMode}
        onSelectLocalTrack={handleSelectLocalTrack}
        onAddLocalTracks={handleAddLocalTracks}
        onRemoveLocalTrack={handleRemoveLocalTrack}
        onClearLocalTracks={handleClearLocalTracks}
        onSwitchAudioMode={handleSwitchAudioMode}
        onDJTalkUpTrack={(track) => triggerDJTalk('intro', undefined, undefined, track)}
      />

      {/* Set Curator Drawer */}
      <SetCuratorDrawer
        isOpen={isCuratorOpen}
        onClose={() => setIsCuratorOpen(false)}
        stationState={stationState}
        onSelectTrackFromSet={handleSelectTrackFromSet}
      />

      {/* Mini Segments Modal */}
      <MiniSegmentsModal
        isOpen={isSegmentsOpen}
        onClose={() => setIsSegmentsOpen(false)}
        stationState={stationState}
        onTriggerSegmentSpeech={handleTriggerSegmentSpeech}
      />

      {/* Studio Footer Status */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 px-6 py-4 text-center text-xs text-slate-500 font-mono">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>TRANSMITTER: CRYSTAL CLEAR 104.7 FM</span>
          </div>
          <span>DJ NOVA INTERACTIVE RADIO BROADCAST • REAL HARD DRIVE AUDIO & SYNTH ENGINE</span>
        </div>
      </footer>
    </div>
  );
}

