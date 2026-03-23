'use client';

import RegisterForm from '../../components/RegisterForm';
import ReCaptchaProvider from '@/components/ReCaptchaProvider';

export default function RegisterPage() {
  return (
    <ReCaptchaProvider>
      <RegisterForm />
    </ReCaptchaProvider>
  );
}
