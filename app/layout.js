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
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍲</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
