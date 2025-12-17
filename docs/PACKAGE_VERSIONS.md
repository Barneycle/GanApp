# GanApp Package and Framework Versions

**Last Updated:** December 2024  
**Project Version:** 1.0.0

This document lists all packages, frameworks, and their versions used in the GanApp Web and Mobile applications.

---

## Table of Contents

1. [Core Frameworks](#core-frameworks)
2. [Web Application Dependencies](#web-application-dependencies)
3. [Mobile Application Dependencies](#mobile-application-dependencies)
4. [Shared Dependencies](#shared-dependencies)
5. [Development Dependencies](#development-dependencies)
6. [Build Tools & Configuration](#build-tools--configuration)
7. [System Requirements](#system-requirements)

---

## Core Frameworks

### React
- **Web:** `react@^18.2.0`
- **Mobile:** `react@19.0.0`
- **Root:** `react@19.0.0`

### React DOM
- **Web:** `react-dom@^18.2.0`
- **Mobile:** `react-dom@19.0.0`

### React Native
- **Mobile:** `react-native@0.79.6`

### Expo
- **Mobile:** `expo@~53.0.22`
- **Root:** `expo@~53.0.24`

### TypeScript
- **Web:** `typescript@^5.2.2`
- **Mobile:** `typescript@~5.8.3`

---

## Web Application Dependencies

### Core Framework & Build Tools
- **Vite:** `vite@^5.0.8`
- **React Router:** `react-router-dom@^6.20.1`
- **React Hook Form:** `react-hook-form@^7.48.2`
- **Zod:** `zod@^3.22.4` (validation)
- **Hookform Resolvers:** `@hookform/resolvers@^3.3.2`

### UI Libraries & Icons
- **Lucide React:** `lucide-react@^0.542.0` (icons)
- **Heroicons:** `@heroicons/react@^2.2.0`
- **Framer Motion:** `framer-motion@^12.23.12` (animations)
- **Tailwind CSS:** `tailwindcss@^3.4.17`

### Rich Text Editors
- **TipTap Core:** `@tiptap/react@^3.10.2`
- **TipTap Starter Kit:** `@tiptap/starter-kit@^3.10.2`
- **TipTap Extensions:**
  - `@tiptap/extension-color@^3.10.2`
  - `@tiptap/extension-highlight@^3.10.2`
  - `@tiptap/extension-image@^3.10.2`
  - `@tiptap/extension-link@^3.10.2`
  - `@tiptap/extension-text-align@^3.10.2`
  - `@tiptap/extension-text-style@^3.10.2`
  - `@tiptap/extension-underline@^3.10.2`
- **Quill:** `quill@^2.0.3`
- **React Quill:** `react-quill@^2.0.0`

### Backend & Database
- **Supabase JS:** `@supabase/supabase-js@^2.56.1`
- **Upstash Redis:** `@upstash/redis@^1.35.7`
- **JWT Decode:** `jwt-decode@^4.0.0`

### PDF & Document Generation
- **jsPDF:** `jspdf@^3.0.4`
- **PDF Lib:** `pdf-lib@^1.17.1`
- **HTML2PDF.js:** `html2pdf.js@^0.12.1`
- **HTML2Canvas:** `html2canvas@^1.4.1`

### QR Code Generation
- **QRCode:** `qrcode@^1.5.4`

### Data Processing
- **PapaParse:** `papaparse@^5.5.3` (CSV parsing)
- **XLSX:** `xlsx@^0.18.5` (Excel files)

### Charts & Visualization
- **Recharts:** `recharts@^2.8.0`

### Utilities
- **DOMPurify:** `dompurify@^3.3.1`
- **SweetAlert2:** `sweetalert2@^11.26.10`
- **Type Definitions:**
  - `@types/dompurify@^3.0.5`

---

## Mobile Application Dependencies

### Core Framework
- **Expo Router:** `expo-router@~5.1.5`
- **React Navigation:**
  - `@react-navigation/native@^7.1.6`
  - `@react-navigation/bottom-tabs@^7.3.10`
  - `@react-navigation/drawer@^7.3.9`
  - `@react-navigation/elements@^2.3.8`

### Expo Modules
- **expo-blur:** `~14.1.5`
- **expo-clipboard:** `~7.1.5`
- **expo-constants:** `~17.1.7`
- **expo-document-picker:** `^14.0.7`
- **expo-file-system:** `~18.1.11`
- **expo-font:** `~13.3.2`
- **expo-haptics:** `~14.1.4`
- **expo-image:** `~2.4.0`
- **expo-image-manipulator:** `^14.0.7`
- **expo-image-picker:** `~16.1.4`
- **expo-intent-launcher:** `^13.0.7`
- **expo-linear-gradient:** `^15.0.7`
- **expo-linking:** `~7.1.7`
- **expo-media-library:** `~17.1.7`
- **expo-notifications:** `^0.29.14`
- **expo-router:** `~5.1.5`
- **expo-secure-store:** `~14.2.4`
- **expo-sharing:** `~13.1.5`
- **expo-splash-screen:** `~0.30.10`
- **expo-sqlite:** `^16.0.10`
- **expo-status-bar:** `~2.2.3`
- **expo-symbols:** `~0.4.5`
- **expo-system-ui:** `~5.0.11`
- **expo-web-browser:** `~14.2.0`

### Camera & QR Code
- **React Native Vision Camera:** `react-native-vision-camera@^4.7.2`
- **React Native QR Code SVG:** `react-native-qrcode-svg@^6.3.20`

### Storage & Data
- **Async Storage:** `@react-native-async-storage/async-storage@^2.2.0`
- **Supabase JS:** `@supabase/supabase-js@^2.57.2`
- **JWT Decode:** `jwt-decode@^4.0.0`

### UI Components & Styling
- **NativeWind:** `nativewind@^4.1.23` (Tailwind for React Native)
- **Tailwind CSS:** `tailwindcss@^3.4.17`
- **React Native SVG:** `react-native-svg@^15.15.0`
- **React Native Safe Area Context:** `react-native-safe-area-context@^5.6.1`
- **React Native Screens:** `react-native-screens@~4.11.1`
- **React Native Gesture Handler:** `react-native-gesture-handler@~2.24.0`
- **React Native Reanimated:** `react-native-reanimated@~3.17.4`
- **React Native Web:** `react-native-web@~0.20.0`
- **React Native WebView:** `react-native-webview@13.13.5`
- **React Native Render HTML:** `react-native-render-html@^6.3.4`

### Image Processing
- **React Native Image Picker:** `react-native-image-picker@^8.2.1`
- **React Native Image Resizer:** `react-native-image-resizer@^1.4.5`
- **React Native Image Marker:** `react-native-image-marker@^1.2.9`
- **React Native View Shot:** `react-native-view-shot@^4.0.3`

### Utilities
- **Clipboard:** `@react-native-clipboard/clipboard@^1.16.3`
- **NetInfo:** `@react-native-community/netinfo@^11.4.1`
- **Keyboard Aware Scroll View:** `react-native-keyboard-aware-scroll-view@^0.9.5`
- **MIME:** `mime@^4.1.0`
- **SweetAlert2:** `sweetalert2@^11.26.10`

### Icons
- **Expo Vector Icons:** `@expo/vector-icons@^14.1.0`
- **Heroicons:** `@nandorojo/heroicons@^0.3.0`

### Development Tools
- **Prettier Plugin Tailwind:** `prettier-plugin-tailwindcss@^0.5.14`

---

## Shared Dependencies

### Backend Services
- **Supabase JS:**
  - Web: `@supabase/supabase-js@^2.56.1`
  - Mobile: `@supabase/supabase-js@^2.57.2`

### Authentication & Security
- **JWT Decode:** `jwt-decode@^4.0.0` (both web and mobile)

### UI Components
- **SweetAlert2:** `sweetalert2@^11.26.10` (both web and mobile)
- **Tailwind CSS:** `tailwindcss@^3.4.17` (both web and mobile)

---

## Development Dependencies

### Web Development Dependencies

#### Testing
- **Vitest:** `vitest@^4.0.16`
- **Vitest UI:** `@vitest/ui@^4.0.16`
- **Testing Library React:** `@testing-library/react@^16.3.1`
- **Testing Library Jest DOM:** `@testing-library/jest-dom@^6.9.1`
- **Testing Library User Event:** `@testing-library/user-event@^14.6.1`
- **jsdom:** `jsdom@^27.3.0`

#### Build Tools
- **Vite Plugin React:** `@vitejs/plugin-react@^4.2.1`
- **PostCSS:** `postcss@^8.4.32`
- **Autoprefixer:** `autoprefixer@^10.4.16`

#### Type Definitions
- **@types/react:** `^18.2.43`
- **@types/react-dom:** `^18.2.17`

### Mobile Development Dependencies

#### Build Tools
- **Babel Core:** `@babel/core@^7.25.2`

#### Linting
- **ESLint:** `eslint@^9.25.0`
- **ESLint Config Expo:** `eslint-config-expo@~9.2.0`

#### Type Definitions
- **@types/react:** `~19.0.10`

### Root Development Dependencies
- **rimraf:** `rimraf@^5.0.0` (file deletion utility)

---

## Build Tools & Configuration

### Web Application

#### Build System
- **Vite:** `^5.0.8`
- **Vite Plugin React:** `^4.2.1`

#### CSS Processing
- **PostCSS:** `^8.4.32`
- **Autoprefixer:** `^10.4.16`
- **Tailwind CSS:** `^3.4.17`

#### TypeScript Configuration
- **Target:** ESNext
- **Module:** ESNext
- **JSX:** react-jsx
- **Strict Mode:** Enabled

### Mobile Application

#### Build System
- **Expo SDK:** `53.0.22`
- **Metro Bundler:** Used for web output

#### TypeScript Configuration
- **Extends:** expo/tsconfig.base
- **Strict Mode:** Enabled
- **JSX:** react-jsx

#### Expo Configuration
- **New Architecture:** Enabled
- **Typed Routes:** Enabled (experimental)
- **Orientation:** Portrait
- **iOS Support:** Tablet supported
- **Android Edge-to-Edge:** Enabled

---

## System Requirements

### Node.js & npm
- **Node.js:** `>=16.0.0` (required)
- **npm:** `>=8.0.0` (required)

### Web Application Runtime
- **Modern Browsers:**
  - Chrome 90+
  - Firefox 88+
  - Edge 90+
  - Safari 14+

### Mobile Application Runtime

#### iOS
- **Minimum iOS Version:** iOS 13.0+
- **Devices:** iPhone 6s or later, iPad (5th generation) or later
- **Xcode:** Latest version recommended

#### Android
- **Minimum Android Version:** Android 8.0 (API level 26)+
- **Android Studio:** Latest version recommended

---

## Package Management

### Installation Commands

#### Install All Dependencies
```bash
npm run install:all
```

#### Web Application Only
```bash
cd apps/Web
npm install
```

#### Mobile Application Only
```bash
cd apps/Mobile
npm install
```

### Lock Files
- **Web:** `apps/Web/package-lock.json`
- **Mobile:** `apps/Mobile/package-lock.json`
- **Root:** `package-lock.json`

---

## Version Update Policy

### Major Updates
- Review breaking changes before updating
- Test thoroughly in development environment
- Update documentation if APIs change

### Minor & Patch Updates
- Generally safe to update
- Review changelogs for known issues
- Test critical features after updates

### Security Updates
- Apply immediately
- Review security advisories
- Test affected features

---

## Notes

### Version Differences
- **React:** Web uses React 18.2.0, Mobile uses React 19.0.0
- **Supabase:** Minor version difference between web (2.56.1) and mobile (2.57.2)
- **TypeScript:** Web uses 5.2.2, Mobile uses 5.8.3

### Compatibility
- All packages are compatible with their respective frameworks
- Expo SDK 53 is compatible with React Native 0.79.6
- Vite 5.x supports React 18.x

### Known Dependencies
- Some packages may have peer dependencies not listed here
- Check individual package documentation for complete dependency trees
- Use `npm list` to view installed versions in your environment

---

## Maintenance

### Regular Updates
- Review dependencies monthly for security updates
- Update minor versions quarterly
- Major version updates require thorough testing

### Dependency Audit
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Check outdated packages
npm outdated
```

### Version Pinning
- Production builds should use exact versions or lock files
- Development can use caret (^) or tilde (~) ranges
- Critical packages should be pinned to specific versions

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Maintained By:** GanApp Development Team

