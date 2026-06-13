import {
  buildPortfolioDetailPath,
  buildPortfolioListPath,
  getPortfolioOwnerIdentifier,
} from './portfolioRouting';

describe('portfolioRouting', () => {
  it('uses a trimmed slug before numeric ids', () => {
    expect(getPortfolioOwnerIdentifier(42, ' jane-doe ')).toBe('jane-doe');
  });

  it('only accepts positive whole numeric owner ids', () => {
    expect(getPortfolioOwnerIdentifier(42, null)).toBe('42');
    expect(getPortfolioOwnerIdentifier(0, null)).toBeNull();
    expect(getPortfolioOwnerIdentifier(-1, null)).toBeNull();
    expect(getPortfolioOwnerIdentifier(1.5, null)).toBeNull();
  });

  it('builds canonical portfolio paths', () => {
    expect(buildPortfolioListPath('jane-doe')).toBe('/dashboard/users/jane-doe/portfolio');
    expect(buildPortfolioDetailPath('jane-doe', 7)).toBe('/dashboard/users/jane-doe/portfolio/7');
  });
});
