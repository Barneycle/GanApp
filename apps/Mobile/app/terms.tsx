import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TermsScreen() {
  const [modalOpen, setModalOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const [modalContent, setModalContent] = useState('terms');

  const getContent = () => {
    if (modalContent === 'terms') {
      return {
        title: 'Terms and Conditions',
        content: (
          <View className="space-y-3">
            <Text className="text-gray-700 text-sm">
              <Text className="font-bold">Last updated:</Text> July 2025
            </Text>
            
            <Text className="font-semibold text-gray-900 text-base">1. Acceptance of Terms</Text>
            <Text className="text-gray-700 text-sm">
              By accessing and using this platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </Text>
            
            <Text className="font-semibold text-gray-900 text-base">2. Use License</Text>
            <Text className="text-gray-700 text-sm">
              Permission is granted to temporarily download one copy of the materials (information or software) on Partido State University's platform for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
            </Text>
            
            <Text className="font-semibold text-gray-900 text-base">3. Disclaimer</Text>
            <Text className="text-gray-700 text-sm">
              The materials on Partido State University's platform are provided on an 'as is' basis. Partido State University makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </Text>
            
            <Text className="font-semibold text-gray-900 text-base">4. Limitations</Text>
            <Text className="text-gray-700 text-sm">
              In no event shall Partido State University or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Partido State University's platform.
            </Text>
            
            <Text className="font-semibold text-gray-900 text-base">5. Accuracy of Materials</Text>
            <Text className="text-gray-700 text-sm">
              The materials appearing on Partido State University's platform could include technical, typographical, or photographic errors. Partido State University does not warrant that any of the materials on its platform are accurate, complete or current.
            </Text>
            
            <Text className="font-semibold text-gray-900 text-base">6. Links</Text>
            <Text className="text-gray-700 text-sm">
              Partido State University has not reviewed all of the sites linked to its platform and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Partido State University of the site.
            </Text>
            
            <Text className="font-semibold text-gray-900 text-base">7. Modifications</Text>
            <Text className="text-gray-700 text-sm">
              Partido State University may revise these terms of service for its platform at any time without notice. By using this platform you are agreeing to be bound by the then current version of these terms of service.
            </Text>
            
            <Text className="font-semibold text-gray-900 text-base">8. Governing Law</Text>
            <Text className="text-gray-700 text-sm">
              These terms and conditions are governed by and construed in accordance with the laws of the Philippines and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
            </Text>
          </View>
        )
      };
    } else {
      return {
        title: 'Privacy Policy',
        content: (
          <View className="space-y-3">
            <Text className="text-gray-700 text-sm">
              <Text className="font-bold">Last updated:</Text> July 2025
            </Text>
            
            <Text className="font-semibold text-gray-900 text-base">1. Information We Collect</Text>
            <Text className="text-gray-700 text-sm">
              We collect information you provide directly to us, such as when you create an account, register for an event, or participate in surveys. This may include:
            </Text>
            <Text className="text-gray-700 text-sm ml-4">
              • Name and contact information (email address){'\n'}
              • Username and password{'\n'}
              • Academic information (for PSU students and employees){'\n'}
              • Survey responses and event participation data
            </Text>
            
            <Text className="font-semibold text-gray-900 text-base">2. How We Use Your Information</Text>
            <Text className="text-gray-700 text-sm">
              We use the information we collect to:
            </Text>
            <Text className="text-gray-700 text-sm ml-4">
              • Provide and maintain our services{'\n'}
              • Process event registrations and survey responses{'\n'}
              • Send you technical notices and support messages{'\n'}
              • Communicate with you about events and updates{'\n'}
              • Monitor and analyze usage and trends
            </Text>
            
            <Text className="font-semibold text-gray-900 text-base">3. Information Sharing</Text>
            <Text className="text-gray-700 text-sm">
              We do not sell, trade, or otherwise transfer your personal information to third parties. We may share information with:
            </Text>
            <Text className="text-gray-700 text-sm ml-4">
              • Partido State University administration for academic purposes{'\n'}
              • Event organizers when you register for specific events{'\n'}
              • Service providers who assist in operating our platform
            </Text>
            
            <Text className="font-semibold text-gray-900 text-base">4. Data Security</Text>
            <Text className="text-gray-700 text-sm">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </Text>
            
            <Text className="font-semibold text-gray-900 text-base">5. Your Rights</Text>
            <Text className="text-gray-700 text-sm">
              You have the right to:
            </Text>
            <Text className="text-gray-700 text-sm ml-4">
              • Access your personal information{'\n'}
              • Correct inaccurate data{'\n'}
              • Request deletion of your data{'\n'}
              • Opt-out of communications
            </Text>
            
            <Text className="font-semibold text-gray-900 text-base">6. Data Retention</Text>
            <Text className="text-gray-700 text-sm">
              We retain your information for as long as your account is active or as needed to provide services. Academic data may be retained longer for institutional purposes.
            </Text>
            
            <Text className="font-semibold text-gray-900 text-base">7. Changes to This Policy</Text>
            <Text className="text-gray-700 text-sm">
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "last updated" date.
            </Text>
            
            <Text className="font-semibold text-gray-900 text-base">8. Contact Us</Text>
            <Text className="text-gray-700 text-sm">
              If you have questions about this privacy policy or our data practices, please contact us at the Partido State University QA Office.
            </Text>
          </View>
        )
      };
    }
  };

  const { title, content } = getContent();

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      <View className="flex-1 bg-blue-900">
        {/* Content */}
        <ScrollView 
          className="flex-1 p-4"
          contentContainerStyle={{ 
            paddingTop: 8,
            paddingBottom: insets.bottom + 32
          }}
        >
          <View className="bg-white rounded-lg p-4 mb-4">
            <Text className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Terms and Conditions
            </Text>
            <View className="space-y-3">
              <Text className="text-gray-700 text-sm">
                <Text className="font-bold">Last updated:</Text> July 2025
              </Text>
              
              <Text className="font-semibold text-gray-900 text-base">1. Acceptance of Terms</Text>
              <Text className="text-gray-700 text-sm">
                By accessing and using this platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </Text>
              
              <Text className="font-semibold text-gray-900 text-base">2. Use License</Text>
              <Text className="text-gray-700 text-sm">
                Permission is granted to temporarily download one copy of the materials (information or software) on Partido State University's platform for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
              </Text>
              
              <Text className="font-semibold text-gray-900 text-base">3. Disclaimer</Text>
              <Text className="text-gray-700 text-sm">
                The materials on Partido State University's platform are provided on an 'as is' basis. Partido State University makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </Text>
              
              <Text className="font-semibold text-gray-900 text-base">4. Limitations</Text>
              <Text className="text-gray-700 text-sm">
                In no event shall Partido State University or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Partido State University's platform.
              </Text>
              
              <Text className="font-semibold text-gray-900 text-base">5. Accuracy of Materials</Text>
              <Text className="text-gray-700 text-sm">
                The materials appearing on Partido State University's platform could include technical, typographical, or photographic errors. Partido State University does not warrant that any of the materials on its platform are accurate, complete or current.
              </Text>
              
              <Text className="font-semibold text-gray-900 text-base">6. Links</Text>
              <Text className="text-gray-700 text-sm">
                Partido State University has not reviewed all of the sites linked to its platform and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Partido State University of the site.
              </Text>
              
              <Text className="font-semibold text-gray-900 text-base">7. Modifications</Text>
              <Text className="text-gray-700 text-sm">
                Partido State University may revise these terms of service for its platform at any time without notice. By using this platform you are agreeing to be bound by the then current version of these terms of service.
              </Text>
              
              <Text className="font-semibold text-gray-900 text-base">8. Governing Law</Text>
              <Text className="text-gray-700 text-sm">
                These terms and conditions are governed by and construed in accordance with the laws of the Philippines and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
              </Text>
            </View>
          </View>

          <View className="bg-white rounded-lg p-4">
            <Text className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Privacy Policy
            </Text>
            <View className="space-y-3">
              <Text className="text-gray-700 text-sm">
                <Text className="font-bold">Last updated:</Text> July 2025
              </Text>
              
              <Text className="font-semibold text-gray-900 text-base">1. Information We Collect</Text>
              <Text className="text-gray-700 text-sm">
                We collect information you provide directly to us, such as when you create an account, register for an event, or participate in surveys. This may include:
              </Text>
              <Text className="text-gray-700 text-sm ml-4">
                • Name and contact information (email address){'\n'}
                • Username and password{'\n'}
                • Academic information (for PSU students and employees){'\n'}
                • Survey responses and event participation data
              </Text>
              
              <Text className="font-semibold text-gray-900 text-base">2. How We Use Your Information</Text>
              <Text className="text-gray-700 text-sm">
                We use the information we collect to:
              </Text>
              <Text className="text-gray-700 text-sm ml-4">
                • Provide and maintain our services{'\n'}
                • Process event registrations and survey responses{'\n'}
                • Send you technical notices and support messages{'\n'}
                • Communicate with you about events and updates{'\n'}
                • Monitor and analyze usage and trends
              </Text>
              
              <Text className="font-semibold text-gray-900 text-base">3. Information Sharing</Text>
              <Text className="text-gray-700 text-sm">
                We do not sell, trade, or otherwise transfer your personal information to third parties. We may share information with:
              </Text>
              <Text className="text-gray-700 text-sm ml-4">
                • Partido State University administration for academic purposes{'\n'}
                • Event organizers when you register for specific events{'\n'}
                • Service providers who assist in operating our platform
              </Text>
              
              <Text className="font-semibold text-gray-900 text-base">4. Data Security</Text>
              <Text className="text-gray-700 text-sm">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </Text>
              
              <Text className="font-semibold text-gray-900 text-base">5. Your Rights</Text>
              <Text className="text-gray-700 text-sm">
                You have the right to:
              </Text>
              <Text className="text-gray-700 text-sm ml-4">
                • Access your personal information{'\n'}
                • Correct inaccurate data{'\n'}
                • Request deletion of your data{'\n'}
                • Opt-out of communications
              </Text>
              
              <Text className="font-semibold text-gray-900 text-base">6. Data Retention</Text>
              <Text className="text-gray-700 text-sm">
                We retain your information for as long as your account is active or as needed to provide services. Academic data may be retained longer for institutional purposes.
              </Text>
              
              <Text className="font-semibold text-gray-900 text-base">7. Changes to This Policy</Text>
              <Text className="text-gray-700 text-sm">
                We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "last updated" date.
              </Text>
              
              <Text className="font-semibold text-gray-900 text-base">8. Contact Us</Text>
              <Text className="text-gray-700 text-sm">
                If you have questions about this privacy policy or our data practices, please contact us at the Partido State University QA Office.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
