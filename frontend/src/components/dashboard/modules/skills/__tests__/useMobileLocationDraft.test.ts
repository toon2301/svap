import { act, renderHook } from '@testing-library/react';
import type { OfferCountryCode } from '@/shared/districtRegistry';
import { useMobileLocationDraft } from '../skillDescriptionModal/hooks/useMobileLocationDraft';

type HookProps = {
  isOpen: boolean;
  countryCode: OfferCountryCode;
  districtCode: string;
  district: string;
  location: string;
};

describe('useMobileLocationDraft', () => {
  it('restores the values captured when the location modal opened', () => {
    const onCountryCodeChange = jest.fn();
    const onDistrictCodeChange = jest.fn();
    const onDistrictChange = jest.fn();
    const onLocationChange = jest.fn();
    const onClose = jest.fn();
    const initialProps: HookProps = {
      isOpen: false,
      countryCode: 'AT',
      districtCode: 'wien',
      district: 'Wien',
      location: 'Wien',
    };

    const { result, rerender } = renderHook(
      (props: HookProps) =>
        useMobileLocationDraft({
          ...props,
          onCountryCodeChange,
          onDistrictCodeChange,
          onDistrictChange,
          onLocationChange,
          onClose,
        }),
      { initialProps },
    );

    rerender({ ...initialProps, isOpen: true });
    rerender({
      isOpen: true,
      countryCode: 'DE',
      districtCode: 'munchen-stadt',
      district: 'M\u00fcnchen (Stadt)',
      location: 'M\u00fcnchen',
    });

    act(() => result.current());

    expect(onCountryCodeChange).toHaveBeenLastCalledWith('AT');
    expect(onDistrictCodeChange).toHaveBeenLastCalledWith('wien');
    expect(onDistrictChange).toHaveBeenLastCalledWith('Wien');
    expect(onLocationChange).toHaveBeenLastCalledWith('Wien');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('captures a fresh snapshot every time the modal opens', () => {
    const onDistrictChange = jest.fn();
    const initialProps: HookProps = {
      isOpen: true,
      countryCode: 'AT',
      districtCode: 'wien',
      district: 'Wien',
      location: '',
    };
    const handlers = {
      onCountryCodeChange: jest.fn(),
      onDistrictCodeChange: jest.fn(),
      onDistrictChange,
      onLocationChange: jest.fn(),
      onClose: jest.fn(),
    };

    const { result, rerender } = renderHook(
      (props: HookProps) => useMobileLocationDraft({ ...props, ...handlers }),
      { initialProps },
    );

    rerender({ ...initialProps, isOpen: false });
    rerender({
      isOpen: true,
      countryCode: 'DE',
      districtCode: 'berlin',
      district: 'Berlin',
      location: 'Berlin',
    });
    rerender({
      isOpen: true,
      countryCode: 'DE',
      districtCode: 'munchen-landkreis',
      district: 'M\u00fcnchen (Landkreis)',
      location: 'M\u00fcnchen',
    });

    act(() => result.current());

    expect(onDistrictChange).toHaveBeenLastCalledWith('Berlin');
  });
});
