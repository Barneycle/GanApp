import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
}

interface ScreenTutorial {
  screenId: string;
  screenName: string;
  steps: TutorialStep[];
}

const allTutorials: ScreenTutorial[] = [
  {
    screenId: 'home',
    screenName: 'Home',
    steps: [
      {
        id: '1',
        title: 'Welcome to GanApp!',
        description: 'This is your home screen. Here you can browse featured events and upcoming events. Swipe left or right on event cards to see more events.',
      },
      {
        id: '2',
        title: 'View Event Details',
        description: 'Tap on any event card to see full details, register, and access event features like surveys and certificates.',
      },
    ],
  },
  {
    screenId: 'my-events',
    screenName: 'My Events',
    steps: [
      {
        id: '1',
        title: 'My Events',
        description: 'This screen shows all events you have registered for. You can view event details, access your QR code for check-in, take surveys, and generate certificates.',
      },
      {
        id: '2',
        title: 'Event Actions',
        description: 'For each event, you can: View QR code for check-in, Take evaluation surveys, and Generate certificates after completing requirements.',
      },
    ],
  },
  {
    screenId: 'albums',
    screenName: 'Albums',
    steps: [
      {
        id: '1',
        title: 'Event Albums',
        description: 'Browse photos uploaded by participants from different events. Each event has its own photo album.',
      },
      {
        id: '2',
        title: 'View & Download Photos',
        description: 'Tap "View All" to see all photos from an event. Tap any photo to view it full screen. Use the download button to save photos to your device.',
      },
      {
        id: '3',
        title: 'Download All',
        description: 'Use the "Download All" button to save all photos from an event at once to your Photos/Downloads folder.',
      },
    ],
  },
  {
    screenId: 'profile',
    screenName: 'Profile',
    steps: [
      {
        id: '1',
        title: 'Edit Your Profile',
        description: 'Update your personal information, change your profile picture, and manage your account settings.',
      },
      {
        id: '2',
        title: 'Profile Picture',
        description: 'Tap on your profile picture to change it. You can take a new photo or select one from your gallery.',
      },
      {
        id: '3',
        title: 'Save Changes',
        description: 'After making changes, tap "Save Changes" to update your profile. You\'ll receive a confirmation when changes are saved.',
      },
    ],
  },
  {
    screenId: 'events',
    screenName: 'Events',
    steps: [
      {
        id: '1',
        title: 'Browse Events',
        description: 'This screen shows all available events. Browse through events and tap on any event to see details and register.',
      },
      {
        id: '2',
        title: 'Register for Events',
        description: 'Tap on an event card to view full details, read descriptions, and register to participate.',
      },
    ],
  },
  {
    screenId: 'qrscanner',
    screenName: 'QR Scanner',
    steps: [
      {
        id: '1',
        title: 'QR Code Scanner',
        description: 'Use this scanner to check in participants at events. Point the camera at a participant\'s QR code to scan it.',
      },
      {
        id: '2',
        title: 'How to Scan',
        description: 'Position the QR code within the scanning frame. The app will automatically detect and scan the code. Make sure there\'s good lighting.',
      },
      {
        id: '3',
        title: 'Check-in Results',
        description: 'After scanning, you\'ll see the participant\'s details and can mark them as checked in for the event.',
      },
    ],
  },
  {
    screenId: 'certificate',
    screenName: 'Certificate',
    steps: [
      {
        id: '1',
        title: 'Generate Certificate',
        description: 'Generate your certificate of participation for this event. Make sure you have completed attendance and any required surveys.',
      },
      {
        id: '2',
        title: 'Download Certificate',
        description: 'After generating, you can download your certificate. It will be saved to your Downloads folder, just like files downloaded from a browser.',
      },
    ],
  },
  {
    screenId: 'camera',
    screenName: 'Camera',
    steps: [
      {
        id: '1',
        title: 'Upload Event Photos',
        description: 'Take photos or select from your gallery to upload photos for this event. You can upload up to 10 photos per event.',
      },
      {
        id: '2',
        title: 'Photo Upload',
        description: 'After selecting photos, tap "Upload Photos" to share them with other participants. Photos will appear in the event album.',
      },
    ],
  },
  {
    screenId: 'setup-profile',
    screenName: 'Setup Profile',
    steps: [
      {
        id: '1',
        title: 'Complete Your Profile',
        description: 'Fill in your personal information to complete your profile setup. This information will be used for event registrations.',
      },
      {
        id: '2',
        title: 'Profile Picture',
        description: 'Add a profile picture by tapping on the camera icon. You can take a photo or select one from your gallery.',
      },
      {
        id: '3',
        title: 'Save Your Profile',
        description: 'After filling in all required fields, tap "Save Profile" to complete your setup and start using the app.',
      },
    ],
  },
  {
    screenId: 'event-details',
    screenName: 'Event Details',
    steps: [
      {
        id: '1',
        title: 'Event Details',
        description: 'View complete information about this event including description, speakers, sponsors, and schedule.',
      },
      {
        id: '2',
        title: 'Register for Event',
        description: 'Tap the "Register" button to sign up for this event. After registration, you\'ll be able to access event features.',
      },
    ],
  },
  {
    screenId: 'survey',
    screenName: 'Survey',
    steps: [
      {
        id: '1',
        title: 'Complete Survey',
        description: 'Answer all questions in this survey. Some questions may be required. Navigate between questions using the buttons.',
      },
      {
        id: '2',
        title: 'Submit Your Answers',
        description: 'After answering all questions, tap "Submit" to save your responses. You can only submit once per survey.',
      },
    ],
  },
  {
    screenId: 'evaluation',
    screenName: 'Evaluation',
    steps: [
      {
        id: '1',
        title: 'Evaluation Survey',
        description: 'Provide your feedback about the event. Answer all questions honestly. Some questions may be required.',
      },
      {
        id: '2',
        title: 'Submit Evaluation',
        description: 'After completing all questions, tap "Submit" to save your evaluation. You may be able to generate a certificate after submission.',
      },
    ],
  },
  {
    screenId: 'participant-details',
    screenName: 'Participant Details',
    steps: [
      {
        id: '1',
        title: 'Participant Information',
        description: 'View detailed information about a participant including their registration status, attendance, and contact details.',
      },
      {
        id: '2',
        title: 'Check-in Status',
        description: 'See if the participant has checked in to the event. You can view their QR code and registration details.',
      },
    ],
  },
];

