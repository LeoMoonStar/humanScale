import express from 'express';
import cors from 'cors';
import { scrapeUrl } from './scrapers.js';
import type { ScrapeRequest, ScrapeResponse } from './types.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'scraper-mcp',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Main scraping endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    const { url } = req.body as ScrapeRequest;

    // Validate request
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      } as ScrapeResponse);
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      } as ScrapeResponse);
    }

    console.log(`[${new Date().toISOString()}] Scraping URL: ${url}`);

    // Scrape the URL
    const scrapedData = await scrapeUrl(url);

    console.log(`[${new Date().toISOString()}] Successfully scraped: ${scrapedData.title}`);

    // Return success response
    res.json({
      success: true,
      data: scrapedData
    } as ScrapeResponse);

  } catch (error) {
    console.error('Scraping error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    res.status(500).json({
      success: false,
      error: errorMessage
    } as ScrapeResponse);
  }
});

// Batch scraping endpoint (for multiple URLs)
app.post('/api/scrape/batch', async (req, res) => {
  try {
    const { urls } = req.body as { urls: string[] };

    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({
        success: false,
        error: 'URLs array is required'
      });
    }

    if (urls.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 URLs allowed per batch request'
      });
    }

    console.log(`[${new Date().toISOString()}] Batch scraping ${urls.length} URLs`);

    // Scrape all URLs in parallel
    const results = await Promise.allSettled(
      urls.map(url => scrapeUrl(url))
    );

    const responses = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          url: urls[index],
          success: true,
          data: result.value
        };
      } else {
        return {
          url: urls[index],
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
        };
      }
    });

    res.json({
      success: true,
      results: responses
    });

  } catch (error) {
    console.error('Batch scraping error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Scraper MCP Service running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Scrape API: POST http://localhost:${PORT}/api/scrape`);
  console.log(`   Batch API: POST http://localhost:${PORT}/api/scrape/batch\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});
