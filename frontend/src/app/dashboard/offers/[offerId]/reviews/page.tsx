import Dashboard from '@/components/dashboard/Dashboard';

interface OfferReviewsPageProps {
  params: Promise<{
    offerId: string;
  }>;
}

export default async function OfferReviewsPage(props: OfferReviewsPageProps) {
  const params = await props.params;
  const raw = params?.offerId;
  const parsed = raw != null ? Number(raw) : NaN;
  const offerId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;

  return <Dashboard initialRoute="offer-reviews" initialOfferId={offerId} />;
}

