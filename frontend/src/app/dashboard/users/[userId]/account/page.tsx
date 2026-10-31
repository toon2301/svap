import Dashboard from '@/components/dashboard/Dashboard';

interface UserAccountDashboardPageProps {
  params: Promise<{
    userId: string;
  }>;
}

// `[userId]` funguje ako slug alebo numerické ID (BC pre staré URL).
export default async function UserAccountDashboardPage(props: UserAccountDashboardPageProps) {
  const params = await props.params;
  const identifier = params.userId;

  return (
    <Dashboard
      initialRoute="profile"
      initialViewedUserId={/^\d+$/.test(identifier) ? Number(identifier) : null}
      initialProfileSlug={identifier}
      initialRightItem="account-type"
    />
  );
}


