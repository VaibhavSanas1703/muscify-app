import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  MoreHorizontal,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume1,
  Volume2,
  MessageSquareQuote,
  ListMusic,
  Heart,
  Radio,
  ListPlus,
  Trash2,
  Loader2,
  Sparkles,
  Download,
  CheckCircle2,
  Moon,
  X,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { TrackArtwork } from './MuscifyLogo.jsx';
import { fetchLyrics } from '../services/musicApi.js';

function formatClock(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatCountdown(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00';
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function parseSyncedLyrics(raw) {
  const lines = [];
  const tagRe = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  for (const row of raw.split('\n')) {
    const matches = Array.from(row.matchAll(tagRe));
    if (matches.length === 0) continue;
    const text = row.replace(tagRe, '').trim();
    if (!text) continue;
    for (const match of matches) {
      const m = Number(match[1]);
      const s = Number(match[2]);
      const ms = match[3] ? Number(match[3].padEnd(3, '0')) / 1000 : 0;
      lines.push({ timeSec: m * 60 + s + ms, text });
    }
  }
  return lines.sort((a, b) => a.timeSec - b.timeSec);
}

export function FullScreenPlayer() {
  const {
    isFullPlayerOpen,
    setIsFullPlayerOpen,
    currentTrack,
    playingFrom,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeatMode,
    togglePlay,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    toggleShuffle,
    cycleRepeat,
    isLiked,
    toggleLike,
    isSaved,
    toggleSaved,
    openAddToPlaylistModal,
    startTrackRadio,
    queue,
    queueIndex,
    playTrack,
    removeFromQueue,
    playerNotice,
    clearNotice,
    sleepTimerRemainingSec,
    setSleepTimer,
    ytHostRef,
  } = usePlayer();

  const [panelMode, setPanelMode] = useState('art');
  const [lyrics, setLyrics] = useState(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricOffsetSec, setLyricOffsetSec] = useState(0);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [sleepModalOpen, setSleepModalOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const activeLineRef = useRef(null);

  // Reset lyrics & sync offset immediately whenever the active track changes
  useEffect(() => {
    setLyrics(null);
    setLyricOffsetSec(0);
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!currentTrack || panelMode !== 'lyrics') return;
    let cancelled = false;
    setLyricsLoading(true);

    const effectiveDuration = duration > 0 ? duration : currentTrack.durationSec;
    fetchLyrics({
      title: currentTrack.title,
      artist: currentTrack.artist,
      duration: effectiveDuration > 0 ? Math.round(effectiveDuration) : 0,
    })
      .then((data) => {
        if (!cancelled) setLyrics(data);
      })
      .catch(() => {
        if (!cancelled) setLyrics({ found: false });
      })
      .finally(() => {
        if (!cancelled) setLyricsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id, panelMode]);

  const syncedLines = useMemo(() => {
    if (!lyrics?.syncedLyrics) return [];
    return parseSyncedLyrics(lyrics.syncedLyrics);
  }, [lyrics?.syncedLyrics]);

  const activeLyricIdx = useMemo(() => {
    if (syncedLines.length === 0) return -1;
    const adjustedTime = currentTime + lyricOffsetSec + 0.25;
    let active = -1;
    for (let i = 0; i < syncedLines.length; i++) {
      if (syncedLines[i].timeSec <= adjustedTime) active = i;
      else break;
    }
    return active;
  }, [syncedLines, currentTime, lyricOffsetSec]);

  useEffect(() => {
    if (panelMode === 'lyrics' && activeLyricIdx >= 0 && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLyricIdx, panelMode]);

  const [palette, setPalette] = useState({
    primary: '#7c2d12',
    deep: '#140806',
  });

  useEffect(() => {
    const fallback = currentTrack?.accentColor || '#6d28d9';
    if (!currentTrack?.thumbnail) {
      setPalette({ primary: fallback, deep: '#0b0a0d' });
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        let bestR = 140;
        let bestG = 58;
        let bestB = 34;
        let bestScore = -1;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          if (luma < 28 || luma > 225) continue;
          const score = sat * 2.2 + (1 - Math.abs(luma - 128) / 128);
          if (score > bestScore) {
            bestScore = score;
            bestR = r;
            bestG = g;
            bestB = b;
          }
        }

        const boost = (c) => Math.min(245, Math.max(20, Math.round(c * 1.15)));
        const deep = (c) => Math.max(8, Math.round(c * 0.22));
        setPalette({
          primary: `rgb(${boost(bestR)}, ${boost(bestG)}, ${boost(bestB)})`,
          deep: `rgb(${deep(bestR)}, ${deep(bestG)}, ${deep(bestB)})`,
        });
      } catch {
        setPalette({ primary: fallback, deep: '#0c090a' });
      }
    };
    img.onerror = () => {
      if (!cancelled) setPalette({ primary: fallback, deep: '#0c090a' });
    };
    img.src = currentTrack.thumbnail;

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id, currentTrack?.thumbnail, currentTrack?.accentColor]);

  if (!currentTrack) {
    return (
      <div className="fixed -left-[9999px] -top-[9999px] w-72 h-40 opacity-0 pointer-events-none" aria-hidden="true">
        <div ref={ytHostRef} className="w-full h-full" />
      </div>
    );
  }

  const remaining = Math.max(0, (duration || 0) - currentTime);
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const liked = isLiked(currentTrack.id);
  const downloaded = isSaved(currentTrack.id);

  return (
    <div
      className={
        isFullPlayerOpen
          ? 'fixed inset-0 z-40 h-[100dvh] max-h-[100dvh] flex flex-col bg-[#08080a] text-white overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
          : 'fixed -left-[9999px] -top-[9999px] w-full h-full opacity-0 pointer-events-none'
      }
      aria-hidden={!isFullPlayerOpen}
    >
      {/* Persistent offscreen audio engine */}
      <div className="fixed -left-[9999px] -top-[9999px] w-72 h-40 opacity-0 pointer-events-none" aria-hidden="true">
        <div ref={ytHostRef} className="w-full h-full" />
      </div>

      {/* High-contrast thumbnail blur + color gradient background */}
      {currentTrack.thumbnail && (
        <img
          src={currentTrack.thumbnail}
          alt=""
          referrerPolicy="no-referrer"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-125 blur-[72px] saturate-[1.85] contrast-125 opacity-80 pointer-events-none transition-all duration-700"
        />
      )}
      <div
        className="absolute inset-0 pointer-events-none transition-colors duration-700"
        style={{
          background: `radial-gradient(circle at 50% 24%, ${palette.primary}55 0%, ${palette.deep}cc 58%, rgba(5,5,7,0.96) 100%)`,
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/35 to-black/85 pointer-events-none"
        aria-hidden="true"
      />

      {/* Top Bar */}
      <div className="relative z-10 shrink-0 flex items-center justify-between gap-2 px-4 sm:px-5 pt-2.5 sm:pt-4 pb-1 sm:pb-2 max-w-2xl w-full mx-auto">
        <button
          type="button"
          onClick={() => setIsFullPlayerOpen(false)}
          className="min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center rounded-full text-white/85 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Minimize player"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center min-w-0 flex-1">
          <div className="w-9 h-1 rounded-full bg-white/45 mb-1" aria-hidden="true" />
          <p className="text-[11px] sm:text-xs font-medium text-white/90 truncate max-w-full px-1 drop-shadow-sm">
            Playing from {playingFrom}
          </p>
        </div>

        <div className="shrink-0 flex justify-end min-w-[44px]">
          <button
            type="button"
            onClick={() => setSleepModalOpen(true)}
            className={`min-h-[44px] flex items-center justify-center gap-1.5 rounded-full transition-colors whitespace-nowrap shrink-0 ${
              sleepTimerRemainingSec !== null
                ? 'px-3 bg-white/15 hover:bg-white/25 text-white'
                : 'min-w-[44px] text-white/80 hover:text-white hover:bg-white/10'
            }`}
            aria-label={
              sleepTimerRemainingSec !== null
                ? `Sleep timer active: ${formatCountdown(sleepTimerRemainingSec)} remaining`
                : 'Sleep timer'
            }
            title="Sleep timer"
          >
            <Moon
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                sleepTimerRemainingSec !== null ? 'text-amber-300 fill-amber-300/20' : ''
              }`}
            />
            {sleepTimerRemainingSec !== null && (
              <span className="text-xs font-semibold tabular-nums">
                {formatCountdown(sleepTimerRemainingSec)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col justify-between px-5 sm:px-6 pb-4 sm:pb-7 pt-1 sm:pt-2 max-w-xl w-full mx-auto overflow-y-auto no-scrollbar">
        {/* Center Display: Thumbnail / Lyrics / Queue */}
        <div className="flex-1 min-h-[160px] flex items-center justify-center py-2 sm:py-3">
          {panelMode === 'art' && (
            <div className="w-[min(80vw,38dvh)] h-[min(80vw,38dvh)] sm:w-[min(72vw,44dvh)] sm:h-[min(72vw,44dvh)] max-w-[390px] max-h-[390px] flex items-center justify-center">
              <TrackArtwork
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full h-full rounded-2xl sm:rounded-3xl shadow-[0_28px_70px_rgba(0,0,0,0.75)] ring-1 ring-white/15"
                accentColor={currentTrack.accentColor}
              />
            </div>
          )}

          {panelMode === 'lyrics' && (
            <div className="w-full h-full overflow-y-auto no-scrollbar rounded-3xl bg-black/30 backdrop-blur-md border border-white/10 p-5 sm:p-6 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-4 shrink-0">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white/90">Lyrics</h3>
                  {lyrics?.found && lyrics.trackName && (
                    <p className="text-[11px] text-white/55 truncate">
                      {lyrics.trackName}
                      {lyrics.artistName ? ` · ${lyrics.artistName}` : ''}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {syncedLines.length > 0 && (
                    <div className="flex items-center gap-1 bg-white/10 rounded-full px-1.5 py-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setLyricOffsetSec((o) => Number((o - 0.5).toFixed(1)))}
                        className="px-1.5 py-0.5 text-white/75 hover:text-white"
                        aria-label="Delay lyrics by 0.5 seconds"
                        title="Sync -0.5s"
                      >
                        -0.5s
                      </button>
                      <span className="text-white/60 tabular-nums px-1">
                        {lyricOffsetSec === 0 ? 'Sync' : `${lyricOffsetSec > 0 ? '+' : ''}${lyricOffsetSec}s`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setLyricOffsetSec((o) => Number((o + 0.5).toFixed(1)))}
                        className="px-1.5 py-0.5 text-white/75 hover:text-white"
                        aria-label="Advance lyrics by 0.5 seconds"
                        title="Sync +0.5s"
                      >
                        +0.5s
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setPanelMode('art')}
                    className="text-xs text-white/65 hover:text-white px-2 py-1"
                  >
                    Cover
                  </button>
                </div>
              </div>
              {lyricsLoading ? (
                <div className="flex-1 flex items-center justify-center text-zinc-400 gap-2 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Matching lyrics...</span>
                </div>
              ) : syncedLines.length > 0 ? (
                <div className="space-y-4 py-4 overflow-y-auto no-scrollbar">
                  {syncedLines.map((line, i) => (
                    <button
                      key={`${line.timeSec}-${i}`}
                      ref={i === activeLyricIdx ? activeLineRef : null}
                      type="button"
                      onClick={() => seekTo(Math.max(0, line.timeSec - lyricOffsetSec))}
                      className={`block text-left text-lg sm:text-xl font-bold leading-snug transition-all duration-200 ${
                        i === activeLyricIdx
                          ? 'text-white scale-[1.01] origin-left'
                          : i < activeLyricIdx
                          ? 'text-white/35'
                          : 'text-white/55 hover:text-white/85'
                      }`}
                    >
                      {line.text}
                    </button>
                  ))}
                </div>
              ) : lyrics?.plainLyrics ? (
                <p className="text-base sm:text-lg font-medium text-white/85 whitespace-pre-line leading-relaxed overflow-y-auto no-scrollbar">
                  {lyrics.plainLyrics}
                </p>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                  <p className="text-lg font-semibold text-white/85">Words are on the way</p>
                  <p className="text-xs text-white/55 mt-1.5">
                    Verified lyrics are not yet available for this version.
                  </p>
                </div>
              )}
            </div>
          )}

          {panelMode === 'queue' && (
            <div className="w-full h-full overflow-y-auto no-scrollbar rounded-3xl bg-black/25 backdrop-blur-md border border-white/10 p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">
                  Up Next ({queue.length})
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => startTrackRadio(currentTrack)}
                    className="text-xs font-medium text-white/80 hover:text-white flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-fill</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelMode('art')}
                    className="text-xs text-white/60 hover:text-white"
                  >
                    Done
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 overflow-y-auto no-scrollbar">
                {queue.map((qTrack, idx) => {
                  const active = idx === queueIndex;
                  return (
                    <div
                      key={`${qTrack.id}-${idx}`}
                      className={`flex items-center justify-between gap-2 p-2 rounded-xl transition-colors ${
                        active ? 'bg-white/15' : 'hover:bg-white/8'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => playTrack(qTrack, queue, playingFrom)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left"
                      >
                        <TrackArtwork
                          src={qTrack.thumbnail}
                          alt={qTrack.title}
                          className="w-10 h-10 rounded-lg"
                          accentColor={qTrack.accentColor}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {qTrack.title}
                          </p>
                          <p className="text-xs text-white/60 truncate">{qTrack.artist}</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromQueue(idx)}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-white/40 hover:text-rose-400"
                        aria-label="Remove from queue"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notice banner if any */}
        {playerNotice && (
          <div className="mb-2 px-3.5 py-2 rounded-xl bg-white/10 text-xs text-white/90 flex items-center justify-between">
            <span>{playerNotice}</span>
            <button type="button" onClick={clearNotice} className="underline ml-2">
              Dismiss
            </button>
          </div>
        )}

        {/* Track Title, Artist, Like & More menu */}
        <div className="shrink-0 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl font-bold text-white truncate">
                {currentTrack.title}
              </h2>
              <p className="text-xs sm:text-base text-white/70 truncate mt-0.5">
                {currentTrack.artist}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0 relative">
              <button
                type="button"
                onClick={() => toggleSaved(currentTrack)}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors ${
                  downloaded ? 'text-emerald-400' : 'text-white/70 hover:text-white'
                }`}
                aria-label={downloaded ? 'Remove download' : 'Download song'}
              >
                {downloaded ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => toggleLike(currentTrack)}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors ${
                  liked ? 'text-rose-400' : 'text-white/70 hover:text-white'
                }`}
                aria-label={liked ? 'Unlike track' : 'Like track'}
              >
                <Heart className={`w-5 h-5 ${liked ? 'fill-rose-400' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setMoreMenuOpen((v) => !v)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/12 hover:bg-white/20 text-white transition-colors"
                aria-label="More options"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              {moreMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMoreMenuOpen(false)} />
                  <div className="absolute right-0 bottom-12 z-50 w-52 rounded-2xl bg-[#1c1c20] border border-white/12 shadow-2xl py-1.5 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        toggleSaved(currentTrack);
                        setMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-100 hover:bg-white/10 text-left"
                    >
                      {downloaded ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Download className="w-4 h-4 text-zinc-400" />
                      )}
                      <span>{downloaded ? 'Remove download' : 'Download'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        openAddToPlaylistModal(currentTrack);
                        setMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-100 hover:bg-white/10 text-left"
                    >
                      <ListPlus className="w-4 h-4 text-zinc-400" />
                      <span>Add to playlist</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        startTrackRadio(currentTrack);
                        setMoreMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-100 hover:bg-white/10 text-left"
                    >
                      <Radio className="w-4 h-4 text-zinc-400" />
                      <span>Start track radio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setSleepModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-zinc-100 hover:bg-white/10 text-left"
                    >
                      <span className="flex items-center gap-3">
                        <Moon className="w-4 h-4 text-zinc-400" />
                        <span>Sleep timer</span>
                      </span>
                      {sleepTimerRemainingSec !== null && (
                        <span className="text-xs text-amber-300 font-medium tabular-nums">
                          {formatCountdown(sleepTimerRemainingSec)}
                        </span>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Interactive Scrubber */}
          <div>
            <div className="relative h-2 bg-white/20 rounded-full flex items-center">
              <div
                className="absolute left-0 top-0 bottom-0 bg-white/85 rounded-full pointer-events-none"
                style={{ width: `${progressPct}%` }}
              />
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seekTo(Number(e.target.value))}
                aria-label="Seek progress"
                className="muscify-slider w-full h-5 relative z-10"
              />
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-white/60 tabular-nums">
              <span>{formatClock(currentTime)}</span>
              <span>-{formatClock(remaining)}</span>
            </div>
          </div>

          {/* Primary Transport Controls */}
          <div className="flex items-center justify-between px-1 sm:px-2">
            <button
              type="button"
              onClick={toggleShuffle}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors ${
                shuffle ? 'text-white bg-white/15' : 'text-white/55 hover:text-white'
              }`}
              aria-label="Toggle shuffle"
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={playPrevious}
              className="min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] flex items-center justify-center rounded-full text-white hover:bg-white/10 active:scale-95 transition-all"
              aria-label="Previous track"
            >
              <SkipBack className="w-7 h-7 sm:w-8 sm:h-8 fill-white" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isBuffering ? (
                <Loader2 className="w-9 h-9 sm:w-10 sm:h-10 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-10 h-10 sm:w-11 sm:h-11 fill-white" />
              ) : (
                <Play className="w-10 h-10 sm:w-11 sm:h-11 fill-white ml-1" />
              )}
            </button>

            <button
              type="button"
              onClick={playNext}
              className="min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] flex items-center justify-center rounded-full text-white hover:bg-white/10 active:scale-95 transition-all"
              aria-label="Next track"
            >
              <SkipForward className="w-7 h-7 sm:w-8 sm:h-8 fill-white" />
            </button>

            <button
              type="button"
              onClick={cycleRepeat}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors ${
                repeatMode !== 'off' ? 'text-white bg-white/15' : 'text-white/55 hover:text-white'
              }`}
              aria-label="Cycle repeat mode"
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-5 h-5" />
              ) : (
                <Repeat className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center gap-3 px-1">
            <Volume1 className="w-4 h-4 text-white/60 shrink-0" />
            <div className="relative flex-1 h-1.5 bg-white/20 rounded-full flex items-center">
              <div
                className="absolute left-0 top-0 bottom-0 bg-white/80 rounded-full pointer-events-none"
                style={{ width: `${isMuted ? 0 : volume}%` }}
              />
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
                className="muscify-slider w-full h-4 relative z-10"
              />
            </div>
            <Volume2 className="w-4 h-4 text-white/60 shrink-0" />
          </div>

          {/* Bottom 3 Utility Controls */}
          <div className="flex items-center justify-around pt-0.5">
            <button
              type="button"
              onClick={() => setPanelMode((m) => (m === 'lyrics' ? 'art' : 'lyrics'))}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors ${
                panelMode === 'lyrics' ? 'text-white bg-white/15' : 'text-white/65 hover:text-white'
              }`}
              aria-label="Lyrics"
            >
              <MessageSquareQuote className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => startTrackRadio(currentTrack)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-white/65 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Start track radio"
              title="Start Radio"
            >
              <Radio className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setPanelMode((m) => (m === 'queue' ? 'art' : 'queue'))}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors ${
                panelMode === 'queue' ? 'text-white bg-white/15' : 'text-white/65 hover:text-white'
              }`}
              aria-label="Up next queue"
            >
              <ListMusic className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sleep Timer Modal */}
      {sleepModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setSleepModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#18181c] border border-white/12 p-5 shadow-2xl space-y-4 text-white"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Sleep timer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Moon className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-bold">Sleep timer</h3>
              </div>
              <button
                type="button"
                onClick={() => setSleepModalOpen(false)}
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-full text-white/65 hover:text-white hover:bg-white/10"
                aria-label="Close sleep timer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {sleepTimerRemainingSec !== null && (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 border border-white/10 px-4 py-3">
                <div>
                  <p className="text-xs text-white/60">Playback pauses in</p>
                  <p className="text-xl font-bold text-amber-300 tabular-nums mt-0.5">
                    {formatCountdown(sleepTimerRemainingSec)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSleepTimer(null);
                    setSleepModalOpen(false);
                  }}
                  className="min-h-[44px] px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
                >
                  Turn off
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {[5, 15, 30, 45, 60, 90].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => {
                    setSleepTimer(minutes);
                    setSleepModalOpen(false);
                  }}
                  className="min-h-[48px] rounded-2xl bg-white/8 hover:bg-white/15 active:scale-[0.98] text-sm font-semibold text-white transition-all tabular-nums"
                >
                  {minutes} min
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const parsed = Number(customMinutes);
                if (!Number.isFinite(parsed) || parsed <= 0) return;
                setSleepTimer(parsed);
                setCustomMinutes('');
                setSleepModalOpen(false);
              }}
              className="flex items-center gap-2 pt-1"
            >
              <input
                type="number"
                min={1}
                max={480}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                placeholder="Custom minutes (1–480)"
                aria-label="Custom sleep timer minutes"
                className="flex-1 min-h-[44px] rounded-xl bg-white/8 border border-white/12 px-3.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/35 tabular-nums"
              />
              <button
                type="submit"
                disabled={!customMinutes || Number(customMinutes) <= 0}
                className="min-h-[44px] px-4 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap shrink-0 transition-colors"
              >
                Set
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
