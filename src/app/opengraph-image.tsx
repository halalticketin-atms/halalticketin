import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';
export const alt = "HalalTicketin' - Meaningful events, made for your community";
export const runtime = 'nodejs';

export default async function OpenGraphImage() {
  const brandLogoBuffer = await readFile(
    path.join(process.cwd(), 'src/assets/images/HTlogocr.png')
  );
  const brandLogo = brandLogoBuffer.buffer.slice(
    brandLogoBuffer.byteOffset,
    brandLogoBuffer.byteOffset + brandLogoBuffer.byteLength
  ) as ArrayBuffer;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 90% 12%, rgba(32, 208, 216, 0.24) 0, rgba(32, 208, 216, 0.09) 18%, transparent 38%), radial-gradient(circle at 7% 92%, rgba(184, 239, 99, 0.26) 0, rgba(184, 239, 99, 0.08) 22%, transparent 42%), #ffffff',
        color: '#0b3436',
        padding: '62px 72px',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -110,
          right: 250,
          width: 270,
          height: 270,
          borderRadius: 270,
          background: 'rgba(184, 239, 99, 0.18)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -75,
          bottom: -140,
          width: 360,
          height: 360,
          borderRadius: 360,
          background: 'rgba(32, 208, 216, 0.13)',
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: 720,
        }}
      >
        <img
          src={brandLogo as unknown as string}
          alt=""
          width={248}
          height={94}
          style={{ objectFit: 'contain' }}
        />

        <div
          style={{
            position: 'absolute',
            left: 72,
            top: 202,
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 70,
              fontWeight: 850,
              lineHeight: 0.98,
              letterSpacing: '-3.5px',
            }}
          >
            <div>Your home for</div>
            <div style={{ color: '#15aeb7' }}>meaningful events.</div>
          </div>
          <div
            style={{
              display: 'flex',
              maxWidth: 640,
              color: '#365e60',
              fontSize: 27,
              lineHeight: 1.35,
            }}
          >
            Discover halal-friendly gatherings, workshops and experiences near you.
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 72,
            top: 474,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: '#0b777d',
            fontSize: 23,
            fontWeight: 700,
          }}
        >
          halalticketin.com
          <div style={{ fontSize: 24 }}>→</div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 74,
          top: 100,
          width: 310,
          height: 390,
          display: 'flex',
          overflow: 'hidden',
          transform: 'rotate(4deg)',
        }}
      >
        <img
          src={brandLogo as unknown as string}
          alt=""
          width={1034}
          height={390}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            objectFit: 'contain',
            objectPosition: 'left center',
          }}
        />
      </div>
    </div>,
    size
  );
}
