export type UserProfile = {
  id: number;
  email: string;
  name?: string | null;
  lastname?: string | null;
  username?: string | null;
  grading_scale?: string | null;
  approval_threshold?: number | null;
  major?: string | null;
  university?: string | null;
  created_at?: string | null;
  last_login?: string | null;
  share_pin?: string | null;
  display_name?: string | null;
};

export type Subject = {
  id: number;
  user_id: number;
  code: string;
  name: string;
  credits?: number | null;
  professor?: string | null;
  color?: string | null;
  icon?: string | null;
  target_grade?: number | null;
  avg_score?: number | null;
  completion_percent?: number | null;
};

export type Assessment = {
  id?: number;
  subject_id: number;
  name: string;
  type?: string | null;
  date?: string | null;
  weight?: string | null;
  out_of?: number | null;
  score?: number | null;
  percentage?: number | null;
  grade_value?: number | null;
  is_completed?: boolean;
};

export type Photo = {
  id?: number;
  subject_id: number;
  local_uri: string;
  created_at?: string;
  es_favorita?: number;
};

export type Schedule = {
  id: number;
  subject_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  name?: string;
  color?: string;
};

export interface FlashcardDeck {
  id: number;
  user_id?: number;
  subject_id: number;
  title: string;
  description: string;
  created_at: string;
  card_count?: number;
  review_count?: number;
  learning_count?: number;
  new_count?: number;
  subject_name?: string;
  subject_color?: string;
  subject_icon?: string;
  owner_username?: string;
  owner_name?: string;
}

export interface Flashcard {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  status: string; // 'new', 'learning', 'review'
  created_at: string;
}

export interface AudioRecording {
  id?: number;
  user_id: number;
  subject_id?: number | null;
  name?: string | null;
  local_uri: string;
  duration?: number;
  created_at?: string;
  subject_name?: string;
  subject_color?: string;
  subject_icon?: string;
  transcript_uri?: string;
  summary_uri?: string;
}

export interface YouTubeVideo {
  id?: number;
  user_id: number;
  subject_id?: number | null;
  youtube_url: string;
  video_id?: string;
  title?: string | null;
  thumbnail_url?: string | null;
  duration?: number;
  created_at?: string;
  subject_name?: string;
  subject_color?: string;
  subject_icon?: string;
  transcript_uri?: string;
  summary_uri?: string;
}
