/**
 * @file imageStore.ts
 * @description Manages storing and retrieving image Blobs from IndexedDB.
 * This acts as a local cache for menu item images to enable offline access
 * and improve performance.
 * @version 1.0.0
 * @author UltraMax Devs - Nexus
 */
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'UltraMaxPOS-ImageCache';
const STORE_NAME = 'menu-images';
const DB_VERSION = 1;

// Singleton promise to prevent multiple DB initializations
let dbPromise: Promise<IDBPDatabase> | null = null;

const getDb = (): Promise<IDBPDatabase> => {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            },
        });
    }
    return dbPromise;
};

/**
 * Saves an image Blob to the IndexedDB cache.
 * @param id - The ID of the menu item (e.g., product ID).
 * @param blob - The image data as a Blob.
 */
export const saveImageToCache = async (id: number, blob: Blob): Promise<void> => {
    try {
        const db = await getDb();
        await db.put(STORE_NAME, { id, blob });
    } catch (error) {
        console.error('Failed to save image to cache:', error);
    }
};

/**
 * Retrieves an image Blob from the IndexedDB cache.
 * @param id - The ID of the menu item.
 * @returns The image Blob if found, otherwise null.
 */
export const getImageFromCache = async (id: number): Promise<Blob | null> => {
    try {
        const db = await getDb();
        const result = await db.get(STORE_NAME, id);
        return result ? result.blob : null;
    } catch (error) {
        console.error('Failed to retrieve image from cache:', error);
        return null;
    }
};

/**
 * Fetches an image from a URL, caches it, and returns the Blob.
 * If the image is already in cache, it returns the cached version.
 * @param id - The ID of the menu item.
 * @param imageUrl - The URL of the image to fetch.
 * @returns The image Blob or null if fetching fails.
 */
export const fetchAndCacheImage = async (id: number, imageUrl: string): Promise<Blob | null> => {
    // 1. Try to get from cache first
    const cachedImage = await getImageFromCache(id);
    if (cachedImage) {
        return cachedImage;
    }

    // 2. If not in cache, fetch from network
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Network response was not ok for image: ${imageUrl}`);
        }
        const blob = await response.blob();

        // 3. Save the fetched image to cache for next time
        await saveImageToCache(id, blob);

        return blob;
    } catch (error) {
        console.error(`Failed to fetch and cache image ${imageUrl}:`, error);
        return null; // Return null on failure
    }
};