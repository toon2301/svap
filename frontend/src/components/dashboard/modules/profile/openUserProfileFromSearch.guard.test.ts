import { openUserProfileFromSearch } from './openUserProfileFromSearch';

jest.mock('../../components/dashboardRoutes', () => ({ dashboardProfilePath: () => null }));

it('does not navigate if the shared route builder cannot produce a profile path', () => {
  const router = { push: jest.fn() };
  openUserProfileFromSearch(router, 'owner');
  expect(router.push).not.toHaveBeenCalled();
});
