import type { ReactNode } from 'react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, Menu, Activity, Briefcase, Rocket, Heart, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ConnectButton } from '@mysten/dapp-kit';

interface AppLayoutProps {
  children: ReactNode;
}

interface Notification {
  id: string;
  type: 'career' | 'project' | 'personal' | 'milestone';
  creatorName: string;
  creatorId: string;
  creatorAvatar: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Mock notifications data
  const notifications: Notification[] = [
    {
      id: '1',
      type: 'career',
      creatorName: 'Sarah Chen',
      creatorId: '1',
      creatorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      title: 'New Position at MIT',
      message: 'Sarah has been promoted to Senior Research Director at MIT CSAIL',
      time: '2 hours ago',
      read: false
    },
    {
      id: '2',
      type: 'project',
      creatorName: 'Alex Rodriguez',
      creatorId: '2',
      creatorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
      title: 'New Project Launch',
      message: 'Alex just launched a new AI startup focused on healthcare solutions',
      time: '5 hours ago',
      read: false
    },
    {
      id: '3',
      type: 'milestone',
      creatorName: 'Maria Garcia',
      creatorId: '3',
      creatorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
      title: 'Research Milestone',
      message: 'Maria published a groundbreaking paper on climate change mitigation',
      time: '1 day ago',
      read: true
    },
    {
      id: '4',
      type: 'personal',
      creatorName: 'David Kim',
      creatorId: '4',
      creatorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
      title: 'Personal Update',
      message: 'David shared an update about his recent speaking engagement at TechCrunch',
      time: '2 days ago',
      read: true
    }
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationsOpen]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'career':
        return <Briefcase size={16} className="text-blue-600" />;
      case 'project':
        return <Rocket size={16} className="text-purple-600" />;
      case 'personal':
        return <Heart size={16} className="text-pink-600" />;
      case 'milestone':
        return <TrendingUp size={16} className="text-emerald-600" />;
      default:
        return <Bell size={16} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)]">
      {/* Global Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[var(--border-color)] h-[var(--header-height)] w-full">
        <div className="h-full flex items-center justify-between flex-nowrap min-w-0 w-full px-6">
          
          {/* Left: Brand */}
          <div className="flex items-center flex-shrink-0">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white flex-shrink-0">
                <Activity size={20} strokeWidth={2.5} />
              </div>
              <span className="font-bold text-xl tracking-tight text-[var(--text-main)] whitespace-nowrap">HumanScale</span>
            </Link>
          </div>

          {/* Right: Navigation & Utilities */}
          <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
            <div className="flex items-center gap-1 flex-shrink-0">
              <Link to="/trending" className="btn-ghost font-medium whitespace-nowrap">Trending</Link>
              <div className="flex items-center bg-gray-100 rounded-full px-3 py-1.5 max-w-[200px] min-w-[150px] border border-transparent focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Search size={16} className="text-gray-400 flex-shrink-0" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  className="bg-transparent border-none outline-none text-sm ml-2 w-full text-[var(--text-main)] placeholder-gray-400 min-w-0 font-medium"
                />
              </div>
              <Link to="/dashboard" className="btn-ghost font-medium text-[var(--primary)] bg-blue-50 whitespace-nowrap">Dashboard</Link>
            </div>

            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="btn-ghost p-2 rounded-full relative flex-shrink-0"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                )}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[600px] overflow-hidden flex flex-col"
                  >
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>

                    {/* Notifications List */}
                    <div className="overflow-y-auto max-h-[500px]">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-[var(--text-muted)]">
                          <Bell size={32} className="mx-auto mb-2 opacity-50" />
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {notifications.map((notification) => (
                            <Link
                              key={notification.id}
                              to={`/creator/${notification.creatorId}`}
                              onClick={() => setNotificationsOpen(false)}
                              className={`block p-4 hover:bg-gray-50 transition-colors ${
                                !notification.read ? 'bg-blue-50/50' : ''
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <img
                                  src={notification.creatorAvatar}
                                  alt={notification.creatorName}
                                  className="w-10 h-10 rounded-full flex-shrink-0 border border-gray-200"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      {getNotificationIcon(notification.type)}
                                      <p className="font-semibold text-sm text-[var(--text-main)] truncate">
                                        {notification.creatorName}
                                      </p>
                                    </div>
                                    {!notification.read && (
                                      <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></span>
                                    )}
                                  </div>
                                  <p className="font-medium text-sm text-[var(--text-main)] mb-1">
                                    {notification.title}
                                  </p>
                                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-2">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-[var(--text-muted)]">
                                    {notification.time}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="p-3 border-t border-gray-200 text-center">
                        <Link
                          to="/notifications"
                          onClick={() => setNotificationsOpen(false)}
                          className="text-sm text-[var(--primary)] hover:underline font-medium"
                        >
                          View All Notifications
                        </Link>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ConnectButton />
            
            <button className="md:hidden btn-ghost p-2 flex-shrink-0">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 pb-20 container" style={{ paddingTop: '120px' }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
