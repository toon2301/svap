import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SearchOfferCardAuthorHeader } from './SearchOfferCardAuthorHeader';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback: string) => ({
      'auth.company': 'Spoločnosť-test',
      'auth.individual': 'Osoba-test',
      'requests.userFallback': 'Používateľ-test',
    }[key] ?? fallback),
  }),
}));

describe('SearchOfferCardAuthorHeader', () => {
  it('localizes the account badge and empty-name fallback', () => {
    const onProfileClick = jest.fn();
    render(
      <SearchOfferCardAuthorHeader
        displayName=''
        ownerUserType='company'
        onProfileClick={onProfileClick}
      />,
    );

    expect(screen.getByText('Používateľ-test')).toBeInTheDocument();
    expect(screen.getByText('Spoločnosť-test')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(onProfileClick).toHaveBeenCalledTimes(1);
  });
});
