export interface PostData {
  id: string;
  theme: string;
  imageUrl: string;
  caption: string;
  hashtags: string;
  platform: string;
  profileUrl: string;
}

export interface GeneratedContent {
  caption: string;
  hashtags: string;
}

export interface AppError {
  title: string;
  message: string;
  suggestion?: string;
}