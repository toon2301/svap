const mockPatch = jest.fn();

jest.mock('@/lib/api', () => ({
  api: { patch: (...args: any[]) => mockPatch(...args), get: jest.fn(), post: jest.fn() },
  endpoints: {
    portfolio: {
      reorder: '/portfolio/reorder',
      imageReorder: (id: number) => `/portfolio/${id}/images/reorder`,
    },
  },
}));

import { reorderPortfolioItems, reorderPortfolioImages } from '../portfolioApi';

describe('portfolioApi reorder – kontrola duplicitných ID (BOD 12c)', () => {
  beforeEach(() => mockPatch.mockReset());

  it('reorderPortfolioItems odmietne duplicitné ID bez server requestu', async () => {
    await expect(reorderPortfolioItems([1, 2, 1])).rejects.toThrow(/Duplicate/);
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('reorderPortfolioImages odmietne duplicitné ID bez server requestu', async () => {
    await expect(reorderPortfolioImages(5, [3, 3])).rejects.toThrow(/Duplicate/);
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('reorderPortfolioItems s unikátnymi ID pošle request', async () => {
    mockPatch.mockResolvedValue({ data: [] });
    await reorderPortfolioItems([1, 2, 3]);
    expect(mockPatch).toHaveBeenCalledWith('/portfolio/reorder', { item_ids: [1, 2, 3] });
  });
});
