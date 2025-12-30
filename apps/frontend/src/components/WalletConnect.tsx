import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function WalletConnectButton() {
  const currentAccount = useCurrentAccount();
  const { isAuthenticated, login } = useAuth();
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);

  const handleConnectClick = async () => {
    // Check if Sui wallet is installed
    if (typeof window === 'undefined') return;

    const hasSuiWallet = !!(window as any).suiWallet;

    if (!hasSuiWallet) {
      setShowWalletPrompt(true);
      return;
    }

    // If wallet is installed, proceed with login
    if (!isAuthenticated && currentAccount) {
      try {
        await login();
      } catch (error) {
        console.error('Login failed:', error);
      }
    }
  };

  if (isAuthenticated) {
    return (
      <Link
        to="/dashboard"
        className="px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-3 group"
      >
        Go to Dashboard
        <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={handleConnectClick}
        className="px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-3 group"
      >
        Connect Wallet
        <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
      </button>

      {/* Wallet Not Found Modal */}
      {showWalletPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full relative animate-fade-in">
            <button
              onClick={() => setShowWalletPrompt(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>

            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-center mb-2">Sui Wallet Not Found</h2>
              <p className="text-gray-600 text-center">
                To connect to PeopleCoin, you need to install a Sui wallet browser extension.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <a
                href="https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-between group"
              >
                <span>Install Sui Wallet (Chrome)</span>
                <ExternalLink size={20} className="group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href="https://sui.io/wallet"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-6 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl font-semibold hover:border-blue-600 transition-all flex items-center justify-between group"
              >
                <span>Other Wallet Options</span>
                <ExternalLink size={20} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>After installing:</strong> Refresh this page and click "Connect Wallet" again.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
