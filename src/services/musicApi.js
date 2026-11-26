import { CURATED_TRACKS, MOOD_CATEGORIES, RADIO_STATIONS } from '../data/catalog.js';

const STREAM_API_BASE = 'https://www.googleapis.com/youtube/v3';
const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const PLAYLIST_ID_RE = /^[a-zA-Z0-9_-]{10,64}$/;

function getOnlineApiKey() {
  const key = import.meta.env.VITE_YOUTUBE_API_KEY?.trim();
  if (!key || key === 'MY_YOUTUBE_API_KEY') return null;
  return key;
}

export function isOnlineApiConfigured() {
  return Boolean(getOnlineApiKey());
}

export function getCatalogMeta() {
  return {
    moods: MOOD_CATEGORIES,
    stations: RADIO_STATIONS,
  };
}

function sanitizeQuery(raw, maxLen = 120) {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLen);
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseIsoDuration(iso) {
  if (!iso) return { seconds: 210, formatted: '3:30' };
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return { seconds: 210, formatted: '3:30' };
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  if (total <= 0) return { seconds: 0, formatted: 'Live' };
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  const formatted =
    hours > 0
      ? `${hours}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
      : `${mm}:${String(ss).padStart(2, '0')}`;
  return { seconds: total, formatted };
}

function cleanVideoMeta(rawTitle, channelTitle) {
  const decodedTitle = decodeHtmlEntities(rawTitle || 'Untitled');
  const cleanedChannel = decodeHtmlEntities(channelTitle || 'Muscify Stream')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/VEVO$/i, '')
    .trim();

  const dashSplit = decodedTitle.split(' - ');
  if (dashSplit.length >= 2 && dashSplit[0].length < 40 && dashSplit[1].length > 1) {
    const cleanSong = dashSplit
      .slice(1)
      .join(' - ')
      .replace(/\(Official.*?\)|\[Official.*?\]/gi, '')
      .trim();
    return {
      title: cleanSong || decodedTitle,
      artist: dashSplit[0].trim() || cleanedChannel,
    };
  }

  return {
    title:
      decodedTitle.replace(/\(Official\s*(Music\s*)?Video\)|\[Official.*?\]/gi, '').trim() ||
      decodedTitle,
    artist: cleanedChannel || 'Unknown Artist',
  };
}

function formatViews(viewCount) {
  if (!viewCount) return undefined;
  const num = Number(viewCount);
  if (!Number.isFinite(num)) return undefined;
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B plays`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M plays`;
  if (num >= 1_000) return `${Math.round(num / 1_000)}K plays`;
  return `${num} plays`;
}

async function fetchOnlineTracksBySearch(query, maxResults = 16, apiKey) {
  const searchUrl = new URL(`${STREAM_API_BASE}/search`);
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('videoCategoryId', '10');
  searchUrl.searchParams.set('videoEmbeddable', 'true');
  searchUrl.searchParams.set('maxResults', String(Math.min(25, Math.max(1, maxResults))));
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('key', apiKey);

  const searchRes = await fetch(searchUrl.toString());
  if (!searchRes.ok) {
    throw new Error(`Stream search failed (${searchRes.status})`);
  }

  const searchJson = await searchRes.json();
  const items = searchJson.items || [];
  const videoIds = items
    .map((item) => (typeof item.id === 'string' ? item.id : item.id?.videoId))
    .filter((id) => Boolean(id && VIDEO_ID_RE.test(id)));

  if (videoIds.length === 0) return [];

  const detailsUrl = new URL(`${STREAM_API_BASE}/videos`);
  detailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
  detailsUrl.searchParams.set('id', videoIds.join(','));
  detailsUrl.searchParams.set('key', apiKey);

  const detailsRes = await fetch(detailsUrl.toString());
  if (!detailsRes.ok) {
    return items
      .map((item) => {
        const videoId = typeof item.id === 'string' ? item.id : item.id?.videoId;
        if (!videoId || !VIDEO_ID_RE.test(videoId)) return null;
        const meta = cleanVideoMeta(item.snippet?.title, item.snippet?.channelTitle);
        const thumb =
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        return {
          id: videoId,
          videoId,
          title: meta.title,
          artist: meta.artist,
          year: item.snippet?.publishedAt?.slice(0, 4),
          durationSec: 210,
          durationFormatted: '3:30',
          thumbnail: thumb,
          source: 'youtube',
        };
      })
      .filter(Boolean);
  }

  const detailsJson = await detailsRes.json();
  const detailMap = new Map();
  for (const d of detailsJson.items || []) {
    detailMap.set(d.id, d);
  }

  return videoIds.map((videoId) => {
    const detail = detailMap.get(videoId);
    const snippet = detail?.snippet;
    const meta = cleanVideoMeta(snippet?.title, snippet?.channelTitle);
    const duration = parseIsoDuration(detail?.contentDetails?.duration);
    const thumb =
      snippet?.thumbnails?.maxres?.url ||
      snippet?.thumbnails?.high?.url ||
      snippet?.thumbnails?.medium?.url ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return {
      id: videoId,
      videoId,
      title: meta.title,
      artist: meta.artist,
      year: snippet?.publishedAt?.slice(0, 4),
      durationSec: duration.seconds,
      durationFormatted: duration.formatted,
      thumbnail: thumb,
      source: 'youtube',
      viewCount: formatViews(detail?.statistics?.viewCount),
    };
  });
}

async function fetchTrendingMusic(regionCode, apiKey) {
  const url = new URL(`${STREAM_API_BASE}/videos`);
  url.searchParams.set('part', 'snippet,contentDetails,statistics');
  url.searchParams.set('chart', 'mostPopular');
  url.searchParams.set('videoCategoryId', '10');
  url.searchParams.set('regionCode', regionCode);
  url.searchParams.set('maxResults', '18');
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Trending request failed (${res.status})`);
  }
  const json = await res.json();
  return (json.items || [])
    .filter((item) => VIDEO_ID_RE.test(item.id))
    .map((item) => {
      const meta = cleanVideoMeta(item.snippet?.title, item.snippet?.channelTitle);
      const duration = parseIsoDuration(item.contentDetails?.duration);
      const thumb =
        item.snippet?.thumbnails?.maxres?.url ||
        item.snippet?.thumbnails?.high?.url ||
        `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;

      return {
        id: item.id,
        videoId: item.id,
        title: meta.title,
        artist: meta.artist,
        year: item.snippet?.publishedAt?.slice(0, 4),
        durationSec: duration.seconds,
        durationFormatted: duration.formatted,
        thumbnail: thumb,
        source: 'youtube',
        viewCount: formatViews(item.statistics?.viewCount),
      };
    });
}

function searchCatalogFallback(query) {
  const q = query.toLowerCase();
  if (!q) return CURATED_TRACKS;
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = CURATED_TRACKS.map((track) => {
    const haystack = `${track.title} ${track.artist} ${track.album || ''} ${track.mood || ''}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (haystack.includes(term)) score += 1;
    }
    return { track, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.track);

  return scored.length > 0 ? scored : CURATED_TRACKS.slice(0, 10);
}

