import React, { useEffect, useState } from 'react';
import { ArrowLeft, Play, Shuffle, Loader2 } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { TrackRow } from '../TrackRow.jsx';
import { fetchMoodTracks, getCatalogMeta } from '../../services/musicApi.js';

export function ExploreView() {
  const { playTrack } = usePlayer();
  const [moods, setMoods] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const [moodTracks, setMoodTracks] = useState([]);
  const [loadingMood, setLoadingMood] = useState(false);

  useEffect(() => {
    const meta = getCatalogMeta();
    if (meta.moods) setMoods(meta.moods);
  }, []);

  const openMood = async (mood) => {
    setSelectedMood(mood);
    setLoadingMood(true);
    try {
      const data = await fetchMoodTracks(mood.id);
      setMoodTracks(data.tracks || []);
    } catch {
      setMoodTracks([]);
    } finally {
      setLoadingMood(false);
    }
  };

  if (selectedMood) {
    return (
      <div className="space-y-6 pb-36 md:pb-28">
        <button
          type="button"
          onClick={() => setSelectedMood(null)}
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore</span>
        </button>

        {/* Mood Hero Header */}
        <div
          className="relative overflow-hidden rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6"
          style={{
            background: `linear-gradient(135deg, ${selectedMood.color}, #111113 85%)`,
          }}
        >
          <div>
            <p className="text-xs font-medium text-white/75 mb-1">Mood & Genre Station</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {selectedMood.label}
            </h1>
            <p className="text-sm text-white/80 mt-1">{selectedMood.subtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={moodTracks.length === 0}
              onClick={() =>
                moodTracks[0] && playTrack(moodTracks[0], moodTracks, `${selectedMood.label} Mix`)
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-zinc-100 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Play All</span>
            </button>
            <button
              type="button"
              disabled={moodTracks.length === 0}
              onClick={() => {
                if (moodTracks.length === 0) return;
                const shuffled = [...moodTracks].sort(() => Math.random() - 0.5);
                playTrack(shuffled[0], shuffled, `${selectedMood.label} Mix`);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/30 text-white text-sm font-medium border border-white/15 hover:bg-black/45 disabled:opacity-50"
            >
              <Shuffle className="w-4 h-4" />
              <span>Shuffle</span>
            </button>
          </div>
        </div>

        {loadingMood ? (
          <div className="py-12 flex items-center justify-center gap-2 text-zinc-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading {selectedMood.label} tracks...</span>
          </div>
        ) : (
          <div className="space-y-1">
            {moodTracks.map((track, idx) => (
              <TrackRow
                key={track.id}
                track={track}
                queue={moodTracks}
                sourceLabel={`${selectedMood.label} Mix`}
                index={idx}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-36 md:pb-28">
      <div className="pt-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Explore</h1>
        <p className="text-sm text-zinc-400 mt-1">Moods, genres & curated stations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {moods.map((mood) => (
          <button
            key={mood.id}
            type="button"
            onClick={() => openMood(mood)}
            className="group relative h-28 sm:h-32 rounded-2xl overflow-hidden text-left focus:outline-none active:scale-[0.98] transition-transform"
            style={{ backgroundColor: mood.color }}
          >
            <div className="absolute top-0 right-0 bottom-0 w-[68%] overflow-hidden">
              <img
                src={mood.image}
                alt={mood.label}
                className="w-full h-full object-cover opacity-55 mix-blend-luminosity group-hover:scale-105 transition-transform duration-500"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(90deg, ${mood.color} 0%, ${mood.color}99 35%, rgba(0,0,0,0.45) 100%)`,
                }}
              />
            </div>

            <div className="relative z-10 h-full p-3.5 flex flex-col justify-between">
              <span className="text-[15px] sm:text-base font-bold text-white leading-tight drop-shadow-sm">
                {mood.label}
              </span>
              <span className="text-[11px] sm:text-xs font-medium text-white/90 text-right self-end leading-tight max-w-[75%] drop-shadow">
                {mood.subtitle}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
