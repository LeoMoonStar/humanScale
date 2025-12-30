import { useState } from 'react';
import {
  User,
  Wallet,
  Bell,
  Shield,
  Lock,
  Mail,
  Link as LinkIcon,
  Camera,
  Save,
  LogOut,
  ExternalLink,
  Twitter,
  Github,
  Linkedin
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function AccountSettings() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'wallet' | 'notifications' | 'security' | 'privacy'>('profile');
  const [isSaving, setIsSaving] = useState(false);

  // Mock profile data
  const [profileData, setProfileData] = useState({
    name: user?.username || 'Anonymous User',
    bio: 'Passionate about investing in talented individuals and supporting innovation.',
    email: 'user@example.com',
    avatar: user?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User',
    location: 'San Francisco, CA',
    website: 'https://example.com',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    priceAlerts: true,
    newFollowers: true,
    creatorUpdates: true,
    weeklyDigest: false,
    marketingEmails: false,
  });

  const [privacySettings, setPrivacySettings] = useState({
    showPortfolio: true,
    showTransactions: false,
    allowMessages: true,
    showActivity: true,
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User size={18} /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
    { id: 'privacy', label: 'Privacy', icon: <Lock size={18} /> },
  ];

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-8">
        <h1 className="text-h1 mb-2">Account Settings</h1>
        <p className="text-subtle text-lg">Manage your account preferences and security settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="card p-4 sticky top-4">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-[var(--primary)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
              <hr className="my-4 border-[var(--border-color)]" />
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-rose-600 hover:bg-rose-50 transition-all"
              >
                <LogOut size={18} />
                <span>Log Out</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="card p-8">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-6">Profile Information</h2>

                  {/* Avatar Upload */}
                  <div className="flex items-center gap-6 mb-8">
                    <div className="relative">
                      <img
                        src={profileData.avatar}
                        alt="Profile"
                        className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                      />
                      <button className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg">
                        <Camera size={16} />
                      </button>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{profileData.name}</h3>
                      <p className="text-sm text-[var(--text-muted)] mb-2">JPG, PNG or GIF. Max size 2MB</p>
                      <button className="btn-secondary text-sm">Upload New Photo</button>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
                        Bio
                      </label>
                      <textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <p className="text-xs text-[var(--text-muted)] mt-1">Brief description for your profile. Max 200 characters.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
                          Location
                        </label>
                        <input
                          type="text"
                          value={profileData.location}
                          onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                          className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
                          Website
                        </label>
                        <input
                          type="url"
                          value={profileData.website}
                          onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                          className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Connected Accounts */}
                <div className="pt-6 border-t border-[var(--border-color)]">
                  <h3 className="font-semibold text-lg mb-4">Connected Accounts</h3>
                  <div className="space-y-3">
                    {[
                      { platform: 'Twitter', icon: <Twitter size={20} />, connected: true, handle: '@johndoe' },
                      { platform: 'GitHub', icon: <Github size={20} />, connected: false, handle: null },
                      { platform: 'LinkedIn', icon: <Linkedin size={20} />, connected: true, handle: 'John Doe' },
                    ].map((account) => (
                      <div key={account.platform} className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="text-gray-600">{account.icon}</div>
                          <div>
                            <p className="font-medium">{account.platform}</p>
                            {account.connected && (
                              <p className="text-sm text-[var(--text-muted)]">{account.handle}</p>
                            )}
                          </div>
                        </div>
                        <button
                          className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            account.connected
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {account.connected ? 'Disconnect' : 'Connect'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Wallet Tab */}
            {activeTab === 'wallet' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-6">Wallet Connection</h2>

                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-6 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-white rounded-full shadow-sm">
                        <Wallet size={24} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">Connected Wallet</h3>
                        <p className="text-sm text-[var(--text-muted)]">Sui Wallet</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 font-mono text-sm">
                      {user?.wallet_address || '0x1234...5678'}
                    </div>
                    <button className="mt-4 btn-ghost text-sm flex items-center gap-2">
                      <ExternalLink size={14} />
                      View on Explorer
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Wallet Actions</h3>
                    <button className="w-full btn-secondary py-3 flex items-center justify-center gap-2">
                      <LinkIcon size={18} />
                      Connect Different Wallet
                    </button>
                    <button className="w-full btn-ghost py-3 text-rose-600 hover:bg-rose-50">
                      Disconnect Wallet
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-6">Notification Preferences</h2>

                  <div className="space-y-6">
                    {[
                      { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive email updates about your account activity' },
                      { key: 'priceAlerts', label: 'Price Alerts', description: 'Get notified when creator token prices change significantly' },
                      { key: 'newFollowers', label: 'New Followers', description: 'Notifications when someone follows you' },
                      { key: 'creatorUpdates', label: 'Creator Updates', description: 'Updates from creators you have invested in' },
                      { key: 'weeklyDigest', label: 'Weekly Digest', description: 'Summary of your portfolio performance' },
                      { key: 'marketingEmails', label: 'Marketing Emails', description: 'Promotional emails and new features' },
                    ].map((setting) => (
                      <div key={setting.key} className="flex items-start justify-between p-4 border border-[var(--border-color)] rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{setting.label}</h4>
                          <p className="text-sm text-[var(--text-muted)]">{setting.description}</p>
                        </div>
                        <label className="relative inline-block w-12 h-6 ml-4">
                          <input
                            type="checkbox"
                            checked={notificationSettings[setting.key as keyof typeof notificationSettings]}
                            onChange={(e) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                [setting.key]: e.target.checked,
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-full h-full bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-6">Security Settings</h2>

                  <div className="space-y-6">
                    <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Shield size={20} className="text-amber-600 mt-1" />
                        <div>
                          <h3 className="font-semibold text-amber-900 mb-2">Two-Factor Authentication (2FA)</h3>
                          <p className="text-sm text-amber-800 mb-4">
                            Add an extra layer of security to your account. Recommended for all users.
                          </p>
                          <button className="btn-primary text-sm">Enable 2FA</button>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 border border-[var(--border-color)] rounded-lg">
                      <h3 className="font-semibold mb-4">Active Sessions</h3>
                      <div className="space-y-3">
                        {[
                          { device: 'MacBook Pro', location: 'San Francisco, CA', time: 'Active now', current: true },
                          { device: 'iPhone 14', location: 'San Francisco, CA', time: '2 hours ago', current: false },
                        ].map((session, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{session.device}</p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {session.location} • {session.time}
                              </p>
                            </div>
                            {!session.current && (
                              <button className="text-sm text-rose-600 hover:underline">Revoke</button>
                            )}
                            {session.current && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Current</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-6">Privacy Settings</h2>

                  <div className="space-y-6">
                    {[
                      { key: 'showPortfolio', label: 'Show Portfolio', description: 'Allow others to see your portfolio holdings' },
                      { key: 'showTransactions', label: 'Show Transactions', description: 'Make your transaction history public' },
                      { key: 'allowMessages', label: 'Allow Messages', description: 'Let other users send you direct messages' },
                      { key: 'showActivity', label: 'Show Activity', description: 'Display your activity on your public profile' },
                    ].map((setting) => (
                      <div key={setting.key} className="flex items-start justify-between p-4 border border-[var(--border-color)] rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{setting.label}</h4>
                          <p className="text-sm text-[var(--text-muted)]">{setting.description}</p>
                        </div>
                        <label className="relative inline-block w-12 h-6 ml-4">
                          <input
                            type="checkbox"
                            checked={privacySettings[setting.key as keyof typeof privacySettings]}
                            onChange={(e) =>
                              setPrivacySettings({
                                ...privacySettings,
                                [setting.key]: e.target.checked,
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-full h-full bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-[var(--border-color)] mt-8">
                    <h3 className="font-semibold text-rose-600 mb-4">Danger Zone</h3>
                    <button className="btn-ghost text-rose-600 hover:bg-rose-50 w-full justify-center py-3">
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button (shown for profile, notifications, and privacy tabs) */}
            {(activeTab === 'profile' || activeTab === 'notifications' || activeTab === 'privacy') && (
              <div className="flex items-center justify-end gap-4 pt-6 border-t border-[var(--border-color)] mt-8">
                <button className="btn-ghost">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn-primary flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
