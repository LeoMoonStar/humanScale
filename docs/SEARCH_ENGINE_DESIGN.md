# Creator Search Engine Design

## Overview

We need **flexible, fast, keyword-based search** for creators, not limited to specific fields. Users should be able to search by:
- **Primary**: Creator name
- **Secondary**: Title, bio, skills, location, industry, token symbol, etc.
- **Multiple keywords**: "AI researcher MIT" should match Sarah Chen

---

## Technology Choice: Typesense vs Elasticsearch vs Meilisearch

### Recommended: **Typesense** ⭐

**Why Typesense:**
- ✅ **Fast** - Sub-50ms search latency
- ✅ **Easy setup** - Single binary, no JVM
- ✅ **Typo tolerance** - Handles misspellings automatically
- ✅ **Relevance tuning** - Configurable field weights
- ✅ **Open source** - Self-hosted, no vendor lock-in
- ✅ **Good docs** - Easy to integrate
- ✅ **Lightweight** - Low resource usage

**Comparison:**

| Feature | Typesense | Elasticsearch | Meilisearch | PostgreSQL FTS |
|---------|-----------|---------------|-------------|----------------|
| Speed | ⚡⚡⚡ | ⚡⚡ | ⚡⚡⚡ | ⚡ |
| Setup Complexity | Easy | Complex | Easy | Easy |
| Memory Usage | Low | High | Low | N/A |
| Typo Tolerance | ✅ | ✅ | ✅ | ❌ |
| Relevance Scoring | ✅ | ✅✅ | ✅ | Limited |
| Faceting | ✅ | ✅ | ✅ | ❌ |
| Cost | Free | Free | Free | Free |
| Scalability | Good | Excellent | Good | Limited |

**Verdict**: Use **Typesense** for simplicity and performance.

---

## Search Index Schema

### Creator Search Document

```json
{
  "id": "uuid",
  "name": "Sarah Chen",                    // Weight: 10 (highest priority)
  "title": "AI Research Scientist",        // Weight: 8
  "bio": "Passionate AI researcher...",    // Weight: 5
  "location": "Cambridge, MA",             // Weight: 3
  "category": "Tech",                      // Weight: 3
  "industry": "Technology",                // Weight: 3
  "skills": ["Machine Learning", "AI"],    // Weight: 7
  "token_symbol": "SARAH",                 // Weight: 6

  // Searchable but lower priority
  "achievements": ["Published 20+ papers"], // Weight: 2
  "company": "MIT CSAIL",                  // Weight: 4
  "email": "sarah@example.com",            // Weight: 1

  // Metadata (not searchable, used for filtering/sorting)
  "verified": true,
  "token_price": 2.45,
  "price_change_24h": 5.2,
  "market_cap": 245000,
  "holders": 428,
  "created_at": 1704067200,

  // URLs for display
  "avatar_url": "https://...",
  "banner_url": "https://..."
}
```

---

## API Design

### New Search API

```http
GET /search/creators?q=AI+researcher+MIT&page=1&limit=20&sort=relevance
```

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `q` | string | Search keywords (space-separated) | Required |
| `page` | integer | Page number | 1 |
| `limit` | integer | Results per page | 20 |
| `sort` | string | Sort by: `relevance`, `price`, `marketCap`, `holders`, `newest` | `relevance` |
| `verified` | boolean | Filter by verified status | - |
| `min_price` | float | Minimum token price | - |
| `max_price` | float | Maximum token price | - |

**Example Requests:**

```http
# Search by name
GET /search/creators?q=Sarah+Chen

# Search by profession + location
GET /search/creators?q=AI+researcher+Cambridge

# Search by skills
GET /search/creators?q=machine+learning+python

# Search by token symbol
GET /search/creators?q=SARAH

# Multi-keyword search
GET /search/creators?q=AI+MIT+neural+networks

# Search with filters
GET /search/creators?q=researcher&verified=true&min_price=2.00

# Search with sorting
GET /search/creators?q=AI&sort=marketCap
```

---

## Response Format

