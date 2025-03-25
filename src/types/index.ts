export interface VideoDetails {
  title: string;
  description: string;
  thumbnail: string;
  channel: string;
  duration: string;
  captions?: string; // Raw captions from YouTube API
  language?: string; // Caption language
}

export interface TimeStampedContent {
  timestamp: number; // in seconds
  text: string;
  type: 'text' | 'code' | 'key_point';
  language?: string; // for code segments
}

export interface SummaryContent {
  text: string;
  code: string[];
  links: string[];
  imageReferences: string[];
  timestamps: TimeStampedContent[]; // Timestamped content with markers
  keyPoints: TimeStampedContent[]; // Important moments in the video
  transcriptSummary?: string; // NLP-processed transcript summary
}

export interface SummaryData {
  videoDetails?: VideoDetails;
  summary?: SummaryContent;
  isLoading: boolean;
  error?: string;
}

export interface UserAuth {
  id: string;
  email: string;
  name?: string;
  isAuthenticated: boolean;
}
