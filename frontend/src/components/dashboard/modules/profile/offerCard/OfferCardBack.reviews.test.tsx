import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  adoptOfferReviewsOrigin,
  resetOfferReviewsOrigin,
  returnToOfferReviewsOrigin,
} from '../../reviews/offerReviewsOrigin';
import { readRememberedProfileScroll } from '../profileScrollMemory';
import type { Offer } from '../profileOffersTypes';
import { OfferCardBack, type OfferCardBackProps } from './OfferCardBack';

const offer: Offer = {
  id: 7,
  category: 'Domácnosť a služby',
  subcategory: 'Maliarske práce',
  description: '',
  is_seeking: false,
};

function props(overrides: Partial<OfferCardBackProps> = {}): OfferCardBackProps {
  return {
    offer,
    accountType: 'personal',
    t: (_key, fallback) => fallback,
    onToggleFlip: jest.fn(),
    isFlipped: true,
    ...overrides,
  };
}

const REVIEWS_HREF = '/dashboard/offers/7/reviews?returnTo=%2Fdashboard%2Fusers%2Fpeter';

describe('OfferCardBack – odkaz na všetky recenzie', () => {
  beforeEach(() => {
    resetOfferReviewsOrigin();
    window.history.replaceState(null, '', '/dashboard/users/peter');
  });

  it('is a plain link to the reviews', () => {
    render(<OfferCardBack {...props({ reviewsHref: REVIEWS_HREF })} />);

    expect(screen.getByRole('link', { name: /Všetky recenzie/ })).toHaveAttribute('href', REVIEWS_HREF);
  });

  it('tells the app that the reviews are opened from the card, so the page can step back', () => {
    const backSpy = jest.spyOn(window.history, 'back').mockImplementation(() => {});
    try {
      render(<OfferCardBack {...props({ reviewsHref: REVIEWS_HREF })} />);

      fireEvent.click(screen.getByRole('link', { name: /Všetky recenzie/ }));

      // Navigáciu robí samotný odkaz; stránka recenzií sa zobrazila a prevezme pôvod.
      window.history.replaceState(null, '', REVIEWS_HREF);
      adoptOfferReviewsOrigin();
      expect(returnToOfferReviewsOrigin()).toBe(true);
      expect(backSpy).toHaveBeenCalledTimes(1);
    } finally {
      backSpy.mockRestore();
    }
  });

  it('does not flip the card back when the link is clicked', () => {
    const onToggleFlip = jest.fn();
    render(
      <div onClick={onToggleFlip}>
        <OfferCardBack {...props({ reviewsHref: REVIEWS_HREF })} />
      </div>,
    );

    fireEvent.click(screen.getByRole('link', { name: /Všetky recenzie/ }));

    expect(onToggleFlip).not.toHaveBeenCalled();
  });

  it('has no link without an address of the reviews', () => {
    render(<OfferCardBack {...props()} />);

    expect(screen.queryByRole('link', { name: /Všetky recenzie/ })).not.toBeInTheDocument();
  });
});

describe('OfferCardBack – odkaz na recenzie a pozícia profilu', () => {
  function mountMain(scrollTop: number): HTMLElement {
    const main = document.createElement('main');
    main.setAttribute('data-dashboard-main', '');
    main.scrollTop = scrollTop;
    document.body.appendChild(main);
    return main;
  }

  beforeEach(() => {
    resetOfferReviewsOrigin();
    window.history.replaceState(null, '', '/dashboard/users/peter');
  });

  afterEach(() => {
    document.querySelectorAll('[data-dashboard-main]').forEach((node) => node.remove());
  });

  it('remembers where the profile was scrolled to when the link opens in this tab', () => {
    mountMain(1500);
    render(<OfferCardBack {...props({ reviewsHref: REVIEWS_HREF })} />);

    fireEvent.click(screen.getByRole('link', { name: /Všetky recenzie/ }));

    expect(readRememberedProfileScroll()).toBe(1500);
  });

  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Cmd', { metaKey: true }],
    ['Shift', { shiftKey: true }],
    ['Alt', { altKey: true }],
  ] as Array<[string, { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean }]>)(
    'leaves this tab alone when %s is held (the browser opens the reviews elsewhere)',
    (_name, modifier) => {
      mountMain(1500);
      render(<OfferCardBack {...props({ reviewsHref: REVIEWS_HREF })} />);

      fireEvent.click(screen.getByRole('link', { name: /Všetky recenzie/ }), modifier);

      // Profil v tejto karte zostal: žiadna zapamätaná pozícia, ktorá by ho neskôr vrátila inam…
      expect(readRememberedProfileScroll()).toBeNull();
      // …a ani čakajúce otvorenie, ktoré by si neskôr privlastnila iná stránka recenzií.
      window.history.replaceState(null, '', REVIEWS_HREF);
      adoptOfferReviewsOrigin();
      expect(returnToOfferReviewsOrigin()).toBe(false);
    },
  );

  it('does not flip the card back for a modified click either', () => {
    const onToggleFlip = jest.fn();
    render(
      <div onClick={onToggleFlip}>
        <OfferCardBack {...props({ reviewsHref: REVIEWS_HREF })} />
      </div>,
    );

    fireEvent.click(screen.getByRole('link', { name: /Všetky recenzie/ }), { ctrlKey: true });

    expect(onToggleFlip).not.toHaveBeenCalled();
  });
});
