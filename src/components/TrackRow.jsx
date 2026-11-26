import React, { useState } from 'react';
import {
  Heart,
  MoreVertical,
  Play,
  Pause,
  ListPlus,
  Radio,
  Download,
  CheckCircle2,
  Forward,
  Trash2,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { TrackArtwork } from './MuscifyLogo.jsx';

export function TrackRow({
  track,
  queue,
  sourceLabel = 'Muscify',
  index,
  onRemove,
  onAfterPlay,
}) {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    isLiked,
    toggleLike,
    isSaved,
    toggleSaved,
    addToQueue,
    playNextInQueue,
    openAddToPlaylistModal,
    startTrackRadio,
  } = usePlayer();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = currentTrack?.id === track.id;
  const liked = isLiked(track.id);
  const saved = isSaved(track.id);

  const handleRowClick = () => {
    if (isActive) {
      togglePlay();
    } else {
      playTrack(track, queue, sourceLabel);
    }
    onAfterPlay?.(track);
  };

  return (
    <div
      className={`group relative flex items-center justify-between gap-3 px-2.5 py-2 rounded-2xl transition-colors ${
        isActive ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'
      }`}
    >
      <button
        type="button"
        onClick={handleRowClick}
        className="flex items-center gap-3.5 min-w-0 flex-1 text-left focus:outline-none"
      >
        {typeof index === 'number' && (
          <span className="w-5 text-center text-xs text-zinc-500 tabular-nums shrink-0 hidden sm:inline-block">
            {isActive && isPlaying ? '▶' : index + 1}
          </span>
        )}
        <div className="relative shrink-0">
          <TrackArtwork
            src={track.thumbnail}
            alt={track.title}
            className="w-12 h-12 rounded-xl"
            accentColor={track.accentColor}
          />
          <div
            className={`absolute inset-0 rounded-xl flex items-center justify-center bg-black/50 transition-opacity ${
              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {isActive && isPlaying ? (
              <Pause className="w-5 h-5 text-white fill-white" />
            ) : (
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={`text-[15px] font-medium truncate ${
              isActive ? 'text-white' : 'text-zinc-100'
            }`}
          >
            {track.title}
          </p>
          <p className="text-xs text-zinc-400 truncate mt-0.5">
            {track.artist}
            {track.viewCount ? ` · ${track.viewCount}` : ''}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-zinc-500 tabular-nums hidden sm:inline mr-2">
          {track.durationFormatted}
        </span>

        <button
          type="button"
          onClick={() => toggleSaved(track)}
          className={`min-h-[44px] min-w-[40px] flex items-center justify-center rounded-full transition-colors ${
            saved
              ? 'text-emerald-400'
              : 'text-zinc-400 hover:text-white opacity-85 sm:opacity-0 sm:group-hover:opacity-100'
          }`}
          aria-label={saved ? 'Remove from Downloads' : 'Download song'}
          title={saved ? 'Downloaded' : 'Download'}
        >
          {saved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </button>

        <button
          type="button"
          onClick={() => toggleLike(track)}
          className={`min-h-[44px] min-w-[40px] flex items-center justify-center rounded-full transition-colors ${
            liked ? 'text-rose-500' : 'text-zinc-400 hover:text-white opacity-80 sm:opacity-0 sm:group-hover:opacity-100'
          }`}
          aria-label={liked ? 'Unlike song' : 'Like song'}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500' : ''}`} />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Track options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-11 z-50 w-52 rounded-2xl bg-[#1c1c20] border border-white/10 shadow-2xl py-1.5 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    playNextInQueue(track);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-200 hover:bg-white/10 text-left"
                >
                  <Forward className="w-4 h-4 text-zinc-400" />
                  <span>Play next</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addToQueue(track);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-200 hover:bg-white/10 text-left"
                >
                  <ListPlus className="w-4 h-4 text-zinc-400" />
                  <span>Add to queue</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openAddToPlaylistModal(track);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-200 hover:bg-white/10 text-left"
                >
                  <ListPlus className="w-4 h-4 text-zinc-400" />
                  <span>Add to playlist</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    startTrackRadio(track);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-200 hover:bg-white/10 text-left"
                >
                  <Radio className="w-4 h-4 text-zinc-400" />
                  <span>Start radio</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toggleSaved(track);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-200 hover:bg-white/10 text-left"
                >
                  {saved ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Download className="w-4 h-4 text-zinc-400" />
                  )}
                  <span>{saved ? 'Remove download' : 'Download'}</span>
                </button>
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => {
                      onRemove();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-rose-400 hover:bg-white/10 text-left"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
