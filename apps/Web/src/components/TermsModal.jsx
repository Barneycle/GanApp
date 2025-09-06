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
              <p className="text-gray-600 font-medium">Last updated: July 2025</p>
            </div>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">1. Acceptance of Terms</h3>
              <p className="pl-3">By accessing and using this platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">2. Use License</h3>
              <p className="pl-3">Permission is granted to temporarily download one copy of the materials (information or software) on Partido State University's platform for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">3. Disclaimer</h3>
              <p className="pl-3">The materials on Partido State University's platform are provided on an 'as is' basis. Partido State University makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">4. Limitations</h3>
              <p className="pl-3">In no event shall Partido State University or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Partido State University's platform.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">5. Accuracy of Materials</h3>
              <p className="pl-3">The materials appearing on Partido State University's platform could include technical, typographical, or photographic errors. Partido State University does not warrant that any of the materials on its platform are accurate, complete or current.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">6. Links</h3>
              <p className="pl-3">Partido State University has not reviewed all of the sites linked to its platform and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Partido State University of the site.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">7. Modifications</h3>
              <p className="pl-3">Partido State University may revise these terms of service for its platform at any time without notice. By using this platform you are agreeing to be bound by the then current version of these terms of service.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">8. Governing Law</h3>
              <p className="pl-3">These terms and conditions are governed by and construed in accordance with the laws of the Philippines and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.</p>
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
              <p className="text-gray-600 font-medium">Last updated: July 2025</p>
            </div>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">1. Information We Collect</h3>
              <p className="pl-3">We collect information you provide directly to us, such as when you create an account, register for an event, or participate in surveys. This may include:</p>
              <ul className="list-disc pl-8 space-y-1 text-sm">
                <li>Name and contact information (email address)</li>
                <li>Username and password</li>
                <li>Academic information (for PSU students and employees)</li>
                <li>Survey responses and event participation data</li>
              </ul>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">2. How We Use Your Information</h3>
              <p className="pl-3">We use the information we collect to:</p>
              <ul className="list-disc pl-8 space-y-1 text-sm">
                <li>Provide and maintain our services</li>
                <li>Process event registrations and survey responses</li>
                <li>Send you technical notices and support messages</li>
                <li>Communicate with you about events and updates</li>
                <li>Monitor and analyze usage and trends</li>
              </ul>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">3. Information Sharing</h3>
              <p className="pl-3">We do not sell, trade, or otherwise transfer your personal information to third parties. We may share information with:</p>
              <ul className="list-disc pl-8 space-y-1 text-sm">
                <li>Partido State University administration for academic purposes</li>
                <li>Event organizers when you register for specific events</li>
                <li>Service providers who assist in operating our platform</li>
              </ul>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">4. Data Security</h3>
              <p className="pl-3">We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">5. Your Rights</h3>
              <p className="pl-3">You have the right to:</p>
              <ul className="list-disc pl-8 space-y-1 text-sm">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of communications</li>
              </ul>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">6. Data Retention</h3>
              <p className="pl-3">We retain your information for as long as your account is active or as needed to provide services. Academic data may be retained longer for institutional purposes.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">7. Changes to This Policy</h3>
              <p className="pl-3">We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "last updated" date.</p>
            </section>
            
            <section className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg border-l-4 border-blue-500 pl-3">8. Contact Us</h3>
              <p className="pl-3">If you have questions about this privacy policy or our data practices, please contact us at the Partido State University QA Office.</p>
            </section>
          </div>
        )
      };
    }
  };

  const { title, content } = getContent();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-hidden mx-2">
        <div className="flex justify-between items-center p-3 sm:p-4 md:p-6 border-b bg-gray-50">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto max-h-[60vh] sm:max-h-[65vh]">
          {content}
        </div>
        
        <div className="p-3 sm:p-4 md:p-6 border-t bg-gray-50">
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
