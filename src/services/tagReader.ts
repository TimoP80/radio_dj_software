import * as musicMetadata from 'music-metadata-browser';
import { RadioTrack } from '../types';

export interface ParsedAudioMetadata {
  title: string;
  artist: string;
  album: string;
  genre: string;
  bpm: number;
  durationSec: number;
  year?: string | number;
  trackNo?: number;
  albumArtUrl?: string;
  fileType: string;
  source: 'id3_tag' | 'filename_heuristic';
}

/**
 * Intelligent filename cleaner & pattern matcher for cases where
 * ID3/metadata tags are missing or incomplete.
 */
export function parseFilenameHeuristic(fileName: string): { artist: string; title: string; album?: string; trackNo?: number } {
  // Remove file extension
  let clean = fileName.replace(/\.[^/.]+$/, '').trim();

  // Strip leading track numbers like "01 - ", "01. ", "1 - ", "1_ ", "01_-_"
  let trackNo: number | undefined;
  const trackNoMatch = clean.match(/^(\d{1,3})[\s._-]+/);
  if (trackNoMatch) {
    trackNo = parseInt(trackNoMatch[1], 10);
    clean = clean.replace(/^(\d{1,3})[\s._-]+/, '').trim();
  }

  // Check for "Artist - Album - TrackNo - Title" or "Artist - Album - Title"
  const multiParts = clean.split(/\s+-\s+/);
  if (multiParts.length >= 3) {
    const artist = multiParts[0].replace(/[_]/g, ' ').trim();
    const album = multiParts[1].replace(/[_]/g, ' ').trim();
    const title = multiParts.slice(2).join(' - ').replace(/[_]/g, ' ').trim();
    return { artist, title, album, trackNo };
  }

  // Check for standard "Artist - Title" pattern
  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    const artist = parts[0].replace(/[_]/g, ' ').trim();
    const title = parts.slice(1).join(' - ').replace(/[_]/g, ' ').trim();
    return { artist, title, trackNo };
  }

  // Check for "Artist _ Title"
  if (clean.includes(' _ ')) {
    const parts = clean.split(' _ ');
    const artist = parts[0].trim();
    const title = parts.slice(1).join(' _ ').trim();
    return { artist, title, trackNo };
  }

  // Check for "Artist ~ Title"
  if (clean.includes(' ~ ')) {
    const parts = clean.split(' ~ ');
    const artist = parts[0].trim();
    const title = parts.slice(1).join(' ~ ').trim();
    return { artist, title, trackNo };
  }

  // Replace remaining underscores with spaces
  clean = clean.replace(/[_]/g, ' ').trim();

  // Check for "[Artist] Title" or "(Artist) Title"
  const bracketMatch = clean.match(/^\[([^\]]+)\]\s*(.+)$/) || clean.match(/^\(([^)]+)\)\s*(.+)$/);
  if (bracketMatch) {
    return {
      artist: bracketMatch[1].trim(),
      title: bracketMatch[2].trim(),
      trackNo,
    };
  }

  return {
    artist: 'Unknown Artist',
    title: clean || 'Untitled Track',
    trackNo,
  };
}

/**
 * Extract audio duration via HTMLAudioElement as a reliable fallback
 */
function getAudioElementDuration(blobUrl: string): Promise<number> {
  return new Promise<number>((resolve) => {
    const audio = new Audio();
    audio.src = blobUrl;
    audio.preload = 'metadata';

    const cleanUp = () => {
      audio.onloadedmetadata = null;
      audio.onerror = null;
    };

    audio.onloadedmetadata = () => {
      const dur = audio.duration;
      cleanUp();
      resolve(dur && !isNaN(dur) && dur !== Infinity ? dur : 180);
    };

    audio.onerror = () => {
      cleanUp();
      resolve(180);
    };

    // Timeout safety after 3 seconds
    setTimeout(() => {
      cleanUp();
      resolve(180);
    }, 3000);
  });
}

/**
 * Parse complete metadata tags (ID3v1, ID3v2, Vorbis FLAC, MP4/M4A, OGG)
 * directly from an uploaded audio File object.
 */
