# Mol5saty iOS Native Project Build Guide

## 📱 App Credentials & Details
- **App Name**: `Mol5saty`
- **Bundle Identifier (App ID)**: `com.mol5saty.app`
- **Remote Production Web Target**: `https://collage-plus-2nd-resort.vercel.app/`
- **Capacitor Version**: 8.5+ with Swift Package Manager (SPM)

---

## 🔒 Implemented & Pre-Configured Features

### 1. Hardware-Level Screenshot & Screen Recording Protection
- **File**: `ios/App/App/SceneDelegate.swift` (contains `HardwareSecurityManager`)
- **Mechanism**: Attaches window layer under iOS FairPlay secure surface (`UITextField.isSecureTextEntry` canvas).
- **Result**: Any screenshot taken (Power + Vol Up) or screen recording (Control Center, AirPlay, QuickTime) is rendered **pitch black** at the Apple GPU/compositor level.
- **Recording Observer**: `UIScreen.capturedDidChangeNotification` automatically blankets the screen with black if recording starts.

### 2. Full Firebase & API Network Access
- **Files**: `capacitor.config.ts`, `ios/App/App/capacitor.config.json`, `ios/App/App/Info.plist`
- `limitsNavigationsToAppBoundDomains`: set to `false` (WebKit will NOT block Firebase Auth/Firestore).
- `allowNavigation`: whitelisted `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `firestore.googleapis.com`, `*.googleapis.com`, `*.firebaseapp.com`, `*.firebaseio.com`, `*.firebasestorage.app`.
- `Info.plist`: configured with `NSAppTransportSecurity` -> `NSAllowsArbitraryLoads: true`.

### 3. iPhone Virtual Keyboard Guard Bypass
- Web client guard `ScreenProtectionGuard.tsx` bypasses mobile blur and keyboard height changes so entering passwords or typing on iOS never triggers warnings or blackouts.

---

## 🛠️ Step-by-Step Xcode Build & TestFlight Submission

1. **Unzip the Project**:
   Ensure the `ios/` folder is on your Mac.
2. **Open in Xcode**:
   Double click `ios/App/App.xcodeproj` or run:
   ```bash
   xed ios/App
   ```
3. **Configure Signing**:
   - In Xcode, select the **App** project on the left sidebar.
   - Go to **Signing & Capabilities**.
   - Check **Automatically manage signing**.
   - Select your Apple Developer **Team**.
   - Verify Bundle Identifier is `com.mol5saty.app`.
4. **Increment Version / Build**:
   - In **General** tab:
     - Set **Version** (e.g. `1.0.1` or `1.0.2`).
     - Set **Build** (e.g. `2` or higher than previous submission).
5. **Archive & Upload**:
   - In Xcode menu, select target device: **Any iOS Device (arm64)**.
   - Click **Product** -> **Archive**.
   - Once the Organizer opens, click **Distribute App** -> **TestFlight & App Store**.
   - Follow prompts to upload to App Store Connect.
