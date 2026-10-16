/** @jest-environment node */

import React from 'react';
import { renderToString } from 'react-dom/server';
import { useSearchDiagnostics } from './useSearchDiagnostics';
import { createSearchDiagnosticSnapshot } from './searchDiagnostics';

describe('server-safe search diagnostics', () => {
  it('renders disabled without browser globals, storage, or a layout-effect warning', () => {
    const error = jest.spyOn(console, 'error');
    function Probe() {
      const diagnostics = useSearchDiagnostics(1, true);
      return <span>{String(diagnostics.enabled)}:{String(diagnostics.snapshot)}</span>;
    }
    expect(typeof window).toBe('undefined');
    expect(renderToString(<Probe />)).toBe('<span>false<!-- -->:<!-- -->null</span>');
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('can construct a safe snapshot without local storage', () => {
    expect(createSearchDiagnosticSnapshot({
      country: null, queryLength: 0, offerType: 'all', onlyMyLocation: false,
      priceMinSet: false, priceMaxSet: false,
    })).toMatchObject({
      country: null, manualCountrySnapshot: null, ipCountrySnapshot: null, ipCacheFresh: null,
      source: 'none', state: 'pending', httpStatus: null,
    });
  });
});
