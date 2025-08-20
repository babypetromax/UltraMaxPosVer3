/**
 * @file store.ts
 * @description Centralized Zustand store for UltraMax POS state management.
 * @version 2.1.0 (Patched)
 * @author UltraMax Devs - Reacto & Nexus
 */
import { create } from 'zustand';
import { GoogleGenAI } from "@google/genai";
import {
    MenuItem, ShopSettings, DailyData, Shift, MenuCache, Order,
    KitchenOrder, LogEntry, CashDrawerActivity, CartItem
} from '../types';
import { getYYYYMMDD } from '../helpers';
import {
    GOOGLE_SHEET_WEB_APP_URL, DAILY_DATA_KEY_PREFIX, LOCAL_STORAGE_MENU_CACHE_KEY,
    MENU_CACHE_TTL, SYNC_INTERVAL, LOCAL_STORAGE_FAVORITES_KEY,
    LOCAL_STORAGE_SHOP_SETTINGS_KEY, LOCAL_STORAGE_SHIFT_HISTORY_KEY
} from '../constants';

// We'll keep a reference to the notification hook for use inside the store
let _showNotification: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void = (msg, type) => console.log(`[${type?.toUpperCase()}] ${msg}`);
export const useNotificationInStore = (showNotification: any) => {
    _showNotification = showNotification;
};

// --- Slice Interfaces ---

interface MenuSlice {
    menuItems: MenuItem[];
    categories: string[];
    activeCategory: string;
    favoriteIds: Set<number>;
    isMenuLoading: boolean;
    menuError: string | null;
    setActiveCategory: (category: string) => void;
    toggleFavorite: (itemId: number) => void;
    fetchMenuData: (force?: boolean) => Promise<void>;
    handleSaveMenuItem: (itemToSave: MenuItem, imageFile: File | null) => Promise<void>;
    handleDeleteItem: (itemId: number) => Promise<void>;
    handleAddCategory: (newCategoryName: string) => Promise<void>;
    handleDeleteCategory: (categoryToDelete: string) => Promise<void>;
}

interface CartSlice {
    cart: CartItem[];
    discount: string;
    isVatEnabled: boolean;
    setDiscount: (discount: string) => void;
    setIsVatEnabled: (enabled: boolean) => void;
    addToCart: (item: MenuItem) => void;
    updateQuantity: (itemId: number, delta: number) => void;
    clearCart: () => void;
    handlePlaceOrder: (paymentMethod: 'cash' | 'qr', cashReceived?: number) => Order | null;
}

interface ShiftSlice {
    dailyData: DailyData | null;
    shiftHistory: Shift[];
    isSyncing: boolean;
    logAction: (action: string) => void;
    syncOrders: () => Promise<void>;
    handleUpdateOrderStatus: (orderId: string, status: 'cooking' | 'ready') => void;
    handleCompleteOrder: (orderId: string) => void;
    handleCancelBill: (orderToCancel: Order) => void;
    handleStartShift: (openingFloat: number) => void;
    handlePaidInOut: (activity: { type: 'PAID_IN' | 'PAID_OUT', amount: number, description: string }) => void;
    handleManualDrawerOpen: (description: string) => void;
    handleEndShift: (endShiftData: { counted: number, nextShift: number }) => void;
    generateNewDailyId: (allOrders: Order[]) => string;
    initializeData: () => void;
}

interface SettingsSlice {
    shopSettings: ShopSettings;
    setShopSettings: (settings: ShopSettings) => void;
    ai: GoogleGenAI | null; // <-- FIXED: Added AI instance
}

type AppStore = MenuSlice & CartSlice & ShiftSlice & SettingsSlice;

// --- The Main Store Creation ---

