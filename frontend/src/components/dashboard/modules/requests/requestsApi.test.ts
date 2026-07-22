import { getSkillRequestActionErrorMessage } from './requestsApi';

jest.mock('@/lib/api', () => ({
  api: {},
  endpoints: {},
}));

describe('getSkillRequestActionErrorMessage', () => {
  it('uses the translated unavailable message for a hidden 404 response', () => {
    const error = {
      response: {
        status: 404,
        data: { error: 'Žiadosť neexistuje.' },
      },
    };

    expect(
      getSkillRequestActionErrorMessage(
        error,
        'The request is no longer available.',
        'Fallback',
      ),
    ).toBe('The request is no longer available.');
  });

  it('preserves normal API errors for non-404 responses', () => {
    const error = {
      response: {
        status: 400,
        data: { error: 'Request already processed.' },
      },
    };

    expect(
      getSkillRequestActionErrorMessage(error, 'Unavailable', 'Fallback'),
    ).toBe('Request already processed.');
  });
});
