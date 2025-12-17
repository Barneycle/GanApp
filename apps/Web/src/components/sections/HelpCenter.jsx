import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  BookOpen,
  Search,
  MessageSquare,
  FileText,
  Video,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Users
} from 'lucide-react';

export const HelpCenter = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);

  const categories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <BookOpen size={24} />,
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
- My Certificates: View and download your certificates
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
      icon: <FileText size={24} />,
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
      icon: <Users size={24} />,
      articles: [
        {
          id: 'view-certificates',
          title: 'Viewing Your Certificates',
          content: `To view your certificates:
1. Go to "My Certificates" from the navigation menu
2. Certificates are grouped by event
3. Click on an event to expand and see all certificates
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
1. Go to "My Certificates" page
2. Find the certificate you want to download
3. Click the "PDF" or "PNG" download button
4. The file will download to your device

Available formats:
- PDF: Best for printing and sharing
- PNG: Best for digital use and social media

Note: Both formats may not be available for all certificates.`
        },
        {
          id: 'qr-check-in',
          title: 'Checking In with QR Code',
          content: `To check in to an event using QR code:
1. Go to "My Events" page
2. Find the event you're registered for
3. Click "View QR Code" button
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
1. Go to "My Events" page
2. Find the event with an available survey
3. Click "Take Evaluation" button
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
1. Go to "Albums" page or event details
2. Select the event album
3. Click "Upload Photos" button
4. Select photos from your device
5. Add captions or descriptions (optional)
6. Click "Upload"

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
1. Go to "Albums" page
2. Browse albums by event
3. Click on an album to view all photos
4. View photos in grid or list view
5. Click on a photo to see full size

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
1. Click the notifications icon in the navigation bar
2. View all your notifications
3. Mark notifications as read
4. Click on notifications to view details

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
2. Click "Create New Ticket"
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
3. Click "Verify"
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
      icon: <MessageSquare size={24} />,
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
1. Open the QR Scanner (mobile app only)
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

Note: QR Scanner is only available in the mobile app for organizers.`
        },
        {
          id: 'event-statistics',
          title: 'Viewing Event Statistics',
          content: `To view event statistics:
1. Go to Events page
2. Click "Statistics" on your event
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
2. Click "Generate QR Codes"
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
      icon: <HelpCircle size={24} />,
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
6. Clear browser cache if needed
7. Contact support if problem continues`
        },
        {
          id: 'download-issues',
          title: 'Download Issues',
          content: `If downloads aren't working:
1. Check your internet connection
2. Ensure pop-up blockers are disabled
3. Check available storage space
4. Try a different browser
5. Clear browser cache
6. Check file permissions
7. Contact support if downloads fail repeatedly`
        }
      ]
    },
    {
      id: 'account',
      title: 'Account & Settings',
      icon: <FileText size={24} />,
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
2. Click "Forgot Password"
3. Enter your email address
4. Check your email for reset link
5. Click the link in the email
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
- Take Evaluation
- Generate Certificate (if eligible)
- View Materials
- Share Event

Use event details to manage your participation.`
        }
      ]
    }
  ];

  const filteredArticles = categories.map(category => ({
    ...category,
    articles: category.articles.filter(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.articles.length > 0);

  const toggleCategory = (categoryId) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <HelpCircle size={32} className="text-blue-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Help Center</h1>
          <p className="text-xl text-slate-600 mb-6">
            Find answers to common questions and learn how to use GanApp
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help articles..."
                className="w-full pl-12 pr-4 py-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            to="/support"
            className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <MessageSquare size={24} className="text-blue-600" />
              <ChevronRight size={20} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">Contact Support</h3>
            <p className="text-sm text-slate-600">Get help from our support team</p>
          </Link>

          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <Video size={24} className="text-green-600" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">Video Tutorials</h3>
            <p className="text-sm text-slate-600">Coming soon</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText size={24} className="text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">Documentation</h3>
            <p className="text-sm text-slate-600">Detailed guides and API docs</p>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          {filteredArticles.map((category) => (
            <div key={category.id} className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-blue-600">{category.icon}</div>
                  <div className="text-left">
                    <h2 className="text-xl font-bold text-slate-800">{category.title}</h2>
                    <p className="text-sm text-slate-600">{category.articles.length} articles</p>
                  </div>
                </div>
                {expandedCategory === category.id ? (
                  <ChevronDown size={24} className="text-slate-400" />
                ) : (
                  <ChevronRight size={24} className="text-slate-400" />
                )}
              </button>

              {expandedCategory === category.id && (
                <div className="border-t border-slate-200 p-4 sm:p-6 space-y-4">
                  {category.articles.map((article) => (
                    <div key={article.id} className="border-l-4 border-blue-500 pl-4">
                      <h3 className="font-semibold text-slate-800 mb-2">{article.title}</h3>
                      <div className="text-slate-600 whitespace-pre-line text-sm leading-relaxed">
                        {article.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* No Results */}
        {searchQuery && filteredArticles.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-12 text-center">
            <HelpCircle size={64} className="mx-auto mb-4 text-slate-400" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Results Found</h3>
            <p className="text-slate-600 mb-6">
              We couldn't find any articles matching "{searchQuery}"
            </p>
            <Link
              to="/support"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-900 text-white rounded-xl hover:bg-blue-800 transition-colors font-medium"
            >
              <MessageSquare size={20} />
              <span>Contact Support</span>
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 sm:mt-12 bg-white rounded-xl shadow-lg border border-slate-200 p-4 sm:p-6 lg:p-8 text-center">
          <h3 className="text-xl font-semibold text-slate-800 mb-4">Still Need Help?</h3>
          <p className="text-slate-600 mb-6">
            Can't find what you're looking for? Our support team is here to help!
          </p>
          <Link
            to="/support"
            className="inline-flex items-center space-x-2 px-8 py-4 bg-blue-900 text-white rounded-xl hover:bg-blue-800 transition-colors font-medium text-lg"
          >
            <MessageSquare size={24} />
            <span>Contact Support</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
