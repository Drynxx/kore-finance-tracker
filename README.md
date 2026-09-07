<p align="center">
  <img src="docs/assets/banner.svg" alt="Kore Financial Intelligence Banner" width="100%" />
</p>

<p align="center">
  <strong>An open-source, privacy-first personal finance tracker featuring natural voice logging, automated banking notification capture, and predictive cash flow analytics.</strong>
</p>

<p align="center">
  <a href="https://github.com/Drynxx/kore-finance-tracker/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="MIT License" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19.2-61DAFB.svg?style=flat-square&logo=react&logoColor=black" alt="React 19" /></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-6.0-646CFF.svg?style=flat-square&logo=vite&logoColor=white" alt="Vite 6" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://appwrite.io/"><img src="https://img.shields.io/badge/Backend-Appwrite-FD366E.svg?style=flat-square&logo=appwrite&logoColor=white" alt="Appwrite" /></a>
  <a href="https://deepmind.google/technologies/gemini/"><img src="https://img.shields.io/badge/AI-Google%20Gemini-4285F4.svg?style=flat-square&logo=google&logoColor=white" alt="Google Gemini" /></a>
  <a href="https://capacitorjs.com/"><img src="https://img.shields.io/badge/Mobile-Capacitor%20Android-119EFF.svg?style=flat-square&logo=capacitor&logoColor=white" alt="Capacitor Android" /></a>
  <img src="https://img.shields.io/badge/PWA-Ready-brightgreen.svg?style=flat-square" alt="PWA Ready" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Interface Showcase](#interface-showcase)
- [Key Capabilities](#key-capabilities)
  - [1. Zero-Friction Transaction Ingestion](#1-zero-friction-transaction-ingestion)
  - [2. Kore Intelligence Voice Engine](#2-kore-intelligence-voice-engine)
  - [3. Predictive Cash Flow & Analytics](#3-predictive-cash-flow--analytics)
  - [4. Data Ownership & Portability](#4-data-ownership--portability)
- [Architecture & Data Pipeline](#architecture--data-pipeline)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Local Installation](#local-installation)
  - [Appwrite Database Schema](#appwrite-database-schema)
- [Native & Mobile Setup](#native--mobile-setup)
  - [Android APK & Auto-Pay Service](#android-apk--auto-pay-service)
  - [iOS 17+ Apple Wallet Shortcut](#ios-17-apple-wallet-shortcut)
  - [Progressive Web App (PWA)](#progressive-web-app-pwa)
- [Configuration Reference](#configuration-reference)
- [Project Documentation](#project-documentation)
- [License](#license)

---

## Overview

**Kore** is an intelligent personal finance platform designed to eliminate manual data entry. Rather than requiring users to manually fill out multi-field expense forms, Kore ingests transactions through three primary zero-friction channels:

1. **Continuous Voice Parsing**: Natural speech parsing powered by Google Gemini (e.g., *"Spent 45 RON on groceries at Mega Image with card"*).
2. **Android Background Notification Listener**: Native Android service running via Capacitor to automatically extract amounts, merchants, and categories from Google Wallet, Google Pay, Revolut, Wise, Monzo, and banking push notifications.
3. **iOS 17+ Apple Wallet Automation**: Apple Shortcuts webhook triggering instant expense logging upon tapping an Apple Pay terminal.

All data is backed by an [Appwrite](https://appwrite.io) backend (cloud or self-hosted), ensuring users maintain complete privacy and ownership over their financial records.

---

## Interface Showcase

### Financial Dashboard & Predictive Forecasting
Full overview showing net balance, category breakdown ("Spending Art"), daily burn velocity, and past 30 days plus 30-day linear projection curve.

<p align="center">
  <img src="docs/screenshots/dashboard.png" alt="Kore Dashboard and Cash Flow Forecast" width="100%" />
</p>

### Voice Intelligence, Ledger, and Auto-Pay Settings

| Kore Voice Assistant | Transaction Ledger | System & Auto-Pay Settings |
|:---:|:---:|:---:|
| <img src="docs/screenshots/ai_assistant.png" alt="Kore Intelligence Voice Assistant" width="100%" /> | <img src="docs/screenshots/transactions.png" alt="Transaction Ledger" width="100%" /> | <img src="docs/screenshots/settings.png" alt="Settings & Auto-Pay Configuration" width="100%" /> |
| *Real-time dynamic voice visualizer & Gemini extraction* | *Categorized history with date segmentation & totals* | *Auto-Pay background listener & appearance preferences* |

---

## Key Capabilities

### 1. Zero-Friction Transaction Ingestion
- **Android `NotificationListenerService`**: Automatically parses transactions from Google Pay, Google Wallet, Revolut, Wise, BT Pay, ING, and Monzo notifications. Writes directly to the Appwrite database when backgrounded, or updates state via local storage queue upon foregrounding.
- **iOS 17+ Apple Wallet Shortcut**: Webhook protocol handler (`web+kore://` and `/quick-log`) compatible with native iOS Apple Wallet automation triggers.
- **Manual Input Modal**: Keyboard entry with category tagging, haptic feedback, and date assignment.

### 2. Kore Intelligence Voice Engine
- **Structured JSON Extraction**: Translates colloquial voice input into typed data (`amount`, `category`, `type`, `date`, `note`, `payment_method`).
- **Conversational Queries**: Answer questions like *"How much did I spend on dining out last month?"* with aggregated context-aware calculations.
- **Bilingual Support**: Native prompt tuning and speech models for English and Romanian (`RO` / `EN` toggle).
- **Acoustic Waveform Feedback**: Dynamic, math-driven audio cloud visualization that pulses with microphone amplitude.
- **Text-to-Speech Output**: Optional conversational auditory feedback powered by ElevenLabs.

### 3. Predictive Cash Flow & Analytics
- **30-Day Forward Forecast**: Computes spending velocity and projects balance trajectory over the next 30 days.
- **Category Donut ("Spending Art")**: Real-time distribution showing top expenditure categories with interactive drill-down.
- **Historical Month Traversal**: Month-by-month historical selector with quick "Show All Time" toggle and monthly reset workflows.
- **Multi-Currency Normalization**: On-the-fly currency conversion supporting USD, EUR, GBP, RON, and more.

### 4. Data Ownership & Portability
- **Self-Hostable**: Compatible with any self-hosted or managed Appwrite instance.
- **One-Click Export**:
  - **PDF Report**: Formatted transaction summary with custom auto-table styling.
  - **CSV Export**: Raw transactional dataset formatted for external spreadsheet analysis.
- **Zero Tracking**: No third-party ad networks, trackers, or telemetry.

---

## Architecture & Data Pipeline

```mermaid
flowchart TD
    subgraph Ingestion["1. Ingestion Layer"]
        A1["Android Notification Listener<br/>(Google Pay, Revolut, Banking)"]
        A2["iOS 17+ Apple Wallet<br/>(Shortcuts Trigger)"]
        A3["Kore Voice Agent<br/>(Web Speech API / Native Mic)"]
        A4["Manual UI Modal<br/>(Form Input)"]
    end

    subgraph Processing["2. Parsing & AI Pipeline"]
        B1["Regex & Heuristic Parsers<br/>(Banking Notifications)"]
        B2["Google Gemini 2.5 / 2.0 API<br/>(Structured JSON Extraction)"]
        B3["OpenRouter Fallback Router"]
        B4["ElevenLabs TTS Service"]
    end

    subgraph Backend["3. Backend & Storage (Appwrite)"]
        C1["Appwrite Auth<br/>(User Sessions)"]
        C2["Appwrite Database<br/>(Transactions Collection)"]
        C3["Appwrite Storage<br/>(Dynamic Wallpapers Bucket)"]
        C4["Capacitor Preferences<br/>(Offline Queue & Settings)"]
    end

    subgraph UI["4. Presentation Layer"]
        D1["React 19 SPA + Vite"]
        D2["Tailwind CSS Glassmorphism"]
        D3["Recharts Cash Flow Forecast"]
        D4["Framer Motion Visualizer"]
    end

    A1 --> B1
    A2 --> D1
    A3 --> B2
    B2 -. fallback .-> B3
    B2 -. response voice .-> B4
    A4 --> D1

    B1 --> C2
    B1 -. app backgrounded .-> C4
    B2 --> C2
    D1 --> C1
    D1 --> C2
    D1 --> C3
    C4 --> D1

    C2 --> D1
    D1 --> D2
    D1 --> D3
    D1 --> D4
```

---

## Technology Stack

| Layer | Technology | Function |
|:---|:---|:---|
| **Frontend Framework** | [React 19](https://react.dev/) | Component hierarchy, state management, and virtual DOM reconciliation |
| **Build Tool** | [Vite 6](https://vitejs.dev/) | Fast HMR dev server and optimized production bundler |
| **Styling** | [Tailwind CSS 3.4](https://tailwindcss.com/) | Utility-first glassmorphism, responsive grid layouts, and dark mode |
| **Animations** | [Framer Motion 12](https://www.framer.com/motion/) | Modals, transitions, and dynamic voice orb visualizer |
| **Charts & Forecasts** | [Recharts 3.5](https://recharts.org/) | Linear cash flow projections and category distribution donut charts |
| **Backend as a Service** | [Appwrite 21](https://appwrite.io/) | User authentication, database documents, and storage buckets |
| **AI Extraction** | [Google Gemini API](https://ai.google.dev/) | Primary LLM for natural language voice parsing and financial queries |
| **Mobile Runtime** | [Capacitor 8](https://capacitorjs.com/) | Native Android runtime, notification listener, and local preferences |
| **Voice Synthesis** | [ElevenLabs API](https://elevenlabs.io/) | Optional conversational text-to-speech audio feedback |
| **Export Engines** | [jsPDF](https://github.com/parallax/jsPDF) & [FileSaver](https://github.com/eligrey/FileSaver.js) | Client-side generation of PDF audit tables and CSV spreadsheets |

---

## Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**
- **Appwrite Instance**: Cloud ([cloud.appwrite.io](https://cloud.appwrite.io)) or self-hosted
- **Google Gemini API Key**: Obtainable from [Google AI Studio](https://aistudio.google.com/)

### Local Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Drynxx/kore-finance-tracker.git
   cd kore-finance-tracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy the example environment template:
   ```bash
   cp .env.example .env
   ```
   Populate `.env` with your Appwrite project credentials and Gemini API key:
   ```env
   VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   VITE_APPWRITE_PROJECT_ID=your_project_id
   VITE_APPWRITE_DATABASE_ID=your_database_id
   VITE_APPWRITE_COLLECTION_ID=transaction
   VITE_APPWRITE_WALLPAPER_BUCKET_ID=your_storage_bucket_id
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5174` (or the port indicated in your console) to view the application.

---

### Appwrite Database Schema

Inside your Appwrite project, create a database and a collection named `transaction` (or your configured `VITE_APPWRITE_COLLECTION_ID`). Define the following attributes:

| Attribute Key | Type | Size / Constraint | Required | Description |
|:---|:---|:---|:---:|:---|
| `userId` | String | 255 chars | Yes | Appwrite Account ID of the document owner |
| `type` | String | 32 chars | Yes | `'expense'` or `'income'` |
| `amount` | Float | Min: `0.01` | Yes | Monetary value of transaction |
| `category` | String | 128 chars | Yes | Expense category (`Food`, `Transport`, `Groceries`, etc.) |
| `date` | String | ISO 8601 (or DateTime) | Yes | Timestamp of transaction occurrence |
| `note` | String | 500 chars | No | Merchant name, note, or tracking source |

#### Recommended Indexes
- **`idx_user_date`**: Key `userId` (ASC), Key `date` (DESC) — optimizes monthly query ranges.

---

## Native & Mobile Setup

### Android APK & Auto-Pay Service
Kore includes native Android code that implements a `NotificationListenerService` (`PaymentNotificationService.java`) to intercept incoming payment pushes from banking applications.

1. **Build and synchronize native Android assets:**
   ```bash
   npm run cap:build
   ```
2. **Open the project in Android Studio:**
   ```bash
   npx cap open android
   ```
3. **Run on a physical device or emulator.**
4. **Grant Notification Access:**
   - In Kore, open **Settings** $\rightarrow$ select the **Auto-Pay** tab.
   - Tap **"Enable Notification Access in Settings"**.
   - Enable **Kore** under Android's *Device & App Notifications* settings.
   - Send a test payment notification to verify automatic capture.

For complete implementation details, review [GOOGLE_AND_APPLE_PAY_TRACKER_GUIDE.md](GOOGLE_AND_APPLE_PAY_TRACKER_GUIDE.md) and [KORE_ANDROID_JAVA_ARCHITECTURE.txt](KORE_ANDROID_JAVA_ARCHITECTURE.txt).

### iOS 17+ Apple Wallet Shortcut
On iOS devices, expense tracking can be triggered instantly upon payment using Apple Shortcuts:
1. Create an automation in the iOS **Shortcuts** app with the **Transaction** trigger (Card: Any Card).
2. Direct the action to open:
   ```text
   web+kore://log?text=[Shortcut Input Amount and Merchant]
   ```
   or send a payload to your deployed Kore `/quick-log` endpoint.
3. Review [OS_SHORTCUTS_GUIDE.md](OS_SHORTCUTS_GUIDE.md) for step-by-step shortcuts configuration.

### Progressive Web App (PWA)
Kore is configured with `vite-plugin-pwa` for offline caching and home-screen installation:
- **Build production PWA**: `npm run build`
- **Preview service worker**: `npm run preview`
- Supports Web Share Target API and custom protocol handling (`web+kore`).

---

## Configuration Reference

| Environment Variable | Required | Default / Description |
|:---|:---:|:---|
| `VITE_APPWRITE_ENDPOINT` | **Yes** | Appwrite API endpoint (e.g., `https://cloud.appwrite.io/v1`) |
| `VITE_APPWRITE_PROJECT_ID` | **Yes** | Your Appwrite project identifier |
| `VITE_APPWRITE_DATABASE_ID` | **Yes** | Database ID containing financial collections |
| `VITE_APPWRITE_COLLECTION_ID` | **Yes** | Collection ID for transactions (e.g., `transaction`) |
| `VITE_APPWRITE_WALLPAPER_BUCKET_ID`| **Yes** | Storage Bucket ID for background wallpapers |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key used for voice parsing and intelligence |
| `OPENROUTER_API_KEY` | No | Optional secondary LLM fallback key |
| `VITE_ELEVENLABS_VOICE_ID` | No | Voice ID for ElevenLabs speech synthesis |
| `VITE_APPWRITE_FUNCTION_ID_GEMINI` | No | Optional Appwrite Cloud Function ID for server-side AI execution |
| `VITE_APPWRITE_FUNCTION_ID_ELEVENLABS` | No | Optional Appwrite Cloud Function ID for audio synthesis |

---

## Project Documentation

Detailed architectural notes and integration guides are available in the repository:
- [CODEBASE_EXPLANATION.md](CODEBASE_EXPLANATION.md) — Comprehensive deep dive into context providers, component architecture, and data flow.
- [GOOGLE_AND_APPLE_PAY_TRACKER_GUIDE.md](GOOGLE_AND_APPLE_PAY_TRACKER_GUIDE.md) — Technical instructions for Android Notification Access and iOS 17 Apple Wallet integration.
- [OS_SHORTCUTS_GUIDE.md](OS_SHORTCUTS_GUIDE.md) — Native OS shortcuts setup for Siri, Android Assistant, and the Action Button.
- [ANDROID_PLAYSTORE_LAUNCH_PLAN.md](ANDROID_PLAYSTORE_LAUNCH_PLAN.md) — Production release and verification plan for Android APK distribution.

---

## Contributing

Contributions are welcome. Please ensure that:
1. Pull requests follow existing code style and pass linting (`npm run lint`).
2. Changes to transaction handling preserve backwards compatibility with the Appwrite collection schema.
3. Mobile changes preserve Android Capacitor build stability (`npm run cap:build`).

---

## License

This project is licensed under the [MIT License](LICENSE).
