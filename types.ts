// FIX: Define and export interfaces. The previous content was incorrect and caused circular dependencies.
export interface PostData {
  id: string;
  theme: string;
  imageUrl: string;
  caption: string;
  hashtags: string;
  platform: string;
  profileUrl: string;
  creativityMode?: boolean;
  thinkingMode?: boolean;
  focusMode?: boolean;
  tone?: string;
}

export interface AppError {
  title: string;
  message: string;
  suggestion?: string;
}

export interface GeneratedContent {
  caption: string;
  hashtags: string;
}

export interface VideoOutputData {
  url: string;
  theme: string;
  platform: string;
}
