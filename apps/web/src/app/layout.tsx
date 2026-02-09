import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'TidKit - True-to-Scale Textures & Buildings for Model Makers',
  description:
    'Create perfectly scaled textures and papercraft buildings for model railroads, wargaming miniatures, and dollhouses. Free tools for hobbyists.',
  keywords: [
    'model railroad textures',
    'HO scale buildings',
    'wargaming terrain',
    'dollhouse miniatures',
    'papercraft buildings',
    'seamless textures',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
