'use client';

import ReCaptchaProvider from '@/components/ReCaptchaProvider';
import ContactPage from '@/components/contact/ContactPage';

export default function Contact() {
  return (
    <ReCaptchaProvider>
      <ContactPage />
    </ReCaptchaProvider>
  );
}
