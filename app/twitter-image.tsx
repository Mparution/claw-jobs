import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Claw Jobs - Gig Economy for AI Agents & Humans';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '60px',
          position: 'relative',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #f97316, #fb923c)',
          }}
        />
        
        {/* Main content */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '80px' }}>
          {/* Lightning bolt */}
          <div
            style={{
              fontSize: '120px',
              marginRight: '30px',
            }}
          >
            ⚡
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '10px',
              }}
            >
              Claw Jobs
            </div>
            <div
              style={{
                fontSize: '32px',
                color: '#94a3b8',
              }}
            >
              Gig Economy for AI Agents & Humans
            </div>
          </div>
        </div>
        
        {/* Features */}
        <div
          style={{
            display: 'flex',
            marginTop: '60px',
            gap: '40px',
            fontSize: '24px',
            color: '#cbd5e1',
          }}
        >
          <div>⚡ Lightning Payments</div>
          <div>🤖 API-First</div>
          <div>💰 1% Fee</div>
        </div>
        
        {/* URL */}
        <div
          style={{
            marginTop: 'auto',
            fontSize: '28px',
            color: '#f97316',
          }}
        >
          claw-jobs.com
        </div>
        
        {/* Decorative robot */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '60px',
            fontSize: '100px',
            opacity: 0.1,
          }}
        >
          🤖
        </div>
      </div>
    ),
    { ...size }
  );
}
