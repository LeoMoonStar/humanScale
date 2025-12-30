import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export function SignDocuments() {
  const navigate = useNavigate();
  const [signed, setSigned] = useState(false);

  const documents = [
    {
      id: 1,
      title: 'Creator Agreement',
      description: 'Terms and conditions for launching a personal token on PeopleCoin',
      status: 'pending' as const,
      pages: 12
    },
    {
      id: 2,
      title: 'Token Buyback Obligation',
      description: 'Legal commitment for token buyback schedule over 5-10 years',
      status: 'pending' as const,
      pages: 8
    },
    {
      id: 3,
      title: 'Privacy & Data Policy',
      description: 'How we handle your personal information and KYC data',
      status: 'pending' as const,
      pages: 6
    }
  ];

  const handleSignAll = () => {
    // TODO: Integrate with DocuSign API
    // For now, simulate signing
    setSigned(true);
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-h1 mb-2">Sign Legal Documents</h1>
        <p className="text-subtle text-lg">
          Please review and sign all required documents to complete your application
        </p>
      </div>

      {signed ? (
        /* Success State */
        <div className="card p-12 text-center">
          <CheckCircle className="mx-auto text-emerald-500 mb-4" size={64} />
          <h2 className="text-2xl font-bold mb-2">Documents Signed Successfully!</h2>
          <p className="text-[var(--text-muted)] mb-6">
            Your application is complete. We'll review it and get back to you within 2-3 business days.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary px-8 py-3"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <>
          {/* DocuSign Integration Notice */}
          <div className="card p-6 mb-8 bg-blue-50 border-blue-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={24} />
              <div>
                <h3 className="font-bold text-blue-900 mb-1">Electronic Signature Required</h3>
                <p className="text-sm text-blue-800">
                  We use <strong>DocuSign</strong> for secure electronic signatures. All documents are legally binding
                  and will be stored securely. You'll receive copies via email after signing.
                </p>
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div className="space-y-4 mb-8">
            {documents.map((doc) => (
              <div key={doc.id} className="card p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FileText className="text-blue-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{doc.title}</h3>
                      <p className="text-sm text-[var(--text-muted)] mb-2">{doc.description}</p>
                      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                        <span>{doc.pages} pages</span>
                        <span>•</span>
                        <span>PDF format</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 text-amber-600">
                      <Clock size={16} />
                      <span className="text-sm font-medium">Pending</span>
                    </div>
                    <button className="btn-ghost text-sm text-blue-600 hover:underline">
                      Preview
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DocuSign Placeholder */}
          <div className="card p-8 border-2 border-dashed border-gray-300 bg-gray-50">
            <div className="text-center mb-6">
              <FileText className="mx-auto text-gray-400 mb-3" size={48} />
              <h3 className="font-bold text-xl mb-2">DocuSign Integration</h3>
              <p className="text-[var(--text-muted)] max-w-md mx-auto">
                In production, this section will display the DocuSign embedded signing experience.
                Users will be able to review and sign all documents directly in this page.
              </p>
            </div>

            {/* Mock DocuSign iframe */}
            <div className="bg-white rounded-lg p-8 mb-6 border border-gray-200">
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5"></div>
                <div className="mt-6 h-12 bg-gray-200 rounded animate-pulse w-48"></div>
              </div>
            </div>

            {/* Technical Details */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm">
              <h4 className="font-bold text-blue-900 mb-2">Implementation Notes:</h4>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Install DocuSign eSignature SDK: <code className="bg-blue-100 px-1 rounded">npm install docusign-esign</code></li>
                <li>Set up DocuSign developer account and obtain API credentials</li>
                <li>Implement embedded signing flow using DocuSign Focused View</li>
                <li>Handle signing events and webhook callbacks</li>
                <li>Store signed documents securely (S3/similar)</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => navigate('/apply')}
              className="btn-ghost px-6 py-3"
            >
              Back to Application
            </button>
            <button
              onClick={handleSignAll}
              className="btn-primary px-8 py-3"
            >
              Sign All Documents
            </button>
          </div>
        </>
      )}
    </div>
  );
}
