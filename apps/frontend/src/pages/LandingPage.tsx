import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Users, Sparkles } from 'lucide-react';
import Lottie from 'lottie-react';
import { WalletConnectButton } from '../components/WalletConnect';

export function LandingPage() {
  const [showAnimation, setShowAnimation] = useState(true);
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    // Load the Lottie JSON file
    fetch('/Step Color.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => console.error('Error loading animation:', error));

    // Hide animation after 3 seconds
    const timer = setTimeout(() => {
      setShowAnimation(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-white via-blue-50 to-purple-50">
      {/* Hero Section */}
      <div className="min-h-screen flex items-center justify-center px-6 py-20">
        <div className="max-w-6xl mx-auto w-full text-center">

          {/* Animation and Hero Content Container - Same Position */}
          <div className="relative min-h-[60vh] flex items-center justify-center mb-20">

            {/* Lottie Animation - Absolute positioned in center */}
            <AnimatePresence mode="wait">
              {showAnimation && animationData && (
                <motion.div
                  key="animation"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1, ease: "easeInOut" }}
                  className="absolute inset-0 flex flex-col items-center justify-center"
                >
                  <div className="max-w-md mx-auto">
                    <Lottie
                      animationData={animationData}
                      loop={true}
                      autoplay={true}
                    />
                  </div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-xl text-gray-600 mt-6"
                  >
                    From one to many...
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Content - Absolute positioned in same center */}
            <AnimatePresence mode="wait">
              {!showAnimation && (
                <motion.div
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                  className="absolute inset-0 flex flex-col items-center justify-center"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-8">
                    <Sparkles size={16} />
                    The Future of Investment
                  </div>

                  <h1 className="text-6xl md:text-8xl font-bold text-gray-900 mb-8">
                    Invest in People,<br />
                    <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      Watch Them Grow
                    </span>
                  </h1>

                  <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                    From a single belief to unlimited potential. Invest in talented creators,
                    scientists, and innovators. Share in their success.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <WalletConnectButton />
                    <Link
                      to="/search"
                      className="px-10 py-5 bg-white text-gray-900 rounded-xl font-semibold text-xl border-2 border-gray-200 hover:border-blue-600 hover:shadow-xl transition-all"
                    >
                      Explore Creators
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Value Props - Always visible below */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: showAnimation ? 3.3 : 1, duration: 0.8 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20"
          >
            {/* Invest */}
            <div className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                <Users className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Invest</h3>
              <p className="text-gray-600 leading-relaxed">
                Support talented individuals across science, arts, sports, and business.
                Buy their tokens and become part of their journey.
              </p>
            </div>

            {/* Grow */}
            <div className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                <TrendingUp className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Grow</h3>
              <p className="text-gray-600 leading-relaxed">
                As creators achieve milestones and gain recognition, your investment grows.
                Share in their success, financially and emotionally.
              </p>
            </div>

            {/* Multiply */}
            <div className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Multiply</h3>
              <p className="text-gray-600 leading-relaxed">
                Build a diverse portfolio of human potential. From one investment to many,
                from potential to prosperity.
              </p>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: showAnimation ? 3.6 : 1.3, duration: 0.8 }}
            className="mt-20 pt-20 border-t border-gray-200"
          >
            <p className="text-sm text-gray-500 mb-8">Trusted by creators and investors worldwide</p>
            <div className="grid grid-cols-3 gap-12">
              <div>
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  $2.4M+
                </div>
                <div className="text-sm text-gray-600">Trading Volume</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  8.2K+
                </div>
                <div className="text-sm text-gray-600">Active Investors</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent mb-2">
                  500+
                </div>
                <div className="text-sm text-gray-600">Creators</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