```json
{
  "success": true,
  "data": {
    "query": "AI researcher MIT",
    "results": [
      {
        "id": "uuid",
        "name": "Sarah Chen",
        "title": "AI Research Scientist",
        "bio": "Passionate AI researcher focused on...",
        "location": "Cambridge, MA",
        "category": "Tech",
        "industry": "Technology",
        "verified": true,
        "avatar": "https://...",
        "token": {
          "symbol": "SARAH",
          "price": 2.45,
          "priceChange24h": 5.2,
          "marketCap": 245000,
          "holders": 428
        },
        "highlights": {
          "name": "<mark>Sarah Chen</mark>",
          "title": "<mark>AI</mark> Research Scientist",
          "company": "<mark>MIT</mark> CSAIL"
        },
        "score": 0.95  // Relevance score (0-1)
      },
      {
        "id": "uuid",
        "name": "John Smith",
        "title": "Machine Learning Engineer",
        "bio": "Building AI systems at MIT...",
        "location": "Boston, MA",
        "category": "Tech",
        "industry": "Technology",
        "verified": false,
        "avatar": "https://...",
        "token": {
          "symbol": "JOHN",
          "price": 1.80,
          "priceChange24h": -2.1,
          "marketCap": 180000,
          "holders": 320
        },
        "highlights": {
          "bio": "Building <mark>AI</mark> systems at <mark>MIT</mark>..."
        },
        "score": 0.78
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    },
    "facets": {
      "category": {
        "Tech": 25,
        "Business": 10,
        "Sports": 5,
        "Music": 2
      },
      "verified": {
        "true": 15,
        "false": 27
      }
    },
    "searchTime": 23  // milliseconds
  }
}
```

**Key Features:**
- ✅ **Highlights** - Shows matched keywords in context
- ✅ **Relevance score** - Shows how well each result matches
- ✅ **Facets** - Shows distribution by category, verified status
- ✅ **Fast** - Search time in milliseconds

---

## Backend Implementation

### 1. Typesense Setup

**Docker Compose:**
```yaml
version: '3.8'

services:
  typesense:
    image: typesense/typesense:0.25.2
    ports:
      - "8108:8108"
    volumes:
      - typesense-data:/data
    environment:
      TYPESENSE_DATA_DIR: /data
      TYPESENSE_API_KEY: ${TYPESENSE_API_KEY}
    command: '--data-dir /data --api-key=${TYPESENSE_API_KEY} --enable-cors'

volumes:
  typesense-data:
```

---

### 2. Create Search Collection

```typescript
import Typesense from 'typesense';

const client = new Typesense.Client({
  nodes: [{
    host: 'localhost',
    port: 8108,
    protocol: 'http'
  }],
  apiKey: process.env.TYPESENSE_API_KEY!,
  connectionTimeoutSeconds: 2
});

// Create creators collection
await client.collections().create({
  name: 'creators',
  fields: [
    // Searchable fields with weights
    { name: 'name', type: 'string', facet: false },
    { name: 'title', type: 'string', facet: false },
    { name: 'bio', type: 'string', facet: false },
    { name: 'location', type: 'string', facet: false },
    { name: 'category', type: 'string', facet: true },
    { name: 'industry', type: 'string', facet: true },
    { name: 'skills', type: 'string[]', facet: false },
    { name: 'token_symbol', type: 'string', facet: false },
    { name: 'company', type: 'string', facet: false },
    { name: 'achievements', type: 'string[]', facet: false },

    // Filter/sort fields
    { name: 'verified', type: 'bool', facet: true },
    { name: 'token_price', type: 'float', facet: false },
    { name: 'market_cap', type: 'int64', facet: false },
    { name: 'holders', type: 'int32', facet: false },
    { name: 'created_at', type: 'int64', facet: false },

    // Display fields
    { name: 'avatar_url', type: 'string', facet: false, optional: true },
    { name: 'banner_url', type: 'string', facet: false, optional: true }
  ],
  default_sorting_field: 'market_cap'
});
```

---

### 3. Index Creator Documents

**On creator creation/update:**
```typescript
async function indexCreator(creator: Creator) {
  const document = {
    id: creator.id,
    name: creator.name,
    title: creator.title,
    bio: creator.bio,
    location: creator.location,
    category: creator.category,
    industry: creator.industry,
    skills: creator.skills,
    token_symbol: creator.tokenSymbol,
    company: creator.experience?.[0]?.company || '',
    achievements: creator.achievements,
    verified: creator.verified,
    token_price: creator.tokenPrice,
    market_cap: creator.marketCap,
    holders: creator.holders,
    created_at: Math.floor(new Date(creator.createdAt).getTime() / 1000),
    avatar_url: creator.avatar,
    banner_url: creator.banner
  };

  await client.collections('creators').documents().upsert(document);
}

// Bulk indexing (initial setup)
async function indexAllCreators() {
  const creators = await db.query('SELECT * FROM creators JOIN tokens...');

  const documents = creators.rows.map(creator => ({
    // ... map to document format
  }));

  await client.collections('creators')
    .documents()
    .import(documents, { action: 'upsert' });
}
```

