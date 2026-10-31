import Dashboard from '@/components/dashboard/Dashboard';

interface UserPortfolioCreateDashboardPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function UserPortfolioCreateDashboardPage(props: UserPortfolioCreateDashboardPageProps) {
  const params = await props.params;
  const identifier = params.userId;

  return (
    <Dashboard
      initialRoute="portfolio-create"
      initialViewedUserId={/^\d+$/.test(identifier) ? Number(identifier) : null}
      initialProfileSlug={/^\d+$/.test(identifier) ? null : identifier}
      initialProfileTab="portfolio"
    />
  );
}
