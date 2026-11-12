/** Soft painted farmland illustration for the sidebar foot (palette-matched, decorative). */
export function Landscape({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 230" className={className} aria-hidden preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="ls-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff9ef" stopOpacity="0" />
          <stop offset="1" stopColor="#ffe2b8" stopOpacity=".9" />
        </linearGradient>
        <linearGradient id="ls-h1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c5d67c" />
          <stop offset="1" stopColor="#98b543" />
        </linearGradient>
        <linearGradient id="ls-h2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8c25a" />
          <stop offset="1" stopColor="#6f8f1d" />
        </linearGradient>
        <linearGradient id="ls-h3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8aa62a" />
          <stop offset="1" stopColor="#425500" />
        </linearGradient>
      </defs>
      <rect width="260" height="230" fill="url(#ls-sky)" />
      <circle cx="132" cy="92" r="30" fill="#f4c56d" opacity=".75" />
      <path d="M0 120c40-14 80-18 130-8s90 6 130-6v124H0Z" fill="#e6ecc7" />
      <path d="M0 140c50-22 100-20 150-6s80 10 110 2v94H0Z" fill="url(#ls-h1)" />
      {[[96, 128], [108, 124], [120, 126], [132, 123], [144, 127]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 0.8} y={y} width="1.6" height="8" fill="#425500" />
          <ellipse cx={x} cy={y - 2} rx="4" ry="7" fill="#5f7a14" />
        </g>
      ))}
      <path d="M0 170c40-18 90-24 140-10s90 16 120 8v62H0Z" fill="url(#ls-h2)" />
      <path d="M0 200c60-20 120-18 170-4s70 8 90 4v30H0Z" fill="url(#ls-h3)" />
      {Array.from({ length: 14 }, (_, i) => (
        <path key={i} d={`M${10 + i * 18} 230c4-14 6-22 8-30`} stroke="#d9b65a" strokeWidth="1.4" fill="none" opacity=".7" />
      ))}
    </svg>
  );
}
