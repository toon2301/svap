// Pre statický export - generuje prázdne parametre
export async function generateStaticParams() {
  return [
    { uidb64: 'placeholder', token: 'placeholder' }
  ];
}

import ResetPasswordClient from './ResetPasswordClient';

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}