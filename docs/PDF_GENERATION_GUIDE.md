# PDF Generation Guide

This guide explains how to convert the Markdown user manuals to PDF format.

## Prerequisites

Choose one of the following methods based on your system and preferences.

## Method 1: Using Pandoc (Recommended)

Pandoc is a universal document converter that produces high-quality PDFs.

### Installation

**Windows:**
1. Download Pandoc from https://pandoc.org/installing.html
2. Install the Windows installer
3. Install a LaTeX distribution (MiKTeX or TeX Live) for PDF generation

**macOS:**
```bash
brew install pandoc
brew install --cask basictex
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install pandoc texlive-xetex
```

### Generating PDFs

Navigate to the `docs/` directory and run:

```bash
# Generate Web User Manual PDF
pandoc WEB_USER_MANUAL.md -o WEB_USER_MANUAL.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=1in \
  -V fontsize=11pt \
  --toc \
  --toc-depth=2

# Generate Mobile App User Manual PDF
pandoc MOBILE_APP_USER_MANUAL.md -o MOBILE_APP_USER_MANUAL.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=1in \
  -V fontsize=11pt \
  --toc \
  --toc-depth=2
```

### Customization Options

Add these options for better formatting:

```bash
pandoc WEB_USER_MANUAL.md -o WEB_USER_MANUAL.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=1in \
  -V fontsize=11pt \
  -V documentclass=article \
  --toc \
  --toc-depth=2 \
  --highlight-style=tango \
  -V colorlinks=true \
  -V linkcolor=blue \
  -V urlcolor=blue
```

## Method 2: Using VS Code Extension

### Installation

1. Install VS Code
2. Install the "Markdown PDF" extension by yzane
3. Open the Markdown file
4. Right-click and select "Markdown PDF: Export (pdf)"

### Configuration

Create `.vscode/settings.json` in the docs folder:

```json
{
  "markdown-pdf.styles": [],
  "markdown-pdf.includeDefaultStyles": true,
  "markdown-pdf.displayHeaderFooter": true,
  "markdown-pdf.headerTemplate": "<div style=\"font-size: 10px; text-align: center; width: 100%;\">GanApp User Manual</div>",
  "markdown-pdf.footerTemplate": "<div style=\"font-size: 10px; text-align: center; width: 100%;\"><span class=\"pageNumber\"></span> / <span class=\"totalPages\"></span></div>"
}
```

## Method 3: Using Online Converters

### Recommended Services

