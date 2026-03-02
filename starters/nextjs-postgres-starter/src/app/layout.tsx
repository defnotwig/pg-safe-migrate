import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Next.js + pg-safe-migrate',
  description: 'Starter template with safe PostgreSQL migrations',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
