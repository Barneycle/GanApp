# GanApp User Manuals Documentation

This directory contains comprehensive user manuals for GanApp Web and Mobile applications, as well as administrator documentation for system administrators.

## Files

- **WEB_USER_MANUAL.md** — Web app (participants and organizers)
- **MOBILE_APP_USER_MANUAL.md** — Mobile app
- **ADMIN_USER_MANUAL.md** — Administrators
- **PDF_GENERATION_GUIDE.md** — How the PDF copies were generated
- **PACKAGE_VERSIONS.md** — Package list snapshot

## Manual Contents

Both manuals include:

1. **Introduction** - Overview of GanApp and user roles
2. **System Requirements** - Minimum and recommended requirements
3. **Getting Started** - Account creation, sign in, and navigation
4. **For Participants** - Complete guide for event participants
5. **For Organizers** - Guide for event organizers
6. **For Administrators** - Administrative features guide
7. **Troubleshooting** - Common issues and solutions
8. **FAQ** - Frequently asked questions
9. **Glossary** - Key terms and definitions

## Generating PDF Versions

See **PDF_GENERATION_GUIDE.md** for detailed instructions on converting Markdown files to PDF.

### Quick PDF Generation Options

**Option 1: Using Pandoc (Recommended)**
```bash
pandoc WEB_USER_MANUAL.md -o WEB_USER_MANUAL.pdf --pdf-engine=xelatex
pandoc MOBILE_APP_USER_MANUAL.md -o MOBILE_APP_USER_MANUAL.pdf --pdf-engine=xelatex
```

**Option 2: Using Online Converters**
- Use online Markdown to PDF converters
- Upload the .md files
- Download the generated PDFs

**Option 3: Using VS Code Extensions**
- Install "Markdown PDF" extension
- Open the .md file
- Right-click and select "Markdown PDF: Export (pdf)"

**Option 4: Using GitHub/GitLab**
- Push files to repository
- View on GitHub/GitLab
- Use browser print to PDF

## Manual Updates

When updating manuals:
1. Update the "Last Updated" date
2. Increment version number if major changes
3. Update table of contents if structure changes
4. Regenerate PDF versions

## Support

For questions about the manuals or to report issues:
- Create a support ticket in GanApp
- Contact your organization administrator

---

**Last Updated:** December 2024