interface HelpCenterProps {
  visible: boolean;
  onClose: () => void;
}

export default function HelpCenter({ visible, onClose }: HelpCenterProps) {
  const insets = useSafeAreaInsets();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (screenId: string) => {
    setExpandedSection(expandedSection === screenId ? null : screenId);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="help-circle" size={32} color="#1e40af" />
            </View>
            <Text style={styles.title}>Help Center</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.subtitle}>
            Browse through all app instructions and learn how to use each feature.
          </Text>

          {allTutorials.map((tutorial) => (
            <View key={tutorial.screenId} style={styles.section}>
              <TouchableOpacity
                onPress={() => toggleSection(tutorial.screenId)}
                style={styles.sectionHeader}
                activeOpacity={0.7}
              >
                <View style={styles.sectionHeaderContent}>
                  <Ionicons
                    name={expandedSection === tutorial.screenId ? 'chevron-down' : 'chevron-forward'}
                    size={20}
                    color="#64748b"
                    style={styles.chevron}
                  />
                  <Text style={styles.sectionTitle}>{tutorial.screenName}</Text>
                </View>
                <Text style={styles.stepCount}>
                  {tutorial.steps.length} {tutorial.steps.length === 1 ? 'step' : 'steps'}
                </Text>
              </TouchableOpacity>

              {expandedSection === tutorial.screenId && (
                <View style={styles.stepsContainer}>
                  {tutorial.steps.map((step, index) => (
                    <View key={step.id} style={styles.stepCard}>
                      <View style={styles.stepHeader}>
                        <View style={styles.stepNumber}>
                          <Text style={styles.stepNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.stepTitle}>{step.title}</Text>
                      </View>
                      <Text style={styles.stepDescription}>{step.description}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
    lineHeight: 24,
  },
  section: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chevron: {
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  stepCount: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  stepsContainer: {
    padding: 16,
    paddingTop: 8,
  },
  stepCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#1e40af',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  stepDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginLeft: 40,
  },
});

