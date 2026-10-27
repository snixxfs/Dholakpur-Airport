import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import './globals.css';

export const metadata: Metadata = {
  title: 'DHOLAKPUR AIRPORT — 3D Airport Operations Simulator',
  description: 'Real-time 3D airport operations simulator featuring aircraft turnaround, landing, taxiing, deplaning, baggage handling, and takeoff.',
};

export const viewport: Viewport = { themeColor: '#dbeafe' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
