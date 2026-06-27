import { ImageResponse } from 'next/og'

export const alt = 'StatusPulse — Your APIs never sleep. Neither should your monitoring.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1B102D 0%, #2A1645 55%, #1B102D 100%)',
          padding: '80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 18,
              background: '#E1567C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            S
          </div>
          <div style={{ fontSize: 46, fontWeight: 700, color: '#fff' }}>StatusPulse</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 44, fontSize: 62, fontWeight: 800, maxWidth: 1000, lineHeight: 1.15 }}>
          <span style={{ color: '#ffffff' }}>Your APIs never sleep. </span>
          <span style={{ color: '#C2EF4E' }}>Neither should your monitoring.</span>
        </div>
        <div style={{ marginTop: 30, fontSize: 30, color: 'rgba(255,255,255,0.7)' }}>
          Real-time monitoring · status pages · SVG badges · Free forever
        </div>
      </div>
    ),
    { ...size }
  )
}
