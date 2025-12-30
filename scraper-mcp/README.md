# Scraper MCP Service

A microservice for scraping and extracting metadata from various URLs including GitHub, LinkedIn, Spotify, and generic web pages.

## Features

- **Multi-platform Support**: GitHub, LinkedIn, Spotify, and generic web scraping
- **Metadata Extraction**: Open Graph tags, Twitter Cards, and platform-specific data
- **Batch Processing**: Scrape multiple URLs in a single request
- **TypeScript**: Full type safety and IntelliSense support
- **Error Handling**: Graceful fallbacks and detailed error messages
- **CORS Enabled**: Ready for frontend integration

## Installation

```bash
npm install
```

## Development

Start the development server with hot reload:

```bash
npm run dev
```

The service will run on `http://localhost:3001` by default.

## Build

Build for production:

```bash
npm run build
```

Run production build:

```bash
npm start
```

## API Endpoints

### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "ok",
  "service": "scraper-mcp",
  "version": "1.0.0",
  "timestamp": "2024-12-28T00:00:00.000Z"
}
```

### Scrape Single URL

```http
POST /api/scrape
Content-Type: application/json

{
  "url": "https://github.com/username"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "title": "Username - GitHub",
    "description": "Software engineer with 50 public repositories",
    "imageUrl": "https://avatars.githubusercontent.com/...",
    "metadata": {
      "platform": "github",
      "username": "username",
      "followers": 100,
      "following": 50,
      "publicRepos": 50,
      "company": "Company Name",
      "location": "San Francisco, CA",
      "blog": "https://blog.example.com",
      "profileUrl": "https://github.com/username"
    }
  }
}
```

### Batch Scrape (up to 10 URLs)

```http
POST /api/scrape/batch
Content-Type: application/json

{
  "urls": [
    "https://github.com/user1",
    "https://linkedin.com/in/user2",
    "https://example.com"
  ]
}
```

Response:
```json
{
  "success": true,
  "results": [
    {
      "url": "https://github.com/user1",
      "success": true,
      "data": { ... }
    },
    {
      "url": "https://linkedin.com/in/user2",
      "success": true,
      "data": { ... }
    },
    {
      "url": "https://example.com",
      "success": false,
      "error": "Failed to scrape URL"
    }
  ]
}
```

## Supported Platforms

### GitHub
- Uses GitHub API for reliable data
- Extracts: username, name, bio, avatar, followers, repos, company, location
- No authentication required for public profiles

### LinkedIn
- Best-effort scraping (LinkedIn restricts automation)
- Extracts: Open Graph metadata
- Note: Full profile data requires LinkedIn API with authentication

### Spotify
- Extracts: playlist, artist, album, track metadata
- Provides embed URLs for iframe integration
- Works with public Spotify content

### Generic URLs
- Extracts: Open Graph tags, Twitter Cards
- Fallback to standard HTML meta tags
- Works with most modern websites

## Frontend Integration

Example usage in React:

```typescript
const scrapeUrl = async (url: string) => {
  try {
    const response = await fetch('http://localhost:3001/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const result = await response.json();

    if (result.success) {
      console.log('Scraped data:', result.data);
      // Use result.data.title, description, imageUrl, metadata
    } else {
      console.error('Scraping failed:', result.error);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
PORT=3001
NODE_ENV=development
```

## Error Handling

The service handles errors gracefully:

- **400 Bad Request**: Invalid URL or missing parameters
- **500 Internal Server Error**: Scraping failed (network issues, blocked, etc.)

Error response format:
```json
{
  "success": false,
  "error": "Detailed error message"
}
```

## Rate Limiting

Currently no rate limiting is implemented. For production:

- Consider adding rate limiting (e.g., express-rate-limit)
- Implement caching to reduce duplicate requests
- Use Redis for distributed rate limiting

## Future Enhancements

- [ ] Add caching layer (Redis)
- [ ] Implement rate limiting
- [ ] Add support for Twitter, Instagram, YouTube
- [ ] Puppeteer integration for JavaScript-heavy sites
- [ ] Screenshot capture functionality
- [ ] PDF metadata extraction
- [ ] API key authentication
- [ ] Request queuing system
- [ ] Webhook support for async scraping
- [ ] LinkedIn API integration with OAuth

## License

MIT
