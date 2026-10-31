import Dashboard from '@/components/dashboard/Dashboard';
import { parseFeedPostId } from '@/lib/feedApi';

interface FeedPostPageProps {
  params: Promise<{
    postId: string;
  }>;
}

export default async function FeedPostPage(props: FeedPostPageProps) {
  const params = await props.params;
  const postId = parseFeedPostId(params?.postId);

  return <Dashboard initialRoute="feed-post-detail" initialFeedPostId={postId} />;
}
