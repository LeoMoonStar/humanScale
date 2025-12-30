import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, TrendingUp, Users, DollarSign, MapPin, Filter, X } from 'lucide-react';

interface Creator {
  id: string;
  name: string;
  title: string;
  avatar: string;
  tokenSymbol: string;
  tokenPrice: number;
  priceChange24h: number;
  marketCap: number;
  holders: number;
  verified: boolean;
  category: string;
  location: string;
  industry: string;
}

// Mock data for creators
const mockCreators: Creator[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    title: 'AI Research Scientist at MIT',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    tokenSymbol: 'SARAH',
    tokenPrice: 2.45,
    priceChange24h: 5.2,
    marketCap: 245000,
    holders: 428,
    verified: true,
    category: 'Tech',
    location: 'Cambridge, MA',
    industry: 'Technology'
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    title: 'Professional Athlete & Fitness Coach',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
    tokenSymbol: 'MARC',
    tokenPrice: 1.82,
    priceChange24h: -2.1,
    marketCap: 182000,
    holders: 315,
    verified: true,
    category: 'Sports',
    location: 'Los Angeles, CA',
    industry: 'Sports & Fitness'
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    title: 'Grammy-Nominated Music Producer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    tokenSymbol: 'EMLY',
    tokenPrice: 3.67,
    priceChange24h: 12.8,
    marketCap: 367000,
    holders: 892,
    verified: true,
    category: 'Music',
    location: 'Nashville, TN',
    industry: 'Entertainment'
  },
  {
    id: '4',
    name: 'David Kim',
    title: 'Startup Founder & Serial Entrepreneur',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    tokenSymbol: 'DKIM',
    tokenPrice: 4.12,
    priceChange24h: 8.3,
    marketCap: 412000,
    holders: 567,
    verified: true,
    category: 'Business',
    location: 'San Francisco, CA',
    industry: 'Business & Finance'
  },
  {
    id: '5',
    name: 'Lisa Patel',
    title: 'Harvard Law Graduate & Civil Rights Attorney',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
    tokenSymbol: 'LISA',
    tokenPrice: 5.50,
    priceChange24h: 15.6,
    marketCap: 550000,
    holders: 1243,
    verified: true,
    category: 'Law',
    location: 'Boston, MA',
    industry: 'Legal Services'
  },
  {
    id: '6',
    name: 'Alex Morgan',
    title: 'Blockchain Developer & Smart Contract Auditor',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    tokenSymbol: 'ALEX',
    tokenPrice: 3.25,
    priceChange24h: 7.4,
    marketCap: 325000,
    holders: 621,
    verified: true,
    category: 'Tech',
    location: 'Seattle, WA',
    industry: 'Technology'
  },
  {
    id: '7',
    name: 'Jessica Williams',
    title: 'Olympic Gold Medalist & Sports Commentator',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica',
    tokenSymbol: 'JESS',
    tokenPrice: 2.89,
    priceChange24h: -1.5,
    marketCap: 289000,
    holders: 445,
    verified: true,
    category: 'Sports',
    location: 'New York, NY',
    industry: 'Sports & Fitness'
  },
  {
    id: '8',
    name: 'Carlos Mendez',
    title: 'Billboard Chart-Topping DJ & Producer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
    tokenSymbol: 'CARL',
    tokenPrice: 4.56,
    priceChange24h: 18.2,
    marketCap: 456000,
    holders: 1089,
    verified: true,
    category: 'Music',
    location: 'Miami, FL',
    industry: 'Entertainment'
  },
  {
    id: '9',
    name: 'Rachel Green',
    title: 'Y Combinator Backed Founder & Tech CEO',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rachel',
    tokenSymbol: 'RACH',
    tokenPrice: 6.78,
    priceChange24h: 22.1,
    marketCap: 678000,
    holders: 1567,
    verified: true,
    category: 'Business',
    location: 'Palo Alto, CA',
    industry: 'Business & Finance'
  },
  {
    id: '10',
    name: 'Michael Chang',
    title: 'Supreme Court Clerk & Constitutional Law Expert',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    tokenSymbol: 'MICH',
    tokenPrice: 5.23,
    priceChange24h: 9.8,
    marketCap: 523000,
    holders: 892,
    verified: true,
    category: 'Law',
    location: 'Washington, DC',
    industry: 'Legal Services'
  },
  {
    id: '11',
    name: 'Nina Patel',
    title: 'Machine Learning Engineer at Google Brain',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nina',
    tokenSymbol: 'NINA',
    tokenPrice: 3.45,
    priceChange24h: 6.3,
    marketCap: 345000,
    holders: 723,
    verified: true,
    category: 'Tech',
    location: 'Mountain View, CA',
    industry: 'Technology'
  },
  {
    id: '12',
    name: 'Tom Brady Jr.',
    title: 'NFL Rising Star & Philanthropist',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tom',
    tokenSymbol: 'TOMB',
    tokenPrice: 7.12,
    priceChange24h: 14.6,
    marketCap: 712000,
    holders: 2134,
    verified: true,
    category: 'Sports',
    location: 'Tampa, FL',
    industry: 'Sports & Fitness'
  },
  {
    id: '13',
    name: 'Sofia Martinez',
    title: 'Latin Grammy Winner & Songwriter',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia',
    tokenSymbol: 'SOFI',
    tokenPrice: 4.89,
    priceChange24h: 11.2,
    marketCap: 489000,
    holders: 1345,
    verified: true,
    category: 'Music',
    location: 'Los Angeles, CA',
    industry: 'Entertainment'
  },
  {
    id: '14',
    name: 'James Wilson',
    title: 'Venture Capitalist & Angel Investor',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
    tokenSymbol: 'JAME',
    tokenPrice: 8.90,
    priceChange24h: -3.2,
    marketCap: 890000,
    holders: 1678,
    verified: true,
    category: 'Business',
    location: 'New York, NY',
    industry: 'Business & Finance'
  },
  {
    id: '15',
    name: 'Amanda Lee',
    title: 'Yale Law Professor & Human Rights Advocate',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amanda',
    tokenSymbol: 'AMAN',
    tokenPrice: 5.67,
    priceChange24h: 8.9,
    marketCap: 567000,
    holders: 1001,
    verified: true,
    category: 'Law',
    location: 'New Haven, CT',
    industry: 'Legal Services'
  },
];

