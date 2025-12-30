import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Download,
  Flame,
  Activity,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePortfolio, useTrendingTokens, useTrades } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
  const { user } = useAuth();
  const { data: portfolio, isLoading: portfolioLoading, error: portfolioError } = usePortfolio(user?.id);
  const { data: trending, isLoading: trendingLoading } = useTrendingTokens(5);
  const { data: trades, isLoading: tradesLoading } = useTrades({ limit: 10 });

  if (portfolioLoading || trendingLoading || tradesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading your dashboard...</span>
      </div>
    );
  }

  if (portfolioError) {
    return (
      <div className="max-w-[1280px] mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-semibold mb-2">Failed to load portfolio data</h3>
          <p className="text-red-600 text-sm">Please check your connection and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-h1 mb-2">Your Dashboard</h1>
        <p className="text-subtle text-lg">Track your investments, monitor creator performance, and discover opportunities.</p>
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
                  <p className="text-xs text-[var(--text-muted)] mb-1">Total Portfolio Value</p>
                  <p className="text-2xl font-bold text-[var(--text-main)]">
                    ${portfolio?.total_value?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="pt-4 border-t border-emerald-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[var(--text-muted)]">24h Change</p>
                    <span className="text-sm font-bold text-emerald-600">+2.4%</span>
                  </div>
                </div>
              </div>

              {/* Your Investments */}
              <div className="flex-1 w-full">
                <h3 className="text-sm font-semibold text-[var(--text-main)] mb-4">Your Investments</h3>
                <div className="space-y-3">
                  {portfolio?.holdings?.slice(0, 4).map((holding: any) => (
                    <Link
                      key={holding.token_id}
                      to={`/creator/${holding.token_id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {holding.token_symbol?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[var(--text-main)] truncate">{holding.token_symbol}</p>
                          <p className="text-xs text-[var(--text-muted)] truncate">{holding.quantity} tokens</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-bold text-sm text-[var(--text-main)]">
                          ${holding.current_value?.toLocaleString()}
                        </p>
                        <p className={`text-xs font-medium ${holding.profit_loss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {holding.profit_loss >= 0 ? '+' : ''}{holding.profit_loss_percentage?.toFixed(1)}%
                        </p>
                      </div>
                    </Link>
                  ))}
                  {(!portfolio?.holdings || portfolio.holdings.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No investments yet</p>
                      <Link to="/search" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
                        Explore creators to invest
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 border-t border-[var(--border-color)] pt-6">
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Total Invested</p>
                <p className="text-lg font-bold">${portfolio?.total_invested?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Creators Backed</p>
                <p className="text-lg font-bold">{portfolio?.holdings?.length || 0}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Total Profit/Loss</p>
                <p className={`text-lg font-bold ${(portfolio?.total_profit_loss || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {(portfolio?.total_profit_loss || 0) >= 0 ? '+' : ''}${portfolio?.total_profit_loss?.toLocaleString() || '0'}
                </p>
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
                    <th className="px-6 py-3 font-medium">Token</th>
                    <th className="px-6 py-3 font-medium">Quantity</th>
                    <th className="px-6 py-3 font-medium">Price</th>
                    <th className="px-6 py-3 font-medium">Total</th>
                    <th className="px-6 py-3 font-medium text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {trades?.items?.slice(0, 10).map((trade: any, i: number) => (
                    <tr key={trade.id || i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-full ${trade.buyer_order_id ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {trade.buyer_order_id ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                          </div>
                          <span className="font-medium capitalize">{trade.buyer_order_id ? 'Buy' : 'Sell'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="badge badge-success">Completed</span>
                      </td>
                      <td className="px-6 py-4 font-medium">{trade.token_id}</td>
                      <td className="px-6 py-4">{trade.quantity}</td>
                      <td className="px-6 py-4 text-[var(--text-secondary)]">${trade.price}</td>
                      <td className="px-6 py-4 font-semibold">${trade.total_value?.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-[var(--text-muted)]">
                        {new Date(trade.executed_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                  {(!trades?.items || trades.items.length === 0) && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No transactions yet
                      </td>
                    </tr>
                  )}
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
              <Link to="/search" className="text-sm text-blue-600 hover:underline">View All</Link>
            </div>

            <div className="space-y-6">
              {trending?.map((token: any, index: number) => (
                <Link
                  key={token.id}
                  to={`/creator/${token.id}`}
                  className="group cursor-pointer block"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl font-bold text-gray-200 group-hover:text-[var(--primary)] transition-colors">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                          {token.symbol?.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[var(--text-main)] group-hover:text-blue-600 transition-colors">
                            {token.name}
                          </h4>
                        </div>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-tight mb-2">
                        {token.description || 'Creator token'}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className={`font-medium ${token.price_change_24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {token.price_change_24h >= 0 ? '+' : ''}{token.price_change_24h}%
                        </span>
                        <span className="text-[var(--text-muted)]">•</span>
                        <span className="text-[var(--text-muted)]">{token.holders} holders</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {(!trending || trending.length === 0) && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No trending creators yet
                </div>
              )}
            </div>

            <Link
              to="/search"
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
               <div className="text-4xl font-bold">Live</div>
               <div>
                 <p className="font-semibold text-blue-100">Active Now</p>
                 <p className="text-xs text-blue-200">Real-time trading</p>
               </div>
             </div>
             <div className="space-y-3 pt-4 border-t border-white/20">
               <div className="flex items-center justify-between text-sm">
                 <span className="text-blue-100">Your Portfolio</span>
                 <span className="font-bold">${portfolio?.total_value?.toLocaleString() || '0'}</span>
               </div>
               <div className="flex items-center justify-between text-sm">
                 <span className="text-blue-100">Total Holdings</span>
                 <span className="font-bold">{portfolio?.holdings?.length || 0}</span>
               </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
