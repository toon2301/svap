import Dashboard from '@/components/dashboard/Dashboard';

export default function DashboardAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Dashboard />
    </>
  );
}
