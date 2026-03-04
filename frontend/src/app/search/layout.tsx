import { SearchLayout } from '@/components/search/SearchLayout';

export default function SearchPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SearchLayout>{children}</SearchLayout>;
}
