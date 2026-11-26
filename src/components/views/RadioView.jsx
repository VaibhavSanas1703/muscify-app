import React, { useEffect, useState } from 'react';
import { Radio, Play, Search, Loader2, Disc3 } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { TrackRow } from '../TrackRow.jsx';
import { fetchRelatedTracks, getCatalogMeta } from '../../services/musicApi.js';

export function RadioView() {
  const { currentTrack, playTrack } = usePlayer();
  const [stations, setStations] = useState([]);
  const [activeStation, setActiveStation] = useState(null);
  const [stationTracks, setStationTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [seedInput, setSeedInput] = useState('');

  useEffect(() => {
    const meta = getCatalogMeta();
    if (meta.stations) setStations(meta.stations);
  }, []);

  const launchStation = async (station) => {
    setActiveStation(station);
    setLoading(true);
    try {
      const data = await fetchRelatedTracks({ q: station.seedQuery });
      const tracks = data.tracks || [];
      setStationTracks(tracks);
      if (tracks[0]) {
        playTrack(tracks[0], tracks, station.title);
      }
    } catch {
      setStationTracks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedSubmit = async (e) => {
    e.preventDefault();
    if (!seedInput.trim()) return;
    const customStation = {
      id: `custom-${Date.now()}`,
      title: `${seedInput.trim()} Radio`,
      subtitle: 'Continuous mix tailored from your seed',
      seedQuery: `${seedInput.trim()} official audio`,
      gradient: 'from-[#7e22ce] via-[#be185d] to-[#c2410c]',
      tag: 'Custom Radio',
    };
    await launchStation(customStation);
  };

  return (
    <div className="space-y-7 pb-36 md:pb-28">
      <div className="pt-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Radio</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Endless stations built around artists, genres & moods
        </p>
      </div>

      {/* Featured Gradient Hero Card */}
      <section
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7e22ce] via-[#9d174d] to-[#c2410c] p-6 sm:p-7 shadow-xl"
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-2 max-w-lg">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
              {currentTrack
                ? `Start ${currentTrack.title} Radio`
                : 'Endless Smart Music Radio'}
            </h2>
            <p className="text-sm text-white/85">
              {currentTrack
                ? `Queue up continuous songs inspired by ${currentTrack.artist}.`
                : 'Pick a station below or enter any artist or song to generate an infinite queue.'}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (currentTrack) {
                    launchStation({
                      id: `track-radio-${currentTrack.id}`,
                      title: `${currentTrack.title} Radio`,
                      subtitle: `Inspired by ${currentTrack.artist}`,
                      seedQuery: `${currentTrack.artist} ${currentTrack.title}`,
                      gradient: 'from-[#7e22ce] to-[#c2410c]',
                      tag: 'Now Playing Radio',
                    });
                  } else if (stations[0]) {
                    launchStation(stations[0]);
                  }
                }}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-zinc-100 active:scale-[0.98] transition-all shadow-md"
              >
                <Radio className="w-4 h-4" />
                <span>Launch Station</span>
              </button>
            </div>
          </div>

          <div className="hidden sm:flex w-20 h-20 rounded-2xl bg-black/25 border border-white/15 items-center justify-center shrink-0">
            <Radio className="w-10 h-10 text-white" />
          </div>
        </div>
      </section>

      {/* Custom Seed Radio Search */}
      <form onSubmit={handleSeedSubmit} className="flex items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            placeholder="Seed a radio station (e.g., Arijit Singh, The Weeknd, Lofi)..."
            className="w-full rounded-full bg-[#141417] border border-white/10 pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-3 rounded-full bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors shrink-0"
        >
          Tune In
        </button>
      </form>

      {/* Live Stations Grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">Featured Stations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((station) => {
            const isSelected = activeStation?.id === station.id;
            return (
              <button
                key={station.id}
                type="button"
                onClick={() => launchStation(station)}
                className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${station.gradient} p-5 text-left transition-transform active:scale-[0.98] ${
                  isSelected ? 'ring-2 ring-white' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-white/75">{station.tag}</p>
                    <h3 className="text-lg font-bold text-white mt-1 leading-snug">
                      {station.title}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-black transition-colors">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
                <p className="text-xs text-white/80 mt-3 line-clamp-2">{station.subtitle}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Station Queue Preview */}
      {activeStation && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Disc3 className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '6s' }} />
              <h2 className="text-lg font-bold text-white">{activeStation.title} — Up Next</h2>
            </div>
          </div>

          {loading ? (
            <div className="py-10 flex items-center justify-center gap-2 text-zinc-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Tuning station queue...</span>
            </div>
          ) : (
            <div className="space-y-1">
              {stationTracks.map((track, idx) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  queue={stationTracks}
                  sourceLabel={activeStation.title}
                  index={idx}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
