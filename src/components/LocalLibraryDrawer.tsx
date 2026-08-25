import React, { useRef, useState } from 'react';
import {
  FolderOpen,
  Upload,
  Music,
  Trash2,
  Play,
  Pause,
  Disc3,
  X,
  Sparkles,
  Radio,
  FileAudio,
  Plus,
  CheckCircle2,
  Layers,
  HardDrive,
  Volume2,
  Tag,
  Calendar,
  Disc,
} from 'lucide-react';
import { RadioTrack, RadioStationState } from '../types';
import { createRadioTrackFromFile } from '../services/tagReader';

interface LocalLibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  localTracks: RadioTrack[];
  activeTrackId: string | null;
  isPlaying: boolean;
  audioSourceMode: 'synth' | 'local_library';
  onSelectLocalTrack: (track: RadioTrack) => void;
  onAddLocalTracks: (tracks: RadioTrack[]) => void;
  onRemoveLocalTrack: (trackId: string) => void;
  onClearLocalTracks: () => void;
  onSwitchAudioMode: (mode: 'synth' | 'local_library') => void;
  onDJTalkUpTrack: (track: RadioTrack) => void;
}

export const LocalLibraryDrawer: React.FC<LocalLibraryDrawerProps> = ({
  isOpen,
  onClose,
  localTracks,
  activeTrackId,
  isPlaying,
  audioSourceMode,
  onSelectLocalTrack,
  onAddLocalTracks,
  onRemoveLocalTrack,
  onClearLocalTracks,
  onSwitchAudioMode,
  onDJTalkUpTrack,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Helper to parse filename into clean artist and title
  const parseFilename = (fileName: string) => {
    // Remove extension
    const base = fileName.replace(/\.[^/.]+$/, '');

    // Check for "Artist - Title" pattern
    if (base.includes(' - ')) {
      const parts = base.split(' - ');
      const artist = parts[0].replace(/[_]/g, ' ').trim();
      const title = parts.slice(1).join(' - ').replace(/[_]/g, ' ').trim();
      return { artist, title };
    }

    // Check for "Artist _ Title"
    if (base.includes(' _ ')) {
      const parts = base.split(' _ ');
      const artist = parts[0].trim();
      const title = parts.slice(1).join(' _ ').trim();
      return { artist, title };
    }

    // Single title fallback
    const title = base.replace(/[_-]/g, ' ').trim();
    return { artist: 'Local Artist', title };
  };

  // Helper to format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format seconds to MM:SS
  const formatDuration = (sec?: number) => {
    if (!sec || isNaN(sec)) return '--:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Process uploaded or dropped audio files using accurate ID3 & metadata parser
  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const audioFiles = files.filter(
      (f) =>
        f.type.startsWith('audio/') ||
        /\.(mp3|wav|ogg|flac|m4a|aac|webm|wma)$/i.test(f.name)
    );

    if (audioFiles.length === 0) return;

    setIsProcessing(true);

    try {
      const parsedTracks: RadioTrack[] = [];

      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        const track = await createRadioTrackFromFile(file, i);
        parsedTracks.push(track);
      }

      onAddLocalTracks(parsedTracks);
    } catch (err) {
      console.error('Error parsing audio files:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset file input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-xs">
      <div
        id="local-library-drawer"
        className="relative flex h-full w-full max-w-2xl flex-col bg-slate-950 border-l border-slate-800 p-6 shadow-2xl overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          title="Close Local Music Drawer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 shadow-lg shadow-purple-500/10">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Hard Drive Music Crate</h2>
              <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-purple-400 uppercase">
                {localTracks.length} {localTracks.length === 1 ? 'TRACK' : 'TRACKS'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Play your real MP3, WAV, and FLAC music files with DJ Nova talk-ups & real-time audio ducking
            </p>
          </div>
        </div>

        {/* Audio Source Mode Toggle Card */}
        <div className="mt-5 rounded-2xl bg-slate-900/60 p-4 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
              <Radio className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                ACTIVE BROADCAST AUDIO SOURCE
              </span>
              <p className="text-sm font-semibold text-white">
                {audioSourceMode === 'local_library'
                  ? '💽 Hard Drive Music Crate'
                  : '📻 Procedural Synth Station'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onSwitchAudioMode('synth')}
              className={`flex-1 sm:flex-initial rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                audioSourceMode === 'synth'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              📻 Synth Radio
            </button>
            <button
              onClick={() => onSwitchAudioMode('local_library')}
              className={`flex-1 sm:flex-initial rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                audioSourceMode === 'local_library'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              💾 Local Crate
            </button>
          </div>
        </div>

        {/* Drag and Drop / Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`mt-5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
            isDragging
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac,.webm,.wma"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 mb-3">
            <Upload className="h-6 w-6" />
          </div>

          <h3 className="text-sm font-bold text-white">
            Drag & Drop Audio Files from Your Hard Drive
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            Supports MP3, WAV, FLAC, M4A, OGG, AAC, and WEBM with accurate ID3v1/ID3v2 and Vorbis tag extraction.
          </p>

          <div className="mt-2 flex items-center gap-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 px-3 py-1 text-[11px] font-mono text-purple-300">
            <Tag className="h-3 w-3 text-purple-400" />
            <span>ID3v1 • ID3v2.3/v2.4 • Vorbis • MP4 Tags • Album Art</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-purple-600/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <FolderOpen className="h-4 w-4" />
              <span>Browse Hard Drive</span>
            </button>
          </div>

          {isProcessing && (
            <p className="mt-2 text-xs font-mono text-purple-300 animate-pulse">
              Reading audio tags and extracting high-fidelity metadata...
            </p>
          )}
        </div>

        {/* Local Music Tracklist */}
        <div className="mt-6 flex flex-1 flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Loaded Songs ({localTracks.length})
              </h3>
            </div>
            {localTracks.length > 0 && (
              <button
                onClick={onClearLocalTracks}
                className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Crate</span>
              </button>
            )}
          </div>

          {localTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-900/20 border border-slate-800/80 p-8 text-center text-slate-500">
              <FileAudio className="h-10 w-10 text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-400">No local tracks in your crate yet.</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Click "Browse Hard Drive" or drag and drop any music files from your computer to read real artist tags and start spinning them on air!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {localTracks.map((track) => {
                const isCurrent = activeTrackId === track.id;
                const isPlayingThis = isCurrent && isPlaying;

                return (
                  <div
                    key={track.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-3.5 transition border ${
                      isCurrent
                        ? 'bg-slate-900/90 border-purple-500/50 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/20'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Track Info & Art */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Album Art or Play Button */}
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-800 border border-slate-700/60 shadow-sm flex items-center justify-center group">
                        {track.albumArtUrl ? (
                          <img
                            src={track.albumArtUrl}
                            alt={track.title}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-900/40 to-slate-900 text-purple-400">
                            <Disc className="h-6 w-6 opacity-70" />
                          </div>
                        )}

                        <button
                          onClick={() => onSelectLocalTrack(track)}
                          className={`absolute inset-0 flex items-center justify-center transition cursor-pointer ${
                            isPlayingThis
                              ? 'bg-purple-900/80 text-white opacity-100'
                              : 'bg-black/60 text-white opacity-0 group-hover:opacity-100'
                          }`}
                          title={isPlayingThis ? 'Currently Playing' : 'Play This Song'}
                        >
                          {isPlayingThis ? (
                            <div className="flex items-center gap-0.5">
                              <span className="h-3 w-0.5 bg-white animate-pulse" />
                              <span className="h-4 w-0.5 bg-white animate-pulse [animation-delay:150ms]" />
                              <span className="h-2.5 w-0.5 bg-white animate-pulse [animation-delay:300ms]" />
                            </div>
                          ) : (
                            <Play className="h-4 w-4 ml-0.5" />
                          )}
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Title and Formats */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {track.trackNo && (
                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              #{track.trackNo < 10 ? `0${track.trackNo}` : track.trackNo}
                            </span>
                          )}
                          <h4
                            className={`text-sm font-bold truncate ${
                              isCurrent ? 'text-white' : 'text-slate-200'
                            }`}
                          >
                            {track.title}
                          </h4>
                          {track.fileType && (
                            <span className="rounded bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.2 text-[9px] font-mono font-bold text-purple-400 shrink-0">
                              {track.fileType}
                            </span>
                          )}
                        </div>

                        {/* Artist & Extended Tag Badges */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 mt-0.5">
                          <span className="font-semibold text-slate-300 truncate max-w-[180px]">
                            {track.artist}
                          </span>

                          {track.album && track.album !== 'Hard Drive Crate' && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[150px]">
                              • <Disc3 className="h-2.5 w-2.5 text-purple-400 shrink-0" />
                              <span className="truncate">{track.album}</span>
                            </span>
                          )}

                          {track.year && (
                            <span className="flex items-center gap-0.5 text-[10px] font-mono text-slate-500">
                              <Calendar className="h-2.5 w-2.5" />
                              {track.year}
                            </span>
                          )}

                          {track.fileSize && (
                            <span className="text-slate-500 text-[10px] font-mono">
                              • {formatFileSize(track.fileSize)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                      <span className="text-xs font-mono text-slate-500 mr-1">
                        {formatDuration(track.durationSec)}
                      </span>

                      {/* DJ Talk-up */}
                      <button
                        onClick={() => onDJTalkUpTrack(track)}
                        className="flex items-center gap-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1 text-xs font-medium text-purple-300 hover:text-white transition cursor-pointer"
                        title="Have DJ Nova do an on-air talk-up for this song"
                      >
                        <Sparkles className="h-3 w-3 text-purple-400" />
                        <span className="hidden sm:inline">Talk-up</span>
                      </button>

                      {/* Play Action */}
                      <button
                        onClick={() => onSelectLocalTrack(track)}
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                          isCurrent
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-purple-600 hover:text-white'
                        }`}
                      >
                        {isCurrent ? 'On Air' : 'Play'}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => onRemoveLocalTrack(track.id)}
                        className="rounded-full p-1.5 text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition cursor-pointer"
                        title="Remove from Crate"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
