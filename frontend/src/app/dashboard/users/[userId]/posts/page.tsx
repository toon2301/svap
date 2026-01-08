import Dashboard from '@/components/dashboard/Dashboard';

interface UserPostsDashboardPageProps {
  params: {
    userId: string;
  };
}

// `[userId]` funguje ako slug alebo numerické ID (BC pre staré URL).
export default function UserPostsDashboardPage({
  params,
}: UserPostsDashboardPageProps) {
  const identifier = params.userId;

  return (
    <Dashboard
      initialRoute="user-profile"
      initialViewedUserId={/^\d+$/.test(identifier) ? Number(identifier) : null}
      initialProfileSlug={identifier}
      initialProfileTab="posts"
    />
  );
}