export async function readAudioFileMetadata(file: File, blobUrl: string): Promise<ParsedAudioMetadata> {
  const ext = file.name.split('.').pop()?.toUpperCase() || 'AUDIO';
  const fallback = parseFilenameHeuristic(file.name);

  try {
    // Attempt full binary tag parsing with music-metadata-browser
    const metadata = await musicMetadata.parseBlob(file, {
      duration: true,
      skipCovers: false,
    });

    const common = metadata.common;
    const format = metadata.format;

    // Check if ID3 tags yielded meaningful titles
    const hasTagTitle = !!common.title && common.title.trim().length > 0;
    const hasTagArtist = (!!common.artist && common.artist.trim().length > 0) || (common.artists && common.artists.length > 0);

    const title = hasTagTitle
      ? common.title!.trim()
      : fallback.title;

    const artist = hasTagArtist
      ? (common.artist?.trim() || common.artists?.join(', ')?.trim() || fallback.artist)
      : fallback.artist;

    const album = common.album?.trim() || fallback.album || 'Hard Drive Crate';
    const genre = (common.genre && common.genre.length > 0 ? common.genre.join(' / ') : '') || 'Local Music';
    const year = common.year || (common.originalyear ? String(common.originalyear) : undefined);
    const bpm = common.bpm ? Math.round(common.bpm) : 120;
    const trackNo = common.track?.no || fallback.trackNo;

    // Extract cover artwork if embedded in the MP3/FLAC/M4A
    let albumArtUrl: string | undefined;
    if (common.picture && common.picture.length > 0) {
      try {
        const pic = common.picture[0];
        const picBlob = new Blob([pic.data as Uint8Array<ArrayBuffer>], { type: pic.format || 'image/jpeg' });
        albumArtUrl = URL.createObjectURL(picBlob);
      } catch (picErr) {
        console.warn('Could not extract embedded album art:', picErr);
      }
    }

    // Determine duration
    let durationSec = format.duration ? Math.round(format.duration) : 0;
    if (!durationSec || durationSec <= 0) {
      const fallbackDur = await getAudioElementDuration(blobUrl);
      durationSec = Math.round(fallbackDur);
    }

    return {
      title,
      artist,
      album,
      genre,
      bpm,
      durationSec,
      year,
      trackNo: trackNo || undefined,
      albumArtUrl,
      fileType: ext,
      source: hasTagTitle || hasTagArtist ? 'id3_tag' : 'filename_heuristic',
    };
  } catch (err) {
    console.warn('music-metadata-browser tag parsing warning, falling back to heuristic:', err);

    const duration = await getAudioElementDuration(blobUrl);

    return {
      title: fallback.title,
      artist: fallback.artist,
      album: fallback.album || 'Hard Drive Crate',
      genre: 'Local Music',
      bpm: 120,
      durationSec: Math.round(duration),
      trackNo: fallback.trackNo,
      fileType: ext,
      source: 'filename_heuristic',
    };
  }
}

/**
 * Creates a fully formed RadioTrack object from a local file and parsed metadata.
 */
export async function createRadioTrackFromFile(file: File, index: number): Promise<RadioTrack> {
  const url = URL.createObjectURL(file);
  const meta = await readAudioFileMetadata(file, url);

  const tagSourceBadge = meta.source === 'id3_tag' ? 'Verified ID3 Audio Tag' : 'Filename Match';

  return {
    id: `local-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
    title: meta.title,
    artist: meta.artist,
    album: meta.album,
    genre: meta.genre,
    bpm: meta.bpm,
    durationSec: meta.durationSec,
    year: meta.year,
    trackNo: meta.trackNo,
    albumArtUrl: meta.albumArtUrl,
    isLocalFile: true,
    fileUrl: url,
    fileName: file.name,
    fileSize: file.size,
    fileType: meta.fileType,
    funFact: `${tagSourceBadge} — "${meta.title}" by ${meta.artist}${meta.album ? ` from "${meta.album}"` : ''}${meta.year ? ` (${meta.year})` : ''}.`,
    lyricTeaser: `Local audio playback: ${meta.title} by ${meta.artist}`,
    energyLevel: meta.genre !== 'Local Music' ? meta.genre : 'Local Audio',
  };
}
