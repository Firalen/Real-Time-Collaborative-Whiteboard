export interface Plan {
  id: string;
  slug: string;
  name: string;
  description?: string;
  priceMonthly: number;
  priceAnnual: number;
  limits: Record<string, number>;
  features: string[];
}

export interface Subscription {
  id: string;
  planSlug: string;
  planName: string;
  status: string;
  billingCycle: string;
  trialEndsAt?: string;
  limits: Record<string, number>;
  features: string[];
}

export interface BoardLayer {
  id: string;
  boardId: string;
  name: string;
  sortOrder: number;
  visible: boolean;
  locked: boolean;
}

export interface GalleryBoard {
  id: string;
  name: string;
  emoji_icon?: string;
  cover_url?: string;
  like_count: number;
  description?: string;
  category?: string;
  featured?: boolean;
  author_name: string;
  published_at: string;
}

export interface AdminMetrics {
  totalUsers: number;
  totalWorkspaces: number;
  totalBoards: number;
  dau: number;
}

export interface AdminWorkspace {
  id: string;
  name: string;
  plan_slug?: string;
  member_count: number;
  created_at: string;
}
