import { fetchCsrfToken, hasCsrfToken, getCsrfToken } from '../csrf';
import axios from 'axios';
import Cookies from 'js-cookie';

jest.mock('axios');
jest.mock('js-cookie');

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
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      await fetchCsrfToken();
      
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
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

