import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

interface Article {
  id: string;
  title: string;
  content: string;
}

interface Category {
  id: string;
  title: string;
  icon: string;
  articles: Article[];
}

const categories: Category[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'book',
    articles: [
      {
        id: 'create-account',
        title: 'How to Create an Account',
        content: `To create an account:
1. Click on the "Sign Up" button in the navigation bar
2. Fill in your email address and choose a password
3. Complete your profile with your first name, last name, and organization
4. Verify your email address (if required)
5. You're all set! You can now browse and register for events.`
      },
      {
        id: 'complete-profile',
        title: 'Completing Your Profile',
        content: `Your profile must include:
- First Name
- Last Name
- Affiliated Organization

These fields are required to register for events. You can update your profile at any time from the Profile page.`
      },
      {
        id: 'navigate-platform',
        title: 'Navigating the Platform',
        content: `The platform has different sections:
- Home: View featured and upcoming events
- Events: Browse all available events
- My Events: View events you've registered for
- Certificates: View and download your certificates
- Profile: Manage your account settings
- Albums: View event photos
- Notifications: View your notifications
- Support: Contact support for help`
      }
    ]
  },
  {
    id: 'events',
    title: 'Events',
    icon: 'document-text',
    articles: [
      {
        id: 'register-event',
        title: 'How to Register for an Event',
        content: `To register for an event:
1. Browse events on the Events page
2. Click on an event to view details
3. Click the "Register" button
4. Confirm your registration
5. You'll receive a confirmation notification

You can view all your registered events on the "My Events" page.`
      },
      {
        id: 'cancel-registration',
        title: 'Canceling Event Registration',
        content: `To cancel your registration:
1. Go to the "My Events" page
2. Find the event you want to cancel
3. Click on the event card
4. Click "Cancel Registration"
5. Confirm the cancellation

Note: Some events may have cancellation deadlines.`
      },
      {
        id: 'event-filters',
        title: 'Using Event Filters and Search',
        content: `You can filter events by:
- Date: Upcoming, Past, or All
- Venue: Filter by specific locations
- Sort: By date, title, or number of participants

Advanced Search allows you to search by:
- Title
- Description
- Venue
- Category
- Tags
- Date range
- Participant count
- Status

You can also use pagination or infinite scroll to browse through events.`
      },
      {
        id: 'event-status',
        title: 'Understanding Event Status',
        content: `Events can have different statuses:
- Draft: Event is being created, not visible to participants
- Published: Event is live and open for registration
- Cancelled: Event has been cancelled
- Completed: Event has finished

Only published events are visible to participants.`
      }
    ]
  },
  {
    id: 'participants',
    title: 'For Participants',
    icon: 'people',
    articles: [
      {
        id: 'view-certificates',
        title: 'Viewing Your Certificates',
        content: `To view your certificates:
1. Go to "Certificates" tab
2. Certificates are grouped by event
3. Tap on an event to expand and see all certificates
4. View certificate previews and details
5. Search by event name, certificate number, or participant name

Certificates appear after you:
- Check in to the event
- Complete the required survey/evaluation
- The organizer generates your certificate`
      },
      {
        id: 'download-certificates',
        title: 'Downloading Certificates',
        content: `To download your certificates:
1. Go to "Certificates" tab
2. Find the certificate you want to download
3. Tap the "PDF" or "PNG" download button
4. Grant media permissions if prompted (iOS)
5. File will be saved to your device

Available formats:
- PDF: Best for printing and sharing
- PNG: Best for digital use and social media

Files are saved to:
- Android: Downloads/GanApp folder
- iOS: Photos/GanApp album`
      },
      {
        id: 'qr-check-in',
        title: 'Checking In with QR Code',
        content: `To check in to an event using QR code:
1. Go to "My Events" tab
2. Find the event you're registered for
3. Tap "View QR Code" button
4. Show the QR code to the event organizer
5. They will scan it to check you in

Alternatively:
- Organizers can scan your QR code from their scanner
- Make sure you're at the event location
- QR codes are unique to each participant and event

Note: You must be registered for the event first.`
      },
      {
        id: 'taking-surveys',
        title: 'Taking Surveys and Evaluations',
        content: `To complete a survey or evaluation:
1. Go to "My Events" tab
2. Find the event with an available survey
3. Tap "Take Survey" or "Evaluation" button
4. Answer all required questions
5. Submit your responses

Important:
- Some surveys are required for certificate generation
- Surveys may have deadlines
- You can usually edit your responses before submitting
- Once submitted, you may not be able to change answers

Surveys help organizers improve future events.`
      },
      {
        id: 'upload-photos',
        title: 'Uploading Event Photos',
        content: `To upload photos to an event album:
1. Go to "Albums" tab or event details
2. Select the event album
3. Tap "Upload Photos" button
4. Grant camera/photo permissions
5. Select photos from your gallery or take new ones
6. Add captions or descriptions (optional)
7. Tap "Upload"

Photo limits:
- Maximum 10 photos per user per event
- Supported formats: JPG, PNG, GIF, WebP
- Maximum file size: 35MB per photo
- Photos are automatically compressed

You can delete your own photos if you reach the limit.`
      },
      {
        id: 'view-albums',
        title: 'Viewing Event Albums',
        content: `To view event photos:
1. Go to "Albums" tab
2. Browse albums by event
3. Tap on an album to view all photos
4. View photos in grid or list view
5. Tap on a photo to see full size

Features:
- See photos from all participants
- View photo details and uploader
- Download photos (if allowed)
- Share albums with others

Albums are created automatically when events are published.`
      },
      {
        id: 'notifications',
        title: 'Managing Notifications',
        content: `To view and manage notifications:
1. Tap the notifications icon in the tab bar
2. View all your notifications
3. Tap notifications to mark as read
4. Tap on notifications to view details

Notification types:
- Event reminders (24 hours before)
- Survey availability
- Registration confirmations
- Certificate generation
- System updates

You can manage notification preferences in Settings.`
      },
      {
        id: 'support-tickets',
        title: 'Creating Support Tickets',
        content: `To get help from support:
1. Go to "Support" page
2. Tap "Create New Ticket"
3. Select a category (Technical, Account, Event, etc.)
4. Choose priority level
5. Enter subject and description
6. Attach files if needed (optional)
7. Submit the ticket

To view your tickets:
- Go to Support page
- See all your tickets and their status
- Reply to tickets from organizers
- Close tickets when resolved

Response time depends on priority level.`
      },
      {
        id: 'verify-certificate',
        title: 'Verifying Certificates',
        content: `To verify a certificate:
1. Go to the certificate verification page
2. Enter the certificate number
3. Tap "Verify"
4. View verification results

Verification shows:
- Certificate validity
- Participant name
- Event details
- Issue date
- Certificate preview

Anyone can verify certificates using the certificate number.`
      },
      {
        id: 'activity-log',
        title: 'Viewing Activity Log',
        content: `To view your activity history:
1. Go to "Activity Log" from your profile menu
2. See all your actions on the platform
3. Filter by date range or activity type
4. View detailed information for each activity

Activity log includes:
- Event registrations
- Check-ins
- Survey completions
- Certificate downloads
- Profile updates
- And more

This helps you track your platform usage.`
      }
    ]
  },
  {
    id: 'organizers',
    title: 'For Organizers',
    icon: 'chatbubbles',
    articles: [
      {
        id: 'create-event',
        title: 'Creating an Event',
        content: `To create an event:
1. Navigate to "Create Event" from the menu
2. Fill in event details:
   - Title and description
   - Date and time
   - Venue and location
   - Maximum participants
   - Banner image
   - Event materials
   - Guest speakers
   - Sponsors
3. Save as draft or publish immediately
4. Manage registrations and generate QR codes

You can edit events anytime before they start.`
      },
      {
        id: 'manage-registrations',
        title: 'Managing Event Registrations',
        content: `To manage registrations:
1. Go to the Events page
2. Click "Manage" on your event
3. View all registered participants
4. Export registration list (CSV/Excel)
5. Generate QR codes for check-in
6. View event statistics

You can also cancel events if needed.`
      },
      {
        id: 'certificates',
        title: 'Generating Certificates',
        content: `To generate certificates:
1. Design a certificate template
2. Go to your event's certificate generation page
3. Upload participant data (CSV/Excel)
4. Configure certificate details
5. Generate certificates in bulk
6. Download PDF or PNG files

Certificates are generated in the background and you'll be notified when ready.`
      },
      {
        id: 'surveys',
        title: 'Creating Surveys',
        content: `To create a survey:
1. Navigate to "Create Survey"
2. Select the event
3. Add questions (multiple choice, text, etc.)
4. Set survey availability dates
5. Publish the survey
6. View responses and analytics

Surveys can be sent to event participants automatically.`
      },
      {
        id: 'qr-scanner',
        title: 'Using QR Code Scanner',
        content: `To check in participants using QR scanner:
1. Open the QR Scanner tab (organizers only)
2. Grant camera permissions if prompted
3. Point camera at participant's QR code
4. Wait for scan confirmation
5. View participant details
6. Confirm check-in

Features:
- Automatic participant check-in
- View participant information
- Check attendance status
- Location validation (if enabled)

Note: QR Scanner is only available for organizers in the mobile app.`
      },
      {
        id: 'event-statistics',
        title: 'Viewing Event Statistics',
        content: `To view event statistics:
1. Go to Events page
2. Tap "Statistics" on your event
3. View comprehensive analytics

Statistics include:
- Total registrations
- Check-in rate
- Survey completion rate
- Certificate generation status
- Participant demographics
- Attendance trends

Use statistics to improve future events.`
      },
      {
        id: 'design-certificate',
        title: 'Designing Certificate Templates',
        content: `To design a certificate template:
1. Go to "Design Certificate" from event management
2. Select background color or image
3. Configure text elements (title, name, date, etc.)
4. Add logos and signatures
5. Position elements using drag-and-drop
6. Preview the certificate
7. Save the template

Certificate elements:
- Background (color or image)
- Title and subtitle
- Participant name
- Event title
- Date and venue
- Logos (PSU, sponsors)
- Signatures
- Certificate ID and QR code

Templates are saved per event.`
      },
      {
        id: 'bulk-qr-codes',
        title: 'Generating Bulk QR Codes',
        content: `To generate QR codes for multiple participants:
1. Go to event management page
2. Tap "Generate QR Codes"
3. Select participants or generate for all
4. Choose QR code format
5. Download as PDF or individual images

QR code features:
- Unique code per participant
- Contains event and participant info
- Can be printed or shared digitally
- Used for check-in at events

QR codes are automatically generated when participants register.`
      },
      {
        id: 'standalone-certificates',
        title: 'Standalone Certificate Generator',
        content: `To generate certificates without an event:
1. Go to "Standalone Certificate Generator"
2. Enter certificate details
3. Upload participant data (CSV/Excel)
4. Design or select template
5. Generate certificates

Use cases:
- Certificates not tied to events
- Custom certificate generation
- Bulk certificate creation
- Special recognition certificates

Note: Standalone certificates don't require event registration.`
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: 'help-circle',
    articles: [
      {
        id: 'login-issues',
        title: 'Login Issues',
        content: `If you can't log in:
1. Check your email and password are correct
2. Make sure your account is not banned
3. Try resetting your password
4. Clear your browser cache and cookies
5. Try a different browser
6. Contact support if issues persist`
      },
      {
        id: 'registration-issues',
        title: 'Event Registration Issues',
        content: `If you can't register:
1. Make sure your profile is complete
2. Check if the event is full
3. Verify the registration deadline hasn't passed
4. Ensure you're logged in
5. Try refreshing the page
6. Contact support if the problem continues`
      },
      {
        id: 'photo-upload',
        title: 'Photo Upload Limits',
        content: `Photo upload limits:
- Maximum 10 photos per user per event
- Photos are compressed automatically
- Supported formats: JPG, PNG, GIF, WebP
- Maximum file size: 35MB per photo

If you reach the limit, you can delete old photos to upload new ones.`
      },
      {
        id: 'certificate-issues',
        title: 'Certificate Generation Issues',
        content: `If certificates aren't generating:
1. Check that your template is valid
2. Verify participant data format
3. Ensure you have permission
4. Check the job queue status
5. Wait a few minutes for processing
6. Contact support if it fails after 10 minutes`
      },
      {
        id: 'qr-scan-issues',
        title: 'QR Code Scanning Issues',
        content: `If QR scanning isn't working:
1. Ensure camera permissions are granted
2. Check that QR code is valid and not expired
3. Verify participant is registered for the event
4. Check internet connection
5. Try refreshing the scanner
6. Ensure QR code is not damaged or blurry
7. Contact support if issues persist`
      },
      {
        id: 'survey-issues',
        title: 'Survey Completion Issues',
        content: `If you can't complete a survey:
1. Check if survey is still available
2. Verify you're registered for the event
3. Ensure all required fields are filled
4. Check survey deadline hasn't passed
5. Try refreshing the page
6. Clear app cache if needed
7. Contact support if problem continues`
      },
      {
        id: 'download-issues',
        title: 'Download Issues',
        content: `If downloads aren't working:
1. Check your internet connection
2. Ensure media permissions are granted (iOS)
3. Check available storage space
4. Try restarting the app
5. Clear app cache
6. Check file permissions
7. Contact support if downloads fail repeatedly`
      }
    ]
  },
  {
    id: 'account',
    title: 'Account & Settings',
    icon: 'document-text',
    articles: [
      {
        id: 'update-profile',
        title: 'Updating Your Profile',
        content: `To update your profile:
1. Go to Profile page
2. Click "Edit Profile"
3. Update your information
4. Upload a new avatar (optional)
5. Save changes

Required fields cannot be left empty.`
      },
      {
        id: 'change-password',
        title: 'Changing Your Password',
        content: `To change your password:
1. Go to Settings page
2. Click "Change Password"
3. Enter your current password
4. Enter your new password
5. Confirm the new password
6. Save changes

Use a strong password with at least 8 characters.`
      },
      {
        id: 'notifications',
        title: 'Managing Notifications',
        content: `Notification settings:
- Event reminders (24 hours before)
- Survey availability
- Registration confirmations
- System updates

You can manage notification preferences in Settings.`
      },
      {
        id: 'delete-account',
        title: 'Account Deletion',
        content: `To delete your account:
1. Contact support through the Support page
2. Request account deletion
3. Provide reason for deletion
4. Wait for admin approval

Note: This action cannot be undone.`
      },
      {
        id: 'reset-password',
        title: 'Resetting Your Password',
        content: `To reset a forgotten password:
1. Go to Login page
2. Tap "Forgot Password"
3. Enter your email address
4. Check your email for reset link
5. Tap the link in the email
6. Enter your new password
7. Confirm the new password
8. Log in with your new password

Note: Reset links expire after a certain time.`
      },
      {
        id: 'setup-profile',
        title: 'Setting Up Your Profile',
        content: `To complete your profile setup:
1. After signing up, you'll be prompted to set up your profile
2. Enter required information:
   - First Name
   - Last Name
   - Affiliated Organization
3. Upload a profile picture (optional)
4. Review and save your profile

Required fields:
- First Name
- Last Name
- Organization

You can update your profile anytime from the Profile page.`
      },
      {
        id: 'event-details',
        title: 'Understanding Event Details',
        content: `Event detail pages show:
- Event title and description
- Date, time, and venue
- Registration status
- Available actions (Register, View QR, etc.)
- Event materials and resources
- Guest speakers and sponsors
- Survey/evaluation links
- Certificate generation (if available)

Actions available:
- Register/Unregister
- View QR Code (for check-in)
- Take Survey/Evaluation
- Generate Certificate (if eligible)
- View Materials
- Share Event

Use event details to manage your participation.`
      },
      {
        id: 'camera-permissions',
        title: 'Camera and Photo Permissions',
        content: `The app needs permissions for:
- Camera: For QR scanning and taking photos
- Photos: For uploading and saving images

To grant permissions:
1. Go to your device Settings
2. Find the GanApp app
3. Enable Camera and Photos permissions
4. Return to the app

Without permissions:
- QR scanner won't work
- You can't take photos
- Downloads may fail (iOS)

Permissions can be changed anytime in device Settings.`
      }
    ]
  }
];

interface HelpCenterProps {
  visible: boolean;
  onClose: () => void;
}

export default function HelpCenter({ visible, onClose }: HelpCenterProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const router = useRouter();

  const filteredCategories = categories.map(category => ({
    ...category,
    articles: category.articles.filter(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.articles.length > 0);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const getIconName = (iconName: string) => {
    const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      'book': 'book',
      'document-text': 'document-text',
      'chatbubbles': 'chatbubbles',
      'help-circle': 'help-circle',
      'people': 'people',
    };
    return iconMap[iconName] || 'help-circle';
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
            <View style={styles.headerText}>
              <Text style={styles.title}>Help Center</Text>
              <Text style={styles.subtitle}>
                Find answers to common questions and learn how to use GanApp
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for help articles..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Quick Links */}
          <View style={styles.quickLinksContainer}>
            <TouchableOpacity
              style={styles.quickLinkCard}
              onPress={() => {
                onClose();
                setTimeout(() => {
                  router.push('/support' as any);
                }, 250);
              }}
            >
              <Ionicons name="chatbubbles" size={24} color="#1e40af" />
              <Text style={styles.quickLinkTitle}>Contact Support</Text>
              <Text style={styles.quickLinkSubtitle}>Get help from our support team</Text>
            </TouchableOpacity>
            <View style={styles.quickLinkCard}>
              <Ionicons name="videocam" size={24} color="#16a34a" />
              <Text style={styles.quickLinkTitle}>Video Tutorials</Text>
              <Text style={styles.quickLinkSubtitle}>Coming soon</Text>
            </View>
            <View style={styles.quickLinkCard}>
              <Ionicons name="document-text" size={24} color="#9333ea" />
              <Text style={styles.quickLinkTitle}>Documentation</Text>
              <Text style={styles.quickLinkSubtitle}>Detailed guides and API docs</Text>
            </View>
          </View>

          {/* Categories */}
          <View style={styles.categoriesContainer}>
            {filteredCategories.map((category) => (
              <View key={category.id} style={styles.categoryCard}>
                <TouchableOpacity
                  onPress={() => toggleCategory(category.id)}
                  style={styles.categoryHeader}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryHeaderLeft}>
                    <Ionicons
                      name={getIconName(category.icon)}
                      size={24}
                      color="#1e40af"
                    />
                    <View style={styles.categoryHeaderText}>
                      <Text style={styles.categoryTitle}>{category.title}</Text>
                      <Text style={styles.categoryCount}>
                        {category.articles.length} articles
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={expandedCategory === category.id ? 'chevron-down' : 'chevron-forward'}
                    size={24}
                    color="#94a3b8"
                  />
                </TouchableOpacity>

                {expandedCategory === category.id && (
                  <View style={styles.articlesContainer}>
                    {category.articles.map((article) => (
                      <View key={article.id} style={styles.articleCard}>
                        <Text style={styles.articleTitle}>{article.title}</Text>
                        <Text style={styles.articleContent}>{article.content}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* No Results */}
          {searchQuery && filteredCategories.length === 0 && (
            <View style={styles.noResultsContainer}>
              <Ionicons name="help-circle" size={64} color="#cbd5e1" />
              <Text style={styles.noResultsTitle}>No Results Found</Text>
              <Text style={styles.noResultsText}>
                We couldn't find any articles matching "{searchQuery}"
              </Text>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerTitle}>Still Need Help?</Text>
            <Text style={styles.footerText}>
              Can't find what you're looking for? Our support team is here to help!
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 22,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    position: 'absolute',
    top: 16,
    right: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    padding: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  quickLinksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  quickLinkCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickLinkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  quickLinkSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  categoriesContainer: {
    gap: 16,
  },
  categoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryHeaderText: {
    marginLeft: 16,
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 14,
    color: '#64748b',
  },
  articlesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 16,
    gap: 16,
  },
  articleCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#1e40af',
    paddingLeft: 16,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  articleContent: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
  },
  noResultsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 48,
    alignItems: 'center',
    marginTop: 24,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  footer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 32,
    alignItems: 'center',
    marginTop: 32,
  },
  footerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  footerText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
});