export async function fetchHomeFeed(regionCode = 'IN') {
  const safeRegion = /^[A-Z]{2}$/.test(regionCode.toUpperCase()) ? regionCode.toUpperCase() : 'IN';
  const apiKey = getOnlineApiKey();

  if (apiKey) {
    try {
      const trending = await fetchTrendingMusic(safeRegion, apiKey);
      if (trending.length >= 6) {
        return {
          source: 'youtube',
          topPicks: trending.slice(0, 8),
          albumsAndSingles: trending.slice(8, 18),
          quickPicks: [...trending.slice(0, 4), ...CURATED_TRACKS.slice(0, 6)],
        };
      }
    } catch {
      // Fall back to curated catalog
    }
  }

  return {
    source: 'catalog',
    topPicks: CURATED_TRACKS.slice(0, 8),
    albumsAndSingles: CURATED_TRACKS.slice(8, 16),
    quickPicks: CURATED_TRACKS.slice(4, 14),
  };
}

export async function searchTracks(rawQuery, maxResults = 18) {
  const q = sanitizeQuery(rawQuery, 120);
  if (!q) return { source: 'catalog', tracks: [] };

  const apiKey = getOnlineApiKey();
  if (apiKey) {
    try {
      const tracks = await fetchOnlineTracksBySearch(q, maxResults, apiKey);
      return { source: 'youtube', tracks };
    } catch {
      // Fall back gracefully
    }
  }

  return {
    source: 'catalog',
    tracks: searchCatalogFallback(q),
    notice: apiKey
      ? 'Showing curated catalog matches while live stream search refreshes.'
      : 'Showing curated catalog matches.',
  };
}

