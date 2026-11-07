/**
 * Fotka portfólia, ktorá sa nenačíta (nález 279).
 *
 * Karta a detail ukážu „Bez titulnej fotky“ (existujúci text pre portfólio bez titulnej fotky), dlaždica galérie
 * neutrálnu plochu a tlačidlá na správu fotky jej ostávajú. Chránená adresa (`/api/auth/portfolio/.../file/`) sa
 * sťahuje ako blob, takže tam zlyhá sťahovanie, nie `<img>`; obe cesty musia skončiť rovnako.
 */

jest.mock('@/lib/apiUrl', () => ({
  getConfiguredApiUrl: () => '/api',
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: { get: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { api } from '@/lib/api';
import { PortfolioCard } from './PortfolioCard';
import { PortfolioDetailHero } from './PortfolioDetailHero';
import { PortfolioGalleryImageTile } from './PortfolioGalleryImageTile';
import type { PortfolioDisplayImage } from './portfolioDisplay';
import type { PortfolioItem } from './portfolioTypes';

const TITLE = 'Rekonštrukcia kúpeľne';
const PUBLIC_URL = 'https://cdn.example.com/media/portfolio/9/thumb.webp';
const PROTECTED_URL = 'https://backend.example.com/api/auth/portfolio/9/images/3/file/?variant=thumbnail';

/** Položka portfólia s titulnou fotkou na danej adrese (verejnej alebo chránenej). */
function itemWithCover(url: string): PortfolioItem {
  return {
    id: 9,
    title: TITLE,
    category: 'remeslo',
    cover_image: { thumbnail_url: url },
    likes_count: 0,
    is_liked_by_me: false,
  } as PortfolioItem;
}

const displayImage: PortfolioDisplayImage = {
  key: 'image-3',
  id: 3,
  mediumSrc: PUBLIC_URL,
  largeSrc: PUBLIC_URL,
  order: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  (api.get as jest.Mock).mockReset();
});

describe('PortfolioCard: titulná fotka sa nenačíta', () => {
  it('verejná adresa: namiesto pokazeného obrázka ukáže „Bez titulnej fotky“', () => {
    render(<PortfolioCard item={itemWithCover(PUBLIC_URL)} categoryLabel="Remeslo" />);

    fireEvent.error(screen.getByAltText(TITLE));

    expect(screen.getByText('portfolio.noCoverImage')).toBeInTheDocument();
    expect(screen.queryByAltText(TITLE)).not.toBeInTheDocument();
  });

  it('chránená adresa: zlyhané stiahnutie ukáže tú istú náhradu', async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error('404'));

    render(<PortfolioCard item={itemWithCover(PROTECTED_URL)} categoryLabel="Remeslo" />);

    expect(await screen.findByText('portfolio.noCoverImage')).toBeInTheDocument();
  });

  it('nová adresa titulnej fotky sa skúsi načítať znova', () => {
    const { rerender } = render(<PortfolioCard item={itemWithCover(PUBLIC_URL)} categoryLabel="Remeslo" />);
    fireEvent.error(screen.getByAltText(TITLE));

    rerender(
      <PortfolioCard
        item={itemWithCover('https://cdn.example.com/media/portfolio/9/other.webp')}
        categoryLabel="Remeslo"
      />,
    );

    expect(screen.getByAltText(TITLE)).toBeInTheDocument();
    expect(screen.queryByText('portfolio.noCoverImage')).not.toBeInTheDocument();
  });
});

describe('PortfolioDetailHero: fotka detailu sa nenačíta', () => {
  it('ukáže „Bez titulnej fotky“ a tlačidlo na otvorenie fotky zmizne', () => {
    render(
      <PortfolioDetailHero
        item={itemWithCover(PUBLIC_URL)}
        categoryLabel="Remeslo"
        heroImage={displayImage}
        onOpenImage={jest.fn()}
      />,
    );
    expect(screen.getByRole('button')).toBeInTheDocument();

    fireEvent.error(screen.getByAltText(TITLE));

    expect(screen.getByText('portfolio.noCoverImage')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('PortfolioGalleryImageTile: fotka galérie sa nenačíta', () => {
  it('ukáže neutrálnu plochu a tlačidlá na správu fotky ostanú', () => {
    render(
      <PortfolioGalleryImageTile
        image={displayImage}
        itemTitle={TITLE}
        index={0}
        total={2}
        isManaging
        isCover={false}
        isBusy={false}
        onOpen={jest.fn()}
        onSetCover={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    fireEvent.error(screen.getByAltText(`${TITLE} 1`));

    expect(screen.getByTestId('image-load-failed')).toBeInTheDocument();
    expect(screen.queryByAltText(`${TITLE} 1`)).not.toBeInTheDocument();
    // Pokazenú fotku sa musí dať ešte odstrániť alebo nahradiť.
    expect(screen.getByTestId('portfolio-gallery-delete-button-3')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-gallery-cover-button-3')).toBeInTheDocument();
  });
});
