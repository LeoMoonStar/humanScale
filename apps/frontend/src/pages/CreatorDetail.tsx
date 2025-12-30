import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Video,
  ExternalLink,
  Github,
  Linkedin,
  Music,
  Globe,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  User,
  Coins,
  Award,
  Target,
  Lightbulb,
  Zap,
  BarChart3,
  TrendingDown
} from 'lucide-react';

// Mock creator data
const mockCreatorData = {
  '1': {
    id: '1',
    name: 'Sarah Chen',
    title: 'AI Research Scientist',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    banner: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=300&fit=crop',
    bio: 'Passionate AI researcher focused on making artificial intelligence more accessible and ethical. Currently leading groundbreaking research at MIT on neural networks and machine learning applications.',
    location: 'Cambridge, MA',
    email: 'sarah.chen@mit.edu',
    phone: '+1 (555) 123-4567',
    tokenSymbol: 'SARAH',
    tokenPrice: 2.45,
    priceChange24h: 5.2,
    marketCap: 245000,
    holders: 428,
    totalSupply: 100000,
    verified: true,
    tokenReleaseDate: '2024-01-01',
    experience: [
      {
        title: 'Senior AI Research Scientist',
        company: 'MIT Computer Science & Artificial Intelligence Lab',
        location: 'Cambridge, MA',
        duration: '2021 - Present',
        description: 'Leading research on ethical AI and neural network optimization. Published 15+ papers in top-tier conferences.'
      },
      {
        title: 'Machine Learning Engineer',
        company: 'Google Brain',
        location: 'Mountain View, CA',
        duration: '2018 - 2021',
        description: 'Developed ML models for natural language processing and computer vision applications.'
      },
      {
        title: 'Research Intern',
        company: 'OpenAI',
        location: 'San Francisco, CA',
        duration: '2017 - 2018',
        description: 'Contributed to reinforcement learning projects and published research on AI safety.'
      }
    ],
    education: [
      {
        degree: 'Ph.D. in Computer Science',
        school: 'Stanford University',
        year: '2018'
      },
      {
        degree: 'B.S. in Computer Science & Mathematics',
        school: 'MIT',
        year: '2014'
      }
    ],
    skills: ['Machine Learning', 'Neural Networks', 'Python', 'TensorFlow', 'Research', 'AI Ethics'],
    achievements: [
      'Published 20+ papers in top AI conferences (NeurIPS, ICML, ICLR)',
      'Recipient of the MIT Technology Review Innovator Under 35 Award',
      'Led team that improved model efficiency by 300%',
      'Guest lecturer at Stanford, Harvard, and UC Berkeley'
    ],
    futureGoals: 'Over the next 2-3 years, I plan to focus on democratizing AI by creating accessible tools for non-technical users. My goal is to bridge the gap between cutting-edge AI research and practical applications that can benefit society.',
    currentWork: 'Currently working on a novel approach to make large language models more energy-efficient and accessible. Our research aims to reduce computational costs by 80% while maintaining performance.',
    challenges: 'The biggest challenge I\'m tackling is ensuring AI systems remain ethical and unbiased as they scale. We\'re developing frameworks for transparent and accountable AI that can be adopted industry-wide.',
    interests: 'Looking to explore AI applications in healthcare, particularly early disease detection and personalized treatment plans. Also interested in AI-powered education tools.',
    socialLinks: {
      linkedin: 'https://linkedin.com/in/sarahchen',
      github: 'https://github.com/sarahchen',
      website: 'https://sarahchen.ai',
      twitter: 'https://twitter.com/sarahchen_ai'
    },
    customSections: [
      {
        type: 'video',
        title: 'About My Research',
        url: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      {
        type: 'iframe',
        title: 'My Spotify Playlist',
        url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M'
      }
    ],
    upcomingQA: {
      date: '2024-01-15',
      time: '2:00 PM EST',
      zoomLink: 'https://zoom.us/j/1234567890'
    },
    lastQAVideo: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    recentTransactions: [
      { type: 'Buy', user: 'Alice', amount: '100 SARAH', price: '$245', time: '5 mins ago' },
      { type: 'Sell', user: 'Bob', amount: '50 SARAH', price: '$122.50', time: '15 mins ago' },
      { type: 'Buy', user: 'Charlie', amount: '200 SARAH', price: '$490', time: '1 hour ago' },
      { type: 'Buy', user: 'David', amount: '75 SARAH', price: '$183.75', time: '2 hours ago' },
      { type: 'Sell', user: 'Emma', amount: '150 SARAH', price: '$367.50', time: '3 hours ago' }
    ]
  }
};

export function CreatorDetail() {
  const { id } = useParams<{ id: string }>();
  const creator = mockCreatorData[id as keyof typeof mockCreatorData];
  const [tradeTab, setTradeTab] = useState<'buy' | 'sell'>('buy');
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);

  if (!creator) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-4">Creator Not Found</h2>
        <p className="text-[var(--text-muted)]">The creator you're looking for doesn't exist.</p>
      </div>
    );
  }

  // Mock chart data
  const chartData = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    price: creator.tokenPrice + (Math.random() - 0.5) * 0.5
  }));

  // Calculate min/max for autoscaling
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  // Token page content (underneath layer)
  const tokenPageContent = (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2">{creator.tokenSymbol} Token</h1>
          <p className="text-[var(--text-muted)]">{creator.name}'s Creator Token</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts & Distribution */}
          <div className="lg:col-span-2 space-y-6">
            {/* Token Overview */}
            <div className="card p-6">
              <h2 className="text-h3 mb-6 flex items-center gap-2">
                <Coins size={20} className="text-[var(--primary)]" />
                Token Overview
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-[var(--text-muted)] mb-1">Current Price</div>
                  <div className="text-2xl font-bold">${creator.tokenPrice}</div>
                  <div className={`text-xs font-semibold flex items-center justify-center gap-1 mt-1 ${
                    creator.priceChange24h >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    <TrendingUp size={12} className={creator.priceChange24h < 0 ? 'rotate-180' : ''} />
                    {creator.priceChange24h > 0 ? '+' : ''}{creator.priceChange24h}%
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-[var(--text-muted)] mb-1">Market Cap</div>
                  <div className="text-2xl font-bold">${(creator.marketCap / 1000).toFixed(0)}K</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-[var(--text-muted)] mb-1">Holders</div>
                  <div className="text-2xl font-bold">{creator.holders}</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-[var(--text-muted)] mb-1">Total Supply</div>
                  <div className="text-2xl font-bold">{(creator.totalSupply / 1000).toFixed(0)}K</div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-[var(--text-muted)] mb-1">Token Released</div>
                <div className="font-semibold">{new Date(creator.tokenReleaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
            </div>

            {/* Price Chart */}
            <div className="card p-6">
              <h2 className="text-h3 mb-6">Price Performance (24h)</h2>
              <div className="h-64 flex items-end gap-1">
                {chartData.map((data, idx) => {
                  const heightPercent = priceRange > 0
                    ? ((data.price - minPrice) / priceRange) * 100
                    : 50;
                  return (
                    <div
                      key={idx}
                      className="flex-1 bg-emerald-500 rounded-t hover:bg-emerald-600 transition-colors cursor-pointer"
                      style={{ height: `${Math.max(heightPercent, 5)}%` }}
                      title={`${data.time}: $${data.price.toFixed(2)}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)]">
                <span>00:00</span>
                <span>12:00</span>
                <span>24:00</span>
              </div>
              <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)] font-semibold">
                <span>Low: ${minPrice.toFixed(2)}</span>
                <span>High: ${maxPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Distribution History */}
            <div className="card p-6">
              <h2 className="text-h3 mb-4">Holder Distribution</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-muted)]">Top 10 holders</span>
                  <span className="font-semibold">45%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-muted)]">Top 11-50 holders</span>
                  <span className="font-semibold">35%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '35%' }}></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-muted)]">Others</span>
                  <span className="font-semibold">20%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="card p-6">
              <h2 className="text-h3 mb-4">Recent Transactions</h2>
              <div className="space-y-3">
                {creator.recentTransactions.map((tx, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tx.type === 'Buy' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {tx.type === 'Buy' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{tx.user} {tx.type.toLowerCase()}s</div>
                        <div className="text-xs text-[var(--text-muted)]">{tx.time}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{tx.amount}</div>
                      <div className="text-xs text-[var(--text-muted)]">{tx.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Trading Module */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-6">
              <h2 className="text-h3 mb-6">Trade ${creator.tokenSymbol}</h2>

              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setTradeTab('buy')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    tradeTab === 'buy'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setTradeTab('sell')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    tradeTab === 'sell'
                      ? 'bg-rose-500 text-white'
                      : 'bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200'
                  }`}
                >
                  Sell
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={tradeTab === 'buy' ? buyAmount : sellAmount}
                      onChange={(e) => tradeTab === 'buy' ? setBuyAmount(e.target.value) : setSellAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute right-3 top-3 text-sm text-[var(--text-muted)]">
                      {creator.tokenSymbol}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[var(--text-muted)]">Price per token</span>
                    <span className="font-semibold">${creator.tokenPrice}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">Total</span>
                    <span className="font-bold">
                      ${(parseFloat(tradeTab === 'buy' ? buyAmount : sellAmount || '0') * creator.tokenPrice).toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${
                    tradeTab === 'buy'
                      ? 'bg-emerald-500 hover:bg-emerald-600'
                      : 'bg-rose-500 hover:bg-rose-600'
                  }`}
                >
                  {tradeTab === 'buy' ? 'Buy' : 'Sell'} ${creator.tokenSymbol}
                </button>

                <p className="text-xs text-[var(--text-muted)] text-center">
                  Connect your wallet to start trading
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Banner & Profile Header */}
      <div className="card overflow-hidden mb-6">
        <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 relative">
          <img src={creator.banner} alt="Banner" className="w-full h-full object-cover opacity-50" />
        </div>
        <div className="p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <img
              src={creator.avatar}
              alt={creator.name}
              className="w-32 h-32 rounded-full border-4 border-white -mt-20 shadow-lg"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{creator.name}</h1>
                {creator.verified && <span className="text-blue-500 text-2xl">✓</span>}
              </div>
              <p className="text-lg text-[var(--text-secondary)] mb-4">{creator.title}</p>
              <p className="text-[var(--text-muted)] max-w-3xl mb-4">{creator.bio}</p>

              <div className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
                {creator.location && (
                  <div className="flex items-center gap-1">
                    <MapPin size={16} />
                    {creator.location}
                  </div>
                )}
                {creator.email && (
                  <div className="flex items-center gap-1">
                    <Mail size={16} />
                    {creator.email}
                  </div>
                )}
              </div>

              {/* Social Links */}
              <div className="flex gap-3 mt-4">
                {creator.socialLinks.linkedin && (
                  <a href={creator.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="btn-ghost p-2">
                    <Linkedin size={20} />
                  </a>
                )}
                {creator.socialLinks.github && (
                  <a href={creator.socialLinks.github} target="_blank" rel="noopener noreferrer" className="btn-ghost p-2">
                    <Github size={20} />
                  </a>
                )}
                {creator.socialLinks.website && (
                  <a href={creator.socialLinks.website} target="_blank" rel="noopener noreferrer" className="btn-ghost p-2">
                    <Globe size={20} />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-500">${creator.tokenPrice}</div>
                <div className="text-xs text-[var(--text-muted)]">Token Price</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{creator.holders}</div>
                <div className="text-xs text-[var(--text-muted)]">Holders</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Flip Container */}
      <div className="relative" style={{ perspective: '2000px', minHeight: '100vh' }}>
        <div
          className="relative transition-transform duration-700 ease-in-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* Front Side - Experience Page */}
          <div
            className="w-full"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
            <div className="min-h-screen bg-white p-6 relative">
              {/* Peel Corner Button - Top Right */}
              <button
                onClick={() => setIsFlipped(true)}
                className="absolute top-0 right-0 z-20 group"
                style={{
                  width: '0',
                  height: '0',
                  borderStyle: 'solid',
                  borderWidth: '0 120px 120px 0',
                  borderColor: 'transparent #3b82f6 transparent transparent',
                  filter: 'drop-shadow(-2px 2px 4px rgba(0,0,0,0.2))',
                  cursor: 'pointer'
                }}
              >
                <div className="absolute -top-2 -right-24 w-24 h-24 flex items-start justify-end p-3">
                  <div className="flex flex-col items-center gap-1 text-white transform rotate-45">
                    <Coins size={20} />
                    <span className="text-xs font-bold whitespace-nowrap">TOKEN</span>
                  </div>
                </div>
              </button>

              <div className="max-w-6xl mx-auto space-y-6 pt-4">
              {/* Skills */}
              <div className="card p-6">
                <h2 className="text-h3 mb-4">Skills & Expertise</h2>
                <div className="flex flex-wrap gap-2">
                  {creator.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Achievements */}
              <div className="card p-6">
                <h2 className="text-h3 mb-4 flex items-center gap-2">
                  <Award size={20} className="text-[var(--primary)]" />
                  Achievements
                </h2>
                <ul className="space-y-3">
                  {creator.achievements.map((achievement, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-[var(--primary)] mt-2 flex-shrink-0"></div>
                      <span className="text-[var(--text-secondary)]">{achievement}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Experience Section */}
              <div className="card p-6">
                <h2 className="text-h3 mb-6 flex items-center gap-2">
                  <Briefcase size={20} className="text-[var(--primary)]" />
                  Work Experience
                </h2>
                <div className="space-y-6">
                  {creator.experience.map((exp, idx) => (
                    <div key={idx} className="border-l-2 border-gray-200 pl-4">
                      <h3 className="font-bold text-lg">{exp.title}</h3>
                      <div className="text-[var(--text-secondary)] font-medium">{exp.company}</div>
                      <div className="text-sm text-[var(--text-muted)] mb-2">{exp.duration} • {exp.location}</div>
                      <p className="text-sm text-[var(--text-muted)]">{exp.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6">
                <h2 className="text-h3 mb-4">Education</h2>
                <div className="space-y-4">
                  {creator.education.map((edu, idx) => (
                    <div key={idx}>
                      <h3 className="font-bold">{edu.degree}</h3>
                      <div className="text-[var(--text-secondary)]">{edu.school}</div>
                      <div className="text-sm text-[var(--text-muted)]">{edu.year}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Goals & Vision Section */}
              <div className="card p-6">
                <h2 className="text-h3 mb-4 flex items-center gap-2">
                  <Target size={20} className="text-[var(--primary)]" />
                  Future Goals (Next 2-3 Years)
                </h2>
                <p className="text-[var(--text-secondary)] leading-relaxed">{creator.futureGoals}</p>
              </div>

              <div className="card p-6">
                <h2 className="text-h3 mb-4 flex items-center gap-2">
                  <Zap size={20} className="text-[var(--primary)]" />
                  What I'm Working On
                </h2>
                <p className="text-[var(--text-secondary)] leading-relaxed">{creator.currentWork}</p>
              </div>

              <div className="card p-6">
                <h2 className="text-h3 mb-4 flex items-center gap-2">
                  <TrendingDown size={20} className="text-[var(--primary)]" />
                  Current Challenges
                </h2>
                <p className="text-[var(--text-secondary)] leading-relaxed">{creator.challenges}</p>
              </div>

              <div className="card p-6">
                <h2 className="text-h3 mb-4 flex items-center gap-2">
                  <Lightbulb size={20} className="text-[var(--primary)]" />
                  What I Want to Explore
                </h2>
                <p className="text-[var(--text-secondary)] leading-relaxed">{creator.interests}</p>
              </div>

              {/* Content Section */}
              {creator.customSections.map((section, idx) => (
                <div key={idx} className="card p-6">
                  <h2 className="text-h3 mb-4 flex items-center gap-2">
                    <Video size={20} className="text-[var(--primary)]" />
                    {section.title}
                  </h2>
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <iframe
                      src={section.url}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              ))}

              <div className="card p-6">
                <h2 className="text-h3 mb-6 flex items-center gap-2">
                  <Calendar size={20} className="text-[var(--primary)]" />
                  Q&A Sessions
                </h2>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                  <h3 className="font-bold mb-2">Next Q&A Session</h3>
                  <div className="text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>{new Date(creator.upcomingQA.date).toLocaleDateString()} at {creator.upcomingQA.time}</span>
                    </div>
                    <a
                      href={creator.upcomingQA.zoomLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary inline-flex items-center gap-2 text-sm"
                    >
                      <Video size={16} />
                      Join Zoom Meeting
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold mb-4">Last Q&A Replay</h3>
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <iframe
                      src={creator.lastQAVideo}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* Back Side - Token Page */}
          <div
            className="w-full absolute top-0 left-0"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="relative">
              {/* Floating Back Button - Bottom Right */}
              <button
                onClick={() => setIsFlipped(false)}
                className="fixed bottom-8 right-8 z-50 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 font-semibold hover:scale-105"
              >
                <User size={20} />
                <span>Back to Profile</span>
              </button>

              {tokenPageContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
