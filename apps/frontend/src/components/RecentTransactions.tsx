import { Clock, Download, ArrowUpRight } from 'lucide-react';
import { useTrades } from '../hooks/useApi';

export function RecentTransactions() {
  const { data: tradesData, isLoading, error } = useTrades({ limit: 10 });

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="text-center text-red-500">
          <p>Failed to load transactions</p>
        </div>
      </div>
    );
  }

  const trades = tradesData?.items || [];

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-h3 flex items-center gap-2">
          <Clock size={20} className="text-[var(--primary)]" />
          Recent Transactions
        </h2>
        <div className="flex gap-2">
          <button className="btn-ghost text-xs flex items-center gap-1">
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Clock size={48} className="mx-auto mb-4 opacity-50" />
          <p>No transactions yet</p>
          <p className="text-sm mt-2">Your trade history will appear here</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Asset</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Price</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Quantity</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Total</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const date = new Date(trade.executed_at);
                const statusColors = {
                  settled: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  settling: 'bg-blue-50 text-blue-700 border-blue-200',
                  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                  failed: 'bg-red-50 text-red-700 border-red-200',
                };

                return (
                  <tr key={trade.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <span className="flex items-center gap-1 text-sm font-medium">
                        {/* Determine if buy or sell based on order ID */}
                        <ArrowUpRight size={14} className="text-emerald-500" />
                        Buy
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-medium text-sm">TOKEN</span>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-sm">
                      ${trade.price.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right text-sm">
                      {trade.quantity.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-sm">
                      ${trade.total_value.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`badge text-xs ${statusColors[trade.settlement_status]}`}>
                        {trade.settlement_status.charAt(0).toUpperCase() + trade.settlement_status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-[var(--text-muted)]">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      <br />
                      <span className="text-xs">{date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {trades.length > 0 && tradesData && tradesData.total > tradesData.limit && (
        <div className="mt-6 text-center">
          <button className="btn-secondary">
            Load More ({tradesData.total - tradesData.limit} more)
          </button>
        </div>
      )}
    </div>
  );
}
