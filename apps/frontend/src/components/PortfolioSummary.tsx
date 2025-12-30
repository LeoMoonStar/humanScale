import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { usePortfolio } from '../hooks/useApi';

export function PortfolioSummary() {
  const { data: portfolio, isLoading, error } = usePortfolio();

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="text-center text-red-500">
          <p>Failed to load portfolio data</p>
          <p className="text-sm text-gray-500 mt-2">Please try again later</p>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="card p-6">
        <div className="text-center text-gray-500">
          <Wallet size={48} className="mx-auto mb-4 opacity-50" />
          <p>No portfolio data available</p>
          <p className="text-sm mt-2">Start trading to build your portfolio</p>
        </div>
      </div>
    );
  }

  const isProfitable = portfolio.profit_loss_percentage >= 0;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-h3 flex items-center gap-2">
          <Wallet size={20} className="text-[var(--primary)]" />
          Portfolio Summary
        </h2>
        <button className="btn-ghost text-xs">View Analytics</button>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
        {/* Portfolio Value */}
        <div className="relative w-48 h-48 flex-shrink-0">
          <div className="absolute inset-0 flex flex-col items-center justify-center border-4 border-gray-100 rounded-full">
            <span className="text-sm text-[var(--text-muted)]">Total Value</span>
            <span className="text-2xl font-bold text-[var(--text-main)]">
              ${portfolio.total_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-xs font-medium flex items-center mt-1 ${isProfitable ? 'text-emerald-500' : 'text-red-500'}`}>
              {isProfitable ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {isProfitable ? '+' : ''}{portfolio.profit_loss_percentage.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Holdings Grid */}
        <div className="flex-1 grid grid-cols-2 gap-4 w-full">
          {portfolio.holdings.slice(0, 4).map((holding) => {
            const holdingProfitable = holding.profit_loss_percentage >= 0;
            return (
              <div
                key={holding.token_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2">
                  {holding.token_image_url && (
                    <img
                      src={holding.token_image_url}
                      alt={holding.token_symbol}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span className="font-medium text-sm">{holding.token_symbol}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{holding.quantity.toLocaleString()}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    ${holding.total_value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </p>
                  <p className={`text-xs font-medium ${holdingProfitable ? 'text-emerald-500' : 'text-red-500'}`}>
                    {holdingProfitable ? '+' : ''}{holding.profit_loss_percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 pt-6 border-t border-gray-100">
        <div className="text-center">
          <p className="text-xs text-[var(--text-muted)] mb-1">Total Invested</p>
          <p className="font-bold text-sm">
            ${portfolio.total_invested.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--text-muted)] mb-1">Current Value</p>
          <p className="font-bold text-sm">
            ${portfolio.total_value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--text-muted)] mb-1">P&L</p>
          <p className={`font-bold text-sm ${isProfitable ? 'text-emerald-500' : 'text-red-500'}`}>
            {isProfitable ? '+' : ''}${portfolio.total_profit_loss.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--text-muted)] mb-1">Assets</p>
          <p className="font-bold text-sm">{portfolio.holdings.length}</p>
        </div>
      </div>
    </div>
  );
}
