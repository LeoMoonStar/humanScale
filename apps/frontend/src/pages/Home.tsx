import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Wallet,
  Clock,
  MoreHorizontal,
  ChevronRight,
  X,
  Download,
  Flame
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Mapping of people names to creator IDs (if they have a creator coin on the platform)
const creatorMap: Record<string, string | undefined> = {
  'Sarah Chen': '1',
  'Elon Musk': undefined, // Not on platform
  'Taylor Swift': undefined, // Not on platform
  'Sam Altman': undefined, // Not on platform
  'Jensen Huang': undefined, // Not on platform
  'Christopher Nolan': undefined, // Not on platform
};

export function Home() {
  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <p className="text-subtle text-lg">Monitor markets, execute trades, and stay informed with trending insights.</p>
      </div>

      {/* Alert/News Banner */}
      <div className="mb-8 bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center justify-between shadow-sm relative overflow-hidden group">
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-white p-2 rounded-full shadow-sm text-orange-500">
            <Flame size={20} fill="currentColor" className="opacity-90" />
          </div>
          <div>
            <p className="font-semibold text-[var(--text-main)]">
              Top 1 from Harvard Law, ready to enter the Top law firm in Manhattan
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
              <span>12.5K Views</span>
              <span>•</span>
              <span>342 Comments</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <span className="badge badge-success flex items-center gap-1">
            <TrendingUp size={12} />
            +5.3%
          </span>
          <button className="text-blue-600 font-medium text-sm hover:underline flex items-center gap-1">
            Read More <ChevronRight size={14} />
          </button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-white/40 to-transparent pointer-events-none"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Content Area (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Portfolio Summary */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-h3 flex items-center gap-2">
                <Wallet size={20} className="text-[var(--primary)]" />
                Portfolio Summary
              </h2>
              <button className="btn-ghost text-xs">View Analytics</button>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
              {/* Balance Change Display */}
              <div className="w-full md:w-64 flex-shrink-0 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl p-6 border border-emerald-100">
                <div className="mb-4">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Previous Balance</p>
                  <p className="text-lg font-semibold text-[var(--text-secondary)]">$12,150</p>
                </div>
                <div className="mb-4">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Current Balance</p>
                  <p className="text-2xl font-bold text-[var(--text-main)]">$12,450</p>
                </div>
                <div className="pt-4 border-t border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-[var(--text-muted)]">24h Change</p>
                    <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                      <ArrowUpRight size={14} /> +$300
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[var(--text-muted)]">Change %</p>
                    <span className="text-sm font-bold text-emerald-600">+2.4%</span>
                  </div>
                </div>
              </div>

              {/* Balance Chart */}
              <div className="flex-1 w-full">
                {(() => {
                  // Mock 24h balance data (hourly data points)
                  const chartData = [
                    12150, 12180, 12165, 12200, 12185, 12220, 12210, 12240,
                    12265, 12250, 12280, 12295, 12270, 12310, 12290, 12330,
                    12345, 12320, 12360, 12380, 12370, 12410, 12430, 12450
                  ];

                  const min = Math.min(...chartData);
                  const max = Math.max(...chartData);
                  const range = max - min;
                  const padding = range * 0.1;

                  // SVG dimensions
                  const width = 600;
                  const height = 200;
                  const chartWidth = width - 40;
                  const chartHeight = height - 40;

                  // Create path
                  const points = chartData.map((value, index) => {
                    const x = (index / (chartData.length - 1)) * chartWidth + 20;
                    const y = chartHeight - ((value - min + padding) / (range + padding * 2)) * chartHeight + 20;
                    return `${x},${y}`;
                  });

                  const pathD = `M ${points.join(' L ')}`;

                  // Create area path (for gradient fill)
                  const areaPathD = `${pathD} L ${chartWidth + 20},${chartHeight + 20} L 20,${chartHeight + 20} Z`;

                  return (
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-[var(--text-main)]">Portfolio Performance</h4>
                        <div className="flex items-center gap-1">
                          {['1D', '1W', '1M', '1Y', 'ALL'].map((period) => (
                            <button
                              key={period}
                              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                period === '1D'
                                  ? 'bg-blue-100 text-[var(--primary)]'
                                  : 'text-[var(--text-muted)] hover:bg-gray-100'
                              }`}
                            >
                              {period}
                            </button>
                          ))}
                        </div>
                      </div>
                      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                        <defs>
                          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        {[0, 1, 2, 3, 4].map((i) => (
                          <line
                            key={i}
                            x1="20"
                            y1={20 + (chartHeight / 4) * i}
                            x2={chartWidth + 20}
                            y2={20 + (chartHeight / 4) * i}
                            stroke="#f3f4f6"
                            strokeWidth="1"
                          />
                        ))}

                        {/* Area fill */}
                        <path
                          d={areaPathD}
                          fill="url(#chartGradient)"
                        />

                        {/* Line */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Dots on data points */}
                        {points.slice(0, 1).concat(points.slice(-1)).map((point, idx) => {
                          const [x, y] = point.split(',').map(Number);
                          return (
                            <circle
                              key={idx}
                              cx={x}
                              cy={y}
                              r="4"
                              fill="white"
                              stroke="#10b981"
                              strokeWidth="2"
                            />
                          );
                        })}
                      </svg>
                      <div className="flex items-center justify-between mt-2 text-xs text-[var(--text-muted)]">
                        <span>12:00 AM</span>
                        <span>Now</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Your Investments */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-main)] mb-4">Your Investments</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    id: '1',
                    name: 'Sarah Chen',
                    title: 'AI Research Scientist',
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
                    tokenSymbol: 'SARAH',
                    tokenAmount: '200',
                    value: '$4,980',
                    change: '+5.2%',
                    changePositive: true
                  },
                  {
                    id: '2',
                    name: 'Alex Rodriguez',
                    title: 'Tech Entrepreneur',
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
                    tokenSymbol: 'ALEX',
                    tokenAmount: '150',
                    value: '$3,735',
                    change: '+2.8%',
                    changePositive: true
                  },
                  {
                    id: '3',
                    name: 'Maria Garcia',
                    title: 'Climate Scientist',
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
                    tokenSymbol: 'MARIA',
                    tokenAmount: '100',
                    value: '$2,500',
                    change: '-1.2%',
                    changePositive: false
                  },
                  {
                    id: '4',
                    name: 'David Kim',
                    title: 'Software Engineer',
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
                    tokenSymbol: 'DAVID',
                    tokenAmount: '50',
                    value: '$1,235',
                    change: '+3.5%',
                    changePositive: true
                  }
                ].map((creator) => (
                  <Link
                    key={creator.id}
                    to={`/creator/${creator.id}`}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 hover:border-blue-200 transition-all group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <img
                        src={creator.avatar}
                        alt={creator.name}
                        className="w-12 h-12 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[var(--text-main)] truncate">{creator.name}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{creator.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-medium text-[var(--text-secondary)]">{creator.tokenAmount} {creator.tokenSymbol}</span>
                          <span className={`text-xs font-medium ${creator.changePositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {creator.change}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-bold text-sm text-[var(--text-main)]">{creator.value}</p>
                      <ChevronRight size={16} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>


          {/* Recent Transactions */}
          <div className="card">
            <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="text-h3">Recent Transactions</h3>
              <button className="btn-ghost text-sm flex items-center gap-1">
                <Download size={14} /> Export History
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Asset</th>
                    <th className="px-6 py-3 font-medium">Amount</th>
                    <th className="px-6 py-3 font-medium">Price</th>
                    <th className="px-6 py-3 font-medium">Fees</th>
                    <th className="px-6 py-3 font-medium text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {[
                    { type: 'Buy', status: 'Completed', asset: 'BTC', amount: '0.045', price: '$42,150', fees: '$12.50', time: '2 mins ago' },
                    { type: 'Sell', status: 'Pending', asset: 'ETH', amount: '1.20', price: '$2,235', fees: '$4.20', time: '15 mins ago' },
                    { type: 'Buy', status: 'Failed', asset: 'SOL', amount: '150.00', price: '$98.20', fees: '$0.00', time: '1 hour ago' },
                    { type: 'Buy', status: 'Completed', asset: 'USDT', amount: '5,000', price: '$1.00', fees: '$1.00', time: '5 hours ago' },
                  ].map((tx, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-full ${tx.type === 'Buy' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {tx.type === 'Buy' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                          </div>
                          <span className="font-medium">{tx.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge ${tx.status === 'Completed' ? 'badge-success' : tx.status === 'Pending' ? 'bg-amber-100 text-amber-600' : 'badge-danger'}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">{tx.asset}</td>
                      <td className="px-6 py-4">{tx.amount}</td>
                      <td className="px-6 py-4 text-[var(--text-secondary)]">{tx.price}</td>
                      <td className="px-6 py-4 text-[var(--text-muted)]">{tx.fees}</td>
                      <td className="px-6 py-4 text-right text-[var(--text-muted)]">{tx.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-[var(--border-color)] text-center">
              <button className="btn-ghost text-sm">View All Transactions</button>
            </div>
          </div>

        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <TrendingUp size={20} className="text-[var(--primary)]" />
                Trending Topics
              </h3>
              <button className="text-sm text-blue-600 hover:underline">View All</button>
            </div>

            <div className="space-y-6">
              {[
                { rank: 1, title: "Sarah Chen's AI Research Team Breaks Performance Records", tags: ["Tech", "AI"], people: ["Sarah Chen"], sentiment: "Bullish", views: "125K" },
                { rank: 2, title: "Taylor Swift Announces New Album Release Date", tags: ["Entertainment", "Music"], people: ["Taylor Swift"], sentiment: "Bullish", views: "98K" },
                { rank: 3, title: "Presidential Debate Features Key Policy Discussions", tags: ["Politics", "Election"], people: [], sentiment: "Neutral", views: "82K" },
                { rank: 4, title: "Christopher Nolan's Latest Film Breaks Box Office Records", tags: ["Entertainment", "Movies"], people: ["Christopher Nolan"], sentiment: "Bullish", views: "150K" },
                { rank: 5, title: "Jensen Huang Unveils Revolutionary AI Chip", tags: ["Tech", "Innovation"], people: ["Jensen Huang"], sentiment: "Bullish", views: "45K" },
              ].map((topic) => (
                <div key={topic.rank} className="group cursor-pointer">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl font-bold text-gray-200 group-hover:text-[var(--primary)] transition-colors">
                      {topic.rank}
                    </span>
                    <div>
                      <h4 className="font-semibold text-[var(--text-main)] group-hover:text-blue-600 transition-colors leading-tight mb-2">
                        {topic.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {topic.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-100 text-xs rounded text-[var(--text-secondary)]">#{tag}</span>
                        ))}
                        {topic.people?.map(person => {
                          const creatorId = creatorMap[person];
                          const hasCreatorCoin = creatorId !== null && creatorId !== undefined;
                          
                          if (hasCreatorCoin) {
                            return (
                              <Link
                                key={person}
                                to={`/creator/${creatorId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="px-2 py-0.5 bg-blue-100 text-[var(--primary)] text-xs rounded font-medium hover:bg-blue-200 transition-colors border border-blue-200"
                              >
                                @{person}
                              </Link>
                            );
                          }
                          return (
                            <Link
                              key={person}
                              to={`/invite/${encodeURIComponent(person)}`}
                              onClick={(e) => e.stopPropagation()}
                              className="px-2 py-0.5 bg-gray-100 text-xs rounded text-[var(--text-secondary)] hover:bg-gray-200 transition-colors cursor-pointer"
                            >
                              @{person}
                            </Link>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> 2h ago
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full btn-secondary mt-6 flex items-center justify-center gap-2">
              Explore More Topics <ChevronRight size={16} />
            </button>
          </div>

        </div>

      </div>
    </>
  );
}