export function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<Creator[]>(mockCreators);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);

  const categories = ['All', 'Tech', 'Sports', 'Music', 'Business', 'Law'];
  const locations = ['All', ...Array.from(new Set(mockCreators.map(c => c.location)))].sort();
  const industries = ['All', ...Array.from(new Set(mockCreators.map(c => c.industry)))].sort();

  useEffect(() => {
    // Filter creators based on search query
    let filtered = mockCreators;
    
    if (query) {
      filtered = filtered.filter(creator =>
        creator.name.toLowerCase().includes(query.toLowerCase()) ||
        creator.title.toLowerCase().includes(query.toLowerCase()) ||
        creator.tokenSymbol.toLowerCase().includes(query.toLowerCase()) ||
        creator.location.toLowerCase().includes(query.toLowerCase()) ||
        creator.industry.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    setResults(filtered);
  }, [query]);

  const filteredResults = results.filter(creator => {
    const categoryMatch = selectedCategory === 'All' || creator.category === selectedCategory;
    const locationMatch = selectedLocation === 'All' || creator.location === selectedLocation;
    const industryMatch = selectedIndustry === 'All' || creator.industry === selectedIndustry;
    return categoryMatch && locationMatch && industryMatch;
  });

  const activeFiltersCount = [
    selectedCategory !== 'All',
    selectedLocation !== 'All',
    selectedIndustry !== 'All'
  ].filter(Boolean).length;

  return (
    <div className="w-full">
      {/* Search Header */}
      <div className="mb-8 text-center">
        <h1 className="text-h1 mb-2">Search Creators</h1>
        <p className="text-subtle text-lg">
          {query ? `Results for "${query}"` : 'Discover talented creators to invest in'}
        </p>
      </div>

      {/* Filters Section */}
      <div className="mb-8 w-full max-w-4xl mx-auto">
        {/* Results Count - Centered Above Filters */}
        <div className="text-center text-sm text-[var(--text-muted)] mb-4">
          {filteredResults.length} creator{filteredResults.length !== 1 ? 's' : ''} found
        </div>

        {/* Filter Controls - Centered */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200 transition-colors"
          >
            <Filter size={16} />
            Filters
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 bg-[var(--primary)] text-white text-xs rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSelectedLocation('All');
                setSelectedIndustry('All');
              }}
              className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            >
              <X size={14} />
              Clear all
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="card p-6 mb-6 space-y-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      selectedCategory === category
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <MapPin size={16} />
                Location
              </label>
              <div className="flex flex-wrap gap-2">
                {locations.slice(0, 10).map(location => (
                  <button
                    key={location}
                    onClick={() => setSelectedLocation(location)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      selectedLocation === location
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                        : 'bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200 border-2 border-transparent'
                    }`}
                  >
                    {location}
                  </button>
                ))}
              </div>
            </div>

            {/* Industry Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Industry</label>
              <div className="flex flex-wrap gap-2">
                {industries.map(industry => (
                  <button
                    key={industry}
                    onClick={() => setSelectedIndustry(industry)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      selectedIndustry === industry
                        ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                        : 'bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200 border-2 border-transparent'
                    }`}
                  >
                    {industry}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Category Filter (Always Visible) - Centered */}
        <div className="flex items-center justify-center gap-2 flex-wrap pb-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid */}
      {filteredResults.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl mx-auto">
          {filteredResults.map(creator => (
            <Link
              key={creator.id}
              to={`/creator/${creator.id}`}
              className="card p-6 hover:shadow-lg transition-shadow cursor-pointer w-full"
            >
              {/* Creator Header */}
              <div className="flex items-start gap-4 mb-4">
                <img
                  src={creator.avatar}
                  alt={creator.name}
                  className="w-16 h-16 rounded-full border-2 border-gray-200"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg truncate">{creator.name}</h3>
                    {creator.verified && (
                      <span className="text-blue-500">✓</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                    {creator.title}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-[var(--text-muted)]">
                    <MapPin size={12} />
                    <span>{creator.location}</span>
                  </div>
                </div>
              </div>

              {/* Token Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">Token</span>
                  <span className="text-sm font-bold">${creator.tokenSymbol}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">${creator.tokenPrice}</span>
                  <span className={`text-sm font-semibold flex items-center gap-1 ${
                    creator.priceChange24h >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    <TrendingUp size={14} className={creator.priceChange24h < 0 ? 'rotate-180' : ''} />
                    {creator.priceChange24h > 0 ? '+' : ''}{creator.priceChange24h}%
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mb-1">
                    <DollarSign size={12} />
                    Market Cap
                  </div>
                  <div className="font-semibold text-sm">${(creator.marketCap / 1000).toFixed(0)}K</div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mb-1">
                    <Users size={12} />
                    Holders
                  </div>
                  <div className="font-semibold text-sm">{creator.holders.toLocaleString()}</div>
                </div>
              </div>

              {/* Category & Industry Badges */}
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
                  {creator.category}
                </span>
                <span className="inline-block px-3 py-1 bg-purple-100 text-purple-600 text-xs font-medium rounded-full">
                  {creator.industry}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <SearchIcon size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-[var(--text-main)] mb-2">No results found</h3>
          <p className="text-[var(--text-muted)]">
            Try adjusting your search or browse all creators
          </p>
        </div>
      )}
    </div>
  );
}
