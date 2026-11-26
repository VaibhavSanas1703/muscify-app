import React, { useEffect, useMemo, useState } from 'react';
import { Search, X, Loader2, ListMusic, User } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { TrackArtwork } from '../MuscifyLogo.jsx';
import { TrackRow } from '../TrackRow.jsx';
import { searchTracks } from '../../services/musicApi.js';

const QUICK_SEARCHES = [
  'Arijit Singh',
  'Pasoori',
  'The Weeknd',
  'Lofi Beats',
  'Coke Studio',
  'Bollywood Party',
];

export function SearchView() {
  const {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    playTrack,
    likedTracks,
    savedTracks,
    localTracks,
    playlists,
    setActiveTab,
    youtubeConfigured,
  } = usePlayer();

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('youtube');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || scope !== 'youtube') {
      if (!trimmed) {
        setResults([]);
        setNotice(null);
      }
      return;
    }

    const handle = window.setTimeout(async () => {
      setLoading(true);
      setNotice(null);
      try {
        const data = await searchTracks(trimmed);
        setResults(data.tracks || []);
        if (data.notice) setNotice(data.notice);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(handle);
  }, [query, scope]);

  const libraryMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const combined = [...likedTracks, ...savedTracks, ...localTracks];
    const unique = combined.filter(
      (t, idx, arr) => arr.findIndex((x) => x.id === t.id) === idx,
    );
    if (!q) return unique;
    return unique.filter((t) =>
      `${t.title} ${t.artist} ${t.album || ''}`.toLowerCase().includes(q),
    );
  }, [query, likedTracks, savedTracks, localTracks]);

  const playlistMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return playlists;
    return playlists.filter((p) =>
      `${p.name} ${p.description || ''}`.toLowerCase().includes(q),
    );
  }, [query, playlists]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
  };

  return (
    <div className="space-y-5 pb-36 md:pb-28">
      {/* Top Search Pill & Profile button */}
      <div className="flex items-center gap-3 pt-2">
        <form onSubmit={handleSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Artists, Songs, Lyrics and More"
            className="w-full rounded-full bg-[#141417] border border-white/10 pl-11 pr-10 py-3 text-sm sm:text-[15px] text-white placeholder-zinc-400 focus:outline-none focus:border-white/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={() => setActiveTab('library')}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-[#141417] border border-white/10 text-zinc-300 hover:text-white shrink-0"
          aria-label="Open Library"
        >
          <User className="w-4 h-4" />
        </button>
      </div>

      {/* Segmented Control: Online | Library | Playlists */}
      <div className="rounded-full bg-[#141417] p-1 grid grid-cols-3 border border-white/[0.06]">
        {['youtube', 'library', 'playlists'].map((tab) => {
          const active = scope === tab;
          const label =
            tab === 'youtube' ? 'Online' : tab === 'library' ? 'Library' : 'Playlists';
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setScope(tab)}
              className={`py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                active ? 'bg-white/16 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Empty Query -> Recent Searches & Quick Prompts */}
      {!query.trim() && scope === 'youtube' && (
        <div className="space-y-6 pt-1">
          {recentSearches.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Recent searches</h2>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-xs font-medium text-zinc-300 hover:text-white px-2 py-1"
                >
                  Clear
                </button>
              </div>

              <div className="space-y-1">
                {recentSearches.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between gap-3 py-2 px-1 rounded-xl hover:bg-white/[0.04]"
                  >
                    <button
                      type="button"
                      onClick={() => playTrack(track, recentSearches, 'Search')}
                      className="flex items-center gap-3.5 min-w-0 flex-1 text-left"
                    >
                      <TrackArtwork
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-12 h-12 rounded-xl"
                        accentColor={track.accentColor}
                      />
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-white truncate">
                          {track.title}
                        </p>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">{track.artist}</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => removeRecentSearch(track.id)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-zinc-400 hover:text-white"
                      aria-label={`Remove ${track.title} from recent searches`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-400">
              {youtubeConfigured ? 'Discover Online Songs' : 'Quick Search'}
            </h2>
            <div className="flex flex-wrap gap-2">
              {QUICK_SEARCHES.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="px-4 py-2 rounded-full bg-white/[0.07] hover:bg-white/14 text-sm text-zinc-200 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Online Search Results */}
      {scope === 'youtube' && query.trim() && (
        <div className="space-y-3">
          {notice && (
            <p className="text-xs text-zinc-400 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5">
              {notice}
            </p>
          )}

          {loading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-zinc-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Searching online catalog...</span>
            </div>
          ) : results.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">
              No matching songs found for "{query}".
            </p>
          ) : (
            <div className="space-y-1">
              {results.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  queue={results}
                  sourceLabel="Search"
                  onAfterPlay={addRecentSearch}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Library Search Scope */}
      {scope === 'library' && (
        <div className="space-y-2">
          {libraryMatches.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">
              No matching tracks in your Liked, Saved, or Local songs.
            </p>
          ) : (
            libraryMatches.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                queue={libraryMatches}
                sourceLabel="Your Library"
              />
            ))
          )}
        </div>
      )}

      {/* Playlists Search Scope */}
      {scope === 'playlists' && (
        <div className="space-y-2">
          {playlistMatches.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">
              No playlists found. Create or import playlists in Library.
            </p>
          ) : (
            playlistMatches.map((pl) => (
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
                className="w-full flex items-center gap-3.5 p-2.5 rounded-2xl hover:bg-white/[0.05] text-left transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0">
                  {pl.coverUrl ? (
                    <img
                      src={pl.coverUrl}
                      alt={pl.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ListMusic className="w-5 h-5 text-zinc-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-white truncate">{pl.name}</p>
                  <p className="text-xs text-zinc-400 tabular-nums">
                    {pl.tracks.length} songs
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
