export interface ScrapedData {
  title?: string;
  description?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
}

export interface ScrapeRequest {
  url: string;
}

export interface ScrapeResponse {
  success: boolean;
  data?: ScrapedData;
  error?: string;
}

export interface OpenGraphData {
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  ogSiteName?: string;
}

export interface TwitterCardData {
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
}

export interface LinkedInProfile {
  name?: string;
  headline?: string;
  location?: string;
  imageUrl?: string;
  connections?: string;
}

export interface GitHubProfile {
  username?: string;
  name?: string;
  bio?: string;
  avatarUrl?: string;
  followers?: number;
  following?: number;
  publicRepos?: number;
  company?: string;
  location?: string;
  blog?: string;
}
