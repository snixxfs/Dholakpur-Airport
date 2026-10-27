'use client';

import dynamic from 'next/dynamic';

const WareTrack = dynamic(() => import('@/components/WareTrack'), {
  ssr: false,
  loading: () => (
    <div className="boot">
      <span className="brand-mark" />
      <span>Loading Dholakpur Airfield…</span>
    </div>
  ),
});

export default function Page() {
  return <WareTrack />;
}
