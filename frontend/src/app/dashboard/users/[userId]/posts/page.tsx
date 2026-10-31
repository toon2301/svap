import Dashboard from '@/components/dashboard/Dashboard';

interface UserPostsDashboardPageProps {
  params: Promise<{
    userId: string;
  }>;
}

// `[userId]` funguje ako slug alebo numerické ID (BC pre staré URL).
export default async function UserPostsDashboardPage(props: UserPostsDashboardPageProps) {
  const params = await props.params;
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