export async function fetchMoodTracks(rawMoodId) {
  const moodId = sanitizeQuery(rawMoodId, 40).toLowerCase();
  const moodObj = MOOD_CATEGORIES.find((m) => m.id === moodId || m.label.toLowerCase() === moodId);
  const query = moodObj ? moodObj.query : `${moodId || 'chill'} music hits`;
  const apiKey = getOnlineApiKey();

  if (apiKey) {
    try {
      const tracks = await fetchOnlineTracksBySearch(query, 16, apiKey);
      return {
        source: 'youtube',
        mood: moodObj || { id: moodId, label: moodId, subtitle: 'Curated Station' },
        tracks,
      };
    } catch {
      // Fall back to curated catalog
    }
  }

  const moodFiltered = CURATED_TRACKS.filter((t) => t.mood === moodId);
  const tracks = moodFiltered.length >= 4 ? moodFiltered : [...moodFiltered, ...CURATED_TRACKS].slice(0, 10);
  return {
    source: 'catalog',
    mood: moodObj || { id: moodId, label: moodId, subtitle: 'Curated Station' },
    tracks,
  };
}

export async function fetchRelatedTracks({ videoId = '', q = '' }) {
  const safeVid = sanitizeQuery(videoId, 20);
  const seedQuery = sanitizeQuery(q, 120) || 'trending music hits';
  const apiKey = getOnlineApiKey();

  if (apiKey) {
    try {
      const raw = await fetchOnlineTracksBySearch(seedQuery, 15, apiKey);
      const filtered = VIDEO_ID_RE.test(safeVid) ? raw.filter((t) => t.videoId !== safeVid) : raw;
      return { source: 'youtube', tracks: filtered };
    } catch {
      // Fall back to curated catalog
    }
  }

  const filtered = CURATED_TRACKS.filter((t) => t.videoId !== safeVid);
  return { source: 'catalog', tracks: filtered.slice(0, 12) };
}

