import React, { useState } from 'react';
import { Check, Plus, X, Loader2, ListMusic, Link2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { TrackArtwork } from './MuscifyLogo.jsx';
import { importPlaylist } from '../services/musicApi.js';

export function CreatePlaylistModal({ open, onClose }) {
  const { createPlaylist } = usePlayer();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    createPlaylist(name, description);
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#141416] border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">New playlist</h2>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pl-name" className="block text-xs font-medium text-zinc-400 mb-1.5">
              Playlist title
            </label>
            <input
              id="pl-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Late Night Drives"
              autoFocus
              required
              className="w-full rounded-xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/40"
            />
          </div>
          <div>
            <label htmlFor="pl-desc" className="block text-xs font-medium text-zinc-400 mb-1.5">
              Description (optional)
            </label>
            <input
              id="pl-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Moody acoustic and synth tracks"
              className="w-full rounded-xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/40"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-sm font-medium text-zinc-300 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full text-sm font-semibold bg-white text-black hover:bg-zinc-200 transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ImportPlaylistModal({ open, onClose }) {
  const { createPlaylist, playTrack } = usePlayer();
  const [input, setInput] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const handleImport = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await importPlaylist(input.trim());
      if (!data.tracks || data.tracks.length === 0) {
        setError('Could not find tracks from that link or list.');
        setLoading(false);
        return;
      }
      const pl = createPlaylist(
        customTitle.trim() || data.playlistName || 'Imported Playlist',
        `${data.tracks.length} imported tracks`,
        data.tracks,
        'imported',
      );
      if (pl.tracks[0]) {
        playTrack(pl.tracks[0], pl.tracks, pl.name);
      }
      setInput('');
      setCustomTitle('');
      onClose();
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Import failed. Please check the URL or song names.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#141416] border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Link2 className="w-5 h-5 text-white" />
            <h2 className="text-xl font-bold text-white">Import Playlist</h2>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
          Paste a playlist link or type song names one per line to resolve and save them into Muscify.
        </p>

        <form onSubmit={handleImport} className="space-y-4">
          <div>
            <label htmlFor="import-title" className="block text-xs font-medium text-zinc-400 mb-1.5">
              Playlist name (optional)
            </label>
            <input
              id="import-title"
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="My Imported Mix"
              className="w-full rounded-xl bg-zinc-900 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/40"
            />
          </div>
          <div>
            <label htmlFor="import-input" className="block text-xs font-medium text-zinc-400 mb-1.5">
              Playlist URL or Song List
            </label>
            <textarea
              id="import-input"
              rows={4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={'Paste a playlist URL...\nor\nPasoori - Ali Sethi\nBlinding Lights - The Weeknd'}
              required
              className="w-full rounded-xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/40 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-sm font-medium text-zinc-300 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-full text-sm font-semibold bg-white text-black hover:bg-zinc-200 transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Importing...' : 'Import'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AddToPlaylistModal() {
  const {
    playlistModalTrack,
    openAddToPlaylistModal,
    playlists,
    addTrackToPlaylist,
    createPlaylist,
  } = usePlayer();
  const [quickName, setQuickName] = useState('');

  if (!playlistModalTrack) return null;

  const handleQuickCreate = (e) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    createPlaylist(quickName, '', [playlistModalTrack]);
    setQuickName('');
    openAddToPlaylistModal(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[#141416] border border-white/10 p-6 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Add to playlist</h2>
          <button
            onClick={() => openAddToPlaylistModal(null)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] mb-4">
          <TrackArtwork
            src={playlistModalTrack.thumbnail}
            alt={playlistModalTrack.title}
            className="w-11 h-11 rounded-lg"
            accentColor={playlistModalTrack.accentColor}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{playlistModalTrack.title}</p>
            <p className="text-xs text-zinc-400 truncate">{playlistModalTrack.artist}</p>
          </div>
        </div>

        <div className="overflow-y-auto space-y-1.5 mb-4 flex-1">
          {playlists.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center">No playlists yet. Create one below.</p>
          ) : (
            playlists.map((pl) => {
              const alreadyIn = pl.tracks.some((t) => t.id === playlistModalTrack.id);
              return (
                <button
                  key={pl.id}
                  onClick={() => {
                    addTrackToPlaylist(pl.id, playlistModalTrack);
                    openAddToPlaylistModal(null);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/10 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                      {pl.coverUrl ? (
                        <img
                          src={pl.coverUrl}
                          alt={pl.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ListMusic className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{pl.name}</p>
                      <p className="text-xs text-zinc-400 tabular-nums">{pl.tracks.length} songs</p>
                    </div>
                  </div>
                  {alreadyIn ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Plus className="w-4 h-4 text-zinc-400 shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <form onSubmit={handleQuickCreate} className="flex items-center gap-2 pt-3 border-t border-white/10">
          <input
            type="text"
            value={quickName}
            onChange={(e) => setQuickName(e.target.value)}
            placeholder="Quick new playlist..."
            className="flex-1 rounded-full bg-zinc-900 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/40"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors shrink-0"
          >
            Create & Add
          </button>
        </form>
      </div>
    </div>
  );
}