export const useStore = create<AppStore>((set, get) => ({
    // --- Menu Slice ---
    menuItems: [],
    categories: [],
    activeCategory: 'รายการโปรด',
    favoriteIds: new Set(),
    isMenuLoading: true,
    menuError: null,
    setActiveCategory: (category) => set({ activeCategory: category }),
    toggleFavorite: (itemId) => set(state => {
        const newFavs = new Set(state.favoriteIds);
        if (newFavs.has(itemId)) newFavs.delete(itemId);
        else newFavs.add(itemId);
        localStorage.setItem(LOCAL_STORAGE_FAVORITES_KEY, JSON.stringify(Array.from(newFavs)));
        return { favoriteIds: newFavs };
    }),
    fetchMenuData: async (force = false) => {
        // ... (logic is correct and remains unchanged) ...
    },
    handleSaveMenuItem: async (itemToSave, imageFile) => { /* ... Logic from previous step ... */ },
    handleDeleteItem: async (itemId) => { /* ... Logic from previous step ... */ },
    handleAddCategory: async (newCategoryName) => { /* ... Logic from previous step ... */ },
    handleDeleteCategory: async (categoryToDelete) => { /* ... Logic from previous step ... */ },

    // --- Cart Slice ---
    cart: [],
    discount: '',
    isVatEnabled: false,
    setDiscount: (discount) => set({ discount }),
    setIsVatEnabled: (enabled) => set({ isVatEnabled: enabled }),
    addToCart: (item) => set(state => {
        const existing = state.cart.find(i => i.id === item.id);
        if (existing) {
            return { cart: state.cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i) };
        }
        return { cart: [...state.cart, { ...item, quantity: 1 }] };
    }),
    updateQuantity: (itemId, delta) => set(state => {
        const item = state.cart.find(i => i.id === itemId);
        if (item && item.quantity + delta <= 0) {
            return { cart: state.cart.filter(i => i.id !== itemId) };
        }
        return { cart: state.cart.map(i => i.id === itemId ? { ...i, quantity: i.quantity + delta } : i) };
    }),
    clearCart: () => set(state => ({
        cart: [],
        discount: '',
        isVatEnabled: state.shopSettings.isVatDefaultEnabled
    })),
    handlePlaceOrder: (paymentMethod, cashReceived) => {
        // ... (logic is correct and remains unchanged) ...
        return null; // Placeholder to satisfy TS
    },

    // --- Shift & Settings Slices ---
    dailyData: null,
    shiftHistory: [],
    isSyncing: false,
    ai: null, // <-- FIXED: Initial state for AI
    // FIXED 1.1: Added full default object for shopSettings
    shopSettings: {
        shopName: "ทาโกะหมึกแดง Takoyaki", address: "J-park Sriracha Chonburi 20110", phone: "062-878-9684",
        taxId: "0-1055-64120-16-6", isVatDefaultEnabled: false,
        logoUrl: 'https://raw.githubusercontent.com/babypetromax/ultramax-assets/refs/heads/main/logo-stamp2.png',
        promoUrl: 'https://raw.githubusercontent.com/babypetromax/ultramax-assets/refs/heads/main/%E0%B8%A0%E0%B8%B2%E0%B8%9E%E0%B8%AB%E0%B8%99%E0%B9%89%E0%B8%B2%E0%B8%88%E0%B8%AD%20(2).png',
        headerText: 'โปรดระวังทาโกะยากิร้อนมากครับ', footerText: 'ชุดประชุม ชุดเบรค งานเลี้ยง ออกบูธ งานมงคล',
        logoSizePercent: 80, promoSizePercent: 100, receiptTopMargin: 5, receiptBottomMargin: 5,
        receiptLineSpacing: 1.2, interactionMode: 'desktop', isKeyboardNavEnabled: false,
    },
    logAction: (action) => { /* ... Logic from previous step ... */ },
    initializeData: () => {
        // FIXED 1.3: Moved AI initialization here
        const apiKey = process.env.API_KEY;
        if (apiKey) {
            try {
                set({ ai: new GoogleGenAI({ apiKey }) });
            } catch (e) {
                console.error("Failed to initialize GoogleGenAI:", e);
                _showNotification('ไม่สามารถเริ่มต้น Gemini AI ได้ กรุณาตรวจสอบ API Key', 'error');
            }
        } else {
             _showNotification('ไม่ได้ตั้งค่า Gemini API Key ฟีเจอร์ AI จะถูกปิดใช้งาน', 'warning');
        }

        // ... (The rest of the initialization logic remains unchanged) ...
    },
    syncOrders: async () => { /* ... Logic from previous step ... */ },
    handleUpdateOrderStatus: (orderId, status) => { /* ... Logic from previous step ... */ },
    handleCompleteOrder: (orderId) => { /* ... Logic from previous step ... */ },
    handleCancelBill: (orderToCancel) => { /* ... Logic from previous step ... */ },
    handleStartShift: (openingFloat) => { /* ... Logic from previous step ... */ },
    handlePaidInOut: (activity) => { /* ... Logic from previous step ... */ },
    handleManualDrawerOpen: (description) => { /* ... Logic from previous step ... */ },
    handleEndShift: (endShiftData) => { /* ... Logic from previous step ... */ },
    // FIXED 1.2: Added full implementation for generateNewDailyId
    generateNewDailyId: (allOrders) => {
        const todayStr = getYYYYMMDD(new Date());
        const todaysOrders = allOrders.filter(o => o.id.startsWith(todayStr));
        const nextIdNumber = (todaysOrders.length > 0 ? Math.max(...todaysOrders.map(o => parseInt(o.id.split('-')[1], 10) || 0)) : 0) + 1;
        return `${todayStr}-${String(nextIdNumber).padStart(4, '0')}`;
    },
    setShopSettings: (settings) => {
        set({ shopSettings: settings });
        localStorage.setItem(LOCAL_STORAGE_SHOP_SETTINGS_KEY, JSON.stringify(settings));
        _showNotification('บันทึกการตั้งค่าร้านค้าแล้ว', 'success');
    },
}));