---

### 4. Search API Endpoint

```typescript
import { Router } from 'express';

const router = Router();

router.get('/search/creators', async (req, res) => {
  const {
    q,
    page = 1,
    limit = 20,
    sort = 'relevance',
    verified,
    min_price,
    max_price
  } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Query parameter "q" is required'
    });
  }

  // Build filter query
  const filters: string[] = [];

  if (verified !== undefined) {
    filters.push(`verified:${verified === 'true'}`);
  }

  if (min_price) {
    filters.push(`token_price:>=${min_price}`);
  }

  if (max_price) {
    filters.push(`token_price:<=${max_price}`);
  }

  // Map sort options
  const sortByMap: Record<string, string> = {
    relevance: '_text_match:desc,market_cap:desc',
    price: 'token_price:desc',
    marketCap: 'market_cap:desc',
    holders: 'holders:desc',
    newest: 'created_at:desc'
  };

  const sortBy = sortByMap[sort as string] || sortByMap.relevance;

  try {
    const searchParams = {
      q: q as string,
      query_by: 'name,title,bio,skills,token_symbol,location,company,category,industry',

      // Field weights (name is most important)
      query_by_weights: '10,8,5,7,6,3,4,3,3',

      // Filters
      filter_by: filters.join(' && ') || undefined,

      // Sorting
      sort_by: sortBy,

      // Pagination
      page: Number(page),
      per_page: Math.min(Number(limit), 100),

      // Highlighting
      highlight_full_fields: 'name,title,bio,company',
      highlight_start_tag: '<mark>',
      highlight_end_tag: '</mark>',

      // Faceting
      facet_by: 'category,verified',
      max_facet_values: 10,

      // Typo tolerance
      num_typos: 2,
      typo_tokens_threshold: 1
    };

    const searchResults = await client
      .collections('creators')
      .documents()
      .search(searchParams);

    // Format response
    const results = searchResults.hits?.map(hit => ({
      id: hit.document.id,
      name: hit.document.name,
      title: hit.document.title,
      bio: hit.document.bio,
      location: hit.document.location,
      category: hit.document.category,
      industry: hit.document.industry,
      verified: hit.document.verified,
      avatar: hit.document.avatar_url,
      token: {
        symbol: hit.document.token_symbol,
        price: hit.document.token_price,
        priceChange24h: 0, // TODO: Calculate from price history
        marketCap: hit.document.market_cap,
        holders: hit.document.holders
      },
      highlights: hit.highlights?.reduce((acc, h) => {
        acc[h.field] = h.snippet || h.value;
        return acc;
      }, {} as Record<string, string>),
      score: hit.text_match / 100 // Normalize to 0-1
    })) || [];

    const facets = searchResults.facet_counts?.reduce((acc, facet) => {
      acc[facet.field_name] = facet.counts.reduce((counts, count) => {
        counts[count.value] = count.count;
        return counts;
      }, {} as Record<string, number>);
      return acc;
    }, {} as Record<string, Record<string, number>>);

    res.json({
      success: true,
      data: {
        query: q,
        results,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: searchResults.found || 0,
          totalPages: Math.ceil((searchResults.found || 0) / Number(limit)),
          hasNext: Number(page) * Number(limit) < (searchResults.found || 0),
          hasPrev: Number(page) > 1
        },
        facets,
        searchTime: searchResults.search_time_ms
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

export default router;
```

---

## Search Features

### 1. Typo Tolerance
```
User types: "Srah Cehn"
Results:    "Sarah Chen" ✅
```

### 2. Multi-Field Search
```
User types: "AI researcher MIT"
Matches:
- name: "Sarah Chen"
- title: "AI Research Scientist"
- company: "MIT CSAIL"
```

### 3. Partial Matching
```
User types: "mach learn"
Matches:    "Machine Learning" ✅
```

### 4. Relevance Scoring
```
"Sarah" in name (weight 10)    → Score: 0.95
"Sarah" in bio (weight 5)      → Score: 0.65
"Sarah" in location (weight 3) → Score: 0.40
```

