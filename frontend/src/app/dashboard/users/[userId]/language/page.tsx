import Dashboard from '@/components/dashboard/Dashboard';

interface UserLanguageDashboardPageProps {
  params: Promise<{
    userId: string;
  }>;
}

// `[userId]` funguje ako slug alebo numerické ID (BC pre staré URL).
export default async function UserLanguageDashboardPage(props: UserLanguageDashboardPageProps) {
  const params = await props.params;
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


