# Option 1 – Quick & Easy Mobile Wrapper

## Overview
This approach wraps the existing Next.js web application in a **Capacitor** WebView. The app runs on a local development server (`http://localhost:3000`) and is displayed inside the native Android/iOS container. No server‑side rendering or static export is required.

## Prerequisites
- Node.js (v20+) and npm installed.
- Android SDK (or Xcode for iOS) set up for Capacitor.
- The project already contains `@capacitor/android`, `@capacitor/ios`, and `capacitor.config.json`.

## Steps
1. **Start the Next.js dev server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

2. **Update Capacitor config (already applied)**
   ```json
   {
     "appId": "com.msjantri.antigravity",
     "appName": "MS JANTRI",
     "webDir": "out",
     "server": {
       "url": "http://localhost:3000",
       "cleartext": true
     }
   }
   ```
   The `server.url` tells Capacitor to load the web app from the dev server instead of a bundled `www` folder.

3. **Sync Capacitor plugins**
   ```bash
   npx cap sync
   ```
   This copies the native Android/iOS projects.

4. **Run the app on a device or emulator**
   ```bash
   npx cap open android   # opens Android Studio, then click Run
   # or for iOS
   npx cap open ios       # opens Xcode, then click Run
   ```
   The native app will launch and display the live Next.js site.

5. **Optional – Build for production**
   If you later want a fully bundled app, run `npm run build && npx cap copy` and remove the `server` block from `capacitor.config.json`.

## Notes
- The dev server must be running while the mobile app is open.
- This method bypasses the static‑export limitations (Server Actions, Firebase Admin, etc.).
- Any API calls that require a backend should be reachable from the device (e.g., use public endpoints or expose the server via ngrok for remote testing).

---
**Result**: You can now develop and test the mobile version quickly without refactoring server‑side code.
