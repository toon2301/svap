import Dashboard from '@/components/dashboard/Dashboard';
import { parseFeedPostId } from '@/lib/feedApi';

interface FeedPostPageProps {
  params: {
    postId: string;
  };
}

export default function FeedPostPage({ params }: FeedPostPageProps) {
  const postId = parseFeedPostId(params?.postId);

  return <Dashboard initialRoute="feed-post-detail" initialFeedPostId={postId} />;
}
