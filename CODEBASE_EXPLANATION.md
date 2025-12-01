# 📘 Kore Codebase Explanation

Welcome to the deep dive of **Kore**. This document explains how the application works under the hood, enabling you to understand, maintain, and extend it with confidence.

---

## 🏗️ High-Level Architecture

Kore is a **Single Page Application (SPA)** built with:
-   **React**: The UI library for building components.
-   **Vite**: The build tool that makes development fast.
-   **Appwrite**: The "Backend-as-a-Service" that handles Database, Authentication, and Storage.
-   **Tailwind CSS**: For styling.

### The "Mental Model"
Think of the app as a collection of **Lego blocks (Components)** that share information through invisible **wires (Contexts)**.

---

## 🧠 The "Brain": Context Providers
Instead of passing data down manually through every component (prop drilling), we use **Contexts**. These wrap the entire app in `App.jsx`, making data available *everywhere*.

### 1. `AuthContext.jsx`
-   **Purpose**: Manages the user's login state.
-   **Key Function**: `checkUserStatus()`. When the app loads, it asks Appwrite "Is anyone logged in?".
-   **If Yes**: It sets `user` state, allowing access to the Dashboard.
-   **If No**: It redirects to the Login screen.

### 2. `TransactionContext.jsx`
-   **Purpose**: The central store for all financial data.
-   **Key Functions**:
    -   `loadTransactions()`: Fetches data from Appwrite Database.
    -   `addTransaction()`: Sends new data to Appwrite *and* updates the local list instantly (Optimistic UI).
    -   `deleteTransaction()`: Removes data.

### 3. `CurrencyContext.jsx`
-   **Purpose**: Handles multi-currency support.
-   **How it works**: It stores the selected currency (e.g., USD, EUR) and provides a `convert()` function to display amounts correctly across the app without changing the underlying data.

### 4. `WallpaperContext.jsx`
-   **Purpose**: Manages the dynamic background.
-   **Key Feature**: It fetches images from an Appwrite Storage Bucket and handles the "Auto-Rotate" logic using `setInterval`.

---

## 🧩 The "Body": Key Components

### `App.jsx` (The Entry Point)
This is the shell. It sets up the Context Providers and decides whether to show the `AuthScreens` (Login/Signup) or the `Layout` (Main App) based on the `user` state.

### `Layout.jsx`
The main container for the authenticated app. It includes:
-   **Navbar**: The top bar with the logo and settings.
-   **Main Content**: Where the Dashboard lives.
-   **Background**: The `NatureBackground` component.

### `Dashboard.jsx`
The heart of the UI. It doesn't fetch data itself; it just *asks* `TransactionContext` for the data and displays it using:
-   **`BudgetGraph`**: An Area Chart showing spending trends.
-   **`SpendingDonut`**: A Donut Chart showing category breakdown.
-   **`TransactionList`**: The scrollable list of recent activity.

### `AddTransactionModal.jsx`
The form for adding money.
-   **Design**: Uses `framer-motion` for the slide-up animation.
-   **Logic**: When you click "Save", it calls `addTransaction` from the Context.

### `AIAssistantModal.jsx` (Kore Agent)
The "Magic" part of the app.
-   **Voice Input**: Uses the browser's `SpeechRecognition` API.
-   **Visualizer**: The `VoiceVisualizer` component creates the "breathing cloud" effect using math-based animations.
-   **Brain**: It sends your text to `services/gemini.js`, which uses Google's AI to parse "Pizza for $10" into `{ amount: 10, category: 'Food' }`.

---

## 🎨 The "Soul": Styling & AI

### Glassmorphism (The "Look")
We achieve the premium, translucent look using Tailwind utility classes:
-   `backdrop-blur-xl`: Blurs what's behind the element.
-   `bg-white/10`: Adds a 10% opaque white layer.
-   `border-white/10`: Adds a subtle, semi-transparent border.

### AI Integration (`services/gemini.js`)
This file is the bridge to Google Gemini.
1.  **Prompt Engineering**: We send a "System Prompt" telling Gemini: *"You are a financial assistant. Extract JSON from this text..."*
2.  **Parsing**: We take Gemini's text response and convert it into a JavaScript object the app can use.

---

## 🔄 Data Flow Example: Adding a Transaction

1.  **User Action**: You click "Save" in `AddTransactionModal`.
2.  **Component**: The modal calls `addTransaction({ amount: 50, ... })`.
3.  **Context**: `TransactionContext` receives this.
    -   It **immediately** adds it to the `transactions` array (so the UI updates instantly).
    -   It **asynchronously** sends it to Appwrite Database to save it permanently.
4.  **Update**:
    -   `Dashboard` sees the `transactions` array changed.
    -   `BudgetGraph` re-renders with the new curve.
    -   `SpendingDonut` updates the category slice.

---

## 📂 Directory Structure

```text
src/
├── components/       # UI Building Blocks (Buttons, Modals, Charts)
├── context/          # State Management (The "Brain")
├── hooks/            # Reusable Logic (useExportData)
├── lib/              # Appwrite Configuration
├── services/         # External APIs (Gemini AI)
├── utils/            # Helper Functions (Formatters)
├── App.jsx           # Main Application Wrapper
└── main.jsx          # React Entry Point
```

This structure keeps the code **modular** (easy to change one part without breaking another) and **scalable** (easy to add new features).
