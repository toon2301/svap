import { handleSave } from './skillDescriptionHandlers';

const t = (_key: string, fallback?: string) => fallback ?? _key;

function validParams(overrides: Record<string, unknown> = {}) {
  return {
    description: 'Maľovanie stien',
    experienceValue: '',
    experienceUnit: 'years' as const,
    tags: [],
    images: [],
    priceFrom: '',
    priceCurrency: '€' as const,
    priceNegotiable: false,
    location: '',
    district: 'Nitra',
    countryCode: 'SK',
    districtCode: 'nitra',
    detailedDescription: '',
    openingHours: {},
    existingImages: [],
    onSave: jest.fn(),
    setError: jest.fn(),
    setExperienceError: jest.fn(),
    setPriceError: jest.fn(),
    t,
    ...overrides,
  };
}

describe('handleSave', () => {
  it('returns false and exposes a safe message when the parent save rejects', async () => {
    const setError = jest.fn();
    const params = validParams({
      onSave: jest.fn().mockRejectedValue(
        new Error('Takúto ponuku alebo dopyt už máš vytvorený.'),
      ),
      setError,
    });

    await expect(handleSave(params)).resolves.toBe(false);
    expect(setError).toHaveBeenCalledWith(
      'Takúto ponuku alebo dopyt už máš vytvorený.',
    );
  });
});
