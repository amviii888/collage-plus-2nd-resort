# Capacitor iOS GitHub Handover & App Store Connect Deployment Plan

A comprehensive architectural roadmap and step-by-step handover package for preparing your GitHub repository so your publisher can clone the code, run cloud builds, and publish directly to Apple App Store Connect and TestFlight via web portal.

## Confirmed Handover Decisions

- **Repository Access**: GitHub repository distribution allowing the publisher to clone and build directly.
- **Publisher Environment**: Web-only App Store Connect portal access (no local Mac/Xcode required).
- **Handover Documentation**: Complete step-by-step guide covering GitHub setup, automated cloud `.ipa` builds, TestFlight beta distribution, and App Store Connect publishing.
- **Native Security Features**: Native iOS Privacy Screen & Screenshot Protection enabled via `@capacitor/privacy-screen`.

---

## 1. Overview & Core Concept

### What It Delivers
This plan prepares your codebase for seamless GitHub handover and configures an automated GitHub Actions CI/CD workflow (`ios-build-appstore.yml`) running on Apple macOS cloud runners. 

When your publisher pushes code or triggers the workflow on GitHub, the pipeline:
1. Builds the Next.js web app static export (`npm run build`).
2. Syncs native Capacitor iOS files (`npx cap sync ios`).
3. Signs the iOS bundle using Apple Developer API key credentials.
4. Uploads the compiled `.ipa` binary directly to **Apple App Store Connect / TestFlight**.

Your publisher can manage builds, invite beta testers, and submit the app for review entirely through their web browser on the **App Store Connect web portal** without ever needing a physical Mac.

---

## 2. Technical Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    1. GITHUB REPOSITORY (HANDOVER)                          │
│                                                                             │
│   Publisher Clones Repo  ──>  Pushes Commit or Triggers Action             │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│             2. AUTOMATED GITHUB ACTIONS CLOUD BUILD (MACOS RUNNER)          │
│                                                                             │
│   ├── Next.js Static Export (`npm run build`)                              │
│   ├── Capacitor iOS Sync (`npx cap sync ios`)                              │
│   ├── Native Screenshot Guard Injection (`@capacitor/privacy-screen`)       │
│   ├── Import Apple App Store Connect Auth Key (`.p8`)                      │
│   └── Xcode Cloud Compilation & Sign (`xcodebuild -exportArchive`)          │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│            3. APP STORE CONNECT WEB PORTAL (PUBLISHER MANAGED)              │
│                                                                             │
│   TestFlight Beta Build Appears  ──>  Submit for App Store Review (Browser)│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Execution Blueprint

### Phase A: Local Repository & Capacitor Setup
1. **Capacitor Configuration (`capacitor.config.json`)**:
   - Set `appId: "com.mol5saty.app"` (or your publisher's Apple App ID).
   - Set `appName: "Mol5saty"`.
   - Ensure `webDir: "out"` for Next.js static export alignment.
2. **Native iOS Screenshot Guard**:
   - Verify `@capacitor/privacy-screen` is initialized in `capacitor.config.json` and native layout wrappers.

### Phase B: Automated Cloud Build Pipeline (`.github/workflows/ios-appstore.yml`)
1. **Configure GitHub Secrets**:
   - `APP_STORE_CONNECT_API_KEY`: App Store Connect API Key (`.p8` file content).
   - `APP_STORE_CONNECT_KEY_ID`: Key ID from Apple Developer.
   - `APP_STORE_CONNECT_ISSUER_ID`: Issuer ID from Apple Developer.
2. **Workflow Execution Steps**:
   - Setup Node.js & CocoaPods dependencies.
   - Run Next.js static build (`npm run build`).
   - Run Capacitor iOS sync (`npx cap sync ios`).
   - Run `xcrun altool` or `xcrun app-store-connect` to deliver `.ipa` package directly to TestFlight.

### Phase C: Publisher Handover Guide Document (`HANDOVER_IOS.md`)
1. Create a clean `HANDOVER_IOS.md` in the repository root explaining:
   - How to link their Apple Developer account.
   - How to set the 3 GitHub secrets.
   - How to trigger the cloud build from GitHub Actions tab.
   - How to release the build to users on App Store Connect web interface.

---

## 4. Key Product & Security Decisions

- **Decision 1: Direct TestFlight Cloud Upload**:
  - *Chosen Approach*: Automated `xcrun app-store-connect` upload in GitHub Actions.
  - *Why*: Allows publisher to manage TestFlight beta testing and App Store submission entirely via browser without Xcode or a Mac.
- **Decision 2: Clear Repository Documentation**:
  - *Chosen Approach*: Include root `HANDOVER_IOS.md` and repository setup scripts.
  - *Why*: Gives publisher an instant 5-minute setup experience when cloning the repo.
