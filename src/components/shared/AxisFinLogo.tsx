interface AxisFinLogoProps {
  className?: string;
  showWordmark?: boolean;
}

export function AxisFinLogo({ className = '', showWordmark = false }: AxisFinLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`} role="img" aria-label="Axis Fin">
      <svg
        width="48"
        height="48"
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-[0_0_18px_rgba(125,92,255,0.26)]"
        aria-hidden="true"
      >
        <rect width="512" height="512" rx="122" fill="url(#axisfin-bg)" />
        <path
          d="M256 72L392 146V304L256 414L120 304V146L256 72Z"
          fill="url(#axisfin-metal)"
          stroke="url(#axisfin-border)"
          strokeWidth="12"
          strokeLinejoin="round"
        />
        <path
          d="M154 315L218 202L279 315L340 185L382 233"
          stroke="url(#axisfin-prism)"
          strokeWidth="34"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M164 346H348"
          stroke="url(#axisfin-line)"
          strokeWidth="24"
          strokeLinecap="round"
        />
        <circle cx="218" cy="202" r="14" fill="#06070B" />
        <path d="M256 72L392 146L256 216L120 146L256 72Z" fill="white" opacity="0.05" />
        <defs>
          <linearGradient id="axisfin-bg" x1="46" y1="42" x2="448" y2="472" gradientUnits="userSpaceOnUse">
            <stop stopColor="#16181E" />
            <stop offset="0.52" stopColor="#07080B" />
            <stop offset="1" stopColor="#171225" />
          </linearGradient>
          <linearGradient id="axisfin-metal" x1="145" y1="108" x2="366" y2="382" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2A2C33" />
            <stop offset="0.46" stopColor="#0F1015" />
            <stop offset="1" stopColor="#3A3545" />
          </linearGradient>
          <linearGradient id="axisfin-border" x1="134" y1="102" x2="376" y2="386" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F4F4F5" stopOpacity="0.42" />
            <stop offset="0.46" stopColor="#51545D" stopOpacity="0.44" />
            <stop offset="1" stopColor="#9B7CFF" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="axisfin-prism" x1="154" y1="185" x2="382" y2="315" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F8FAFC" />
            <stop offset="0.42" stopColor="#38BDF8" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="axisfin-line" x1="164" y1="346" x2="348" y2="346" gradientUnits="userSpaceOnUse">
            <stop stopColor="#CBD5E1" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
      {showWordmark ? <span className="font-display text-2xl font-bold text-white">AxisFin</span> : null}
    </div>
  );
}
