import Dashboard from '@/components/dashboard/Dashboard';

interface UserPortfolioDashboardPageProps {
  params: Promise<{
    userId: string;
  }>;
}

// `[userId]` funguje ako slug alebo numerické ID (BC pre staré URL).
export default async function UserPortfolioDashboardPage(props: UserPortfolioDashboardPageProps) {
  const params = await props.params;
  const identifier = params.userId;

  return (
    <Dashboard
      initialRoute="user-profile"
      initialViewedUserId={/^\d+$/.test(identifier) ? Number(identifier) : null}
      initialProfileSlug={identifier}
      initialProfileTab="portfolio"
    />
  );
}


