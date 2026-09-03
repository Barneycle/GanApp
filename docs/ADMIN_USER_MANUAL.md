# GanApp Administrator User Manual

**Version:** 1.0  
**Last Updated:** December 2024  
**Audience:** System Administrators Only

---

## Table of Contents

1. [Introduction](#introduction)
2. [System Requirements](#system-requirements)
3. [Getting Started](#getting-started)
4. [Admin Dashboard Overview](#admin-dashboard-overview)
5. [User Management](#user-management)
6. [Event Management](#event-management)
7. [Cancellation Requests](#cancellation-requests)
8. [Analytics & Reports](#analytics--reports)
9. [System Settings](#system-settings)
10. [Notification Management](#notification-management)
11. [Database Maintenance](#database-maintenance)
12. [Activity Logs](#activity-logs)
13. [Organization Management](#organization-management)
14. [Troubleshooting](#troubleshooting)
15. [Security Best Practices](#security-best-practices)
16. [Glossary](#glossary)

---

## Introduction

This manual is designed specifically for **System Administrators** of GanApp. It provides comprehensive documentation for all administrative features and system management capabilities.

### What is GanApp?

GanApp is a comprehensive event management platform that enables organizations to:
- Create and manage events
- Register and track participants
- Generate certificates automatically
- Collect feedback through surveys
- Manage user accounts and permissions
- Monitor system performance and analytics

### Administrator Role

As a System Administrator, you have full access to:
- User account management
- System-wide event management
- Analytics and reporting
- System configuration and settings
- Database maintenance
- Security and access control

**Important:** Administrative actions can significantly impact the system. Always exercise caution and follow best practices outlined in this manual.

---

## System Requirements

### Minimum Requirements

- **Operating System:** Windows 10/11, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **Web Browser:** 
  - Google Chrome 90+ (Recommended)
  - Mozilla Firefox 88+ (Recommended)
  - Microsoft Edge 90+
  - Safari 14+ (macOS)
- **Internet Connection:** Stable broadband connection (minimum 5 Mbps recommended)
- **Screen Resolution:** 1920x1080 or higher (for optimal dashboard viewing)
- **Permissions:** Administrator account with full system access

### Recommended Requirements

- **Web Browser:** Latest version of Google Chrome or Mozilla Firefox
- **Internet Connection:** 10 Mbps or higher
- **Screen Resolution:** 2560x1440 or higher
- **RAM:** 8GB or more
- **Dual Monitor Setup:** Recommended for efficient administration

### Browser Settings

Ensure the following browser settings are enabled:
- Cookies (required for session management)
- Pop-ups (required for reports and exports)
- Local storage

---

## Getting Started

### Accessing the Admin Dashboard

1. Navigate to the GanApp website
2. Sign in with your administrator account credentials
3. Click **"Admin Dashboard"** in the navigation menu
4. You'll be redirected to the Admin Dashboard

**Note:** If you don't see the Admin Dashboard option, verify that:
- Your account has administrator role assigned
- Your profile is complete (First Name, Last Name, Organization)
- You're logged in with the correct account

### First-Time Setup

If this is your first time accessing the admin dashboard:

1. **Complete Your Profile:**
   - Ensure your profile includes First Name, Last Name, and Organization
   - Update your email and contact information
   - Add a profile picture (optional but recommended)

2. **Familiarize Yourself with the Dashboard:**
   - Review the Dashboard overview section
   - Explore each tab to understand available features
   - Review system statistics

3. **Configure System Settings:**
   - Review and configure system settings
   - Set up notification preferences
   - Configure maintenance mode settings (if needed)

### Admin Dashboard Navigation

The Admin Dashboard features a sidebar navigation with the following sections:

- **Dashboard** - System overview and statistics
- **User Management** - Manage all user accounts
- **Event Management** - Manage all events system-wide
- **Cancellation Requests** - Handle event cancellation requests
- **Analytics & Reports** - View system analytics and generate reports
- **System Settings** - Configure system settings
- **Notification Management** - Manage system notifications
- **Database Maintenance** - Database operations and maintenance
- **Activity Logs** - View system activity and audit logs

---

## Admin Dashboard Overview

### Dashboard Statistics

The Dashboard provides a comprehensive overview of system status:

**User Statistics:**
- **Total Users** - Total number of registered users
- **Active Users** - Users who have logged in recently
- **Banned Users** - Users currently banned from the system
- **New Users** - Users registered this month

**Event Statistics:**
- **Total Events** - All events in the system
- **Published Events** - Events currently visible to participants
- **Cancelled Events** - Events that have been cancelled
- **Upcoming Events** - Events scheduled for the future

**Activity Statistics:**
- **Total Registrations** - All event registrations
- **Certificates Generated** - Total certificates created
- **Pending Cancellations** - Cancellation requests awaiting approval
- **Survey Responses** - Total survey/evaluation responses

### Dashboard Features

- **Real-time Updates** - Statistics update automatically
- **Quick Actions** - Access common tasks quickly
- **System Warnings** - Alerts for important system issues
- **Recent Activity** - View recent system events

### Refreshing Dashboard Data

- Click the **"Refresh"** button to update statistics
- Data refreshes automatically every few minutes
- Use manual refresh for immediate updates

---

## User Management

### Viewing Users

1. Go to Admin Dashboard
2. Click **"User Management"** in the sidebar
3. View all users in the system

**User Information Displayed:**
- Name and email address
- User role (Participant, Organizer, Admin)
- Registration date
- Account status (Active/Banned)
- Profile completion status
- Last sign-in date

### Searching and Filtering Users

**Search Options:**
- Search by name
- Search by email address
- Filter by role
- Filter by status (Active/Banned)
- Sort by registration date, name, or email

**How to Search:**
1. Use the search bar at the top
2. Enter name or email
3. Results update automatically

**How to Filter:**
1. Click filter dropdowns
2. Select filter criteria
3. Apply filters
4. Clear filters to reset view

### Creating a New User

1. Go to User Management
2. Click **"Create User"** button
3. Fill in user details:
   - **Email Address** (Required)
   - **Password** (Required - user can change later)
   - **First Name** (Required)
   - **Last Name** (Required)
   - **Role** (Participant, Organizer, or Admin)
   - **Affiliated Organization** (Required)
4. Click **"Create"**
5. User will receive account details via email (if configured)

**Important:** 
- Ensure email addresses are unique
- Use strong passwords
- Assign appropriate roles based on user needs

### Editing User Information

1. Find the user in the user list
2. Click **"Edit"** button
3. Update information:
   - Name
   - Email (requires verification)
   - Organization
   - Profile picture
4. Click **"Save Changes"**

**Note:** Some changes may require user verification.

### Banning Users

**When to Ban a User:**
- Violation of terms of service
- Inappropriate behavior
- Security concerns
- Spam or abuse

**How to Ban a User:**
1. Find the user in User Management
2. Click **"Ban User"** button
3. Select ban duration:
   - **Minutes** - Temporary ban (1-59 minutes)
   - **Hours** - Short-term ban (1-23 hours)
   - **Days** - Medium-term ban (1-30 days)
   - **Months** - Long-term ban (1-11 months)
   - **Years** - Extended ban (1+ years)
   - **Permanent** - Indefinite ban
4. Enter reason for ban (optional but recommended)
5. Click **"Confirm Ban"**

**Effects of Banning:**
- User cannot sign in
- User cannot register for events
- User cannot access their account
- User receives notification of ban

### Unbanning Users

1. Find the banned user
2. Click **"Unban"** button
3. Confirm unban action
4. User can immediately sign in again

**Note:** Review ban reason before unbanning.

### Changing User Roles

**Available Roles:**
- **Participant** - Can register for events and view certificates
- **Organizer** - Can create and manage events
- **Admin** - Full system access (use with caution)

**How to Change Role:**
1. Find the user
2. Click **"Change Role"**
3. Select new role from dropdown
4. Confirm role change
5. User permissions update immediately

**Important:** 
- Changing to Admin grants full system access
- Changing from Admin removes admin privileges
- Document role changes for audit purposes

### Archiving Users

**When to Archive:**
- User requests account deletion
- Long-term inactive accounts
- Compliance requirements

**How to Archive:**
1. Find the user
2. Click **"Archive"** button
3. Confirm archiving
4. User account is archived

**Archived User Effects:**
- Account is hidden from active user list
- User cannot sign in
- Data is retained for compliance
- Can be restored if needed

### Viewing Archived Users

1. Click **"Archived Users"** tab
2. View all archived users
3. Options available:
   - **Restore** - Reactivate user account
   - **Permanently Delete** - Remove user completely (irreversible)

**Warning:** Permanent deletion cannot be undone. Ensure compliance requirements are met before permanent deletion.

---

## Event Management

### Viewing All Events

1. Go to Admin Dashboard
2. Click **"Event Management"** in the sidebar
3. View all events in the system

**Event Information Displayed:**
- Event title and rationale
- Date and time
- Venue location
- Organizer name
- Event status (Draft/Published/Cancelled)
- Participant count
- Registration status

### Searching and Filtering Events

**Search Options:**
- Search by event title
- Search by organizer name
- Filter by status
- Filter by date range
- Filter by venue
- Sort by date, title, or participant count

### Admin Event Actions

As an administrator, you can:

**View Event Details:**
- Click on any event to view full details
- See all registered participants
- View event statistics
- Access event kits and programmes

**Edit Any Event:**
- Click **"Edit"** on any event
- Modify event details
- Change dates, venue, or description
- Update event status

**Cancel Events:**
- Click **"Cancel Event"**
- Enter cancellation reason
- Notify all participants automatically
- Event status changes to "Cancelled"

**Delete Events:**
- Click **"Delete"** (use with caution)
- Confirm deletion
- Event and all associated data are removed

**View Event Statistics:**
- Click **"Statistics"** on any event
- View registration trends
- See attendance rates
- Review survey completion rates

**Manage Participants:**
- View all registered participants
- Export participant list
- Manually check in participants
- Remove participants if needed

### Bulk Event Operations

**Export All Events:**
1. Go to Event Management
2. Click **"Export"** button
3. Choose format (CSV or Excel)
4. Download file with all event data

**Bulk Status Changes:**
- Select multiple events
- Change status in bulk
- Useful for publishing multiple draft events

---

## Cancellation Requests

### Viewing Cancellation Requests

1. Go to Admin Dashboard
2. Click **"Cancellation Requests"** in the sidebar
3. View all pending cancellation requests

**Request Information Displayed:**
- Participant name and email
- Event details (title, date, venue)
- Request date and time
- Cancellation reason
- Request status (Pending/Approved/Rejected)

### Processing Cancellation Requests

**Reviewing Requests:**
1. Click on a cancellation request
2. Review participant information
3. Check event details
4. Read cancellation reason
5. Review participant's registration history

**Approving Requests:**
1. Click **"Approve"** button
2. Add notes (optional)
3. Confirm approval
4. Participant's registration is cancelled
5. Participant receives confirmation notification
6. Event spot becomes available

**Rejecting Requests:**
1. Click **"Reject"** button
2. Enter rejection reason (required)
3. Confirm rejection
4. Participant receives notification
5. Registration remains active

**Bulk Processing:**
- Select multiple requests
- Approve or reject in bulk
- Useful for handling many requests at once

### Cancellation Request Guidelines

**Approve When:**
- Valid reason provided
- Request is timely
- No policy violations
- Participant has legitimate need

**Reject When:**
- Request violates event policy
- Deadline has passed (if applicable)
- Suspicious or fraudulent request
- Event has already started

---

## Analytics & Reports

### Viewing Analytics

1. Go to Admin Dashboard
2. Click **"Analytics & Reports"** in the sidebar
3. View comprehensive system analytics

### Available Reports

**User Growth Report:**
- New user registrations over time
- User growth trends
- Active user statistics
- User retention metrics

**Event Statistics:**
- Total events created
- Events by status
- Events by organizer
- Popular events
- Event completion rates

**Registration Trends:**
- Registration patterns over time
- Peak registration periods
- Registration by event type
- Cancellation rates

**Certificate Generation Stats:**
- Total certificates generated
- Certificates by event
- Generation success rates
- Download statistics

**Survey Response Rates:**
- Survey completion rates
- Response trends
- Popular survey questions
- Response quality metrics

**System Usage Metrics:**
- Platform activity levels
- Feature usage statistics
- Peak usage times
- User engagement metrics

### Generating Reports

**Step-by-Step:**
1. Select report type from dropdown
2. Choose date range:
   - Last 7 days
   - Last 30 days
   - Last 90 days
   - Custom range
   - All time
3. Apply filters (optional):
   - By user role
   - By event
   - By organizer
   - By status
4. Click **"Generate Report"**
5. Wait for report generation
6. Download report in preferred format

**Export Formats:**
- **PDF** - Best for presentations and printing
- **CSV** - Best for data analysis in Excel
- **Excel** - Best for detailed analysis with charts

### Report Scheduling

**Automated Reports:**
- Set up recurring reports
- Schedule daily, weekly, or monthly reports
- Email reports automatically
- Configure report recipients

**Report Storage:**
- Reports are saved in system
- Access historical reports
- Compare reports over time
- Export archived reports

---

## System Settings

### Accessing System Settings

1. Go to Admin Dashboard
2. Click **"System Settings"** in the sidebar
3. View and configure system settings

### Maintenance Mode

**Purpose:** Temporarily disable public access for system maintenance or updates.

**How to Enable:**
1. Go to System Settings
2. Toggle **"Maintenance Mode"** to ON
3. Enter maintenance message (optional):
   - Custom message displayed to users
   - Explain reason for maintenance
   - Provide estimated downtime
4. Click **"Save Settings"**

**Effects:**
- System becomes read-only for non-admins
- Users see maintenance message
- Administrators can still access system
- All admin functions remain available

**How to Disable:**
1. Go to System Settings
2. Toggle **"Maintenance Mode"** to OFF
3. Click **"Save Settings"**
4. System returns to normal operation

**Best Practices:**
- Enable maintenance mode before major updates
- Provide clear maintenance messages
- Notify users in advance when possible
- Keep maintenance periods short
- Test system before disabling

### Email Configuration

**SMTP Settings:**
- Configure email server settings
- Set up email authentication
- Test email delivery
- Configure email templates

**Email Notifications:**
- Enable/disable system emails
- Configure notification types
- Set email frequency limits
- Customize email content

### Notification Preferences

**System Notifications:**
- Configure notification types
- Set notification frequency
- Enable/disable specific notifications
- Configure notification channels

**User Notification Settings:**
- Set default notification preferences
- Configure notification templates
- Manage notification delivery
- Monitor notification status

### Security Settings

**Password Policies:**
- Minimum password length
- Password complexity requirements
- Password expiration (if enabled)
- Password reset policies

**Session Management:**
- Session timeout duration
- Concurrent session limits
- Session security settings
- Sign-in attempt limits

**Access Control:**
- IP whitelisting (if configured)
- Two-factor authentication (if enabled)
- API access controls
- Rate limiting settings

### System Limits

**User Limits:**
- Maximum users (if applicable)
- User registration limits
- Account creation restrictions

**Event Limits:**
- Maximum events per organizer
- Event size limits
- Registration limits per event

**Storage Limits:**
- File upload limits
- Storage quotas
- File retention policies

---

## Notification Management

### Viewing Notifications

1. Go to Admin Dashboard
2. Click **"Notification Management"** in the sidebar
3. View all system notifications

### Notification Types

**Event-Related:**
- Event reminders (24 hours before)
- Registration confirmations
- Event cancellations
- Event updates

**Certificate-Related:**
- Certificate generation complete
- Certificate download notifications
- Certificate verification requests

**System Updates:**
- System maintenance notifications
- Feature updates
- Policy changes
- Security alerts

**User Actions:**
- Account creation
- Profile updates
- Role changes
- Account status changes

### Managing Notifications

**View Notification History:**
- See all sent notifications
- Filter by type, date, or recipient
- View delivery status
- Check notification content

**Notification Templates:**
- Create custom notification templates
- Edit existing templates
- Preview templates before sending
- Test notification delivery

**Manual Notifications:**
- Send notifications to specific users
- Send bulk notifications
- Schedule notifications
- Customize notification content

**Notification Delivery:**
- Monitor delivery status
- View failed deliveries
- Retry failed notifications
- Configure delivery retry settings

### Notification Best Practices

- Keep messages clear and concise
- Include relevant links when appropriate
- Use appropriate notification types
- Avoid notification spam
- Test notifications before bulk sending

---

## Database Maintenance

### Accessing Database Maintenance

1. Go to Admin Dashboard
2. Click **"Database Maintenance"** in the sidebar
3. View database statistics and operations

**Warning:** Database operations can significantly impact system performance. Only perform maintenance during low-traffic periods and ensure you have backups.

### Database Statistics

**Table Statistics:**
- Table sizes
- Record counts per table
- Storage usage
- Growth trends

**Performance Metrics:**
- Query performance
- Index usage
- Connection statistics
- Cache statistics

### Database Operations

**View Table Statistics:**
1. Go to Database Maintenance
2. View table statistics
3. See record counts and sizes
4. Monitor growth trends

**Clean Up Old Data:**
- Remove old archived data
- Clean up expired sessions
- Remove old logs (if configured)
- Archive historical data

**Optimize Database:**
- Rebuild indexes
- Optimize tables
- Clean up fragmentation
- Update statistics

**Backup Database:**
- Create manual backups
- View backup history
- Restore from backup (if configured)
- Configure automatic backups

### Database Maintenance Best Practices

**Before Maintenance:**
- Create full backup
- Notify users if needed
- Schedule during low-traffic periods
- Test on staging environment first

**During Maintenance:**
- Monitor system performance
- Watch for errors
- Keep maintenance windows short
- Document all changes

**After Maintenance:**
- Verify system functionality
- Check performance metrics
- Review error logs
- Update documentation

---

## Activity Logs

### Viewing Activity Logs

1. Go to Admin Dashboard
2. Click **"Activity Logs"** in the sidebar
3. View all system activities

### Log Information

**Logged Activities:**
- User actions (sign in, sign out, registration)
- Event changes (create, edit, cancel, delete)
- Administrative actions (user management, settings changes)
- System events (errors, warnings, maintenance)

**Log Details:**
- **Timestamp** - When the action occurred
- **User** - Who performed the action
- **Action Type** - What action was performed
- **Details** - Specific information about the action
- **IP Address** - User's IP address (if available)
- **Status** - Success or failure

### Filtering Logs

**Filter Options:**
- Filter by user
- Filter by action type
- Filter by date range
- Filter by status (success/failure)
- Search logs by keyword

**How to Filter:**
1. Use filter dropdowns
2. Select filter criteria
3. Enter date range if needed
4. Click "Apply Filters"
5. Use search bar for keyword search

### Log Retention

**Retention Policies:**
- Logs are retained for compliance
- Older logs may be archived
- Critical logs are retained longer
- Review retention policies regularly

**Exporting Logs:**
- Export logs for analysis
- Download logs in CSV format
- Archive logs for compliance
- Share logs with security team if needed

### Audit Trail

**Compliance:**
- Activity logs serve as audit trail
- Required for security audits
- Useful for troubleshooting
- Evidence for policy enforcement

---

## Organization Management

### Viewing Organizations

1. Go to Admin Dashboard
2. Navigate to organization management (if available)
3. View all organizations in the system

### Organization Information

**Organization Details:**
- Organization name
- Organization members
- Organization events
- Organization statistics

### Organization Actions

**Create Organization:**
1. Click **"Create Organization"**
2. Enter organization details:
   - Organization name
   - Description
   - Contact information
3. Assign organization members
4. Save organization

**Edit Organization:**
1. Find the organization
2. Click **"Edit"**
3. Update organization details
4. Save changes

**View Organization Members:**
- See all users in organization
- View member roles
- See member activity
- Manage member permissions

**Archive Organization:**
- Archive inactive organizations
- Retain organization data
- Restore if needed
- Permanently delete (if allowed)

---

## Troubleshooting

### Common Admin Issues

**Problem:** Cannot access Admin Dashboard

**Solutions:**
1. Verify you're logged in with admin account
2. Check that your account has admin role assigned
3. Ensure your profile is complete
4. Clear browser cache and cookies
5. Try a different browser
6. Contact system administrator if issue persists

**Problem:** Statistics not updating

**Solutions:**
1. Click "Refresh" button
2. Wait a few minutes for automatic refresh
3. Check internet connection
4. Clear browser cache
5. Check for system errors in Activity Logs

**Problem:** Cannot perform admin actions

**Solutions:**
1. Verify you have admin permissions
2. Check if maintenance mode is enabled
3. Review Activity Logs for errors
4. Ensure you're using supported browser
5. Contact system administrator

**Problem:** Reports not generating

**Solutions:**
1. Check date range is valid
2. Verify filters are correct
3. Ensure sufficient data exists
4. Try smaller date range
5. Check system resources
6. Review error logs

**Problem:** User management actions failing

**Solutions:**
1. Verify user exists
2. Check user's current status
3. Ensure no conflicting actions
4. Review Activity Logs
5. Try action again
6. Contact support if persistent

### Performance Issues

**Slow Dashboard Loading:**
- Check internet connection
- Clear browser cache
- Close unnecessary tabs
- Check system load
- Contact IT support

**Slow Report Generation:**
- Use smaller date ranges
- Reduce filter complexity
- Generate reports during off-peak hours
- Check database performance
- Contact database administrator

---

## Security Best Practices

### Account Security

**Password Management:**
- Use strong, unique passwords
- Change passwords regularly
- Never share admin credentials
- Use password manager
- Enable two-factor authentication if available

**Session Management:**
- Sign out when finished
- Don't leave admin session open
- Use secure networks only
- Avoid public Wi-Fi for admin access
- Clear browser cache regularly

### Access Control

**Principle of Least Privilege:**
- Only grant admin access when necessary
- Review admin access regularly
- Remove admin access when no longer needed
- Document all access grants

**User Management:**
- Verify user identity before granting access
- Review user actions regularly
- Monitor for suspicious activity
- Ban users promptly when needed

### Data Protection

**Backup Procedures:**
- Create regular backups
- Test backup restoration
- Store backups securely
- Document backup procedures
- Verify backup integrity

**Data Privacy:**
- Follow data protection regulations
- Protect user personal information
- Limit data access to authorized personnel
- Secure data transmission
- Implement data retention policies

### Monitoring and Auditing

**Regular Monitoring:**
- Review Activity Logs regularly
- Monitor system performance
- Check for security alerts
- Review user activities
- Monitor failed sign-in attempts

**Audit Procedures:**
- Maintain audit trail
- Document all admin actions
- Review audit logs periodically
- Report security incidents
- Conduct security audits

### Incident Response

**Security Incidents:**
- Report incidents immediately
- Document incident details
- Preserve evidence
- Follow incident response procedures
- Notify relevant parties

**Data Breaches:**
- Contain breach immediately
- Assess impact
- Notify affected users
- Report to authorities if required
- Review and improve security

---

## Glossary

**Admin Dashboard** - Administrative interface for system management

**Activity Log** - Record of all system activities and user actions

**Archive** - Move user or data to inactive storage while retaining information

**Ban** - Temporarily or permanently restrict user access to the system

**Cancellation Request** - Participant request to cancel event registration

**Dashboard** - Overview page showing system statistics and key metrics

**Database Maintenance** - Operations to optimize and maintain database performance

**Maintenance Mode** - System state where public access is restricted for maintenance

**Notification Management** - System for managing and sending notifications to users

**Organization** - Group of users belonging to the same institution or company

**Role** - User permission level (Participant, Organizer, Admin)

**System Settings** - Configuration options for system behavior and features

**User Management** - Administrative functions for managing user accounts

**Activity Log** - Comprehensive record of all system activities

**Audit Trail** - Complete history of administrative actions for compliance

**Backup** - Copy of system data for recovery purposes

**Session** - User's active sign-in period

**Two-Factor Authentication** - Security method requiring two forms of verification

---

## Additional Resources

- **Support:** Contact technical support for assistance
- **Documentation:** Refer to technical documentation for advanced features
- **Training:** Attend administrator training sessions
- **Updates:** Stay informed about system updates and new features

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Confidential:** This document is intended for System Administrators only

