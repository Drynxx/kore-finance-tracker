import React, { createContext, useState, useEffect, useContext } from 'react';
import { storage, WALLPAPER_BUCKET_ID } from '../lib/appwrite';

const WallpaperContext = createContext();

export const useWallpaper = () => useContext(WallpaperContext);

export const WallpaperProvider = ({ children }) => {
    const [wallpaperUrl, setWallpaperUrl] = useState(null);
    const [wallpapers, setWallpapers] = useState([]);
    const [isAutoRotating, setIsAutoRotating] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!WALLPAPER_BUCKET_ID) {
            console.warn('Wallpaper Bucket ID not configured');
            setLoading(false);
            return;
        }

        const fetchWallpapers = async () => {
            try {
                const response = await storage.listFiles(WALLPAPER_BUCKET_ID);
                setWallpapers(response.files);

                if (response.files.length > 0) {
                    // Pick a random wallpaper initially
                    const randomFile = response.files[Math.floor(Math.random() * response.files.length)];
                    const url = storage.getFileView(WALLPAPER_BUCKET_ID, randomFile.$id);
                    setWallpaperUrl(url);
                }
            } catch (error) {
                console.error('Failed to fetch wallpapers:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchWallpapers();
    }, []);

    // Rotation Logic
    useEffect(() => {
        if (!isAutoRotating || wallpapers.length === 0) return;

        const interval = setInterval(() => {
            const nextFile = wallpapers[Math.floor(Math.random() * wallpapers.length)];
            const nextUrl = storage.getFileView(WALLPAPER_BUCKET_ID, nextFile.$id);
            setWallpaperUrl(nextUrl);
        }, 60000);

        return () => clearInterval(interval);
    }, [isAutoRotating, wallpapers]);

    const selectWallpaper = (fileId) => {
        const url = storage.getFileView(WALLPAPER_BUCKET_ID, fileId);
        setWallpaperUrl(url);
        setIsAutoRotating(false);
    };

    const enableAutoRotation = () => {
        setIsAutoRotating(true);
        // Trigger immediate change
        if (wallpapers.length > 0) {
            const nextFile = wallpapers[Math.floor(Math.random() * wallpapers.length)];
            const nextUrl = storage.getFileView(WALLPAPER_BUCKET_ID, nextFile.$id);
            setWallpaperUrl(nextUrl);
        }
    };

    return (
        <WallpaperContext.Provider value={{
            wallpaperUrl,
            wallpapers,
            loading,
            isAutoRotating,
            selectWallpaper,
            enableAutoRotation
        }}>
            {children}
        </WallpaperContext.Provider>
    );
};
