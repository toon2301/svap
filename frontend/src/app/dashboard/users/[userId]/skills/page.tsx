import Dashboard from '@/components/dashboard/Dashboard';

interface UserSkillsDashboardPageProps {
  params: {
    userId: string;
  };
}

// `[userId]` funguje ako slug alebo numerické ID (BC pre staré URL).
export default function UserSkillsDashboardPage({
  params,
}: UserSkillsDashboardPageProps) {
  const identifier = params.userId;

  return (
    <Dashboard
      initialRoute="user-profile"
      initialViewedUserId={/^\d+$/.test(identifier) ? Number(identifier) : null}
      initialProfileSlug={identifier}
      initialProfileTab="offers"
    />
  );
}

