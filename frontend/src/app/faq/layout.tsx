import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ | Svaply',
  description:
    'Často kladené otázky o Svaply – ako funguje platforma, ponuky, dopyty, bezpečnosť a podpora.',
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
