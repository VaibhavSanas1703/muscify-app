import React, { useEffect, useState } from 'react';
import { History, Play, Disc3, Globe, Loader2 } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { MuscifyMark, TrackArtwork } from '../MuscifyLogo.jsx';
import { TrackRow } from '../TrackRow.jsx';
import { fetchHomeFeed } from '../../services/musicApi.js';

const REGIONS = [
  { code: 'IN', label: 'India' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'JP', label: 'Japan' },
];

export function HomeView() {
  const {
    playTrack,
    setActiveTab,
    youtubeConfigured,
    historyTracks,
    removeFromHistory,
    clearHistory,
    currentTrack,
  } = usePlayer();

  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState('IN');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchHomeFeed(region)
      .then((data) => {
        if (!cancelled) setFeed(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [region]);

  const handleDiscoveryMix = () => {
    const pool = feed?.topPicks || [];
    if (pool.length > 0) {
      playTrack(pool[0], pool, 'Discovery Station');
    } else {
      setActiveTab('radio');
    }
  };

  return (
    <div className="space-y-8 pb-36 md:pb-28">
      {/* Top Header */}
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3 md:hidden">
          <MuscifyMark className="w-8 h-7 text-white" />
          <span className="text-xl font-bold tracking-tight text-white">Muscify</span>
        </div>

        <div className="hidden md:block">
          <h1 className="text-2xl font-bold tracking-tight text-white">Listen Now</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.08] rounded-full px-3 py-1.5">
            <Globe className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              aria-label="Chart region"
              className="bg-transparent text-xs font-medium text-zinc-200 focus:outline-none cursor-pointer"
            >
              {REGIONS.map((r) => (
                <option key={r.code} value={r.code} className="bg-zinc-900 text-white">
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Listening history and library"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Featured Gradient Hero Card */}
      <section
        aria-label="Featured mix"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#6d28d9] via-[#5b21b6] to-[#311042] p-6 sm:p-7 shadow-xl"
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-2 max-w-lg">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
              {youtubeConfigured
                ? 'Stream Live Online Music'
                : 'Your Daily Discovery Mix'}
            </h2>
            <p className="text-sm text-white/80 leading-relaxed">
              {youtubeConfigured
                ? 'Live regional charts, mood stations, synced lyrics, and seamless video-to-audio streaming.'
                : 'Play curated Bollywood, Indie, Lofi, and Global hits instantly or search tracks anytime.'}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleDiscoveryMix}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-zinc-100 active:scale-[0.98] transition-all shadow-md"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Play Discovery Mix</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('search')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/25 hover:bg-black/35 text-white text-sm font-medium border border-white/15 transition-colors"
              >
                <span>Search Songs</span>
              </button>
            </div>
          </div>

          <div className="hidden sm:flex items-center justify-center w-24 h-24 rounded-2xl bg-black/25 border border-white/15 backdrop-blur-md shrink-0">
            <MuscifyMark className="w-12 h-10 text-white" />
          </div>
        </div>
      </section>

      {loading && !feed ? (
        <div className="py-16 flex items-center justify-center gap-2.5 text-zinc-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading music feed...</span>
        </div>
      ) : (
        <>
          {/* Top Picks for You */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Top Picks for You
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('explore')}
                className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Explore Moods
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-visible">
              {/* Featured Discovery Station Poster Card */}
              <button
                type="button"
                onClick={handleDiscoveryMix}
                className="group relative w-60 sm:w-64 md:w-auto aspect-[3/4] shrink-0 rounded-2xl overflow-hidden bg-zinc-900 text-left focus:outline-none"
              >
                <img
                  src="/src/assets/images/cover_discovery_mix_1795688001424.jpg"
                  alt="Discovery Station"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-xs font-medium text-white/75">Made for You</p>
                  <p className="text-lg font-bold text-white leading-snug mt-0.5">
                    Discovery Station
                  </p>
                  <p className="text-xs text-white/65 mt-1">Endless personalized mix</p>
                </div>
              </button>

              {(feed?.topPicks || []).slice(0, 7).map((track) => {
                const isActive = currentTrack?.id === track.id;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => playTrack(track, feed?.topPicks, 'Top Picks for You')}
                    className="group relative w-60 sm:w-64 md:w-auto aspect-[3/4] shrink-0 rounded-2xl overflow-hidden bg-zinc-900 text-left focus:outline-none"
                  >
                    <TrackArtwork
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                      accentColor={track.accentColor}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />

                    <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-xs font-medium text-white/75 truncate">
                        {track.artist}
                      </p>
                      <p className="text-base font-bold text-white leading-snug line-clamp-2 mt-0.5">
                        {track.title}
                      </p>
                      <p className="text-xs text-white/60 mt-1 tabular-nums">
                        {isActive ? 'Now Playing' : `Single · ${track.year || '2026'}`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Albums & Singles */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Albums & singles
            </h2>

            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 md:grid md:grid-cols-4 lg:grid-cols-5 md:overflow-visible">
              {(feed?.albumsAndSingles || []).map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => playTrack(track, feed?.albumsAndSingles, 'Albums & Singles')}
                  className="group w-40 sm:w-44 md:w-auto shrink-0 text-left focus:outline-none"
                >
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-900 mb-2.5">
                    <TrackArtwork
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                      accentColor={track.accentColor}
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 fill-black ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">{track.artist}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Recently Played or Quick Picks */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {historyTracks.length > 0 ? 'Recently Played' : 'Quick Picks'}
              </h2>
              {historyTracks.length > 0 ? (
                <button
                  type="button"
                  onClick={clearHistory}
                  className="min-h-[36px] px-3 py-1 rounded-full text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Clear
                </button>
              ) : (
                <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                  <Disc3 className="w-3.5 h-3.5" />
                  <span>Tap any track to stream</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-1">
              {(historyTracks.length > 0 ? historyTracks.slice(0, 6) : feed?.quickPicks.slice(0, 8) || []).map(
                (track, idx, arr) => (
                  <TrackRow
                    key={`${track.id}-${idx}`}
                    track={track}
                    queue={arr}
                    sourceLabel={historyTracks.length > 0 ? 'Recently Played' : 'Quick Picks'}
                    onRemove={
                      historyTracks.length > 0
                        ? () => removeFromHistory(track.id)
                        : undefined
                    }
                  />
                ),
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
