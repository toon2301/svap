import NotificationsFeed from './notifications/NotificationsFeed';

interface NotificationsModuleProps {
  onNavigate?: (targetUrl: string) => void;
}

export default function NotificationsModule({ onNavigate }: NotificationsModuleProps) {
  return <NotificationsFeed onNavigate={onNavigate} />;
}
