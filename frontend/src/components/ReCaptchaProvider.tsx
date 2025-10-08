'use client';

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { ReactNode } from 'react';

interface ReCaptchaProviderProps {
  children: ReactNode;
}

/**
 * ReCaptcha Provider komponent
 * Poskytuje Google reCAPTCHA v3 kontext pre celú aplikáciu
 */
export default function ReCaptchaProvider({ children }: ReCaptchaProviderProps) {
  const reCaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // Ak site key nie je nastavený, vypisujeme warning ale renderujeme children
  if (!reCaptchaSiteKey) {
    console.warn('NEXT_PUBLIC_RECAPTCHA_SITE_KEY nie je nastavený. reCAPTCHA nebude fungovať.');
    return <>{children}</>;
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={reCaptchaSiteKey}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: 'head',
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}

