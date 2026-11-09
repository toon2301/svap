/** @jest-environment node */

import { renderToString } from 'react-dom/server';

import type { SkillsDescriptionScreenProps } from '../types';
import { useStableScreenProps } from './useStableScreenProps';

/**
 * Stabilné vstupy obrazovky na serveri (nálezy 322 a 323): hook používa `useLayoutEffect`, ktorý na serveri nebeží,
 * preto sa tam nesmie objaviť žiadne varovanie a prvé vykreslenie musí vrátiť rovnaké vstupy ako v prehliadači.
 */
function Probe(props: SkillsDescriptionScreenProps) {
  const stable = useStableScreenProps(props);
  return (
    <p>{`${stable.category}|${(stable.initialTags ?? []).join(',')}|${typeof stable.onBack}|${typeof stable.onTagsChange}`}</p>
  );
}

describe('useStableScreenProps na serveri', () => {
  it('vykreslí bez varovania a vráti tagy a stabilné funkcie už v prvom vykreslení', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(typeof window).toBe('undefined');

    const html = renderToString(
      <Probe category="Domácnosť" subcategory="Upratovanie" onBack={jest.fn()} initialTags={['kvet', 'zahrada']} />,
    );

    expect(html).toContain('Domácnosť|kvet,zahrada|function|undefined');
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
