# Kore - Smart Finance Tracker 💸

Kore is a modern, high-performance budget tracking application built with **React**, **Vite**, and **Appwrite**. It features a stunning glassmorphic UI, real-time data synchronization, and dynamic wallpaper customization.

![Kore Dashboard](https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=2000&auto=format&fit=crop)

## ✨ Features

-   **📊 Interactive Dashboard**: Visualize your spending with beautiful Area Charts and Donut graphs (powered by Recharts).
-   **💰 Transaction Management**: Add, edit, and categorize income and expenses with ease.
-   **🎨 Dynamic Wallpapers**:
    -   Fetch high-quality wallpapers from Appwrite Storage.
    -   **Auto-Rotate Mode**: Refreshes your background every minute.
    -   **Manual Selection**: Choose your favorite backdrop from the settings.
-   **🌍 Multi-Currency Support**: Switch between USD, EUR, GBP, JPY, and more with real-time UI updates.
-   **🔐 Secure Authentication**: Powered by Appwrite Auth for secure sign-up and login.
-   **📱 Fully Responsive**: Works seamlessly on desktop, tablet, and mobile devices.

## 🛠️ Tech Stack

-   **Frontend**: React, Vite, Tailwind CSS, Framer Motion
-   **Backend**: Appwrite (Auth, Database, Storage)
-   **Icons**: Lucide React
-   **Charts**: Recharts

## 🚀 Getting Started

### Prerequisites

-   Node.js (v16+)
-   Appwrite Account & Project

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/yourusername/wealtify](https://github.com/Drynxx/kore-finance-tracker).git
    cd kore-finance-tracker
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root directory and add your Appwrite credentials:
    ```env
    VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
    VITE_APPWRITE_PROJECT_ID=your_project_id
    VITE_APPWRITE_DATABASE_ID=your_database_id
    VITE_APPWRITE_COLLECTION_ID=your_collection_id
    VITE_APPWRITE_WALLPAPER_BUCKET_ID=your_bucket_id
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
