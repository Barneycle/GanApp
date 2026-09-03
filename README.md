# GanApp Monorepo

A monorepo containing the GanApp web application, mobile app, and shared packages.

## 🏗️ Project Structure

```
ganapp/
├── Apps/
│   ├── Web/                 # React + Vite web application
│   └── Mobile/              # React Native + Expo mobile app
├── packages/
│   └── shared/              # Shared utilities, services, and Supabase client
├── package.json             # Root monorepo configuration
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 16.0.0
- npm >= 8.0.0

### Installation
```bash
# Install all dependencies and build shared package
npm run install:all
```

### Development

#### Web App
```bash
# Start web development server
npm run dev:web
```

#### Mobile App
```bash
# Start mobile development server
npm run dev:mobile
```

#### Shared Package
```bash
# Build shared package
npm run build:shared

# Watch mode for shared package
npm run dev --workspace=@ganapp/shared
```

## 📦 Available Scripts

### Root Level Commands
- `npm run dev:web` - Start web development server
- `npm run dev:mobile` - Start mobile development server
- `npm run build:shared` - Build shared package
- `npm run build:web` - Build web application
- `npm run build:mobile` - Build mobile application
- `npm run build:all` - Build shared package and web app
- `npm run clean:shared` - Clean shared package build
- `npm run clean:all` - Clean all build artifacts
- `npm run install:all` - Install dependencies and build shared package
- `npm run update:shared` - Rebuild shared package and restart web dev

### Workspace Commands
- `npm run dev --workspace=ganapp-web` - Web app dev server
- `npm run build --workspace=ganapp-web` - Build web app
- `npm run start --workspace=ganapp-mobile` - Mobile app dev server
- `npm run build --workspace=@ganapp/shared` - Build shared package

## 🔧 Shared Package

The `@ganapp/shared` package contains:
- **Supabase Client** - Database connection and configuration
- **Services** - EventService, AuthService, UserService, etc.
- **Types** - Shared TypeScript interfaces
- **Utilities** - Common helper functions

### Using Shared Package
```typescript
// In web or mobile apps
import { EventService, AuthService } from '@ganapp/shared';
import { supabase } from '@ganapp/shared/supabase';

// Use services
const events = await EventService.getPublishedEvents();
```

## 🏠 Apps

### Web App (`Apps/Web/`)
- **Framework**: React + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **State**: React Context + Hooks

### Mobile App (`Apps/Mobile/`)
- **Framework**: React Native + Expo
- **Styling**: NativeWind (Tailwind for React Native)
- **Navigation**: Expo Router
- **Camera**: react-native-vision-camera

## 🔄 Development Workflow

1. **Make changes to shared package** in `packages/shared/`
2. **Rebuild shared package**: `npm run build:shared`
3. **Restart development servers** to pick up changes
4. **Test changes** in both web and mobile apps

## 📝 Notes

- The shared package must be rebuilt after changes for apps to see updates
- Use `npm run update:shared` to quickly rebuild and restart web dev
- Both apps reference the shared package via `file:../../packages/shared`
- Environment variables should be set in each app's `.env.local` file

## 🐛 Troubleshooting

### Shared Package Not Updating
```bash
# Clean and rebuild
npm run clean:shared
npm run build:shared
# Restart dev servers
```

### Dependency Issues
```bash
# Clean all and reinstall
npm run clean:all
npm run install:all
```

### Build Errors
- Ensure shared package builds successfully first
- Check TypeScript compilation in shared package
- Verify workspace references in package.json files