### 5. Faceted Search
```
Search: "researcher"
Facets:
- Category: Tech (25), Business (10), Law (5)
- Verified: Yes (15), No (27)
- Location: Cambridge (12), Boston (8), NYC (10)
```

---

## Data Synchronization

### Keep Typesense in sync with PostgreSQL

**Strategy: Event-driven updates**

```typescript
// After creating/updating creator in PostgreSQL
async function afterCreatorUpdate(creatorId: string) {
  const creator = await db.getCreator(creatorId);
  await indexCreator(creator);
}

// After deleting creator
async function afterCreatorDelete(creatorId: string) {
  await client.collections('creators')
    .documents(creatorId)
    .delete();
}

// Periodic full re-index (nightly)
cron.schedule('0 2 * * *', async () => {
  console.log('Starting full re-index...');
  await indexAllCreators();
  console.log('Re-index complete');
});
```

---

## Performance Expectations

| Metric | Target | Notes |
|--------|--------|-------|
| Search latency | < 50ms | 95th percentile |
| Index update | < 10ms | Single document |
| Bulk index | < 1s | 1000 documents |
| Memory usage | < 500MB | For 10,000 creators |
| Throughput | 1000+ QPS | Queries per second |

---

## Migration from Simple SQL

**Phase 1: Add Typesense alongside PostgreSQL**
- Keep existing `/creators` endpoint for backward compatibility
- Add new `/search/creators` endpoint
- Frontend uses new search endpoint

**Phase 2: Migrate gradually**
- Monitor search usage
- Optimize search parameters
- Collect user feedback

**Phase 3: Deprecate old endpoint**
- Redirect `/creators?search=...` to `/search/creators`
- Eventually remove old endpoint

---

## Frontend Integration

```tsx
import { useState, useEffect } from 'react';
import { debounce } from 'lodash';

export function CreatorSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Debounced search (wait 300ms after user stops typing)
  const searchCreators = debounce(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search/creators?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.data.results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, 300);

  useEffect(() => {
    searchCreators(query);
  }, [query]);

  return (
    <div>
      <input
        type="search"
        placeholder="Search creators by name, skills, location..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full p-3 border rounded-lg"
      />

      {loading && <div>Searching...</div>}

      <div className="space-y-4 mt-4">
        {results.map((creator: any) => (
          <div key={creator.id} className="card p-4">
            <h3 dangerouslySetInnerHTML={{ __html: creator.highlights?.name || creator.name }} />
            <p dangerouslySetInnerHTML={{ __html: creator.highlights?.title || creator.title }} />
            <p className="text-sm text-gray-600">Score: {creator.score.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Alternative: PostgreSQL Full-Text Search

If you want to avoid adding another service, PostgreSQL has built-in full-text search:

```sql
-- Add tsvector column
ALTER TABLE creators ADD COLUMN search_vector tsvector;

-- Create GIN index
CREATE INDEX creators_search_idx ON creators USING GIN(search_vector);

-- Update search vector on insert/update
CREATE FUNCTION creators_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER creators_search_update
  BEFORE INSERT OR UPDATE ON creators
  FOR EACH ROW EXECUTE FUNCTION creators_search_trigger();

-- Search query
SELECT *, ts_rank(search_vector, query) AS rank
FROM creators, plainto_tsquery('english', 'AI researcher MIT') AS query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

**Pros:**
- ✅ No additional service
- ✅ Transactional consistency

**Cons:**
- ❌ Slower than Typesense
- ❌ Limited typo tolerance
- ❌ Less flexible relevance tuning
- ❌ No built-in highlighting

---

## Recommendation

**Use Typesense** for production. It's the best balance of:
- Performance
- Features (typo tolerance, highlighting, facets)
- Ease of use
- Resource efficiency

**Use PostgreSQL FTS** only if:
- You want to minimize infrastructure
- Search is not a primary feature
- You have < 1000 creators

---

## Summary

✅ **Flexible keyword search** - Not limited to specific fields
✅ **Multi-field search** - Name, title, bio, skills, location, etc.
✅ **Typo tolerance** - Handles misspellings automatically
✅ **Relevance ranking** - Best matches first
✅ **Fast** - Sub-50ms search latency
✅ **Highlights** - Shows matched keywords in context
✅ **Facets** - Filter by category, verified status
✅ **Easy to use** - Simple query parameter `?q=keywords`

**New API:**
```http
GET /search/creators?q=AI+researcher+MIT&sort=relevance
```

This gives users the flexibility they need while maintaining excellent performance! 🚀
