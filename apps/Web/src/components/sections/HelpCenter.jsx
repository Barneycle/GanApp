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
  ExternalLink
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
- Profile: Manage your account settings
- Albums: View event photos
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
                className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
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
                <div className="border-t border-slate-200 p-6 space-y-4">
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
        <div className="mt-12 bg-white rounded-xl shadow-lg border border-slate-200 p-8 text-center">
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
