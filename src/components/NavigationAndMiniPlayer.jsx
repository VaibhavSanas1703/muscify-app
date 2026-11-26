import React from 'react';
import {
  Home,
  LayoutGrid,
  Radio,
  Library,
  Search,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Heart,
  Volume2,
  VolumeX,
  Maximize2,
  ListMusic,
  Loader2,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { MuscifyMark, TrackArtwork } from './MuscifyLogo.jsx';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'explore', label: 'Explore', icon: LayoutGrid },
  { id: 'radio', label: 'Radio', icon: Radio },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'search', label: 'Search', icon: Search },
];

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function DesktopSidebar() {
  const { activeTab, setActiveTab, playlists, playTrack } = usePlayer();

  return (
    <aside className="relative z-10 hidden md:flex flex-col w-60 lg:w-64 shrink-0 bg-[#0a0810]/55 backdrop-blur-2xl border-r border-white/10 h-full select-none">
      <div className="px-6 pt-6 pb-5 flex items-center gap-3">
        <MuscifyMark className="w-8 h-7 text-white" />
        <span className="text-xl font-bold tracking-tight text-white">Muscify</span>
      </div>

      <nav className="px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-white/12 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-7 px-6 mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-500">Playlists</span>
        <button
          type="button"
          onClick={() => setActiveTab('library')}
          className="text-xs text-zinc-400 hover:text-white transition-colors"
        >
          Manage
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-24 space-y-0.5 no-scrollbar">
        {playlists.length === 0 ? (
          <p className="px-3 py-2 text-xs text-zinc-600">
            Create or import playlists in Library
          </p>
        ) : (
          playlists.map((pl) => (
            <button
              key={pl.id}
              type="button"
              onClick={() => {
                if (pl.tracks[0]) {
                  playTrack(pl.tracks[0], pl.tracks, pl.name);
                } else {
                  setActiveTab('library');
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-white/[0.05] transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0">
                {pl.coverUrl ? (
                  <img
                    src={pl.coverUrl}
                    alt={pl.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ListMusic className="w-4 h-4 text-zinc-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200 group-hover:text-white truncate">
                  {pl.name}
                </p>
                <p className="text-xs text-zinc-500 tabular-nums">
                  {pl.tracks.length} songs
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}

export function DesktopBottomBar() {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlay,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    toggleMute,
    isLiked,
    toggleLike,
    setIsFullPlayerOpen,
  } = usePlayer();

  if (!currentTrack) return null;
  const liked = isLiked(currentTrack.id);
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="hidden md:flex fixed bottom-0 left-0 right-0 z-30 h-20 bg-[#0d0a12]/75 backdrop-blur-2xl border-t border-white/10 px-5 items-center justify-between gap-6">
      {/* Left: Track info */}
      <div className="flex items-center gap-3.5 w-[28%] min-w-0">
        <button
          type="button"
          onClick={() => setIsFullPlayerOpen(true)}
          className="relative group shrink-0 rounded-xl overflow-hidden"
          aria-label="Open full-screen player"
        >
          <TrackArtwork
            src={currentTrack.thumbnail}
            alt={currentTrack.title}
            className="w-12 h-12 rounded-xl"
            accentColor={currentTrack.accentColor}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
        </button>
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setIsFullPlayerOpen(true)}
            className="text-sm font-semibold text-white hover:underline truncate block max-w-full text-left"
          >
            {currentTrack.title}
          </button>
          <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
        </div>
        <button
          type="button"
          onClick={() => toggleLike(currentTrack)}
          className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full shrink-0 transition-colors ${
            liked ? 'text-rose-500' : 'text-zinc-400 hover:text-white'
          }`}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500' : ''}`} />
        </button>
      </div>

      {/* Center: Transport + Scrubber */}
      <div className="flex flex-col items-center gap-1.5 flex-1 max-w-xl">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={playPrevious}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-zinc-300 hover:text-white transition-colors"
            aria-label="Previous track"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-black" />
            ) : (
              <Play className="w-5 h-5 fill-black ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={playNext}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-zinc-300 hover:text-white transition-colors"
            aria-label="Next track"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>

        <div className="w-full flex items-center gap-2.5">
          <span className="text-[11px] text-zinc-400 tabular-nums w-9 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden flex items-center">
            <div
              className="absolute left-0 top-0 bottom-0 bg-white rounded-full pointer-events-none"
              style={{ width: `${progressPct}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-label="Seek track"
              className="muscify-slider w-full h-3 opacity-0 hover:opacity-100 relative z-10"
            />
          </div>
          <span className="text-[11px] text-zinc-400 tabular-nums w-9">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Volume & Expand */}
      <div className="flex items-center justify-end gap-2 w-[24%]">
        <button
          type="button"
          onClick={toggleMute}
          className="min-h-[40px] min-w-[40px] flex items-center justify-center text-zinc-400 hover:text-white"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
        <div className="relative w-24 h-1.5 bg-white/15 rounded-full flex items-center">
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
            className="muscify-slider w-full h-3 relative z-10 opacity-0 hover:opacity-100"
          />
        </div>
        <button
          type="button"
          onClick={() => setIsFullPlayerOpen(true)}
          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 ml-1"
          aria-label="Expand player"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function MobileBottomDock() {
  const {
    activeTab,
    setActiveTab,
    currentTrack,
    isPlaying,
    isBuffering,
    togglePlay,
    playNext,
    setIsFullPlayerOpen,
    currentTime,
    duration,
  } = usePlayer();

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 px-3 pb-2.5 pt-2 bg-gradient-to-t from-[#08060c]/95 via-[#08060c]/55 to-transparent pointer-events-none">
      <div className="max-w-md mx-auto space-y-2 pointer-events-auto">
        {/* Floating Mini-Player */}
        {currentTrack && (
          <div className="relative overflow-hidden rounded-full bg-[#15111b]/80 backdrop-blur-2xl border border-white/14 shadow-2xl px-2.5 py-1.5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsFullPlayerOpen(true)}
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
            >
              <TrackArtwork
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-10 h-10 rounded-xl shrink-0"
                accentColor={currentTrack.accentColor}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-white truncate leading-tight">
                  {currentTrack.title}
                </p>
                <p className="text-[11px] text-zinc-400 truncate leading-tight mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>
            </button>

            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={togglePlay}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-white active:scale-95 transition-transform"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isBuffering ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 fill-white" />
                ) : (
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={playNext}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-white active:scale-95 transition-transform"
                aria-label="Next track"
              >
                <SkipForward className="w-5 h-5 fill-white" />
              </button>
            </div>

            {/* Subtle progress indicator along bottom edge */}
            <div
              className="absolute bottom-0 left-4 right-4 h-[2px] bg-white/10 rounded-full overflow-hidden pointer-events-none"
              aria-hidden="true"
            >
              <div
                className="h-full bg-white/80 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Floating 5-Tab Pill Dock */}
        <nav
          aria-label="Primary navigation"
          className="rounded-full bg-[#14101a]/80 backdrop-blur-2xl border border-white/14 shadow-2xl px-1.5 py-1 grid grid-cols-5 items-center"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[44px] flex flex-col items-center justify-center rounded-full py-1 transition-colors ${
                  active ? 'bg-white/14 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-[10px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
