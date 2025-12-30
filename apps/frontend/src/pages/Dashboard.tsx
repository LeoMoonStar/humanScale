import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Wallet,
  Clock,
  ChevronRight,
  X,
  Download,
  Flame
} from 'lucide-react';

export function Dashboard() {
  return (
    <div className="max-w-[1280px] mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-h1 mb-2">Trading Dashboard</h1>
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
              {/* Donut Chart Visual */}
              <div className="relative w-48 h-48 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {/* Background Circle */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="12" />
                  {/* Segments (Simulated) */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f97316" strokeWidth="12" strokeDasharray="100 251" strokeDashoffset="0" className="opacity-90 hover:opacity-100 transition-opacity" /> {/* BTC ~40% */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="12" strokeDasharray="75 251" strokeDashoffset="-100" className="opacity-90 hover:opacity-100 transition-opacity" /> {/* ETH ~30% */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="12" strokeDasharray="50 251" strokeDashoffset="-175" className="opacity-90 hover:opacity-100 transition-opacity" /> {/* Others ~20% */}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm text-[var(--text-muted)]">Total Value</span>
                  <span className="text-2xl font-bold text-[var(--text-main)]">$12,450</span>
                  <span className="text-xs text-emerald-500 font-medium flex items-center mt-1">
                    <ArrowUpRight size={12} /> +2.4%
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="font-medium text-sm">Bitcoin</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">0.45 BTC</p>
                    <p className="text-xs text-[var(--text-muted)]">$4,980</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="font-medium text-sm">Ethereum</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">2.1 ETH</p>
                    <p className="text-xs text-[var(--text-muted)]">$3,735</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="font-medium text-sm">USDT</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">2,500 USDT</p>
                    <p className="text-xs text-[var(--text-muted)]">$2,500</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    <span className="font-medium text-sm">Others</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">-</p>
                    <p className="text-xs text-[var(--text-muted)]">$1,235</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 border-t border-[var(--border-color)] pt-6">
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">24h Volume</p>
                <p className="text-lg font-bold">$1.2M</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Total Trades</p>
                <p className="text-lg font-bold">142</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Win Rate</p>
                <p className="text-lg font-bold text-emerald-600">68%</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Avg. Profit</p>
                <p className="text-lg font-bold text-emerald-600">+$240</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Following List */}
            <div className="card p-6">
              <h3 className="text-h3 mb-4">Following</h3>
              <div className="space-y-3">
                {[
                  { sym: 'BTC', name: 'Bitcoin', price: '$42,390', change: '+1.2%', up: true },
                  { sym: 'ETH', name: 'Ethereum', price: '$2,240', change: '-0.8%', up: false },
                  { sym: 'SOL', name: 'Solana', price: '$98.50', change: '+4.5%', up: true },
                  { sym: 'BNB', name: 'Binance', price: '$312.00', change: '-0.2%', up: false },
                ].map((coin) => (
                  <div key={coin.sym} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${coin.sym === 'BTC' ? 'bg-orange-500' : coin.sym === 'ETH' ? 'bg-blue-500' : coin.sym === 'SOL' ? 'bg-purple-500' : 'bg-yellow-500'}`}>
                        {coin.sym[0]}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{coin.sym}</p>
                        <p className="text-xs text-[var(--text-muted)]">{coin.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{coin.price}</p>
                      <p className={`text-xs font-medium ${coin.up ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {coin.change}
                      </p>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-xs btn-primary py-1 px-3 h-7">Trade</button>
                      <button className="ml-1 p-1 text-gray-400 hover:text-red-500"><X size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Empty block for layout balance or ad could go here, extending Transactions mainly */}
             <div className="card p-6 flex flex-col justify-center items-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white relative overflow-hidden">
                <div className="relative z-10 text-center">
                   <h3 className="text-2xl font-bold mb-2">Pro Analytics</h3>
                   <p className="text-indigo-100 mb-6 text-sm">Unlock advanced charts and real-time data integration.</p>
                   <button className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-bold text-sm hover:shadow-lg transition-shadow">Upgrade Now</button>
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl"></div>
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
                { rank: 1, title: "Bitcoin ETF Approval Likely This Week", tags: ["Regulation", "Crypto"], sentiment: "Bullish", views: "125K" },
                { rank: 2, title: "Ethereum Layer 2 TVL Hits All-Time High", tags: ["DeFi", "L2"], sentiment: "Bullish", views: "98K" },
                { rank: 3, title: "Stablecoin Regulation Talks in EU", tags: ["Regulation", "Euro"], sentiment: "Neutral", views: "82K" },
                { rank: 4, title: "New AI Token Surges 500% Overnight", tags: ["AI", "Memecoin"], sentiment: "High Risk", views: "150K" },
                { rank: 5, title: "Exchange Outage Reports Increasing", tags: ["Infra", "Alert"], sentiment: "Bearish", views: "45K" },
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
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                        <span className={`font-medium ${topic.sentiment === 'Bullish' ? 'text-emerald-500' : topic.sentiment === 'Bearish' ? 'text-rose-500' : 'text-amber-500'}`}>
                          {topic.sentiment}
                        </span>
                        <span>•</span>
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

          <div className="card p-6 bg-gray-900 text-white border-gray-800">
             <h3 className="font-bold mb-2">Market Sentiment</h3>
             <div className="flex items-center gap-4 mb-4">
               <div className="text-4xl font-bold text-emerald-400">72</div>
               <div>
                 <p className="font-semibold text-emerald-100">Greed</p>
                 <p className="text-xs text-gray-400">Previous: 68</p>
               </div>
             </div>
             <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
               <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 w-[72%]"></div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
