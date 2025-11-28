# Kore - Financial Intelligence 💎

> **The future of personal finance tracking.** Experience a stunning, AI-powered financial companion that blends MacOS aesthetics with cutting-edge web technology.

![Kore Banner](https://images.unsplash.com/photo-1639815188546-c43c240ff4df?q=80&w=2000&auto=format&fit=crop)

## 🌟 Overview

**Kore** is not just a budget tracker; it's an intelligent financial agent. Built with **React**, **Vite**, and **Appwrite**, it offers a seamless, privacy-focused experience that works offline and installs as a native app (PWA).

With its "Glassmorphism" design language, fluid animations, and the powerful **Kore Agent** (powered by Google Gemini), managing your money feels less like a chore and more like interacting with the future.

## ✨ Key Features

### 🧠 Kore Agent (AI Assistant)
-   **Natural Voice Control**: Just say *"Spent $15 on coffee"* and watch it happen.
-   **Smart Parsing**: Powered by **Google Gemini**, it understands context, dates, and categories instantly.
-   **Dynamic Visualizer**: Features a mesmerizing, real-time "Cloud" visualizer that reacts to your voice.
-   **Financial Insights**: Ask questions like *"How much did I spend on food last month?"* and get instant, conversational answers.

### 🎨 Stunning UI/UX
-   **MacOS Glass Aesthetic**: Deep blurs, translucent cards, and subtle gradients create a premium feel.
-   **Fluid Animations**: Powered by **Framer Motion**, every interaction is smooth and responsive.
-   **Dynamic Wallpapers**: The app adapts to your style with auto-rotating, high-quality backgrounds from Unsplash.

### 📱 Mobile-First & PWA
-   **Installable**: Add to your home screen for a native app experience.
-   **Offline Capable**: View your data even without an internet connection.
-   **Haptic Feedback**: Satisfying tactile responses for interactions (on supported devices).

### 📊 Powerful Analytics
-   **Interactive Charts**: Visualize spending trends with Recharts.
-   **Multi-Currency**: Real-time conversion and support for USD, EUR, GBP, RON, and more.
-   **Export Data**: Download your transaction history as PDF or CSV with a single click.

## 🛠️ Tech Stack

-   **Frontend**: [React](https://reactjs.org/), [Vite](https://vitejs.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/)
-   **Backend & Auth**: [Appwrite](https://appwrite.io/)
-   **AI Intelligence**: [Google Gemini API](https://deepmind.google/technologies/gemini/)
-   **Charts**: [Recharts](https://recharts.org/)
-   **Icons**: [Lucide React](https://lucide.dev/)

## 🚀 Getting Started

### Prerequisites
-   Node.js (v18+)
-   Appwrite Account (Cloud or Self-Hosted)
-   Google Gemini API Key

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Drynxx/kore-finance-tracker.git
    cd kore-finance-tracker
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```env
    VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
    VITE_APPWRITE_PROJECT_ID=your_project_id
    VITE_APPWRITE_DATABASE_ID=your_database_id
    VITE_APPWRITE_COLLECTION_ID=your_collection_id
    VITE_APPWRITE_WALLPAPER_BUCKET_ID=your_bucket_id
    VITE_GEMINI_API_KEY=your_gemini_api_key
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

## 📱 PWA Setup
To test the PWA functionality locally:
1.  Build the app: `npm run build`
2.  Preview the build: `npm run preview`
3.  Open in browser and look for the "Install" icon in the address bar.

## 🤝 Contributing
Contributions are welcome! Please fork the repository and submit a Pull Request.

## 📄 License
This project is licensed under the MIT License.

---
*Crafted with ❤️ by the Kore Team*
