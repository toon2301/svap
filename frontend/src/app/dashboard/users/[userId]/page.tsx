import Dashboard from '@/components/dashboard/Dashboard';

interface UserDashboardPageProps {
  params: {
    userId: string;
  };
  searchParams: {
    highlight?: string;
    offer?: string;
  };
}

// Tento route segment `[userId]` slúži ako slug alebo numerické ID (backward compatible).
export default function UserDashboardPage({ params, searchParams }: UserDashboardPageProps) {
  const identifier = params.userId;
  const rawHighlightId = searchParams.offer ?? searchParams.highlight;
  const highlightId = rawHighlightId ? Number(rawHighlightId) : null;

  return (
    <Dashboard
      initialRoute="user-profile"
      // Ak je identifier čisto numerický, môžeme ho použiť aj ako ID (fallback)
      initialViewedUserId={/^\d+$/.test(identifier) ? Number(identifier) : null}
      initialProfileSlug={identifier}
      initialHighlightedSkillId={!isNaN(Number(highlightId)) ? highlightId : null}
    />
  );
}

