import { fetchCsrfToken, hasCsrfToken, getCsrfToken } from '../csrf';
import axios from 'axios';
import Cookies from 'js-cookie';

jest.mock('axios');
jest.mock('js-cookie');
// fetchCsrfToken loguje chyby cez logClientError (ten je v test/prod prostredí
// no-op, takže console.error sa nevolá – overujeme priamo delegáciu na logger).
jest.mock('@/utils/clientLogging', () => ({
  logClientError: jest.fn(),
}));

describe('CSRF utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchCsrfToken', () => {
    it('makes GET request to csrf-token endpoint', async () => {
      (axios.get as jest.Mock).mockResolvedValue({});
      
      await fetchCsrfToken();
      
      expect(axios.get).toHaveBeenCalled();
    });

    it('handles error gracefully', async () => {
      const { logClientError } = require('@/utils/clientLogging');
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Nesmie thrownúť – chyba sa pohltí a deleguje na logClientError.
      await expect(fetchCsrfToken()).resolves.toBeUndefined();

      expect(logClientError).toHaveBeenCalled();
    });
  });

  describe('hasCsrfToken', () => {
    it('returns true when token exists', () => {
      (Cookies.get as jest.Mock).mockReturnValue('token-value');
      
      expect(hasCsrfToken()).toBe(true);
    });

    it('returns false when token does not exist', () => {
      (Cookies.get as jest.Mock).mockReturnValue(undefined);
      
      expect(hasCsrfToken()).toBe(false);
    });
  });

  describe('getCsrfToken', () => {
    it('returns token value from cookies', () => {
      (Cookies.get as jest.Mock).mockReturnValue('my-token');
      
      expect(getCsrfToken()).toBe('my-token');
    });

    it('returns undefined when no token', () => {
      (Cookies.get as jest.Mock).mockReturnValue(undefined);
      
      expect(getCsrfToken()).toBeUndefined();
    });
  });
});

