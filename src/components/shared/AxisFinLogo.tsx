interface AxisFinLogoProps {
  className?: string;
  showWordmark?: boolean;
}

export function AxisFinLogo({ className = '', showWordmark = false }: AxisFinLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-label="AxisFin">
      <svg
        width="48"
        height="48"
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-[0_0_14px_rgba(59,130,246,0.28)]"
        aria-hidden="true"
      >
        <rect width="512" height="512" rx="112" fill="url(#axisfin-bg)" />
        <path
          d="M128 326L241 96L356 326"
          stroke="url(#axisfin-blue)"
          strokeWidth="38"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M174 250C224 205 326 200 370 241C421 289 348 349 242 337C141 326 76 288 108 240C128 211 181 202 237 217"
          stroke="url(#axisfin-purple)"
          strokeWidth="22"
          strokeLinecap="round"
        />
        <circle cx="190" cy="344" r="42" fill="url(#axisfin-dot)" />
        <circle cx="210" cy="226" r="12" fill="#050608" />
        <path d="M226 218L288 194" stroke="#050608" strokeWidth="18" strokeLinecap="round" />
        <defs>
          <linearGradient id="axisfin-bg" x1="46" y1="42" x2="448" y2="472" gradientUnits="userSpaceOnUse">
            <stop stopColor="#111827" />
            <stop offset="0.55" stopColor="#0F1116" />
            <stop offset="1" stopColor="#1B1238" />
          </linearGradient>
          <linearGradient id="axisfin-blue" x1="128" y1="96" x2="356" y2="326" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38BDF8" />
            <stop offset="0.48" stopColor="#3882F6" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="axisfin-purple" x1="96" y1="212" x2="394" y2="339" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8B5CF6" />
            <stop offset="0.45" stopColor="#6D5AF6" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="axisfin-dot" x1="160" y1="306" x2="229" y2="381" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#6D5AF6" />
          </linearGradient>
        </defs>
      </svg>
      {showWordmark ? <span className="font-display text-2xl font-bold text-white">AxisFin</span> : null}
    </div>
  );
}
