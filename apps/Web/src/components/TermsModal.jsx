import React from 'react';

const TermsModal = ({ isOpen, onClose, contentType }) => {
  if (!isOpen) return null;

  const getContent = () => {
    if (contentType === 'terms') {
      return {
        title: 'Terms and Conditions',
        content: (
          <div className="space-y-4 sm:space-y-5 text-sm sm:text-base text-gray-700 leading-relaxed">
            <div className="text-center border-b border-gray-200 pb-3">
              <p className="text-gray-600 font-medium">
                <span className="font-bold">Last updated:</span> July 2025
              </p>
            </div>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">1. Acceptance of Terms</h3>
              <p className="pl-3">By accessing and using GanApp, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by these terms, please do not use this application.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">2. Use License</h3>
              <p className="pl-3">Permission is granted to use GanApp for personal, non-commercial purposes related to event management, registration, and participation. This is the grant of a license, not a transfer of title, and you may not modify, copy, or distribute the application without permission.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">3. User Accounts</h3>
              <p className="pl-3">You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">4. User Conduct</h3>
              <p className="pl-3">You agree to use GanApp only for lawful purposes and in a way that does not infringe the rights of others or restrict their use of the application. Prohibited activities include but are not limited to: harassment, spamming, uploading malicious content, or attempting to gain unauthorized access to the system.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">5. Event Registration and Participation</h3>
              <p className="pl-3">When registering for events through GanApp, you agree to provide accurate information and to comply with any event-specific terms and conditions. Event organizers reserve the right to accept or reject registrations at their discretion.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">6. Disclaimer</h3>
              <p className="pl-3">GanApp is provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim all other warranties including, without limitation, implied warranties of merchantability, fitness for a particular purpose, or non-infringement of intellectual property.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">7. Limitations of Liability</h3>
              <p className="pl-3">In no event shall GanApp or its developers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use GanApp.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">8. Modifications</h3>
              <p className="pl-3">We may revise these terms of service at any time without notice. By continuing to use GanApp, you are agreeing to be bound by the then current version of these terms of service.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">9. Termination</h3>
              <p className="pl-3">We reserve the right to terminate or suspend your account and access to GanApp immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.</p>
            </section>
          </div>
        )
      };
    } else {
      return {
        title: 'Privacy Policy',
        content: (
          <div className="space-y-4 sm:space-y-5 text-sm sm:text-base text-gray-700 leading-relaxed">
            <div className="text-center border-b border-gray-200 pb-3">
              <p className="text-gray-600 font-medium">
                <span className="font-bold">Last updated:</span> July 2025
              </p>
            </div>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">1. Information We Collect</h3>
              <p className="pl-3 mb-4">GanApp collects information you provide directly to us, such as when you create an account, register for an event, or participate in surveys. This may include:</p>
              <ul className="list-disc pl-8 space-y-1 text-sm">
                <li>Name and contact information (email address, phone number)</li>
                <li>Account credentials (username and password)</li>
                <li>Profile information (affiliated organization, role)</li>
                <li>Event registration and participation data</li>
                <li>Survey responses and feedback</li>
                <li>Profile photos and avatars</li>
              </ul>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">2. How We Use Your Information</h3>
              <p className="pl-3 mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-8 space-y-1 text-sm">
                <li>Provide and maintain GanApp services</li>
                <li>Process event registrations and manage attendance</li>
                <li>Collect and analyze survey responses</li>
                <li>Send you notifications about events and updates</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Monitor and analyze app usage and trends</li>
                <li>Improve our services and user experience</li>
              </ul>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">3. Information Sharing</h3>
              <p className="pl-3 mb-4">We do not sell, trade, or otherwise transfer your personal information to third parties. We may share information with:</p>
              <ul className="list-disc pl-8 space-y-1 text-sm">
                <li>Event organizers when you register for their events</li>
                <li>Service providers who assist in operating GanApp (hosting, analytics, etc.)</li>
                <li>When required by law or to protect our rights and safety</li>
              </ul>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">4. Data Security</h3>
              <p className="pl-3">We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure authentication, and regular security assessments.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">5. Your Rights</h3>
              <p className="pl-3 mb-4">You have the right to:</p>
              <ul className="list-disc pl-8 space-y-1 text-sm">
                <li>Access and review your personal information</li>
                <li>Correct inaccurate or incomplete data</li>
                <li>Request deletion of your account and data</li>
                <li>Export your data in a portable format</li>
                <li>Opt-out of non-essential communications</li>
                <li>Withdraw consent for data processing</li>
              </ul>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">6. Data Retention</h3>
              <p className="pl-3">We retain your information for as long as your account is active or as needed to provide services. Event and survey data may be retained for historical and analytical purposes. You may request deletion of your account and associated data at any time.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">7. Cookies and Tracking</h3>
              <p className="pl-3">GanApp may use cookies and similar tracking technologies to enhance your experience, analyze usage patterns, and improve our services. You can control cookie preferences through your device settings.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">8. Children's Privacy</h3>
              <p className="pl-3">GanApp is not intended for users under the age of 13. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">9. Changes to This Policy</h3>
              <p className="pl-3">We may update this privacy policy from time to time. We will notify you of any significant changes by posting the new policy on this page and updating the "last updated" date. Your continued use of GanApp after changes constitutes acceptance of the updated policy.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">10. Contact Us</h3>
              <p className="pl-3">If you have questions about this privacy policy or our data practices, please contact us through the app's support features or your account settings.</p>
            </section>
          </div>
        )
      };
    }
  };

  const { title, content } = getContent();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl h-[90vh] flex flex-col mx-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-3 sm:p-4 md:p-6 border-b bg-gray-50 flex-shrink-0">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div 
          data-modal-content
          className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8" 
          style={{ minHeight: 0 }}
          onWheel={(e) => {
            // Allow scrolling within modal
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            // Allow touch scrolling within modal
            e.stopPropagation();
          }}
        >
          {content}
        </div>
        
        <div className="p-3 sm:p-4 md:p-6 border-t bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-2 px-3 sm:px-4 rounded-md sm:rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
