import React, { useState } from 'react';
import { Disc3 } from 'lucide-react';

export function MuscifyMark({ className = 'w-8 h-8' }) {
  return (
    <svg
      viewBox="0 0 36 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3 7.5C11.5 2.5 24.5 2.5 33 7.5"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M6 15C13 11 23 11 30 15"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M9.5 22.5C14.8 19.8 21.2 19.8 26.5 22.5"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TrackArtwork({
  src,
  alt,
  className = 'w-12 h-12 rounded-lg',
  accentColor = '#581c87',
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center overflow-hidden bg-zinc-900 text-white/70 shrink-0 ${className}`}
        style={{
          backgroundImage: `radial-gradient(circle at 30% 25%, ${accentColor}88, #121215 80%)`,
        }}
        aria-label={alt}
      >
        <Disc3 className="w-1/2 h-1/2 opacity-60" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover bg-zinc-900 shrink-0 ${className}`}
      loading="lazy"
    />
  );
}
