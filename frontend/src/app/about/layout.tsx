import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'O nás | Svaply',
  description:
    'Svaply prepája ľudí cez zručnosti, služby a pomoc. Nájdi ľudí, služby a príležitosti na jednom mieste.',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
