import Dashboard from '@/components/dashboard/Dashboard';

interface UserPortfolioDashboardPageProps {
  params: {
    userId: string;
  };
}

// `[userId]` funguje ako slug alebo numerické ID (BC pre staré URL).
export default function UserPortfolioDashboardPage({
  params,
}: UserPortfolioDashboardPageProps) {
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


