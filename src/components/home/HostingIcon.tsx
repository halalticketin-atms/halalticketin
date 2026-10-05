import { useId } from 'react';

/** Filled artwork drawn for the homepage invitation, with the brand ticket cutouts. */
export default function HostingIcon({ kind }: { kind: 'ticket' | 'community' | 'checkin' }) {
  const id = useId();
  return (
    <svg width="38" height="38" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="8" y1="5" x2="38" y2="43" gradientUnits="userSpaceOnUse">
          <stop stopColor="#53D8C1" /><stop offset=".52" stopColor="#13AEB3" /><stop offset="1" stopColor="#00858F" />
        </linearGradient>
      </defs>
      {kind === 'ticket' && <g transform="rotate(-35 24 24)">
        <path d="M10 10h28a3 3 0 0 1 3 3v6a5 5 0 0 0 0 10v6a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3v-6a5 5 0 0 0 0-10v-6a3 3 0 0 1 3-3Z" fill={`url(#${id})`} />
        <path d="M30 13v3m0 5v3m0 5v3" stroke="white" strokeOpacity=".65" strokeWidth="2" strokeLinecap="round" />
        <path d="M13 13h13" stroke="white" strokeOpacity=".4" strokeWidth="2" strokeLinecap="round" />
      </g>}
      {kind === 'community' && <>
        <path d="M3 33c0-6 4-10 9-10s9 4 9 10v5H7a4 4 0 0 1-4-4v-1Zm24 0c0-6 4-10 9-10s9 4 9 10v1a4 4 0 0 1-4 4H27v-5Z" fill={`url(#${id})`} opacity=".7" />
        <circle cx="12" cy="16" r="6" fill={`url(#${id})`} opacity=".75" /><circle cx="36" cy="16" r="6" fill={`url(#${id})`} opacity=".75" />
        <path d="M11 37c0-7 5-13 13-13s13 6 13 13v5H11v-5Z" fill={`url(#${id})`} stroke="#D6FFF5" strokeWidth="2" />
        <circle cx="24" cy="13" r="8" fill={`url(#${id})`} stroke="#D6FFF5" strokeWidth="2" />
      </>}
      {kind === 'checkin' && <>
        <path d="M25 4H15a3 3 0 0 0-3 2L7 25a2 2 0 0 0 2 3h10l-3 14c-.4 2 2 3 3 1l23-26a2 2 0 0 0-2-3H27l2-6a3 3 0 0 0-4-4Z" fill={`url(#${id})`} />
        <path d="m17 8-4 14h8" stroke="white" strokeOpacity=".45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>}
    </svg>
  );
}
