import Dashboard from '@/components/dashboard/Dashboard';

interface UserPrivacyDashboardPageProps {
  params: {
    userId: string;
  };
}

// `[userId]` funguje ako slug alebo numerické ID (BC pre staré URL).
export default function UserPrivacyDashboardPage({
  params,
}: UserPrivacyDashboardPageProps) {
  const identifier = params.userId;

  return (
    <Dashboard
      initialRoute="profile"
      initialViewedUserId={/^\d+$/.test(identifier) ? Number(identifier) : null}
      initialProfileSlug={identifier}
      initialRightItem="privacy"
    />
  );
}


