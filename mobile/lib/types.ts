export type Category = 'coffee' | 'study' | 'sports' | 'outdoors' | 'bar' | 'party' | 'other';

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  birth_date: string;
  bio: string;
  avatar_url: string;
  is_founding_host?: number;
  is_admin?: number;
}

export interface Gathering {
  id: string;
  host_id: string;
  title: string;
  category: Category;
  description: string;
  start_time: string;
  end_time: string;
  max_guests: number;
  visibility: 'public' | 'approval';
  lat: number;
  lng: number;
  address: string | null;
  exact: boolean;
  created_at: string;
  cancelled_at: string | null;
  host?: { id: string; display_name: string; avatar_url: string; bio?: string; is_founding_host?: number };
  spots_left?: number;
  my_request_status?: string | null;
}

export interface JoinRequest {
  id: string;
  gathering_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'declined';
  display_name?: string;
  avatar_url?: string;
}

export interface Message {
  id: string;
  gathering_id: string;
  user_id: string;
  body: string;
  created_at: string;
  display_name?: string;
}
