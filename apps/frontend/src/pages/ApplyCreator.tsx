import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Briefcase,
  DollarSign,
  FileText,
  Upload,
  CheckCircle,
  Info,
  Plus,
  X as XIcon,
  Loader
} from 'lucide-react';

interface ProfileUrl {
  id: string;
  url: string;
  displayType: 'embed' | 'link' | 'video' | 'profile-card';
  label: string;
  scraped: boolean;
  scrapedData?: {
    title?: string;
    description?: string;
    imageUrl?: string;
    metadata?: Record<string, any>;
  };
}

interface FormData {
  // Personal Information
  fullName: string;
  email: string;
  phone: string;
  location: string;
  bio: string;

  // Professional Information
  title: string;
  profileUrls: ProfileUrl[];

  // Token Configuration
  tokenSymbol: string;
  totalSupply: string;
  initialPrice: string;
  seedLiquidity: string;
  buybackDuration: string;

  // Documents
  resume: File | null;
  idDocument: File | null;
  pitchVideo: File | null;
}

export function ApplyCreator() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [scrapingUrls, setScrapingUrls] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    title: '',
    profileUrls: [],
    tokenSymbol: '',
    totalSupply: '100000',
    initialPrice: '1.00',
    seedLiquidity: '10000',
    buybackDuration: '5',
    resume: null,
    idDocument: null,
    pitchVideo: null
  });

  const totalSteps = 4;

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: 'resume' | 'idDocument' | 'pitchVideo', file: File) => {
    setFormData(prev => ({ ...prev, [field]: file }));
  };

  const addProfileUrl = () => {
    const newUrl: ProfileUrl = {
      id: Date.now().toString(),
      url: '',
      displayType: 'link',
      label: '',
      scraped: false
    };
    setFormData(prev => ({
      ...prev,
      profileUrls: [...prev.profileUrls, newUrl]
    }));
  };

  const removeProfileUrl = (id: string) => {
    setFormData(prev => ({
      ...prev,
      profileUrls: prev.profileUrls.filter(u => u.id !== id)
    }));
  };

  const updateProfileUrl = (id: string, field: keyof ProfileUrl, value: any) => {
    setFormData(prev => ({
      ...prev,
      profileUrls: prev.profileUrls.map(u =>
        u.id === id ? { ...u, [field]: value } : u
      )
    }));
  };

  const scrapeUrl = async (urlId: string) => {
    const url = formData.profileUrls.find(u => u.id === urlId);
    if (!url || !url.url) return;

    setScrapingUrls(prev => new Set(prev).add(urlId));

    try {
      // Call MCP scraper service
      const response = await fetch('http://localhost:3001/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.url })
      });

      const data = await response.json();

      updateProfileUrl(urlId, 'scraped', true);
      updateProfileUrl(urlId, 'scrapedData', data);
    } catch (error) {
      console.error('Failed to scrape URL:', error);
      // For demo purposes, use mock data
      updateProfileUrl(urlId, 'scraped', true);
      updateProfileUrl(urlId, 'scrapedData', {
        title: 'Scraped Content',
        description: 'This is mock scraped data. MCP service not available.',
        metadata: {}
      });
    } finally {
      setScrapingUrls(prev => {
        const next = new Set(prev);
        next.delete(urlId);
        return next;
      });
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    // TODO: Submit form data to backend
    console.log('Form submitted:', formData);
    // Navigate to document signing
    navigate('/apply/sign-documents');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-h1 mb-2">Apply to Become a Creator</h1>
        <p className="text-subtle text-lg">
          Launch your personal token and start raising funds from your supporters
        </p>
      </div>

      {/* Progress Bar */}
      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4].map(step => (
            <div key={step} className="flex items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step <= currentStep
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {step < currentStep ? <CheckCircle size={20} /> : step}
              </div>
              {step < 4 && (
                <div className={`flex-1 h-1 mx-2 ${
                  step < currentStep ? 'bg-[var(--primary)]' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs text-center text-[var(--text-muted)]">
          <div>Personal Info</div>
          <div>Professional</div>
          <div>Token Config</div>
          <div>Documents</div>
        </div>
      </div>

      {/* Form Content */}
      <div className="card p-8">
        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="text-[var(--primary)]" />
              <h2 className="text-h3">Personal Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="John Doe"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="john@example.com"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="San Francisco, CA"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bio *</label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about yourself and why you want to launch a personal token..."
                rows={5}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        )}

        {/* Step 2: Professional Information */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <Briefcase className="text-[var(--primary)]" />
              <h2 className="text-h3">Professional Information & Profile URLs</h2>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Professional Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., AI Research Scientist, Professional Athlete"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Dynamic Profile URLs */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="block text-sm font-medium">Profile URLs</label>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Add your professional profiles, portfolios, or any content you want to showcase
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addProfileUrl}
                  className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
                >
                  <Plus size={16} />
                  Add URL
                </button>
              </div>

              {formData.profileUrls.length === 0 && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Briefcase className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-sm text-[var(--text-muted)]">
                    No profile URLs added yet. Click "Add URL" to get started.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {formData.profileUrls.map((profileUrl) => (
                  <div key={profileUrl.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium mb-2">Label/Description</label>
                        <input
                          type="text"
                          value={profileUrl.label}
                          onChange={(e) => updateProfileUrl(profileUrl.id, 'label', e.target.value)}
                          placeholder="e.g., My LinkedIn Profile, GitHub Projects"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium mb-2">URL</label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={profileUrl.url}
                            onChange={(e) => updateProfileUrl(profileUrl.id, 'url', e.target.value)}
                            placeholder="https://..."
                            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => scrapeUrl(profileUrl.id)}
                            disabled={!profileUrl.url || scrapingUrls.has(profileUrl.id)}
                            className="btn-secondary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {scrapingUrls.has(profileUrl.id) ? (
                              <>
                                <Loader size={14} className="animate-spin" />
                                Scraping...
                              </>
                            ) : (
                              'Scrape'
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-2">Display Type</label>
                        <select
                          value={profileUrl.displayType}
                          onChange={(e) => updateProfileUrl(profileUrl.id, 'displayType', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="link">Link (clickable)</option>
                          <option value="embed">Embed (iframe)</option>
                          <option value="video">Video Player</option>
                          <option value="profile-card">Profile Card</option>
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeProfileUrl(profileUrl.id)}
                          className="btn-ghost text-red-600 hover:bg-red-50 px-4 py-2 text-sm w-full"
                        >
                          <XIcon size={16} className="inline mr-2" />
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Scraped Data Preview */}
                    {profileUrl.scraped && profileUrl.scrapedData && (
                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <p className="text-xs font-medium text-green-600 mb-2">✓ Scraped Data:</p>
                        <div className="bg-white rounded p-3 text-xs">
                          {profileUrl.scrapedData.title && (
                            <p><strong>Title:</strong> {profileUrl.scrapedData.title}</p>
                          )}
                          {profileUrl.scrapedData.description && (
                            <p className="mt-1"><strong>Description:</strong> {profileUrl.scrapedData.description}</p>
                          )}
                          {profileUrl.scrapedData.imageUrl && (
                            <img src={profileUrl.scrapedData.imageUrl} alt="Preview" className="mt-2 rounded max-h-20" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {formData.profileUrls.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm mt-4">
                  <Info size={16} className="inline mr-2 text-blue-600" />
                  <span className="text-blue-900">
                    Our MCP scraper will extract information from these URLs to enrich your profile automatically.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Token Configuration */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="text-[var(--primary)]" />
              <h2 className="text-h3">Token Configuration</h2>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <Info className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-blue-900">
                  These parameters will determine your token economics and cannot be changed after deployment.
                  Please consult with our team if you need guidance.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Token Symbol * (3-5 characters)</label>
                <input
                  type="text"
                  value={formData.tokenSymbol}
                  onChange={(e) => handleInputChange('tokenSymbol', e.target.value.toUpperCase())}
                  placeholder="JOHN"
                  maxLength={5}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Total Supply *</label>
                <input
                  type="number"
                  value={formData.totalSupply}
                  onChange={(e) => handleInputChange('totalSupply', e.target.value)}
                  placeholder="100000"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Initial Price (USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.initialPrice}
                  onChange={(e) => handleInputChange('initialPrice', e.target.value)}
                  placeholder="1.00"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Seed Liquidity (USD) *</label>
                <input
                  type="number"
                  value={formData.seedLiquidity}
                  onChange={(e) => handleInputChange('seedLiquidity', e.target.value)}
                  placeholder="10000"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  This will be locked in the liquidity pool
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Buyback Duration (years) *</label>
                <select
                  value={formData.buybackDuration}
                  onChange={(e) => handleInputChange('buybackDuration', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="5">5 years</option>
                  <option value="6">6 years</option>
                  <option value="7">7 years</option>
                  <option value="8">8 years</option>
                  <option value="9">9 years</option>
                  <option value="10">10 years</option>
                </select>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mt-6">
              <h3 className="font-bold mb-3">Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[var(--text-muted)]">Total Market Cap:</span>
                  <div className="font-bold">${(parseFloat(formData.totalSupply || '0') * parseFloat(formData.initialPrice || '0')).toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Your Commitment:</span>
                  <div className="font-bold">${formData.seedLiquidity} over {formData.buybackDuration} years</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Documents */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="text-[var(--primary)]" />
              <h2 className="text-h3">Upload Documents</h2>
            </div>

            <div className="space-y-6">
              {/* Resume/CV */}
              <div>
                <label className="block text-sm font-medium mb-2">Resume/CV *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                  <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                  <p className="text-sm text-[var(--text-muted)] mb-2">
                    {formData.resume ? formData.resume.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">PDF, DOC, DOCX (Max 10MB)</p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => e.target.files?.[0] && handleFileChange('resume', e.target.files[0])}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label htmlFor="resume-upload" className="btn-primary mt-3 inline-flex cursor-pointer">
                    Select File
                  </label>
                </div>
              </div>

              {/* ID Document */}
              <div>
                <label className="block text-sm font-medium mb-2">Government ID *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                  <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                  <p className="text-sm text-[var(--text-muted)] mb-2">
                    {formData.idDocument ? formData.idDocument.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">PDF, JPG, PNG (Max 10MB)</p>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => e.target.files?.[0] && handleFileChange('idDocument', e.target.files[0])}
                    className="hidden"
                    id="id-upload"
                  />
                  <label htmlFor="id-upload" className="btn-primary mt-3 inline-flex cursor-pointer">
                    Select File
                  </label>
                </div>
              </div>

              {/* Pitch Video */}
              <div>
                <label className="block text-sm font-medium mb-2">Pitch Video (Optional)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                  <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                  <p className="text-sm text-[var(--text-muted)] mb-2">
                    {formData.pitchVideo ? formData.pitchVideo.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">MP4, MOV, AVI (Max 100MB)</p>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => e.target.files?.[0] && handleFileChange('pitchVideo', e.target.files[0])}
                    className="hidden"
                    id="video-upload"
                  />
                  <label htmlFor="video-upload" className="btn-secondary mt-3 inline-flex cursor-pointer">
                    Select File
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-8 border-t border-gray-200">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="btn-ghost px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>

          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              className="btn-primary px-6 py-3"
            >
              Next Step
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="btn-primary px-6 py-3"
            >
              Submit Application
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
