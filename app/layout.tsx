import type { Metadata } from 'next';
import { Anton } from 'next/font/google';
import './globals.css';

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'South Park Hurricanes — Pin Design Contest',
  description: 'Vote on pin designs for the Cooperstown 2025 trip. Cash or Trash!',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={anton.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0D0000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen bg-black text-sp-white antialiased">{children}</body>
    </html>
  );
}
