# 💳 Kore Payment Notification Tracker Guide (Google Pay & Apple Pay)

This guide explains how **Kore - Financial Intelligence** tracks transactions in real-time from **Google Pay** on Android (via the native APK background notification service) and **Apple Pay** on iOS (via iOS 17+ Apple Wallet Automations).

---

## 🤖 1. Android Native APK (Google Pay & Banking Notifications)

### 🌟 How It Works
Android provides a native OS permission called `BIND_NOTIFICATION_LISTENER_SERVICE`. 
When Kore runs as an Android application, its background `PaymentNotificationService`:
1. **Passively monitors incoming notifications** from:
   - **Google Wallet / Google Pay** (`com.google.android.apps.walletnfcrel`)
   - **Google Play Services** (`com.google.android.gms`)
   - **Revolut** (`com.revolut.revolut`)
   - **Wise** (`com.transferwise.android`)
   - **BT Pay, ING, Chase, Monzo**, and banking alerts.
2. **Parses Transaction Details**:
   - Extracts the transaction amount (e.g., `$14.50`, `45.00 RON`, `€12.99`).
   - Identifies the merchant (e.g., Starbucks, Mega Image, Uber, Amazon).
   - Auto-assigns the category (*Food & Dining*, *Groceries*, *Transportation*, *Shopping*, etc.).
3. **Persists to Appwrite Database**:
   - If the app is open: Logs directly via Appwrite SDK and updates state in real-time.
   - If the app is closed: Directly writes via background HTTP REST API, or queues in local `SharedPreferences` to sync instantly on next app launch.
4. **Fires a Confirmation Notification**:
   - Sound & heads-up alert: `✅ Logged: -$14.50 • Starbucks (Food & Dining)`
   - Tapping the notification takes you directly into Kore.

---

### 🚀 Step-by-Step Android Setup

1. **Install the Kore APK** on your Android device (generated via GitHub Actions or local build).
2. Open **Kore** $\rightarrow$ Tap the **Settings** (gear) icon in the top right.
3. Switch to the **⚡ Auto-Pay** tab.
4. If permission is required, tap **"Enable Notification Access in Settings"**.
5. In Android's **Device & App Notifications** screen:
   - Find **Kore**.
   - Toggle **Allow Notification Access** $\rightarrow$ Tap **Allow**.
6. Tap **"Test Google Pay Notification"** in the Auto-Pay tab to verify the parser!

---

## 🍎 2. Apple iOS (Apple Pay & iOS 17+ Wallet Automation)

### 🛡️ The iOS Architecture Difference
Because iOS is strictly sandboxed for user privacy, Apple does not allow any 3rd-party app to read notifications from other apps. 

**However**, starting in **iOS 17**, Apple added a native **Apple Wallet "Transaction" Trigger** inside the Apple Shortcuts app. This allows your iPhone to automatically send the transaction into Kore the instant you tap your phone to pay with Apple Pay!

---

### 🛠️ Step-by-Step Apple Pay Shortcut Setup

1. Open the **Shortcuts** app on your iPhone.
2. Tap the **Automation** tab at the bottom $\rightarrow$ Tap **+** (New Automation).
3. Scroll down and tap **Transaction**:
   - **Card**: *Any Card*
   - **Category**: *Any Category*
   - **Merchant**: *Any Merchant*
4. Under "When", select **Run Immediately** (and turn off "Notify When Run" if you don't want duplicate popups).
5. Tap **Next** $\rightarrow$ Choose **New Blank Automation** $\rightarrow$ Tap **Add Action**.
6. Search for **Open URLs** (or **Get Contents of URL**):
   - In the URL field, enter:
     ```text
     web+kore://log?text=Spent [Amount] [Currency] at [Merchant]
     ```
   - *(Tap the variable suggestions above your keyboard to insert the dynamic `Amount`, `Currency`, and `Merchant` variables provided by the Apple Pay trigger)*.
7. Tap **Done** in the top right corner!

Now, whenever you double-click your iPhone's side button and pay with Apple Pay at any terminal, your iPhone immediately passes the transaction into Kore and auto-categorizes it!

---

## 📦 3. Building the Android APK

### Option A: GitHub Actions 1-Click Cloud Build (Recommended)
We have configured `.github/workflows/build-apk.yml`.
1. Push the repository to GitHub:
   ```bash
   git add .
   git commit -m "Add Capacitor Android APK build and Google Pay notification tracker"
   git push origin main
   ```
2. On GitHub, go to the **Actions** tab.
3. Select **Build Kore Android APK** $\rightarrow$ Click **Run workflow**.
4. Once completed, download `kore-debug-apk` from the **Artifacts** section and install it directly on your Android phone!

### Option B: Local Android Build (Android Studio / Gradle)
If you install Android Studio on your PC:
```powershell
npm run cap:build
npx cap open android
```
In Android Studio: Tap **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
