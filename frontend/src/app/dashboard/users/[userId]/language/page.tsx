import Dashboard from '@/components/dashboard/Dashboard';

interface UserLanguageDashboardPageProps {
  params: {
    userId: string;
  };
}

// `[userId]` funguje ako slug alebo numerické ID (BC pre staré URL).
export default function UserLanguageDashboardPage({
  params,
}: UserLanguageDashboardPageProps) {
  const identifier = params.userId;

  return (
    <Dashboard
      initialRoute="profile"
      initialViewedUserId={/^\d+$/.test(identifier) ? Number(identifier) : null}
      initialProfileSlug={identifier}
      initialRightItem="language"
    />
  );
}


