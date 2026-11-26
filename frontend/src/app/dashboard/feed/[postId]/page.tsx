import Dashboard from '@/components/dashboard/Dashboard';

/**
 * Adresa príspevku (`/dashboard/feed/<id>`: odkaz, F5, upozornenie) je Nástenka a nad ňou detail príspevku: okno na počítači,
 * obrazovka na mobile. Číslo príspevku (a komentár z `?comment=`) si dashboard prečíta z adresy, takže stránka mu nič
 * nepodáva (nález 360, bývalý modul `feed-post-detail` zanikol).
 */
export default function FeedPostPage() {
  return <Dashboard initialRoute="home" />;
}
