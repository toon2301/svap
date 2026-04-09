import Dashboard from '@/components/dashboard/Dashboard';

interface UserEditDashboardPageProps {
  params: {
    userId: string;
  };
}

// `[userId]` funguje ako slug alebo numerické ID (BC pre staré URL).
export default function UserEditDashboardPage({
  params,
}: UserEditDashboardPageProps) {
  const identifier = params.userId;

  return (
    <Dashboard
      initialRoute="profile"
      initialViewedUserId={/^\d+$/.test(identifier) ? Number(identifier) : null}
      initialProfileSlug={identifier}
      initialRightItem="edit-profile"
    />
  );
}


