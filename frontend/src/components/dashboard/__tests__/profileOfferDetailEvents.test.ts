import {
  dispatchProfileOfferDetailClose,
  dispatchProfileOfferDetailOpen,
  PROFILE_OFFER_DETAIL_CLOSE_EVENT,
  PROFILE_OFFER_DETAIL_OPEN_EVENT,
} from '../modules/profile/profileOfferDetailEvents';

describe('profileOfferDetailEvents', () => {
  it('dispatches open and close events', () => {
    const openSpy = jest.fn();
    const closeSpy = jest.fn();

    window.addEventListener(PROFILE_OFFER_DETAIL_OPEN_EVENT, openSpy);
    window.addEventListener(PROFILE_OFFER_DETAIL_CLOSE_EVENT, closeSpy);

    dispatchProfileOfferDetailOpen();
    dispatchProfileOfferDetailClose();

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(closeSpy).toHaveBeenCalledTimes(1);

    window.removeEventListener(PROFILE_OFFER_DETAIL_OPEN_EVENT, openSpy);
    window.removeEventListener(PROFILE_OFFER_DETAIL_CLOSE_EVENT, closeSpy);
  });
});
