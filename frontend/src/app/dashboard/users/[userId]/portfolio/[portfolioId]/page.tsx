import Dashboard from '@/components/dashboard/Dashboard';

interface UserPortfolioDetailDashboardPageProps {
  params: {
    userId: string;
    portfolioId: string;
  };
}

export default function UserPortfolioDetailDashboardPage({
  params,
}: UserPortfolioDetailDashboardPageProps) {
  const identifier = params.userId;
  const portfolioId = Number(params.portfolioId);

  return (
    <Dashboard
      initialRoute="portfolio-detail"
      initialViewedUserId={/^\d+$/.test(identifier) ? Number(identifier) : null}
      initialProfileSlug={identifier}
      initialProfileTab="portfolio"
      initialPortfolioItemId={Number.isFinite(portfolioId) ? portfolioId : null}
    />
  );
}
