import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Folder,
  Heart,
  History,
  Link2,
  ListMusic,
  Play,
  Plus,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { CreatePlaylistModal, ImportPlaylistModal } from '../Modals.jsx';
import { MuscifyMark } from '../MuscifyLogo.jsx';
import { TrackRow } from '../TrackRow.jsx';

export function LibraryView() {
  const {
    stats,
    savedTracks,
    toggleSaved,
    clearSaved,
    likedTracks,
    localTracks,
    historyTracks,
    removeFromHistory,
    clearHistory,
    playlists,
    playTrack,
    addLocalFiles,
    removeTrackFromPlaylist,
    deletePlaylist,
    youtubeConfigured,
  } = usePlayer();

  const [subView, setSubView] = useState({ type: 'root' });
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const fileInputRef = useRef(null);

  const minutesListened = Math.floor(stats.totalSecondsListened / 60);

  const topSongEntry = useMemo(() => {
    const entries = Object.values(stats.trackPlayCounts);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b.count - a.count)[0];
  }, [stats.trackPlayCounts]);

  const activePlaylist = useMemo(() => {
    if (subView.type !== 'playlist') return undefined;
    return playlists.find((p) => p.id === subView.playlistId);
  }, [playlists, subView]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addLocalFiles(e.target.files);
      setSubView({ type: 'local' });
    }
  };

  if (subView.type !== 'root') {
    const title =
      subView.type === 'saved'
        ? 'Downloads'
        : subView.type === 'local'
        ? 'Local Music'
        : subView.type === 'liked'
        ? 'Liked Songs'
        : subView.type === 'history'
        ? 'Listening History'
        : activePlaylist?.name || 'Playlist';

    const tracks =
      subView.type === 'saved'
        ? savedTracks
        : subView.type === 'local'
        ? localTracks
        : subView.type === 'liked'
        ? likedTracks
        : subView.type === 'history'
        ? historyTracks
        : activePlaylist?.tracks || [];

    return (
      <div className="space-y-6 pb-36 md:pb-28">
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setSubView({ type: 'root' })}
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Library</span>
          </button>

          {subView.type === 'saved' && savedTracks.length > 0 && (
            <button
              type="button"
              onClick={clearSaved}
              className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 px-3 py-2 rounded-full hover:bg-white/5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear downloads</span>
            </button>
          )}

          {subView.type === 'history' && historyTracks.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 px-3 py-2 rounded-full hover:bg-white/5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear history</span>
            </button>
          )}

          {subView.type === 'playlist' && activePlaylist && (
            <button
              type="button"
              onClick={() => {
                deletePlaylist(activePlaylist.id);
                setSubView({ type: 'root' });
              }}
              className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 px-3 py-2 rounded-full hover:bg-white/5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete playlist</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{title}</h1>
            <p className="text-sm text-zinc-400 mt-1 tabular-nums">
              {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
              {activePlaylist?.description ? ` · ${activePlaylist.description}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {subView.type === 'local' && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Add Audio Files</span>
                </button>
              </>
            )}

            {tracks.length > 0 && (
              <button
                type="button"
                onClick={() => playTrack(tracks[0], tracks, title)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Play All</span>
              </button>
            )}
          </div>
        </div>

        {tracks.length === 0 ? (
          <div className="rounded-3xl bg-[#141416] border border-white/[0.07] p-10 text-center space-y-3">
            <p className="text-base font-semibold text-white">Nothing here yet</p>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
              {subView.type === 'local'
                ? 'Choose MP3, WAV, FLAC, or M4A audio files from your device to play them directly inside Muscify.'
                : 'Save, like, or add tracks from Home, Explore, or Search to build your collection.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {tracks.map((track, idx) => (
              <TrackRow
                key={`${track.id}-${idx}`}
                track={track}
                queue={tracks}
                sourceLabel={title}
                index={idx}
                onRemove={
                  subView.type === 'playlist' && activePlaylist
                    ? () => removeTrackFromPlaylist(activePlaylist.id, track.id)
                    : subView.type === 'history'
                    ? () => removeFromHistory(track.id)
                    : subView.type === 'saved'
                    ? () => toggleSaved(track)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-36 md:pb-28">
      {/* Top Bar */}
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Library</h1>

        <div className="flex items-center gap-1 rounded-full bg-[#141417] border border-white/10 p-1">
          <button
            type="button"
            onClick={() => setSubView({ type: 'history' })}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Listening history"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setSubView({ type: 'liked' })}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Profile & liked songs"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Listening Experience Cards */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1 md:grid md:grid-cols-2 md:overflow-visible">
        <div className="w-[310px] sm:w-[340px] md:w-auto shrink-0 rounded-3xl bg-gradient-to-br from-[#9e211b] via-[#5c1212] to-[#1d0808] p-6 flex flex-col justify-between min-h-[190px] shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-white/80">
              YOUR LISTENING EXPERIENCE
            </span>
            <MuscifyMark className="w-7 h-6 text-white" />
          </div>

          <div className="my-4">
            <p className="text-4xl font-bold text-white tabular-nums leading-none">
              {minutesListened}
            </p>
            <p className="text-xs font-semibold tracking-wider text-white/75 mt-1.5">
              MINUTES LISTENED
            </p>
          </div>

          <div className="flex items-end justify-between text-xs">
            <div>
              <p className="font-semibold tracking-wider text-white">MUSCIFY LISTENER</p>
              <p className="text-white/75 tabular-nums mt-0.5">
                {stats.totalPlays} {stats.totalPlays === 1 ? 'play' : 'plays'} · All time
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] tracking-wider text-white/65">MEMBER SINCE</p>
              <p className="font-semibold text-white tabular-nums">{stats.memberSince}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => topSongEntry && playTrack(topSongEntry.track, [topSongEntry.track], 'Top Song')}
          className="w-[280px] sm:w-[320px] md:w-auto shrink-0 rounded-3xl bg-gradient-to-br from-[#8c4327] via-[#4a2013] to-[#190c08] p-6 flex flex-col justify-between min-h-[190px] text-left shadow-xl hover:brightness-110 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-white/80">
              YOUR TOP SONG
            </span>
            <span className="text-[11px] text-white/65">
              {youtubeConfigured ? 'Online Stream' : 'Curated Mix'}
            </span>
          </div>

          <div className="my-4">
            <p className="text-2xl font-bold text-white truncate">
              {topSongEntry ? topSongEntry.track.title : 'Start Listening'}
            </p>
            <p className="text-xs font-semibold tracking-wider text-white/75 mt-1">
              {topSongEntry ? 'TOP SONG' : 'PLAY A TRACK TO TRACK STATS'}
            </p>
          </div>

          <div className="text-xs">
            <p className="font-semibold text-white truncate">
              {topSongEntry ? topSongEntry.track.artist : 'Muscify Insights'}
            </p>
            <p className="text-white/75 tabular-nums mt-0.5">
              {topSongEntry ? `${topSongEntry.count} plays` : 'Real-time play counter'}
            </p>
          </div>
        </button>
      </div>

      {/* Interactive Rows */}
      <div className="divide-y divide-white/[0.08]">
        <button
          type="button"
          onClick={() => setSubView({ type: 'saved' })}
          className="w-full flex items-center justify-between py-4 px-1 hover:bg-white/[0.03] transition-colors text-left"
        >
          <div className="flex items-center gap-4">
            <Download className="w-5 h-5 text-white" />
            <div>
              <p className="text-base font-medium text-white">Downloads</p>
              <p className="text-xs text-zinc-500 tabular-nums">{savedTracks.length} downloaded tracks</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-500" />
        </button>

        <button
          type="button"
          onClick={() => setSubView({ type: 'local' })}
          className="w-full flex items-center justify-between py-4 px-1 hover:bg-white/[0.03] transition-colors text-left"
        >
          <div className="flex items-center gap-4">
            <Folder className="w-5 h-5 text-white" />
            <div>
              <p className="text-base font-medium text-white">Local Music</p>
              <p className="text-xs text-zinc-500 tabular-nums">
                {localTracks.length > 0
                  ? `${localTracks.length} device files`
                  : 'Play MP3, WAV & audio from your device'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-500" />
        </button>

        <button
          type="button"
          onClick={() => setSubView({ type: 'liked' })}
          className="w-full flex items-center justify-between py-4 px-1 hover:bg-white/[0.03] transition-colors text-left"
        >
          <div className="flex items-center gap-4">
            <Heart className="w-5 h-5 text-white" />
            <div>
              <p className="text-base font-medium text-white">Liked Songs</p>
              <p className="text-xs text-zinc-500 tabular-nums">{likedTracks.length} songs</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-500" />
        </button>
      </div>

      {/* Playlists Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">Playlists</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* New Playlist Card */}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="group text-left focus:outline-none"
          >
            <div className="aspect-square rounded-2xl bg-[#1c1c1e] group-hover:bg-[#242428] transition-colors flex items-center justify-center mb-2.5">
              <Plus className="w-10 h-10 text-white" />
            </div>
            <p className="text-base font-semibold text-white">New playlist</p>
            <p className="text-xs text-zinc-400">Saved to Muscify</p>
          </button>

          {/* Import Playlist Card */}
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="group text-left focus:outline-none"
          >
            <div className="aspect-square rounded-2xl bg-[#1c1c1e] group-hover:bg-[#242428] transition-colors flex items-center justify-center mb-2.5">
              <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center">
                <Link2 className="w-7 h-7" />
              </div>
            </div>
            <p className="text-base font-semibold text-white">Import Playlist</p>
            <p className="text-xs text-zinc-400">From playlist link or song list</p>
          </button>

          {/* User Playlists */}
          {playlists.map((pl) => (
            <button
              key={pl.id}
              type="button"
              onClick={() => setSubView({ type: 'playlist', playlistId: pl.id })}
              className="group text-left focus:outline-none"
            >
              <div className="aspect-square rounded-2xl bg-[#1c1c1e] overflow-hidden flex items-center justify-center mb-2.5 relative">
                {pl.coverUrl ? (
                  <img
                    src={pl.coverUrl}
                    alt={pl.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <ListMusic className="w-10 h-10 text-zinc-500" />
                )}
              </div>
              <p className="text-base font-semibold text-white truncate">{pl.name}</p>
              <p className="text-xs text-zinc-400 tabular-nums">
                {pl.tracks.length} {pl.tracks.length === 1 ? 'song' : 'songs'}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Developer Section */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xl font-bold text-white">Developer</h2>
        <div className="rounded-2xl bg-[#141416] border border-white/[0.08] p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-base font-semibold text-white">App by Vaibhav Sanas</p>
            <p className="text-xs text-zinc-400 mt-0.5">Muscify</p>
          </div>
          <MuscifyMark className="w-7 h-6 text-white/75 shrink-0" />
        </div>
      </section>

      <CreatePlaylistModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ImportPlaylistModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
