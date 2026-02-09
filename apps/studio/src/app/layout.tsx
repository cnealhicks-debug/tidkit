import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'TidKit Studio - Texture Creation & Processing',
  description:
    'Create true-to-scale textures for model railroads, wargaming, and dollhouses. Seamless generation, scale detection, and smart processing.',
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
