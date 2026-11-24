/**
 * Údaj „príspevok len s textom v ľavom stĺpci dvojstĺpcového okna“ (K58, krok 3, R73).
 *
 * Údaj ide kontextom, nie vlastnosťou karty (`FeedPostCard.tsx` nesmie rásť nad 500 riadkov). Mimo poskytovateľa je
 * `false`, takže karta vo feede, v dialógu zdieľania, na mobile aj v jednostĺpcovom okne sa nemení.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  FeedDetailTextOnlyProvider,
  useFeedDetailTextOnly,
} from '../FeedDetailTextOnlyContext';

function Sonda() {
  return <span data-testid="sonda">{String(useFeedDetailTextOnly())}</span>;
}

describe('údaj o okne príspevku len s textom (useFeedDetailTextOnly)', () => {
  it('bez poskytovateľa vráti false', () => {
    render(<Sonda />);

    expect(screen.getByTestId('sonda')).toHaveTextContent('false');
  });

  it('vnútri poskytovateľa s hodnotou true vráti true', () => {
    render(
      <FeedDetailTextOnlyProvider value>
        <Sonda />
      </FeedDetailTextOnlyProvider>,
    );

    expect(screen.getByTestId('sonda')).toHaveTextContent('true');
  });

  it('vnútri poskytovateľa s hodnotou false vráti false', () => {
    render(
      <FeedDetailTextOnlyProvider value={false}>
        <Sonda />
      </FeedDetailTextOnlyProvider>,
    );

    expect(screen.getByTestId('sonda')).toHaveTextContent('false');
  });

  it('najbližší poskytovateľ vyhráva', () => {
    render(
      <FeedDetailTextOnlyProvider value>
        <FeedDetailTextOnlyProvider value={false}>
          <Sonda />
        </FeedDetailTextOnlyProvider>
      </FeedDetailTextOnlyProvider>,
    );

    expect(screen.getByTestId('sonda')).toHaveTextContent('false');
  });
});
