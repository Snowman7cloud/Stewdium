import './globals.css';

export const metadata = {
  title: 'Stewdium - Share & Discover Recipes',
  description: 'Your home for discovering, sharing, and organizing recipes. Built by food lovers, for food lovers.',
  openGraph: {
    title: 'Stewdium - Share & Discover Recipes',
    description: 'Discover recipes, build your collection, and plan your meals.',
    url: 'https://stewdium.com',
    siteName: 'Stewdium',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="icon" href="/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
