export type PortfolioImageStatus = 'pending' | 'approved' | 'rejected';

export type PortfolioImage = {
  id: number;
  image_url?: string | null;
  thumbnail_url?: string | null;
  medium_url?: string | null;
  large_url?: string | null;
  order?: number | null;
  width?: number | null;
  height?: number | null;
  status?: PortfolioImageStatus;
  rejected_reason?: string | null;
};

export type PortfolioRelatedOffer = {
  id: number;
  category?: string | null;
  subcategory?: string | null;
  is_seeking?: boolean;
};

export type PortfolioItem = {
  id: number;
  title: string;
  category: string;
  description?: string | null;
  sort_order: number;
  is_featured?: boolean;
  can_manage?: boolean;
  related_offer?: PortfolioRelatedOffer | null;
  cover_image?: PortfolioImage | null;
  images?: PortfolioImage[];
  created_at?: string;
  updated_at?: string;
};
