import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReCaptchaProvider from './ReCaptchaProvider';

jest.mock('react-google-recaptcha-v3', () => ({
  GoogleReCaptchaProvider: ({ children }: any) => <div data-testid="recaptcha-provider">{children}</div>,
}));

describe('ReCaptchaProvider', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('renders children when key is missing and logs warning', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    render(
      <ReCaptchaProvider>
        <div>child</div>
      </ReCaptchaProvider>
    );

    expect(screen.getByText('child')).toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('wraps children with GoogleReCaptchaProvider when key present', () => {
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'test-key';
    render(
      <ReCaptchaProvider>
        <div>child</div>
      </ReCaptchaProvider>
    );
    expect(screen.getByTestId('recaptcha-provider')).toBeInTheDocument();
    expect(screen.getByText('child')).toBeInTheDocument();
  });
});


