import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const navigation = useNavigation();
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    const isPrivacy = type === 'privacy';
    setShowPrivacy(isPrivacy);
    // Update header title dynamically
    navigation.setOptions({
      title: isPrivacy ? 'Privacy Policy' : 'Terms & Conditions',
    });
  }, [type, navigation]);

  const renderTermsContent = () => (
    <View className="space-y-5">
      <Text className="text-gray-700 text-lg mb-5">
        <Text className="font-bold">Last updated:</Text> July 2025
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">1. Acceptance of Terms</Text>
      <Text className="text-gray-700 text-lg mb-5 leading-7">
        By accessing and using GanApp, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by these terms, please do not use this application.
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">2. Use License</Text>
      <Text className="text-gray-700 text-lg mb-5 leading-7">
        Permission is granted to use GanApp for personal, non-commercial purposes related to event management, registration, and participation. This is the grant of a license, not a transfer of title, and you may not modify, copy, or distribute the application without permission.
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">3. User Accounts</Text>
      <Text className="text-gray-700 text-lg mb-5 leading-7">
        You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">4. User Conduct</Text>
      <Text className="text-gray-700 text-lg mb-5 leading-7">
        You agree to use GanApp only for lawful purposes and in a way that does not infringe the rights of others or restrict their use of the application. Prohibited activities include but are not limited to: harassment, spamming, uploading malicious content, or attempting to gain unauthorized access to the system.
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">5. Event Registration and Participation</Text>
      <Text className="text-gray-700 text-lg mb-5 leading-7">
        When registering for events through GanApp, you agree to provide accurate information and to comply with any event-specific terms and conditions. Event organizers reserve the right to accept or reject registrations at their discretion.
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">6. Disclaimer</Text>
      <Text className="text-gray-700 text-lg mb-5 leading-7">
        GanApp is provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim all other warranties including, without limitation, implied warranties of merchantability, fitness for a particular purpose, or non-infringement of intellectual property.
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">7. Limitations of Liability</Text>
      <Text className="text-gray-700 text-lg mb-5 leading-7">
        In no event shall GanApp or its developers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use GanApp.
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">8. Modifications</Text>
      <Text className="text-gray-700 text-lg mb-5 leading-7">
        We may revise these terms of service at any time without notice. By continuing to use GanApp, you are agreeing to be bound by the then current version of these terms of service.
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">9. Termination</Text>
      <Text className="text-gray-700 text-lg mb-5 leading-7">
        We reserve the right to terminate or suspend your account and access to GanApp immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.
      </Text>
    </View>
  );

  const renderPrivacyContent = () => (
    <View className="space-y-5">
      <Text className="text-gray-700 text-lg mb-5">
        <Text className="font-bold">Last updated:</Text> July 2025
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">1. Information We Collect</Text>
      <Text className="text-gray-700 text-lg mb-4 leading-7">
        GanApp collects information you provide directly to us, such as when you create an account, register for an event, or participate in surveys. This may include:
      </Text>
      <Text className="text-gray-700 text-lg ml-4 mb-5 leading-7">
        • Name and contact information (email address, phone number){'\n'}
        • Account credentials (username and password){'\n'}
        • Profile information (affiliated organization, role){'\n'}
        • Event registration and participation data{'\n'}
        • Survey responses and feedback{'\n'}
        • Profile photos and avatars
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">2. How We Use Your Information</Text>
      <Text className="text-gray-700 text-lg mb-4 leading-7">
        We use the information we collect to:
      </Text>
      <Text className="text-gray-700 text-lg ml-4 mb-5 leading-7">
        • Provide and maintain GanApp services{'\n'}
        • Process event registrations and manage attendance{'\n'}
        • Collect and analyze survey responses{'\n'}
        • Send you notifications about events and updates{'\n'}
        • Provide customer support and respond to inquiries{'\n'}
        • Monitor and analyze app usage and trends{'\n'}
        • Improve our services and user experience
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">3. Information Sharing</Text>
      <Text className="text-gray-700 text-lg mb-4 leading-7">
        We do not sell, trade, or otherwise transfer your personal information to third parties. We may share information with:
      </Text>
      <Text className="text-gray-700 text-lg ml-4 mb-5 leading-7">
        • Event organizers when you register for their events{'\n'}
        • Service providers who assist in operating GanApp (hosting, analytics, etc.){'\n'}
        • When required by law or to protect our rights and safety
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">4. Data Security</Text>
      <Text className="text-gray-700 text-lg mb-5 leading-7">
        We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure authentication, and regular security assessments.
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">5. Your Rights</Text>
      <Text className="text-gray-700 text-lg mb-4 leading-7">
        You have the right to:
      </Text>
      <Text className="text-gray-700 text-lg ml-4 mb-5 leading-7">
        • Access and review your personal information{'\n'}
        • Correct inaccurate or incomplete data{'\n'}
        • Request deletion of your account and data{'\n'}
        • Export your data in a portable format{'\n'}
        • Opt-out of non-essential communications{'\n'}
        • Withdraw consent for data processing
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">6. Data Retention</Text>
      <Text className="text-gray-700 text-lg mb-5 leading-7">
        We retain your information for as long as your account is active or as needed to provide services. Event and survey data may be retained for historical and analytical purposes. You may request deletion of your account and associated data at any time.
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">7. Cookies and Tracking</Text>
      <Text className="text-gray-700 text-lg mb-5 leading-7">
        GanApp may use cookies and similar tracking technologies to enhance your experience, analyze usage patterns, and improve our services. You can control cookie preferences through your device settings.
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">8. Children's Privacy</Text>
      <Text className="text-gray-700 text-lg mb-5 leading-7">
        GanApp is not intended for users under the age of 13. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">9. Changes to This Policy</Text>
      <Text className="text-gray-700 text-lg mb-5 leading-7">
        We may update this privacy policy from time to time. We will notify you of any significant changes by posting the new policy on this page and updating the "last updated" date. Your continued use of GanApp after changes constitutes acceptance of the updated policy.
      </Text>
      
      <Text className="font-semibold text-gray-900 text-xl mb-3">10. Contact Us</Text>
      <Text className="text-gray-700 text-lg mb-5 leading-7">
        If you have questions about this privacy policy or our data practices, please contact us through the app's support features or your account settings.
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      <View className="flex-1 bg-blue-900">
        {/* Content */}
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ 
            padding: 16,
            paddingTop: 0,
            paddingBottom: insets.bottom + 32
          }}
        >
          <View className="rounded-lg p-6" style={{ backgroundColor: '#FAFAFA' }}>
            <Text className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              {showPrivacy ? 'Privacy Policy' : 'Terms and Conditions'}
            </Text>
            {showPrivacy ? renderPrivacyContent() : renderTermsContent()}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
