import Dashboard from '@/components/dashboard/Dashboard';

interface UserDashboardPageProps {
  params: Promise<{
    userId: string;
  }>;
  searchParams: Promise<{
    highlight?: string;
    offer?: string;
  }>;
}

// Tento route segment `[userId]` slúži ako slug alebo numerické ID (backward compatible).
export default async function UserDashboardPage(props: UserDashboardPageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const identifier = params.userId;
  const rawHighlightId = searchParams.offer ?? searchParams.highlight;
  const parsedHighlightId = rawHighlightId ? Number(rawHighlightId) : null;
  const highlightId =
    parsedHighlightId != null &&
    Number.isFinite(parsedHighlightId) &&
    Number.isInteger(parsedHighlightId) &&
    parsedHighlightId > 0
      ? parsedHighlightId
      : null;

  return (
    <Dashboard
      initialRoute="user-profile"
      // Ak je identifier čisto numerický, môžeme ho použiť aj ako ID (fallback)
      initialViewedUserId={/^\d+$/.test(identifier) ? Number(identifier) : null}
      initialProfileSlug={identifier}
      initialHighlightedSkillId={highlightId}
    />
  );
}

