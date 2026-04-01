import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import ClientComponents from "@/components/ClientComponents";
import ErrorBoundary from "@/components/ErrorBoundary";
import { LoadingProvider } from "@/contexts/LoadingContext";

// Force App Router to be fully dynamic (disable static optimization / edge HTML caching).
export const dynamic = "force-dynamic";
export const revalidate = 0;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Swaply - Výmenná platforma zručností",
  description: "Vymeň si zručnosti s ostatnými. Nauč sa niečo nové a nauč ostatných svoje zručnosti.",
  keywords: ["zručnosti", "výmena", "vzdelávanie", "mentoring", "učenie"],
  authors: [{ name: "Swaply Team" }],
  robots: "index, follow",
  icons: {
    icon: [{ url: "/favicon.png?v=20260402", type: "image/png", sizes: "any" }],
    shortcut: "/favicon.png?v=20260402",
    apple: "/favicon.png?v=20260402",
  },
  openGraph: {
    title: "Swaply - Výmenná platforma zručností",
    description: "Vymeň si zručnosti s ostatnými. Nauč sa niečo nové a nauč ostatných svoje zručnosti.",
    type: "website",
    locale: "sk_SK",
  },
  twitter: {
    card: "summary_large_image",
    title: "Swaply - Výmenná platforma zručností",
    description: "Vymeň si zručnosti s ostatnými. Nauč sa niečo nové a nauč ostatných svoje zručnosti.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#9333EA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk" className={inter.variable}>
      <head>
        {/* Favicon: explicitné linky + cache-bust (prehliadače agresívne cachujú starú ikonu) */}
        <link rel="icon" href="/favicon.png?v=20260402" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/favicon.png?v=20260402" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png?v=20260402" />
        {/* PWA a mobile meta tagy */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#9333EA" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Swaply" />
        
        {/* Accessibility meta tagy */}
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        
        {/* Performance a SEO */}
        <meta name="format-detection" content="telephone=no, email=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Swaply" />
        
        {/* Force zoom reset for email links */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        
        {/* Security (iba HTTP headers – X-Frame-Options sa nastavuje na serveri, nie v meta) */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        
        {/* Preload kritických zdrojov */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body 
        className={`${inter.className} antialiased bg-[var(--background)] text-[var(--foreground)]`}
        style={{ scrollBehavior: 'smooth' }}
      >
        <Providers>
          <ErrorBoundary>
            <LoadingProvider>
              {children}
              <ClientComponents />
            </LoadingProvider>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