export async function importPlaylist(raw) {
  const rawInput = sanitizeQuery(raw, 1000);
  if (!rawInput) {
    throw new Error('Please provide a playlist link or track list.');
  }

  const apiKey = getOnlineApiKey();

  try {
    if (rawInput.startsWith('http://') || rawInput.startsWith('https://')) {
      const parsed = new URL(rawInput);
      const allowedHosts = [
        'youtube.com',
        'www.youtube.com',
        'music.youtube.com',
        'm.youtube.com',
        'youtu.be',
        'open.spotify.com',
      ];
      if (!allowedHosts.includes(parsed.hostname.toLowerCase())) {
        throw new Error('Please enter a valid playlist link or a list of song titles.');
      }

      const listId = parsed.searchParams.get('list');
      if (listId && PLAYLIST_ID_RE.test(listId) && apiKey) {
        const plUrl = new URL(`${STREAM_API_BASE}/playlistItems`);
        plUrl.searchParams.set('part', 'snippet,contentDetails');
        plUrl.searchParams.set('maxResults', '25');
        plUrl.searchParams.set('playlistId', listId);
        plUrl.searchParams.set('key', apiKey);

        const plRes = await fetch(plUrl.toString());
        if (plRes.ok) {
          const plJson = await plRes.json();
          const importedTracks = (plJson.items || [])
            .map((item) => {
              const vid = item.snippet?.resourceId?.videoId;
              if (!vid || !VIDEO_ID_RE.test(vid)) return null;
              const meta = cleanVideoMeta(
                item.snippet?.title || 'Imported Track',
                item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || 'Muscify Stream',
              );
              return {
                id: vid,
                videoId: vid,
                title: meta.title,
                artist: meta.artist,
                durationSec: 210,
                durationFormatted: '3:30',
                thumbnail:
                  item.snippet?.thumbnails?.high?.url ||
                  item.snippet?.thumbnails?.medium?.url ||
                  `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                source: 'youtube',
              };
            })
            .filter(Boolean);

          if (importedTracks.length > 0) {
            return {
              playlistName: 'Imported Playlist',
              tracks: importedTracks,
              source: 'youtube',
            };
          }
        }
      }

      if (parsed.hostname.toLowerCase() === 'open.spotify.com') {
        const oembedUrl = new URL('https://open.spotify.com/oembed');
        oembedUrl.searchParams.set('url', parsed.toString());
        let title = 'Imported Spotify Mix';
        try {
          const oRes = await fetch(oembedUrl.toString());
          if (oRes.ok) {
            const oJson = await oRes.json();
            if (oJson.title) title = sanitizeQuery(oJson.title, 80);
          }
        } catch {
          // Keep default title
        }

        if (apiKey) {
          const tracks = await fetchOnlineTracksBySearch(`${title} official audio`, 12, apiKey);
          return { playlistName: title, tracks, source: 'youtube' };
        }
        return {
          playlistName: title,
          tracks: searchCatalogFallback(title).slice(0, 8),
          source: 'catalog',
        };
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('valid playlist')) {
      throw err;
    }
  }

  const lines = rawInput
    .split(/\r?\n|,/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 2)
    .slice(0, 12);

  if (lines.length === 0) {
    throw new Error('No valid songs or playlist link found.');
  }

  const collected = [];
  for (const line of lines) {
    if (apiKey) {
      try {
        const matches = await fetchOnlineTracksBySearch(line, 1, apiKey);
        if (matches[0]) collected.push(matches[0]);
        continue;
      } catch {
        // Fall back to catalog match
      }
    }
    const cat = searchCatalogFallback(line);
    if (cat[0] && !collected.some((c) => c.id === cat[0].id)) {
      collected.push(cat[0]);
    }
  }

  return {
    playlistName: 'Imported Playlist',
    tracks: collected.length > 0 ? collected : CURATED_TRACKS.slice(0, 6),
    source: apiKey ? 'youtube' : 'catalog',
  };
}

function normalizeTextForMatch(str) {
  return str
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripSongNoise(rawTitle) {
  return rawTitle
    .replace(/\|.*$/g, '')
    .replace(/\((?:from|official|lyric|lyrical|audio|video|full|hd|4k|feat\.?|ft\.?).*?\)/gi, '')
    .replace(/\[(?:official|lyric|lyrical|audio|video|full|hd|4k).*?\]/gi, '')
    .replace(/\b(?:official\s+(?:music\s+)?video|lyric\s+video|full\s+(?:song|audio|video)|lyrical|4k\s+video)\b/gi, '')
    .replace(/\s+(?:ft\.?|feat\.?)\s+.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreLyricCandidate(candidate, targetTitleNorm, artistListNorm, reqDuration) {
  if (!candidate.plainLyrics && !candidate.syncedLyrics) return -1000;
  const candTitle = normalizeTextForMatch(stripSongNoise(candidate.trackName || ''));
  const candArtist = normalizeTextForMatch(candidate.artistName || '');
  if (!candTitle) return -1000;

  let score = 0;

  if (candTitle === targetTitleNorm) {
    score += 60;
  } else if (candTitle.includes(targetTitleNorm) || targetTitleNorm.includes(candTitle)) {
    score += 32;
  } else {
    const targetWords = targetTitleNorm.split(' ').filter((w) => w.length > 1);
    const overlap = targetWords.filter((w) => candTitle.includes(w)).length;
    if (targetWords.length === 0 || overlap / targetWords.length < 0.6) {
      return -1000;
    }
    score += Math.round((overlap / targetWords.length) * 25);
  }

  if (artistListNorm.length > 0 && candArtist) {
    const matchedArtist = artistListNorm.some(
      (a) => a.length > 1 && (candArtist.includes(a) || a.includes(candArtist)),
    );
    if (matchedArtist) {
      score += 45;
    } else {
      const allArtistWords = artistListNorm.join(' ').split(' ').filter((w) => w.length > 2);
      const artistOverlap = allArtistWords.some((w) => candArtist.includes(w));
      score += artistOverlap ? 18 : -40;
    }
  }

  if (candidate.syncedLyrics) score += 20;

  if (reqDuration > 20 && candidate.duration && candidate.duration > 20) {
    const diff = Math.abs(candidate.duration - reqDuration);
    if (diff <= 4) score += 30;
    else if (diff <= 12) score += 16;
    else if (diff <= 25) score += 4;
    else if (diff > 45) score -= 25;
  }

  return score;
}

export async function fetchLyrics({ title, artist = '', duration = 0 }) {
  const rawTitle = sanitizeQuery(title, 160);
  const rawArtist = sanitizeQuery(artist, 160);
  const reqDuration = Math.max(0, Math.min(3600, Number(duration) || 0));

  if (!rawTitle) return { found: false };

  const cleanTitle = stripSongNoise(rawTitle) || rawTitle;
  const artistTokens = rawArtist
    .split(/,|&|\bx\b|\bfeat\.?\b|\bft\.?\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
  const primaryArtist = artistTokens[0] || '';
  const targetTitleNorm = normalizeTextForMatch(cleanTitle);
  const artistListNorm = artistTokens.map(normalizeTextForMatch).filter(Boolean);

  try {
    if (primaryArtist) {
      const getUrl = new URL('https://lrclib.net/api/get');
      getUrl.searchParams.set('track_name', cleanTitle);
      getUrl.searchParams.set('artist_name', primaryArtist);
      if (reqDuration > 20) {
        getUrl.searchParams.set('duration', String(Math.round(reqDuration)));
      }

      const getRes = await fetch(getUrl.toString());
      if (getRes.ok) {
        const exact = await getRes.json();
        const exactScore = scoreLyricCandidate(exact, targetTitleNorm, artistListNorm, reqDuration);
        if (exactScore >= 40 && (exact.plainLyrics || exact.syncedLyrics)) {
          return {
            found: true,
            plainLyrics: exact.plainLyrics,
            syncedLyrics: exact.syncedLyrics,
            trackName: exact.trackName,
            artistName: exact.artistName,
          };
        }
      }
    }

    const candidates = [];

    const structuredUrl = new URL('https://lrclib.net/api/search');
    structuredUrl.searchParams.set('track_name', cleanTitle);
    if (primaryArtist) structuredUrl.searchParams.set('artist_name', primaryArtist);

    const structuredRes = await fetch(structuredUrl.toString());
    if (structuredRes.ok) {
      const items = await structuredRes.json();
      candidates.push(...items);
    }

    if (candidates.length === 0) {
      const broadUrl = new URL('https://lrclib.net/api/search');
      broadUrl.searchParams.set('q', `${cleanTitle} ${primaryArtist}`.trim());
      const broadRes = await fetch(broadUrl.toString());
      if (broadRes.ok) {
        const items = await broadRes.json();
        candidates.push(...items);
      }
    }

    const ranked = candidates
      .map((c) => ({
        c,
        score: scoreLyricCandidate(c, targetTitleNorm, artistListNorm, reqDuration),
      }))
      .filter((entry) => entry.score >= 35)
      .sort((a, b) => b.score - a.score);

    const best = ranked[0]?.c;
    if (best) {
      return {
        found: true,
        plainLyrics: best.plainLyrics,
        syncedLyrics: best.syncedLyrics,
        trackName: best.trackName,
        artistName: best.artistName,
      };
    }
  } catch {
    // Graceful fallback
  }

  return { found: false };
}
