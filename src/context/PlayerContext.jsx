import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { fetchRelatedTracks, isOnlineApiConfigured } from '../services/musicApi.js';

const STORAGE_KEYS = {
  STATS: 'muscify_stats_v1',
  LIKED: 'muscify_liked_v1',
  SAVED: 'muscify_saved_v1',
  PLAYLISTS: 'muscify_playlists_v1',
  HISTORY: 'muscify_history_v1',
  SEARCHES: 'muscify_recent_searches_v1',
};

function getInitialMemberSince() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${yy}`;
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [activeTab, setActiveTab] = useState('home');
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [youtubeConfigured, setYoutubeConfigured] = useState(false);

  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [playingFrom, setPlayingFrom] = useState('Muscify');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playerNotice, setPlayerNotice] = useState(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [videoMode, setVideoMode] = useState(false);

  const [likedTracks, setLikedTracks] = useState(() => readStorage(STORAGE_KEYS.LIKED, []));
  const [savedTracks, setSavedTracks] = useState(() => readStorage(STORAGE_KEYS.SAVED, []));
  const [historyTracks, setHistoryTracks] = useState(() => readStorage(STORAGE_KEYS.HISTORY, []));
  const [playlists, setPlaylists] = useState(() => readStorage(STORAGE_KEYS.PLAYLISTS, []));
  const [recentSearches, setRecentSearches] = useState(() => readStorage(STORAGE_KEYS.SEARCHES, []));
  const [localTracks, setLocalTracks] = useState([]);
  const [playlistModalTrack, setPlaylistModalTrack] = useState(null);
  const [sleepTimerEndAt, setSleepTimerEndAt] = useState(null);
  const [sleepTimerRemainingSec, setSleepTimerRemainingSec] = useState(null);

  const [stats, setStats] = useState(() =>
    readStorage(STORAGE_KEYS.STATS, {
      totalSecondsListened: 0,
      totalPlays: 0,
      memberSince: getInitialMemberSince(),
      trackPlayCounts: {},
    }),
  );

  const ytHostRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytReadyRef = useRef(false);
  const audioRef = useRef(null);

  const currentTrack = queueIndex >= 0 && queueIndex < queue.length ? queue[queueIndex] : null;
  const currentTrackRef = useRef(null);
  currentTrackRef.current = currentTrack;

  const queueRef = useRef([]);
  queueRef.current = queue;
  const queueIndexRef = useRef(-1);
  queueIndexRef.current = queueIndex;
  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;
  const shuffleRef = useRef(shuffle);
  shuffleRef.current = shuffle;

  // Persist user collections
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LIKED, JSON.stringify(likedTracks));
    } catch { /* ignore */ }
  }, [likedTracks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(savedTracks));
    } catch { /* ignore */ }
  }, [savedTracks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(historyTracks.slice(0, 40)));
    } catch { /* ignore */ }
  }, [historyTracks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    } catch { /* ignore */ }
  }, [playlists]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SEARCHES, JSON.stringify(recentSearches.slice(0, 15)));
    } catch { /* ignore */ }
  }, [recentSearches]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    } catch { /* ignore */ }
  }, [stats]);

  // Check client-side online stream API configuration
  useEffect(() => {
    setYoutubeConfigured(isOnlineApiConfigured());
  }, []);

  // Initialize HTML5 Audio element for Local Music files
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume / 100;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (currentTrackRef.current?.source === 'local') {
        setCurrentTime(audio.currentTime || 0);
        setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      }
    };
    const onEnded = () => {
      if (currentTrackRef.current?.source === 'local') {
        handleTrackEndedRef.current();
      }
    };
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const recordTrackPlay = useCallback((track) => {
    setHistoryTracks((prev) => [track, ...prev.filter((t) => t.id !== track.id)].slice(0, 40));
    setStats((prev) => {
      const existing = prev.trackPlayCounts[track.id];
      return {
        ...prev,
        totalPlays: prev.totalPlays + 1,
        trackPlayCounts: {
          ...prev.trackPlayCounts,
          [track.id]: {
            track,
            count: (existing?.count || 0) + 1,
          },
        },
      };
    });
  }, []);

  const loadAndPlayTrack = useCallback((track) => {
    setPlayerNotice(null);
    setCurrentTime(0);
    setDuration(track.durationSec || 0);

    // Pause both engines first
    audioRef.current?.pause();
    if (ytReadyRef.current && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch { /* ignore */ }
    }

    if (track.source === 'local' && track.localUrl && audioRef.current) {
      audioRef.current.src = track.localUrl;
      audioRef.current.volume = isMuted ? 0 : volume / 100;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        })
        .catch(() => {
          setIsPlaying(false);
        });
      return;
    }

    if (track.videoId) {
      setIsBuffering(true);
      if (ytReadyRef.current && ytPlayerRef.current) {
        try {
          ytPlayerRef.current.loadVideoById(track.videoId);
          ytPlayerRef.current.setVolume(isMuted ? 0 : volume);
          setIsPlaying(true);
        } catch {
          setIsBuffering(false);
        }
      }
    }
  }, [isMuted, volume]);

  const handleTrackEndedRef = useRef(() => {});

  const playNextInternal = useCallback(() => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    if (q.length === 0) return;

    if (repeatModeRef.current === 'one' && idx >= 0 && q[idx]) {
      loadAndPlayTrack(q[idx]);
      return;
    }

    let nextIdx = idx + 1;
    if (shuffleRef.current && q.length > 1) {
      const candidates = q.map((_, i) => i).filter((i) => i !== idx);
      nextIdx = candidates[Math.floor(Math.random() * candidates.length)];
    } else if (nextIdx >= q.length) {
      if (repeatModeRef.current === 'all') {
        nextIdx = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }

    const nextTrack = q[nextIdx];
    if (nextTrack) {
      setQueueIndex(nextIdx);
      recordTrackPlay(nextTrack);
      loadAndPlayTrack(nextTrack);
    }
  }, [loadAndPlayTrack, recordTrackPlay]);

  handleTrackEndedRef.current = playNextInternal;

  // Load IFrame Audio API script & instantiate player
  useEffect(() => {
    let mounted = true;

    const initPlayer = () => {
      if (!mounted || !ytHostRef.current || ytPlayerRef.current || !window.YT?.Player) return;
      const mountEl = document.createElement('div');
      ytHostRef.current.innerHTML = '';
      ytHostRef.current.appendChild(mountEl);

      ytPlayerRef.current = new window.YT.Player(mountEl, {
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            ytReadyRef.current = true;
            e.target.setVolume(volume);
            const active = currentTrackRef.current;
            if (active?.videoId) {
              e.target.loadVideoById(active.videoId);
              setIsPlaying(true);
            }
          },
          onStateChange: (e) => {
            const state = e.data;
            // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
            if (state === 1) {
              setIsPlaying(true);
              setIsBuffering(false);
              const d = e.target.getDuration();
              if (d && Number.isFinite(d)) setDuration(d);
            } else if (state === 2) {
              setIsPlaying(false);
              setIsBuffering(false);
            } else if (state === 3) {
              setIsBuffering(true);
            } else if (state === 0) {
              setIsBuffering(false);
              handleTrackEndedRef.current();
            }
          },
          onError: (e) => {
            setIsBuffering(false);
            if (e.data === 101 || e.data === 150 || e.data === 100) {
              setPlayerNotice('Video embed restricted by rights holder — skipping to next playable track.');
              setTimeout(() => {
                if (queueRef.current.length > 1) {
                  handleTrackEndedRef.current();
                } else {
                  setIsPlaying(false);
                }
              }, 1400);
            } else {
              setPlayerNotice('Playback error occurred on this stream.');
              setIsPlaying(false);
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existing) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        document.body.appendChild(tag);
      }
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevCallback?.();
        initPlayer();
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  // Poll playback current time at 250ms for crisp lyric sync & accumulate listening seconds accurately
  useEffect(() => {
    if (!isPlaying) return;
    let lastStatTick = Date.now();
    const timer = window.setInterval(() => {
      if (currentTrackRef.current?.source !== 'local' && ytReadyRef.current && ytPlayerRef.current) {
        try {
          const t = ytPlayerRef.current.getCurrentTime();
          const d = ytPlayerRef.current.getDuration();
          if (Number.isFinite(t)) setCurrentTime(t);
          if (d && Number.isFinite(d)) setDuration(d);
        } catch { /* ignore */ }
      }
      const now = Date.now();
      if (now - lastStatTick >= 1000) {
        const deltaSec = Math.floor((now - lastStatTick) / 1000);
        lastStatTick += deltaSec * 1000;
        setStats((prev) => ({
          ...prev,
          totalSecondsListened: prev.totalSecondsListened + deltaSec,
        }));
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  // Sleep timer countdown & automatic playback pause
  useEffect(() => {
    if (sleepTimerEndAt === null) {
      setSleepTimerRemainingSec(null);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((sleepTimerEndAt - Date.now()) / 1000));
      if (remaining <= 0) {
        audioRef.current?.pause();
        if (ytReadyRef.current && ytPlayerRef.current) {
          try {
            ytPlayerRef.current.pauseVideo();
          } catch { /* ignore */ }
        }
        setIsPlaying(false);
        setSleepTimerEndAt(null);
        setSleepTimerRemainingSec(null);
        setPlayerNotice('Sleep timer ended — playback paused');
        return;
      }
      setSleepTimerRemainingSec(remaining);
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [sleepTimerEndAt]);

  const setSleepTimer = useCallback((minutes) => {
    if (!minutes || !Number.isFinite(minutes) || minutes <= 0) {
      setSleepTimerEndAt(null);
      setSleepTimerRemainingSec(null);
      setPlayerNotice('Sleep timer turned off');
      return;
    }
    const clampedMinutes = Math.min(480, Math.round(minutes));
    const endAt = Date.now() + clampedMinutes * 60_000;
    setSleepTimerEndAt(endAt);
    setSleepTimerRemainingSec(clampedMinutes * 60);
    setPlayerNotice(`Sleep timer set for ${clampedMinutes} min`);
  }, []);

  const playTrack = useCallback(
    (track, newQueue, sourceLabel = 'Muscify') => {
      setPlayingFrom(sourceLabel);
      if (newQueue && newQueue.length > 0) {
        const idx = newQueue.findIndex((t) => t.id === track.id);
        const finalQueue = idx >= 0 ? newQueue : [track, ...newQueue];
        const finalIdx = idx >= 0 ? idx : 0;
        setQueue(finalQueue);
        setQueueIndex(finalIdx);
      } else {
        const existingIdx = queueRef.current.findIndex((t) => t.id === track.id);
        if (existingIdx >= 0) {
          setQueueIndex(existingIdx);
        } else {
          setQueue((prev) => [track, ...prev]);
          setQueueIndex(0);
        }
      }
      recordTrackPlay(track);
      loadAndPlayTrack(track);
    },
    [loadAndPlayTrack, recordTrackPlay],
  );

  const togglePlay = useCallback(() => {
    const active = currentTrackRef.current;
    if (!active) return;

    if (active.source === 'local' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      return;
    }

    if (ytReadyRef.current && ytPlayerRef.current) {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
    }
  }, [isPlaying]);

  const playNext = useCallback(() => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    if (q.length === 0) return;

    let nextIdx = idx + 1;
    if (shuffleRef.current && q.length > 1) {
      const candidates = q.map((_, i) => i).filter((i) => i !== idx);
      nextIdx = candidates[Math.floor(Math.random() * candidates.length)];
    } else if (nextIdx >= q.length) {
      nextIdx = 0;
    }
    const nextTrack = q[nextIdx];
    if (nextTrack) {
      setQueueIndex(nextIdx);
      recordTrackPlay(nextTrack);
      loadAndPlayTrack(nextTrack);
    }
  }, [loadAndPlayTrack, recordTrackPlay]);

  const seekTo = useCallback((sec) => {
    const clamped = Math.max(0, sec);
    setCurrentTime(clamped);
    if (currentTrackRef.current?.source === 'local' && audioRef.current) {
      audioRef.current.currentTime = clamped;
      return;
    }
    if (ytReadyRef.current && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(clamped, true);
    }
  }, []);

  const playPrevious = useCallback(() => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    if (q.length === 0) return;

    if (currentTime > 4) {
      seekTo(0);
      return;
    }

    const prevIdx = idx - 1 < 0 ? q.length - 1 : idx - 1;
    const prevTrack = q[prevIdx];
    if (prevTrack) {
      setQueueIndex(prevIdx);
      recordTrackPlay(prevTrack);
      loadAndPlayTrack(prevTrack);
    }
  }, [currentTime, loadAndPlayTrack, recordTrackPlay, seekTo]);

  const setVolume = useCallback((vol) => {
    const clamped = Math.max(0, Math.min(100, vol));
    setVolumeState(clamped);
    setIsMuted(clamped === 0);
    if (audioRef.current) {
      audioRef.current.volume = clamped / 100;
    }
    if (ytReadyRef.current && ytPlayerRef.current) {
      ytPlayerRef.current.unMute();
      ytPlayerRef.current.setVolume(clamped);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioRef.current) audioRef.current.volume = next ? 0 : volume / 100;
      if (ytReadyRef.current && ytPlayerRef.current) {
        if (next) ytPlayerRef.current.mute();
        else {
          ytPlayerRef.current.unMute();
          ytPlayerRef.current.setVolume(volume);
        }
      }
      return next;
    });
  }, [volume]);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(
    () => setRepeatMode((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')),
    [],
  );

  const addToQueue = useCallback((track) => {
    setQueue((prev) => {
      if (prev.length === 0) {
        setQueueIndex(0);
        loadAndPlayTrack(track);
        recordTrackPlay(track);
        return [track];
      }
      return [...prev, track];
    });
    setPlayerNotice(`Added "${track.title}" to queue`);
  }, [loadAndPlayTrack, recordTrackPlay]);

  const playNextInQueue = useCallback((track) => {
    setQueue((prev) => {
      if (prev.length === 0) {
        setQueueIndex(0);
        loadAndPlayTrack(track);
        recordTrackPlay(track);
        return [track];
      }
      const copy = [...prev];
      const insertAt = Math.max(0, queueIndexRef.current + 1);
      copy.splice(insertAt, 0, track);
      return copy;
    });
    setPlayerNotice(`Playing "${track.title}" next`);
  }, [loadAndPlayTrack, recordTrackPlay]);

  const removeFromQueue = useCallback((index) => {
    setQueue((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const copy = prev.filter((_, i) => i !== index);
      if (index < queueIndexRef.current) {
        setQueueIndex((qi) => Math.max(0, qi - 1));
      } else if (index === queueIndexRef.current) {
        if (copy.length === 0) {
          setQueueIndex(-1);
          setIsPlaying(false);
        } else {
          const nextIdx = Math.min(index, copy.length - 1);
          setQueueIndex(nextIdx);
          loadAndPlayTrack(copy[nextIdx]);
        }
      }
      return copy;
    });
  }, [loadAndPlayTrack]);

  const startTrackRadio = useCallback(
    async (track) => {
      try {
        const data = await fetchRelatedTracks({
          videoId: track.videoId || '',
          q: `${track.artist.split(',')[0]} ${track.title} mix`,
        });
        const related = data.tracks || [];
        const stationQueue = [track, ...related.filter((t) => t.id !== track.id)];
        playTrack(track, stationQueue, `${track.title} Radio`);
      } catch {
        playTrack(track, [track], `${track.title} Radio`);
      }
    },
    [playTrack],
  );

  const isLiked = useCallback(
    (trackId) => likedTracks.some((t) => t.id === trackId),
    [likedTracks],
  );
  const toggleLike = useCallback((track) => {
    setLikedTracks((prev) =>
      prev.some((t) => t.id === track.id) ? prev.filter((t) => t.id !== track.id) : [track, ...prev],
    );
  }, []);

  const isSaved = useCallback(
    (trackId) => savedTracks.some((t) => t.id === trackId),
    [savedTracks],
  );
  const toggleSaved = useCallback((track) => {
    setSavedTracks((prev) => {
      const exists = prev.some((t) => t.id === track.id);
      setPlayerNotice(
        exists
          ? `Removed "${track.title}" from Downloads`
          : `Saved "${track.title}" to Downloads`,
      );
      return exists ? prev.filter((t) => t.id !== track.id) : [track, ...prev];
    });
  }, []);

  const clearSaved = useCallback(() => {
    setSavedTracks([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.SAVED);
    } catch { /* ignore */ }
  }, []);

  const addLocalFiles = useCallback(
    (files) => {
      const added = Array.from(files).map((file, idx) => {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        const parts = cleanName.split(' - ');
        const localUrl = URL.createObjectURL(file);
        return {
          id: `local-${Date.now()}-${idx}-${file.size}`,
          title: parts.length > 1 ? parts.slice(1).join(' - ').trim() : cleanName,
          artist: parts.length > 1 ? parts[0].trim() : 'Local Audio File',
          durationSec: 0,
          durationFormatted: 'Audio',
          thumbnail: '',
          source: 'local',
          localUrl,
          accentColor: '#3f3f46',
        };
      });
      setLocalTracks((prev) => [...added, ...prev]);
      if (added[0]) {
        playTrack(added[0], added, 'Local Music');
      }
    },
    [playTrack],
  );

  const createPlaylist = useCallback(
    (name, description = '', initialTracks = [], source = 'custom') => {
      const pl = {
        id: `pl-${Date.now()}`,
        name: name.trim() || 'Untitled Playlist',
        description: description.trim(),
        tracks: initialTracks,
        createdAt: Date.now(),
        coverUrl: initialTracks[0]?.thumbnail,
        source,
      };
      setPlaylists((prev) => [pl, ...prev]);
      return pl;
    },
    [],
  );

  const addTrackToPlaylist = useCallback((playlistId, track) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        if (pl.tracks.some((t) => t.id === track.id)) return pl;
        const tracks = [...pl.tracks, track];
        return { ...pl, tracks, coverUrl: pl.coverUrl || track.thumbnail };
      }),
    );
  }, []);

  const removeTrackFromPlaylist = useCallback((playlistId, trackId) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        const tracks = pl.tracks.filter((t) => t.id !== trackId);
        return { ...pl, tracks, coverUrl: tracks[0]?.thumbnail };
      }),
    );
  }, []);

  const deletePlaylist = useCallback((playlistId) => {
    setPlaylists((prev) => prev.filter((pl) => pl.id !== playlistId));
  }, []);

  const addRecentSearch = useCallback((track) => {
    setRecentSearches((prev) => [track, ...prev.filter((t) => t.id !== track.id)].slice(0, 15));
  }, []);

  const removeRecentSearch = useCallback((trackId) => {
    setRecentSearches((prev) => prev.filter((t) => t.id !== trackId));
  }, []);

  const clearRecentSearches = useCallback(() => setRecentSearches([]), []);

  const removeFromHistory = useCallback((trackId) => {
    setHistoryTracks((prev) => prev.filter((t) => t.id !== trackId));
  }, []);

  const clearHistory = useCallback(() => {
    setHistoryTracks([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
    } catch { /* ignore */ }
  }, []);

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      isFullPlayerOpen,
      setIsFullPlayerOpen,
      youtubeConfigured,
      currentTrack,
      queue,
      queueIndex,
      playingFrom,
      isPlaying,
      isBuffering,
      playerNotice,
      clearNotice: () => setPlayerNotice(null),
      currentTime,
      duration,
      volume,
      isMuted,
      shuffle,
      repeatMode,
      videoMode,
      setVideoMode,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      playTrack,
      togglePlay,
      playNext,
      playPrevious,
      seekTo,
      addToQueue,
      playNextInQueue,
      removeFromQueue,
      startTrackRadio,
      likedTracks,
      isLiked,
      toggleLike,
      savedTracks,
      isSaved,
      toggleSaved,
      clearSaved,
      historyTracks,
      removeFromHistory,
      clearHistory,
      localTracks,
      addLocalFiles,
      playlists,
      createPlaylist,
      addTrackToPlaylist,
      removeTrackFromPlaylist,
      deletePlaylist,
      recentSearches,
      addRecentSearch,
      removeRecentSearch,
      clearRecentSearches,
      stats,
      playlistModalTrack,
      openAddToPlaylistModal: setPlaylistModalTrack,
      sleepTimerEndAt,
      sleepTimerRemainingSec,
      setSleepTimer,
      ytHostRef,
    }),
    [
      activeTab,
      isFullPlayerOpen,
      youtubeConfigured,
      currentTrack,
      queue,
      queueIndex,
      playingFrom,
      isPlaying,
      isBuffering,
      playerNotice,
      currentTime,
      duration,
      volume,
      isMuted,
      shuffle,
      repeatMode,
      videoMode,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      playTrack,
      togglePlay,
      playNext,
      playPrevious,
      seekTo,
      addToQueue,
      playNextInQueue,
      removeFromQueue,
      startTrackRadio,
      likedTracks,
      isLiked,
      toggleLike,
      savedTracks,
      isSaved,
      toggleSaved,
      clearSaved,
      historyTracks,
      removeFromHistory,
      clearHistory,
      localTracks,
      addLocalFiles,
      playlists,
      createPlaylist,
      addTrackToPlaylist,
      removeTrackFromPlaylist,
      deletePlaylist,
      recentSearches,
      addRecentSearch,
      removeRecentSearch,
      clearRecentSearches,
      stats,
      playlistModalTrack,
      sleepTimerEndAt,
      sleepTimerRemainingSec,
      setSleepTimer,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}
