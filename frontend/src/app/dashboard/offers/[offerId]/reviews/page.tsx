import Dashboard from '@/components/dashboard/Dashboard';

interface OfferReviewsPageProps {
  params: {
    offerId: string;
  };
}

export default function OfferReviewsPage({ params }: OfferReviewsPageProps) {
  const raw = params?.offerId;
  const parsed = raw != null ? Number(raw) : NaN;
  const offerId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;

  return <Dashboard initialRoute="offer-reviews" initialOfferId={offerId} />;
}

