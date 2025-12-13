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
- Profile: Manage your account settings
- Albums: View event photos
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
