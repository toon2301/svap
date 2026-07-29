import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomeModule from '../modules/HomeModule';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

describe('HomeModule', () => {
  it('renders a clean feed root and preserves the home onboarding target', () => {
    render(<HomeModule />);

    expect(screen.getByRole('heading', { name: 'Nástenka' })).toBeInTheDocument();
    expect(screen.getByTestId('home-feed-root')).toHaveAttribute(
      'data-onboarding',
      'home-welcome',
    );
    expect(screen.queryByText('Štatistiky')).not.toBeInTheDocument();
  });
});