1. **Dillinger** (https://dillinger.io/)
   - Open the Markdown file
   - Click "Export as" → "PDF"
   - Download the PDF

2. **Markdown to PDF** (https://www.markdowntopdf.com/)
   - Upload the .md file
   - Click "Convert"
   - Download the PDF

3. **CloudConvert** (https://cloudconvert.com/md-to-pdf)
   - Upload the .md file
   - Convert to PDF
   - Download the result

### Limitations

- May not preserve all formatting
- Table of contents may not be clickable
- Less control over styling

## Method 4: Using GitHub/GitLab

1. Push the Markdown files to a repository
2. View the file on GitHub/GitLab
3. Use browser print function (Ctrl+P / Cmd+P)
4. Select "Save as PDF"
5. Adjust print settings as needed

### Browser Print Settings

- **Layout:** Portrait
- **Paper Size:** A4 or Letter
- **Margins:** Default or Custom
- **Background Graphics:** Enabled
- **Headers and Footers:** As desired

## Method 5: Using Python (markdown-pdf)

### Installation

```bash
npm install -g md-to-pdf
```

### Usage

```bash
md-to-pdf WEB_USER_MANUAL.md
md-to-pdf MOBILE_APP_USER_MANUAL.md
```

## Method 6: Using Docker

If you have Docker installed:

```bash
docker run --rm -v "$PWD:/data" pandoc/latex WEB_USER_MANUAL.md -o WEB_USER_MANUAL.pdf
docker run --rm -v "$PWD:/data" pandoc/latex MOBILE_APP_USER_MANUAL.md -o MOBILE_APP_USER_MANUAL.pdf
```

## Recommended Settings for Professional PDFs

### Page Settings
- **Paper Size:** A4 (8.27" × 11.69") or Letter (8.5" × 11")
- **Margins:** 1 inch (2.54 cm) on all sides
- **Orientation:** Portrait

### Typography
- **Font Size:** 11pt for body text
- **Font Family:** Times New Roman, Arial, or Calibri
- **Line Spacing:** 1.15 or 1.5

### Structure
- **Table of Contents:** Include with page numbers
- **Page Numbers:** Bottom center or bottom right
- **Headers/Footers:** Include document title and page numbers

### Example Pandoc Command with All Options

```bash
pandoc WEB_USER_MANUAL.md -o WEB_USER_MANUAL.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=1in \
  -V fontsize=11pt \
  -V documentclass=article \
  -V fontfamily=times \
  -V linestretch=1.15 \
  --toc \
  --toc-depth=2 \
  --highlight-style=tango \
  -V colorlinks=true \
  -V linkcolor=blue \
  -V urlcolor=blue \
  -V toccolor=blue \
  -V titlepage=true \
  -V title="GanApp Web User Manual" \
  -V author="GanApp Documentation Team" \
  -V date="December 2024"
```

## Troubleshooting

### Pandoc Issues

**Problem:** "xelatex not found"
- **Solution:** Install a LaTeX distribution (MiKTeX or TeX Live)

**Problem:** "Font not found"
- **Solution:** Use `-V fontfamily=times` or install required fonts

**Problem:** Tables not rendering correctly
- **Solution:** Use `--wrap=preserve` option

### VS Code Extension Issues

**Problem:** Extension not generating PDF
- **Solution:** Check that Chrome/Chromium is installed (required)

**Problem:** Styling issues
- **Solution:** Customize CSS in extension settings

### General Issues

**Problem:** PDF too large
- **Solution:** Compress images before conversion or use PDF compression tools

**Problem:** Links not working
- **Solution:** Ensure `colorlinks=true` in Pandoc options

## Quality Checklist

Before finalizing PDFs, check:

- [ ] Table of contents is present and clickable
- [ ] Page numbers are correct
- [ ] All images are included and visible
- [ ] Links work correctly
- [ ] Formatting is consistent
- [ ] No page breaks in awkward places
- [ ] Headers and footers are correct
- [ ] Fonts are readable
- [ ] Margins are appropriate
- [ ] Document metadata is correct

## Automation Script

Create a script to automate PDF generation:

**generate-pdfs.sh (Linux/macOS):**
```bash
#!/bin/bash
pandoc WEB_USER_MANUAL.md -o WEB_USER_MANUAL.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=1in \
  -V fontsize=11pt \
  --toc \
  --toc-depth=2

pandoc MOBILE_APP_USER_MANUAL.md -o MOBILE_APP_USER_MANUAL.pdf \
  --pdf-engine=xelatex \
  -V geometry:margin=1in \
  -V fontsize=11pt \
  --toc \
  --toc-depth=2

echo "PDFs generated successfully!"
```

**generate-pdfs.bat (Windows):**
```batch
@echo off
pandoc WEB_USER_MANUAL.md -o WEB_USER_MANUAL.pdf --pdf-engine=xelatex -V geometry:margin=1in -V fontsize=11pt --toc --toc-depth=2
pandoc MOBILE_APP_USER_MANUAL.md -o MOBILE_APP_USER_MANUAL.pdf --pdf-engine=xelatex -V geometry:margin=1in -V fontsize=11pt --toc --toc-depth=2
echo PDFs generated successfully!
pause
```

Make executable and run:
```bash
chmod +x generate-pdfs.sh
./generate-pdfs.sh
```

---

**Last Updated:** December 2024

