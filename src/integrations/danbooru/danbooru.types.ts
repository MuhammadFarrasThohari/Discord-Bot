export interface DanbooruPost {
  id: number;
  created_at: string;

  file_url: string | null;
  preview_file_url: string | null;
  large_file_url: string | null;

  source: string;
  rating: string;

  image_width: number;
  image_height: number;
  file_ext: string;
  file_size: number;

  score: number;
  fav_count: number;
  tag_string: string;

  is_deleted: boolean;
  is_pending: boolean;
}

export interface DanbooruTag {
  id: number;
  name: string;
  category: number;
  post_count: number;
  is_deprecated?: boolean;
}