# 📱 Complete Step-by-Step Guide: Building & Shipping Your iOS App (`.ipa`) to the Apple App Store

This guide explains how **Capacitor** converts your web app into a native iOS app with **hardware-level screenshot protection** (`@capacitor/privacy-screen`), and how to generate your iOS package (`.ipa`) using **Cloud CI/CD (GitHub Actions / Ionic Appflow)**—without buying or owning a Mac computer.

---

## 🛠️ Step 1: Understanding What Capacitor Does

**Capacitor** is a native runtime built by Ionic that wraps your Next.js application inside an iOS WebKit container.
- It translates your web app (`out/` or live HTTPS URL) into native iOS code.
- It gives your app access to native iPhone hardware features like **Privacy Screen (Screenshot Protection)**, **Push Notifications**, **Camera**, and **Status Bar Styling**.
- Your project is already configured with Capacitor 7 in `capacitor.config.ts` and `@capacitor/privacy-screen` in `package.json`.

---

## 🛡️ Step 2: How Screenshot & Screen Recording Protection Works on iOS

Your project includes `@capacitor/privacy-screen` in `capacitor.config.ts`:

```typescript
// capacitor.config.ts
plugins: {
  PrivacyScreen: {
    enable: true,
    iosBlur: 'dark',
    protected: true
  }
}
```

### What this provides on iPhones & iPads:
1. **App Switcher Obscuration**: Automatically blurs or replaces the screen with a dark security cover when the user switches apps or takes a multi-tasking preview.
2. **Native iOS Screenshot Guard**: Prevents students from capturing video lectures or protected medical summaries.
3. **Hardware Video Protection**: Mutes audio/video output if screen recording or wireless AirPlay mirroring is detected.

---

## ☁️ Step 3: Building Your iOS Package (`.ipa`) on Windows or Linux (No Mac Required!)

Since you are using Windows or Linux, you do **not** need a local Mac. We use **GitHub Actions**, which provides a cloud-hosted macOS virtual machine with Xcode pre-installed for free.

### Option A: Automated Cloud Build via GitHub Actions (Recommended)

1. **Push your code to GitHub**:
   - Push your project repository to GitHub (Public or Private).

2. **Run the Automated Cloud Workflow**:
   - We created the file `.github/workflows/ios-build.yml` in your project.
   - Go to your GitHub repository -> Click the **Actions** tab.
   - Select **Capacitor iOS Cloud IPA Build Pipeline** -> Click **Run workflow**.

3. **Download Your Built Xcode Archive (`.xcarchive` / `.ipa`)**:
   - The cloud macOS runner will compile Next.js, sync Capacitor iOS, run `pod install`, and run `xcodebuild` in the cloud.
   - Once complete (~4-6 minutes), download the built iOS artifact directly from GitHub Actions under **Artifacts**.

---

## 🍏 Step 4: Signing & Uploading to Apple App Store Connect

To submit your app to the App Store or TestFlight:

1. **Get an Apple Developer Account**:
   - Register at [developer.apple.com](https://developer.apple.com) ($99 USD/year).

2. **Generate your App Store Identifier & Certificates**:
   - Register App ID: `site.universeacademy.app` (matching your `appId` in `capacitor.config.ts`).
   - Create an **iOS Distribution Certificate** (`.p12`) and **App Store Provisioning Profile** (`.mobileprovision`).

3. **Upload to App Store Connect / TestFlight**:
   - If using **Ionic Appflow**: Connect your GitHub repository to [Appflow](https://ionicframework.com/appflow). Appflow compiles and automatically uploads the `.ipa` directly to TestFlight with one click.
   - If using a cloud Mac rental (e.g. MacInCloud): Open Xcode -> Window -> Organizer -> Select Archive -> Click **Distribute App** -> **App Store Connect**.

---

## 🚀 Summary Checklist

| Step | Status | Command / Link |
| :--- | :---: | :--- |
| **Capacitor Configured** | ✅ Ready | `capacitor.config.ts` |
| **Screenshot Protection** | ✅ Ready | `@capacitor/privacy-screen` enabled |
| **Cloud Build Workflow** | ✅ Ready | `.github/workflows/ios-build.yml` |
| **Apple Developer Account** | ⏳ Action Required | [developer.apple.com](https://developer.apple.com) |
| **App Store Connect Upload** | ⏳ Action Required | TestFlight Beta / Public Release |
