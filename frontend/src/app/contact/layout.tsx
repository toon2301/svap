import type { Metadata } from 'next';
import ReCaptchaProvider from '@/components/ReCaptchaProvider';

export const metadata: Metadata = {
  title: 'Kontakt | Svaply',
  description:
    'Kontaktuj tím Svaply. Máš otázku alebo potrebuješ pomoc? Napíš nám – radi ti pomôžeme.',
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <ReCaptchaProvider>{children}</ReCaptchaProvider>;
}
