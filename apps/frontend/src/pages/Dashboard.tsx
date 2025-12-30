import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Wallet,
  Clock,
  ChevronRight,
  Download,
  Flame,
  Award,
  Star,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  return (
    <div className="max-w-[1280px] mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-h1 mb-2">Your Dashboard</h1>
        <p className="text-subtle text-lg">Track your investments, monitor creator performance, and discover opportunities.</p>
      </div>

      {/* Alert/Achievement Banner */}
      <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-lg p-4 flex items-center justify-between shadow-sm relative overflow-hidden group">
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-white p-2 rounded-full shadow-sm text-purple-600">
            <Award size={20} className="opacity-90" />
          </div>
          <div>
            <p className="font-semibold text-[var(--text-main)]">
              Sarah Chen just achieved Top 1% in AI Research - Your investment is up 12.5%!
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
              <span>125K Community Reactions</span>
              <span>•</span>
              <span>2.4K New Investors</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <span className="badge badge-success flex items-center gap-1">
            <TrendingUp size={12} />
            +12.5%
          </span>
          <Link to="/creator/1" className="text-blue-600 font-medium text-sm hover:underline flex items-center gap-1">
            View Profile <ChevronRight size={14} />
          </Link>
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
              {/* Balance Change Display with Chart */}
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

              {/* Your Investments */}
              <div className="flex-1 w-full">
                <h3 className="text-sm font-semibold text-[var(--text-main)] mb-4">Your Investments</h3>
                <div className="space-y-3">
                  {[
                    {
                      id: '1',
                      name: 'Sarah Chen',
                      title: 'AI Research Scientist',
                      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
                      tokenSymbol: 'SARAH',
                      tokenAmount: '200',
                      value: '$4,980',
                      change: '+12.5%',
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
                      change: '+8.2%',
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
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <img
                          src={creator.avatar}
                          alt={creator.name}
                          className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[var(--text-main)] truncate">{creator.name}</p>
                          <p className="text-xs text-[var(--text-muted)] truncate">{creator.title}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-bold text-sm text-[var(--text-main)]">{creator.value}</p>
                        <p className={`text-xs font-medium ${creator.changePositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {creator.change}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 border-t border-[var(--border-color)] pt-6">
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Total Invested</p>
                <p className="text-lg font-bold">$12,450</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Creators Backed</p>
                <p className="text-lg font-bold">4</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Avg. Return</p>
                <p className="text-lg font-bold text-emerald-600">+7.5%</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Best Performer</p>
                <p className="text-lg font-bold text-emerald-600">+12.5%</p>
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
                    <th className="px-6 py-3 font-medium">Creator</th>
                    <th className="px-6 py-3 font-medium">Tokens</th>
                    <th className="px-6 py-3 font-medium">Price</th>
                    <th className="px-6 py-3 font-medium">Total</th>
                    <th className="px-6 py-3 font-medium text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {[
                    { type: 'Buy', status: 'Completed', creator: 'Sarah Chen', tokens: '50', price: '$24.90', total: '$1,245', time: '2 mins ago' },
                    { type: 'Sell', status: 'Pending', creator: 'Alex Rodriguez', tokens: '20', price: '$24.90', total: '$498', time: '15 mins ago' },
                    { type: 'Buy', status: 'Failed', creator: 'Maria Garcia', tokens: '30', price: '$25.00', total: '$750', time: '1 hour ago' },
                    { type: 'Buy', status: 'Completed', creator: 'David Kim', tokens: '25', price: '$24.70', total: '$617.50', time: '5 hours ago' },
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
                      <td className="px-6 py-4 font-medium">{tx.creator}</td>
                      <td className="px-6 py-4">{tx.tokens}</td>
                      <td className="px-6 py-4 text-[var(--text-secondary)]">{tx.price}</td>
                      <td className="px-6 py-4 font-semibold">{tx.total}</td>
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
                <Flame size={20} className="text-orange-500" />
                Trending Creators
              </h3>
              <Link to="/explore" className="text-sm text-blue-600 hover:underline">View All</Link>
            </div>

            <div className="space-y-6">
              {[
                {
                  rank: 1,
                  name: "Sarah Chen",
                  title: "AI Research Scientist - Published breakthrough paper on neural networks",
                  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
                  id: "1",
                  tags: ["Tech", "AI"],
                  sentiment: "Bullish",
                  change: "+12.5%",
                  investors: "2.4K"
                },
                {
                  rank: 2,
                  name: "Marcus Johnson",
                  title: "Olympic Athlete - Won gold medal in 100m sprint",
                  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
                  id: "5",
                  tags: ["Sports", "Olympics"],
                  sentiment: "Bullish",
                  change: "+18.2%",
                  investors: "1.8K"
                },
                {
                  rank: 3,
                  name: "Elena Rodriguez",
                  title: "Climate Activist - Led successful policy change initiative",
                  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena",
                  id: "6",
                  tags: ["Environment", "Policy"],
                  sentiment: "Bullish",
                  change: "+9.7%",
                  investors: "1.2K"
                },
                {
                  rank: 4,
                  name: "Alex Rodriguez",
                  title: "Tech Entrepreneur - Raised Series B funding at $100M valuation",
                  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
                  id: "2",
                  tags: ["Startup", "Tech"],
                  sentiment: "Bullish",
                  change: "+8.2%",
                  investors: "950"
                },
                {
                  rank: 5,
                  name: "David Kim",
                  title: "Software Engineer - Open source project reached 10K GitHub stars",
                  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
                  id: "4",
                  tags: ["OpenSource", "Dev"],
                  sentiment: "Bullish",
                  change: "+6.3%",
                  investors: "720"
                },
              ].map((creator) => (
                <Link
                  key={creator.rank}
                  to={`/creator/${creator.id}`}
                  className="group cursor-pointer block"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl font-bold text-gray-200 group-hover:text-[var(--primary)] transition-colors">
                      {creator.rank}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <img
                          src={creator.avatar}
                          alt={creator.name}
                          className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                        />
                        <div>
                          <h4 className="font-bold text-sm text-[var(--text-main)] group-hover:text-blue-600 transition-colors">
                            {creator.name}
                          </h4>
                        </div>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-tight mb-2">
                        {creator.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {creator.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-100 text-xs rounded text-[var(--text-secondary)]">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-medium text-emerald-500">{creator.change}</span>
                        <span className="text-[var(--text-muted)]">•</span>
                        <span className="text-[var(--text-muted)]">{creator.investors} investors</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <Link
              to="/explore"
              className="w-full btn-secondary mt-6 flex items-center justify-center gap-2"
            >
              Discover More Creators <ChevronRight size={16} />
            </Link>
          </div>

          <div className="card p-6 bg-gradient-to-br from-blue-600 to-purple-600 text-white border-0">
             <div className="flex items-center gap-2 mb-2">
               <Activity size={20} />
               <h3 className="font-bold">Platform Activity</h3>
             </div>
             <div className="flex items-center gap-4 mb-4">
               <div className="text-4xl font-bold">8.2K</div>
               <div>
                 <p className="font-semibold text-blue-100">Active Investors</p>
                 <p className="text-xs text-blue-200">Last 24 hours</p>
               </div>
             </div>
             <div className="space-y-3 pt-4 border-t border-white/20">
               <div className="flex items-center justify-between text-sm">
                 <span className="text-blue-100">Total Volume</span>
                 <span className="font-bold">$2.4M</span>
               </div>
               <div className="flex items-center justify-between text-sm">
                 <span className="text-blue-100">New Creators</span>
                 <span className="font-bold">+127</span>
               </div>
               <div className="flex items-center justify-between text-sm">
                 <span className="text-blue-100">Avg. Token Price</span>
                 <span className="font-bold">$24.82</span>
               </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
