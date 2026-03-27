import Dashboard from '@/components/dashboard/Dashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function DashboardMessagesPage() {
  return <Dashboard initialRoute="messages" />;
}

