import Dashboard from '@/components/dashboard/Dashboard';

interface UserPortfolioCreateDashboardPageProps {
  params: {
    userId: string;
  };
}

export default function UserPortfolioCreateDashboardPage({
  params,
}: UserPortfolioCreateDashboardPageProps) {
  const identifier = params.userId;

  return (
    <Dashboard
      initialRoute="portfolio-create"
      initialViewedUserId={/^\d+$/.test(identifier) ? Number(identifier) : null}
      initialProfileSlug={/^\d+$/.test(identifier) ? null : identifier}
    />
  );
}
