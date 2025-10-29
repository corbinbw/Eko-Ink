import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EkoInk - Automated Thank You Notes',
  description: 'Automated handwritten thank-you notes for sales teams',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
