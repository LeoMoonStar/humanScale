import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail, Users, Send, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function InviteCreator() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    joinGroup: false
  });
  const [submitted, setSubmitted] = useState(false);

  const decodedName = name ? decodeURIComponent(name) : 'This Person';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would send the invitation to the backend
    console.log('Invitation submitted:', { person: decodedName, ...formData });
    setSubmitted(true);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', message: '', joinGroup: false });
    }, 3000);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Invitation Sent!</h2>
          <p className="text-[var(--text-muted)] mb-6">
            Your invitation to {decodedName} has been submitted. We'll reach out to them on your behalf.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-h1">Invite {decodedName} to Join</h1>
          <p className="text-subtle">Help bring them to the PeopleCoin platform</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="card p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Users size={24} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2 text-[var(--text-main)]">Not on the Platform Yet — But You Can Change That! 🚀</h3>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              <span className="font-medium text-[var(--text-main)]">{decodedName}</span> hasn't joined PeopleCoin yet, but here's your chance to make it happen! 
              Write a personal invitation letter that could be the reason they join, or team up with others in our community group. 
              <span className="font-medium text-[var(--primary)]"> Your voice matters</span> — together, we can bring amazing creators to the platform!
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Form */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-h3 mb-6 flex items-center gap-2">
              <Mail size={20} className="text-[var(--primary)]" />
              Send an Invitation
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Invitation Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={`Dear ${decodedName},\n\nI believe you would be a great addition to the PeopleCoin platform...`}
                  rows={8}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Write a personal message explaining why you think they should join
                </p>
              </div>

              {/* Join Group Checkbox */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="joinGroup"
                  checked={formData.joinGroup}
                  onChange={(e) => setFormData({ ...formData, joinGroup: e.target.checked })}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="joinGroup" className="flex-1 cursor-pointer">
                  <span className="font-medium block mb-1">Join the Invitation Group</span>
                  <span className="text-sm text-[var(--text-muted)]">
                    Join a community of people working together to bring {decodedName} to the platform. 
                    You'll receive updates and can collaborate with others.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                <Send size={18} />
                Send Invitation
              </button>
            </form>
          </div>
        </div>

        {/* Right Column - Info */}
        <div className="space-y-6">
          {/* Community Stats */}
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Invitation Community</h3>
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-bold text-[var(--primary)]">1,234</p>
                <p className="text-sm text-[var(--text-muted)]">People have invited</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">892</p>
                <p className="text-sm text-[var(--text-muted)]">Joined the group</p>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="card p-6">
            <h3 className="font-semibold mb-4">How It Works</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <p className="text-[var(--text-secondary)]">
                  You write and submit an invitation letter
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <p className="text-[var(--text-secondary)]">
                  We compile all invitations and reach out to {decodedName}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <p className="text-[var(--text-secondary)]">
                  If they join, you'll be notified and can invest in their creator coin
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="card p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <h3 className="font-semibold mb-3">Why Invite Them?</h3>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">✓</span>
                <span>Early access to their creator coin when they join</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">✓</span>
                <span>Support their journey and career growth</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 mt-0.5">✓</span>
                <span>Be part of building the future of personal investment</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

