# 📱 Mol5saty (Universe Academy) — iOS App Store & TestFlight Handover Guide

This comprehensive guide is prepared specifically for publishers and developers who receive **GitHub repository access** to build, release, and distribute the **Mol5saty** mobile application on the **Apple App Store** and **TestFlight**—even without owning a physical Mac computer.

---

## 🔒 Native Protection & App Security Features Included
- **Native iOS Privacy Screen (`@capacitor/privacy-screen`)**: Automatically blurs/obscures app screens in the iOS App Switcher when multitasking.
- **Hardware Screenshot & Screen Capture Guard**: Real-time detection and shielding of lecture videos, medical handouts, and university summaries.
- **Dynamic Moving Watermark Overlay**: Dynamic student name, device barcode, and QR code moving across video playback views.

---

## 🚀 Quick Setup Overview for Web-Only Publishers (No Mac Required)

You can build and submit the app directly from your web browser using **GitHub Actions Cloud macOS Runners** and **App Store Connect Web Portal**.

```
1. Clone GitHub Repository  ──>  2. Link Apple Developer API Keys in GitHub Secrets  ──>  3. Click "Run Workflow"  ──>  4. Distribute via TestFlight Web Portal
```

---

## 🛠️ Step 1: Create App Store Connect API Key (5 Minutes)

1. Log in to [App Store Connect Web Portal](https://appstoreconnect.apple.com/).
2. Navigate to **Users and Access** ➔ **Integrations** ➔ **App Store Connect API**.
3. Click **+ (Generate API Key)**:
   - **Name**: `GitHub CI/CD Builder`
   - **Access**: `Admin` or `App Manager`
4. Download the generated Private Key file (`AuthKey_XXXXXXXXXX.p8`). *Note: Apple only allows downloading this file once!*
5. Copy the **Key ID** (e.g., `AB123CD45E`) and **Issuer ID** (e.g., `69a6eb8d-XXXX-XXXX-XXXX-XXXXXXXXXXXX`).

---

## 🔑 Step 2: Configure GitHub Repository Secrets

In your cloned **GitHub Repository**:
1. Go to **Settings** ➔ **Secrets and variables** ➔ **Actions**.
2. Click **New repository secret** and add the following 3 variables:

| Secret Name | Description / Value |
| :--- | :--- |
| `APP_STORE_CONNECT_API_KEY` | Paste the complete text content of your downloaded `.p8` key file. |
| `APP_STORE_CONNECT_KEY_ID` | Paste your 10-character Key ID from Apple Developer. |
| `APP_STORE_CONNECT_ISSUER_ID` | Paste your Apple Developer Issuer ID GUID. |

*(Optional for signing)*: You can also add `BUILD_CERTIFICATE_BASE64`, `P12_PASSWORD`, and `BUILD_PROVISION_PROFILE_BASE64` if using custom manual distribution profiles.

---

## ⚡ Step 3: Trigger Cloud iOS Build in GitHub Actions

1. In your GitHub Repository, click the **Actions** tab at the top.
2. Select **Build and Upload iOS App to TestFlight / App Store Connect** from the left sidebar.
3. Click **Run workflow** ➔ Select branch `main` ➔ Click **Run workflow**.
4. GitHub Actions will provision an Apple macOS runner, run `npm run build`, sync Capacitor iOS, compile the app, and deliver the build directly to your Apple App Store Connect account.

---

## 📦 Step 4: Submit & Distribute via App Store Connect Portal

1. Log in to [App Store Connect](https://appstoreconnect.apple.com/) on your browser.
2. Go to **My Apps** ➔ Select **Mol5saty (Universe Academy)**.
3. Select **TestFlight**:
   - Your automated build from GitHub Actions will appear under **iOS Builds**.
   - Add internal or external beta testers with a single click.
4. Select **App Store**:
   - Attach the uploaded build under the **Build** section.
   - Complete App Privacy information, Screenshots, and Description.
   - Click **Submit for Review**.

---

## 💻 Optional: Local Xcode Build Guide (If you have a Mac)

If you or your team member owns a local Mac computer with Xcode installed:

```bash
# 1. Clone repo & install dependencies
git clone <your-repo-url>
cd nextn
npm install

# 2. Build static Next.js export & sync Capacitor
npm run build
npx cap sync ios

# 3. Open project natively in Xcode
npx cap open ios
```

In Xcode:
1. Select the top **App** target ➔ **Signing & Capabilities**.
2. Select your **Apple Developer Team**.
3. Select **Product ➔ Archive** ➔ Click **Distribute App** to upload to App Store Connect.

---

## 📞 Support & Contacts
For technical questions or custom iOS build support, contact the Mol5saty Development Architecture Team.
