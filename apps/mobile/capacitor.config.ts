import type { CapacitorConfig } from '@capacitor/cli'

// Inside the Android WebView the app is served from https://localhost: that origin must be in the
// API's CORS_ORIGINS. VITE_API_URL / VITE_MEDIA_URL are baked in at `npm run build`, so build against
// a URL the phone can reach (never localhost).
const config: CapacitorConfig = {
  appId: 'me.kinotest.app',
  appName: 'Kinotest',
  webDir: 'dist',
}

export default config
