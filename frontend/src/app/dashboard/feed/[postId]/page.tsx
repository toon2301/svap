import Dashboard from '@/components/dashboard/Dashboard';

interface FeedPostPageProps {
  params: {
    postId: string;
  };
}

export default function FeedPostPage({ params }: FeedPostPageProps) {
  const raw = params?.postId;
  const parsed = raw != null ? Number(raw) : NaN;
  const postId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;

  return <Dashboard initialRoute="feed-post-detail" initialFeedPostId={postId} />;
}
