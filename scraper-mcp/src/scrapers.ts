import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ScrapedData, OpenGraphData, TwitterCardData, GitHubProfile } from './types.js';

/**
 * Scrape Open Graph and Twitter Card metadata from any URL
 */
export async function scrapeGenericUrl(url: string): Promise<ScrapedData> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Extract Open Graph metadata
    const ogData: OpenGraphData = {
      ogTitle: $('meta[property="og:title"]').attr('content'),
      ogDescription: $('meta[property="og:description"]').attr('content'),
      ogImage: $('meta[property="og:image"]').attr('content'),
      ogUrl: $('meta[property="og:url"]').attr('content'),
      ogType: $('meta[property="og:type"]').attr('content'),
      ogSiteName: $('meta[property="og:site_name"]').attr('content'),
    };

    // Extract Twitter Card metadata
    const twitterData: TwitterCardData = {
      twitterCard: $('meta[name="twitter:card"]').attr('content'),
      twitterTitle: $('meta[name="twitter:title"]').attr('content'),
      twitterDescription: $('meta[name="twitter:description"]').attr('content'),
      twitterImage: $('meta[name="twitter:image"]').attr('content'),
    };

    // Fallback to standard HTML meta tags
    const title = ogData.ogTitle ||
                  twitterData.twitterTitle ||
                  $('title').text() ||
                  $('meta[name="title"]').attr('content') ||
                  'Untitled';

    const description = ogData.ogDescription ||
                       twitterData.twitterDescription ||
                       $('meta[name="description"]').attr('content') ||
                       '';

    const imageUrl = ogData.ogImage ||
                    twitterData.twitterImage ||
                    $('link[rel="image_src"]').attr('href') ||
                    '';

    return {
      title: title.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      metadata: {
        ...ogData,
        ...twitterData,
        canonicalUrl: $('link[rel="canonical"]').attr('href'),
        favicon: $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href'),
      }
    };
  } catch (error) {
    console.error('Error scraping generic URL:', error);
    throw new Error(`Failed to scrape URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Scrape GitHub profile using GitHub API
 */
export async function scrapeGitHubProfile(username: string): Promise<ScrapedData> {
  try {
    // Use GitHub API for more reliable data
    const response = await axios.get(`https://api.github.com/users/${username}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'PeopleCoin-Scraper'
      },
      timeout: 10000
    });

    const profile: GitHubProfile = {
      username: response.data.login,
      name: response.data.name,
      bio: response.data.bio,
      avatarUrl: response.data.avatar_url,
      followers: response.data.followers,
      following: response.data.following,
      publicRepos: response.data.public_repos,
      company: response.data.company,
      location: response.data.location,
      blog: response.data.blog,
    };

    return {
      title: profile.name || profile.username || 'GitHub Profile',
      description: profile.bio || `GitHub user with ${profile.publicRepos} public repositories`,
      imageUrl: profile.avatarUrl,
      metadata: {
        platform: 'github',
        username: profile.username,
        followers: profile.followers,
        following: profile.following,
        publicRepos: profile.publicRepos,
        company: profile.company,
        location: profile.location,
        blog: profile.blog,
        profileUrl: `https://github.com/${username}`
      }
    };
  } catch (error) {
    console.error('Error scraping GitHub profile:', error);
    throw new Error(`Failed to scrape GitHub profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Scrape LinkedIn profile (note: LinkedIn blocks most scrapers, this is a basic attempt)
 */
export async function scrapeLinkedInProfile(url: string): Promise<ScrapedData> {
  try {
    // LinkedIn heavily restricts scraping, so we'll do best-effort extraction
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Try to extract basic info from meta tags
    const title = $('meta[property="og:title"]').attr('content') ||
                  $('title').text() ||
                  'LinkedIn Profile';

    const description = $('meta[property="og:description"]').attr('content') ||
                       $('meta[name="description"]').attr('content') ||
                       '';

    const imageUrl = $('meta[property="og:image"]').attr('content') || '';

    return {
      title: title.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      metadata: {
        platform: 'linkedin',
        url: url,
        note: 'LinkedIn limits automated scraping. Consider using LinkedIn API or manual input.'
      }
    };
  } catch (error) {
    console.error('Error scraping LinkedIn profile:', error);
    // Return partial data instead of failing
    return {
      title: 'LinkedIn Profile',
      description: 'LinkedIn profile (authentication required for full details)',
      imageUrl: '',
      metadata: {
        platform: 'linkedin',
        url: url,
        error: 'LinkedIn requires authentication for detailed scraping',
        note: 'Consider using LinkedIn API with proper authentication'
      }
    };
  }
}

/**
 * Scrape Spotify content (playlists, artists, albums)
 */
export async function scrapeSpotifyUrl(url: string): Promise<ScrapedData> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    const title = $('meta[property="og:title"]').attr('content') ||
                  $('meta[name="twitter:title"]').attr('content') ||
                  $('title').text() ||
                  'Spotify Content';

    const description = $('meta[property="og:description"]').attr('content') ||
                       $('meta[name="twitter:description"]').attr('content') ||
                       $('meta[name="description"]').attr('content') ||
                       '';

    const imageUrl = $('meta[property="og:image"]').attr('content') ||
                    $('meta[name="twitter:image"]').attr('content') ||
                    '';

    // Determine content type from URL
    let contentType = 'unknown';
    if (url.includes('/playlist/')) contentType = 'playlist';
    else if (url.includes('/artist/')) contentType = 'artist';
    else if (url.includes('/album/')) contentType = 'album';
    else if (url.includes('/track/')) contentType = 'track';

    return {
      title: title.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      metadata: {
        platform: 'spotify',
        contentType: contentType,
        url: url,
        embedUrl: url.replace('/playlist/', '/embed/playlist/')
                    .replace('/artist/', '/embed/artist/')
                    .replace('/album/', '/embed/album/')
                    .replace('/track/', '/embed/track/')
      }
    };
  } catch (error) {
    console.error('Error scraping Spotify URL:', error);
    throw new Error(`Failed to scrape Spotify URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main scraper function that routes to appropriate scraper based on URL
 */
export async function scrapeUrl(url: string): Promise<ScrapedData> {
  try {
    // Validate URL
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Route to appropriate scraper
    if (hostname.includes('github.com')) {
      const username = urlObj.pathname.split('/')[1];
      if (username) {
        return await scrapeGitHubProfile(username);
      }
    } else if (hostname.includes('linkedin.com')) {
      return await scrapeLinkedInProfile(url);
    } else if (hostname.includes('spotify.com')) {
      return await scrapeSpotifyUrl(url);
    }

    // Default: use generic scraper
    return await scrapeGenericUrl(url);

  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to scrape URL');
  }
}
