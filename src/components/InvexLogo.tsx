interface InvexLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const InvexLogo = ({ className = '', size = 'md' }: InvexLogoProps) => {
  const sizes = {
    sm: { width: 120, height: 40 },
    md: { width: 160, height: 50 },
    lg: { width: 200, height: 65 },
  };

  const { width, height } = sizes[size];

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 65"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background shape */}
      <rect x="2" y="12" width="42" height="42" rx="8" fill="#00B37E" />
      
      {/* Box/Package icon inside */}
      <path
        d="M23 22L33 27V37L23 42L13 37V27L23 22Z"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M23 32V42M13 27L23 32L33 27"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      
      {/* Yellow accent dot */}
      <circle cx="33" cy="22" r="4" fill="#F9C74F" />
      
      {/* INVEX text */}
      <text
        x="52"
        y="40"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="700"
        fontSize="28"
        fill="#00B37E"
      >
        Invex
      </text>
      
      {/* 5.0 badge */}
      <rect x="140" y="22" width="45" height="22" rx="4" fill="#00B37E" />
      <text
        x="162.5"
        y="38"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="600"
        fontSize="14"
        fill="white"
        textAnchor="middle"
      >
        5.0
      </text>
    </svg>
  );
};