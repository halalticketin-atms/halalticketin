import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';
export const alt = "HalalTicketin' - Your Home of Meaningful Events";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'linear-gradient(135deg, rgb(236, 254, 255) 0%, rgb(240, 253, 250) 45%, rgb(255, 255, 255) 100%)',
          color: '#0f172a',
          padding: '64px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 28,
            fontWeight: 700,
            color: '#0f766e',
          }}
        >
          HalalTicketin&apos;
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>
            <div>Your home of</div>
            <div>Meaningful events.</div>
          </div>
          <div style={{ fontSize: 30, color: '#334155' }}>
            Your home for halal-friendly communities.
          </div>
        </div>
      </div>
    ),
    size
  );
}
