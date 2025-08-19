import React, { createContext, useState, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import {
    MenuItem, MenuCache, Order, KitchenOrder, LogEntry, ShopSettings,
    CashDrawerActivity, Shift, DailyData, CartItem
} from '../types';
import {
    GOOGLE_SHEET_WEB_APP_URL, DAILY_DATA_KEY_PREFIX, LOCAL_STORAGE_FAVORITES_KEY,
    LOCAL_STORAGE_SHOP_SETTINGS_KEY, LOCAL_STORAGE_SHIFT_HISTORY_KEY,
    LOCAL_STORAGE_MENU_CACHE_KEY, SYNC_INTERVAL, MENU_CACHE_TTL
} from '../constants';
import { getYYYYMMDD } from '../helpers';
import { useApp } from './AppContext';
import { useNotification } from './NotificationContext';

interface DataContextType {
    ai: GoogleGenAI | null;
    isInitialLoadComplete: boolean;
    dailyData: DailyData;
    setDailyData: React.Dispatch<React.SetStateAction<DailyData | null>>;
    shiftHistory: Shift[];
    menuItems: MenuItem[];
    categories: string[];
    activeCategory: string;
    setActiveCategory: React.Dispatch<React.SetStateAction<string>>;
    favoriteIds: Set<number>;
    toggleFavorite: (itemId: number) => void;
    shopSettings: ShopSettings;
    setShopSettings: React.Dispatch<React.SetStateAction<ShopSettings>>;
    offlineReceiptLogo: string | null;
    setOfflineReceiptLogo: React.Dispatch<React.SetStateAction<string | null>>;
    offlineReceiptPromo: string | null;
    setOfflineReceiptPromo: React.Dispatch<React.SetStateAction<string | null>>;
    isMenuLoading: boolean;
    menuError: string | null;
    logAction: (action: string) => void;
    fetchMenuData: (force?: boolean) => Promise<void>;
    syncOrders: () => Promise<void>;
    handleUpdateOrderStatus: (orderId: string, status: 'cooking' | 'ready') => void;
    handleCompleteOrder: (orderId: string) => void;
    handleCancelBill: (orderToCancel: Order) => void;
    handleStartShift: (openingFloat: number) => void;
    handlePaidInOut: (activity: { type: 'PAID_IN' | 'PAID_OUT', amount: number, description: string }) => void;
    handleManualDrawerOpen: (description: string) => void;
    handleEndShift: (endShiftData: { counted: number, nextShift: number }) => void;
    handleSaveMenuItem: (itemToSave: MenuItem) => Promise<void>;
    handleDeleteItem: (itemId: number) => Promise<void>;
    handleAddCategory: (newCategoryName: string) => Promise<void>;
    handleDeleteCategory: (categoryToDelete: string) => Promise<void>;
    generateNewDailyId: (allOrders: Order[]) => string;
    navCategories: string[];
    filteredMenuItems: MenuItem[];
    shiftSummaryData: any; // Consider creating a specific type for this
    dailySummaryData: {
        grossSales: number;
        netSales: number;
        cancellationsTotal: number;
        cancellationsCount: number;
    };
    // For keyboard navigation
    categoryItemRefs: React.MutableRefObject<Map<string, HTMLLIElement>>;
    menuItemRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
    menuGridRef: React.RefObject<HTMLDivElement>;
    getCategoryItemRef: (cat: string) => (el: HTMLLIElement | null) => void;
    getMenuItemRef: (id: number) => (el: HTMLDivElement | null) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAdminMode, searchQuery, focusedItem, setFocusedItem } = useApp();
    const { showNotification } = useNotification();
    
    const [ai, setAi] = useState<GoogleGenAI | null>(null);
    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
    const [dailyData, setDailyData] = useState<DailyData | null>(null);
    const [shiftHistory, setShiftHistory] = useState<Shift[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
    const [shopSettings, setShopSettings] = useState<ShopSettings>({
        shopName: "ทาโกะหมึกแดง Takoyaki", address: "J-park Sriracha Chonburi 20110", phone: "062-878-9684",
        taxId: "0-1055-64120-16-6", isVatDefaultEnabled: false,
        logoUrl: 'https://raw.githubusercontent.com/babypetromax/ultramax-assets/refs/heads/main/logo-stamp2.png',
        promoUrl: 'https://raw.githubusercontent.com/babypetromax/ultramax-assets/refs/heads/main/%E0%B8%A0%E0%B8%B2%E0%B8%9E%E0%B8%AB%E0%B8%99%E0%B9%89%E0%B8%B2%E0%B8%88%E0%B8%AD%20(2).png',
        headerText: 'โปรดระวังทาโกะยากิร้อนมากครับ', footerText: 'ชุดประชุม ชุดเบรค งานเลี้ยง ออกบูธ งานมงคล',
        logoSizePercent: 80, promoSizePercent: 100, receiptTopMargin: 5, receiptBottomMargin: 5,
        receiptLineSpacing: 1.2, interactionMode: 'desktop', isKeyboardNavEnabled: false,
    });
    const [offlineReceiptLogo, setOfflineReceiptLogo] = useState<string | null>(null);
    const [offlineReceiptPromo, setOfflineReceiptPromo] = useState<string | null>(null);
    const [isMenuLoading, setIsMenuLoading] = useState(true);
    const [menuError, setMenuError] = useState<string | null>(null);

    // For keyboard navigation
    const categoryItemRefs = useRef(new Map<string, HTMLLIElement>());
    const menuItemRefs = useRef(new Map<number, HTMLDivElement>());
    const menuGridRef = useRef<HTMLDivElement>(null);
    const getCategoryItemRef = (cat: string) => (el: HTMLLIElement | null) => {
        if (el) categoryItemRefs.current.set(cat, el); else categoryItemRefs.current.delete(cat);
    };
    const getMenuItemRef = (id: number) => (el: HTMLDivElement | null) => {
        if (el) menuItemRefs.current.set(id, el); else menuItemRefs.current.delete(id);
    };

    const logAction = useCallback((action: string) => {
        if (!isInitialLoadComplete) return;
        setDailyData(prevData => {
            if (!prevData) return prevData;
            const newData = {
                ...prevData,
                activityLog: [{ timestamp: new Date(), action }, ...prevData.activityLog.slice(0, 199)],
            };
            localStorage.setItem(`${DAILY_DATA_KEY_PREFIX}${newData.date}`, JSON.stringify(newData));
            return newData;
        });
    }, [isInitialLoadComplete]);

    const fetchMenuData = useCallback(async (force = false) => {
        setIsMenuLoading(true);
        setMenuError(null);

        if (!force) {
            const cachedMenuJSON = localStorage.getItem(LOCAL_STORAGE_MENU_CACHE_KEY);
            if (cachedMenuJSON) {
                const cache: MenuCache = JSON.parse(cachedMenuJSON);
                if (Date.now() - cache.timestamp < MENU_CACHE_TTL) {
                    setMenuItems(cache.menuItems);
                    setCategories(cache.categories);
                    if (cache.categories.length > 0 && activeCategory === '') {
                        setActiveCategory(cache.categories[0]);
                    }
                    setIsMenuLoading(false);
                    logAction('โหลดเมนูจาก Cache สำเร็จ');
                    return;
                }
            }
        }

        if (!GOOGLE_SHEET_WEB_APP_URL || !GOOGLE_SHEET_WEB_APP_URL.startsWith('https://script.google.com/macros/s/')) {
            setMenuError('กรุณาตั้งค่า Google Sheet Web App URL ที่ถูกต้อง');
            setIsMenuLoading(false);
            return;
        }

        try {
            const response = await fetch(`${GOOGLE_SHEET_WEB_APP_URL}?action=getMenu`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (data.status === 'success') {
                const formattedMenuItems = data.menuItems.map((item: any) => ({
                    ...item, id: Number(item.id), price: parseFloat(item.price) || 0,
                }));

                setMenuItems(formattedMenuItems);
                setCategories(data.categories);
                if (data.categories.length > 0 && activeCategory === '') {
                    setActiveCategory(data.categories[0]);
                }

                const newCache: MenuCache = {
                    timestamp: Date.now(),
                    menuItems: formattedMenuItems,
                    categories: data.categories,
                };
                localStorage.setItem(LOCAL_STORAGE_MENU_CACHE_KEY, JSON.stringify(newCache));
                logAction('โหลดเมนูจาก Google Sheet และบันทึกลง Cache สำเร็จ');
            } else {
                throw new Error(data.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลเมนู');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            setMenuError(`ไม่สามารถโหลดเมนูได้: ${errorMessage}`);
            logAction(`ผิดพลาดในการโหลดเมนู: ${errorMessage}`);
        } finally {
            setIsMenuLoading(false);
        }
    }, [logAction, activeCategory]);

    useEffect(() => {
        // --- Initialize AI instance ---
        const apiKey = process.env.API_KEY;
        if (apiKey) {
            try {
                setAi(new GoogleGenAI({ apiKey }));
            } catch (e) {
                console.error("Failed to initialize GoogleGenAI:", e);
                showNotification('ไม่สามารถเริ่มต้น Gemini AI ได้ กรุณาตรวจสอบ API Key', 'error');
            }
        } else {
            console.warn("API_KEY environment variable not set. AI features will be disabled.");
        }

        // --- Initial data load ---
        try {
            const savedFavoritesJSON = localStorage.getItem(LOCAL_STORAGE_FAVORITES_KEY);
            if (savedFavoritesJSON) setFavoriteIds(new Set(JSON.parse(savedFavoritesJSON)));
            
            let loadedSettings = { ...shopSettings };
            const savedSettingsJSON = localStorage.getItem(LOCAL_STORAGE_SHOP_SETTINGS_KEY);
            if (savedSettingsJSON) {
                loadedSettings = { ...loadedSettings, ...JSON.parse(savedSettingsJSON) };
            }
            setShopSettings(loadedSettings);
            
            const savedShiftHistoryJSON = localStorage.getItem(LOCAL_STORAGE_SHIFT_HISTORY_KEY);
            if(savedShiftHistoryJSON) {
                setShiftHistory(JSON.parse(savedShiftHistoryJSON).map((s: Shift) => ({...s, startTime: new Date(s.startTime), endTime: s.endTime ? new Date(s.endTime) : undefined, activities: s.activities.map((a: CashDrawerActivity) => ({...a, timestamp: new Date(a.timestamp)}))})));
            }
            
            const savedOfflineLogo = localStorage.getItem('takoyaki_pos_offline_logo');
            if (savedOfflineLogo) setOfflineReceiptLogo(savedOfflineLogo);
            
            const savedOfflinePromo = localStorage.getItem('takoyaki_pos_offline_promo');
            if (savedOfflinePromo) setOfflineReceiptPromo(savedOfflinePromo);

            const todayStr = getYYYYMMDD(new Date());
            const dailyDataKey = `${DAILY_DATA_KEY_PREFIX}${todayStr}`;
            const savedDailyDataJSON = localStorage.getItem(dailyDataKey);
            
            let currentDailyData: DailyData;

            if (savedDailyDataJSON) {
                const parsed = JSON.parse(savedDailyDataJSON);
                currentDailyData = {
                    ...parsed,
                    date: todayStr,
                    completedOrders: parsed.completedOrders.map((o: Order) => ({ ...o, timestamp: new Date(o.timestamp), cancelledAt: o.cancelledAt ? new Date(o.cancelledAt) : undefined, syncStatus: o.syncStatus || 'synced' })),
                    kitchenOrders: parsed.kitchenOrders.map((o: KitchenOrder) => ({ ...o, timestamp: new Date(o.timestamp) })),
                    activityLog: parsed.activityLog.map((l: LogEntry) => ({...l, timestamp: new Date(l.timestamp)})),
                    currentShift: parsed.currentShift ? { ...parsed.currentShift, startTime: new Date(parsed.currentShift.startTime), activities: parsed.currentShift.activities.map((a: CashDrawerActivity) => ({...a, timestamp: new Date(a.timestamp)})) } : null
                };
            } else {
                currentDailyData = {
                    date: todayStr,
                    completedOrders: [],
                    kitchenOrders: [],
                    activityLog: [{ timestamp: new Date(), action: "เริ่มต้นวันใหม่" }],
                    currentShift: null
                };
                 Object.keys(localStorage).forEach(key => {
                    if (key.startsWith(DAILY_DATA_KEY_PREFIX) && key !== dailyDataKey) {
                        localStorage.removeItem(key);
                    }
                });
            }
            setDailyData(currentDailyData);

            fetchMenuData();

        } catch (error) {
            console.error("Failed to load data from localStorage", error);
        } finally {
            setIsInitialLoadComplete(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    useEffect(() => {
        if(isInitialLoadComplete && !process.env.API_KEY) {
            showNotification('ไม่ได้ตั้งค่า Gemini API Key ฟีเจอร์ AI จะถูกปิดใช้งาน', 'warning');
        }
    }, [isInitialLoadComplete, showNotification]);


    const syncOrders = useCallback(async () => {
        if (!dailyData) return;
        if (!GOOGLE_SHEET_WEB_APP_URL || !GOOGLE_SHEET_WEB_APP_URL.startsWith('https://script.google.com/macros/s/')) {
            console.error("Google Sheet Web App URL is not set.");
            setDailyData(prevData => {
                if (!prevData) return null;
                const updatedOrders = prevData.completedOrders.map(o => o.syncStatus === 'pending' ? { ...o, syncStatus: 'failed' as const } : o);
                const newData = { ...prevData, completedOrders: updatedOrders };
                localStorage.setItem(`${DAILY_DATA_KEY_PREFIX}${newData.date}`, JSON.stringify(newData));
                return newData;
            });
            return;
        }

        const ordersToSync = dailyData.completedOrders.filter(o => o.syncStatus === 'pending' || o.syncStatus === 'failed');
        if (ordersToSync.length === 0) return;
        
        logAction(`กำลังซิงค์ข้อมูล ${ordersToSync.length} บิลที่ค้างอยู่...`);

        const syncPromises = ordersToSync.map(async (order) => {
            try {
                const response = await fetch(GOOGLE_SHEET_WEB_APP_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'saveOrder', order }),
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const result = await response.json();
                if (result.status !== 'success') throw new Error(`Apps Script Error: ${result.message || 'Unknown error'}`);
                
                return { id: order.id, status: 'synced' as const };
            } catch (error) {
                console.error(`Failed to sync order #${order.id}:`, error);
                return { id: order.id, status: 'failed' as const };
            }
        });

        const results = await Promise.all(syncPromises);

        setDailyData(prevData => {
            if (!prevData) return null;
            const newOrders = [...prevData.completedOrders];
            let syncedCount = 0;
            results.forEach(result => {
                const orderIndex = newOrders.findIndex(o => o.id === result.id);
                if (orderIndex !== -1 && newOrders[orderIndex].syncStatus !== result.status) {
                    newOrders[orderIndex].syncStatus = result.status;
                    if (result.status === 'synced') syncedCount++;
                }
            });
            if (syncedCount > 0) logAction(`ซิงค์ข้อมูลสำเร็จ ${syncedCount} บิล`);

            const newData = { ...prevData, completedOrders: newOrders };
            localStorage.setItem(`${DAILY_DATA_KEY_PREFIX}${newData.date}`, JSON.stringify(newData));
            return newData;
        });
    }, [logAction, dailyData]);

    useEffect(() => {
        if (isInitialLoadComplete && dailyData) {
            syncOrders();
            const intervalId = setInterval(syncOrders, SYNC_INTERVAL);
            return () => clearInterval(intervalId);
        }
    }, [isInitialLoadComplete, syncOrders, dailyData]);

    useEffect(() => { if (isInitialLoadComplete) localStorage.setItem(LOCAL_STORAGE_FAVORITES_KEY, JSON.stringify(Array.from(favoriteIds))); }, [favoriteIds, isInitialLoadComplete]);
    useEffect(() => { if (isInitialLoadComplete) localStorage.setItem(LOCAL_STORAGE_SHOP_SETTINGS_KEY, JSON.stringify(shopSettings)); }, [shopSettings, isInitialLoadComplete]);
    useEffect(() => { if (isInitialLoadComplete) localStorage.setItem(LOCAL_STORAGE_SHIFT_HISTORY_KEY, JSON.stringify(shiftHistory)); }, [shiftHistory, isInitialLoadComplete]);
    
    const navCategories = useMemo(() => ['รายการโปรด', ...categories], [categories]);
    
    const filteredMenuItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (query !== '') {
            if (focusedItem?.pane === 'menu') setFocusedItem(null);
            return menuItems.filter(item => item.name.toLowerCase().includes(query));
        }
        if (activeCategory === 'รายการโปรด') {
            return menuItems.filter(item => favoriteIds.has(item.id));
        }
        return menuItems.filter(item => item.category === activeCategory);
    }, [menuItems, activeCategory, favoriteIds, searchQuery, focusedItem, setFocusedItem]);
    
    // === ULTRAMAX DEVS FIX START: Corrected Summary Logic ===
    const dailySummaryData = useMemo(() => {
        const summary = { grossSales: 0, netSales: 0, cancellationsTotal: 0, cancellationsCount: 0 };
        if (!dailyData) return summary;
    
        // 1. Iterate through ALL completed orders to calculate the true Gross Sales.
        // This includes active, cancelled, and reversal bills.
        for (const order of dailyData.completedOrders) {
            if (order.status !== 'cancelled') {
                 summary.grossSales += order.total;
            }
        }
    
        // 2. Separately calculate the total value of cancelled bills.
        for (const order of dailyData.completedOrders) {
            if (order.status === 'cancelled') {
                summary.cancellationsTotal += order.total;
                summary.cancellationsCount += 1;
            }
        }
    
        // 3. Net Sales is Gross Sales (only from non-cancelled bills)
        summary.netSales = summary.grossSales; // Since gross sales now correctly excludes cancellations.
    
        return summary;
    }, [dailyData]);
    // === ULTRAMAX DEVS FIX END ===

    const shiftSummaryData = useMemo(() => {
        if (!dailyData?.currentShift) return null;
    
        const summary = {
            totalSales: 0, totalCashSales: 0, totalQrSales: 0,
            totalPaidIn: 0, totalPaidOut: 0,
            totalCancellationsValue: 0, totalCancellationsCount: 0,
            expectedCashInDrawer: dailyData.currentShift.openingFloatAmount,
        };
    
        const shiftOrderIds = new Set(dailyData.currentShift.activities.filter(a => a.type === 'SALE').map(a => a.orderId));
        const shiftRefundOrderIds = new Set(dailyData.currentShift.activities.filter(a => a.type === 'REFUND').map(a => a.orderId));
        const cancelledOrdersInShift = dailyData.completedOrders.filter(o => o.status === 'cancelled' && shiftRefundOrderIds.has(o.id));

        summary.totalCancellationsValue = cancelledOrdersInShift.reduce((sum, o) => sum + o.total, 0);
        summary.totalCancellationsCount = cancelledOrdersInShift.length;

        for (const act of dailyData.currentShift.activities) {
            switch (act.type) {
                case 'SALE':
                    summary.totalSales += act.amount;
                    if (act.paymentMethod === 'cash') summary.totalCashSales += act.amount;
                    else if (act.paymentMethod === 'qr') summary.totalQrSales += act.amount;
                    break;
                case 'REFUND':
                    if (act.paymentMethod === 'cash') summary.totalPaidOut += act.amount;
                    break;
                case 'PAID_IN': summary.totalPaidIn += act.amount; break;
                case 'PAID_OUT': summary.totalPaidOut += act.amount; break;
            }
        }
        
        summary.expectedCashInDrawer = dailyData.currentShift.openingFloatAmount + summary.totalCashSales + summary.totalPaidIn - summary.totalPaidOut;
    
        return summary;
    }, [dailyData]);

    const toggleFavorite = (itemId: number) => {
        setFavoriteIds(prev => {
            const newFavs = new Set(prev);
            if (newFavs.has(itemId)) newFavs.delete(itemId);
            else newFavs.add(itemId);
            return newFavs;
        });
    };
    
    const handleUpdateOrderStatus = (orderId: string, status: 'cooking' | 'ready') => {
        setDailyData(prevData => {
            if (!prevData) return null;
    
            // 1. เรายังคง map อาร์เรย์เดิมเพื่อหาออเดอร์ที่ต้องการแก้ไข
            const updatedKitchenOrders = prevData.kitchenOrders.map(order => {
                // 2. เมื่อเจอออเดอร์ที่ตรงกับ id ที่ส่งเข้ามา
                if (order.id === orderId) {
                    // 3. สร้าง object ออเดอร์ที่อัปเดตแล้ว พร้อมกับเปลี่ยน status
                    const updatedOrder = { ...order, status };
    
                    // 4. [ส่วนที่เพิ่มเข้ามา] คือการตรวจสอบเงื่อนไขสำคัญ!
                    // "ถ้าสถานะใหม่คือ 'ready' และออเดอร์นี้ยังไม่เคยถูกบันทึกเวลาทำเสร็จ (readyAt) มาก่อน"
                    // การเช็ค !order.readyAt เพื่อป้องกันการบันทึกเวลาซ้ำซ้อนหากมีการกดปุ่มผิดพลาด
                    if (status === 'ready' && !order.readyAt) {
                        // 5. บันทึกเวลาปัจจุบันลงใน field 'readyAt'
                        updatedOrder.readyAt = new Date();
                        
                        // 6. คำนวณระยะเวลาที่ใช้ทั้งหมด (เป็นวินาที)
                        // โดยนำเวลาที่ทำเสร็จ (readyAt) มาลบกับเวลาที่บิลเข้า (timestamp)
                        updatedOrder.preparationTimeInSeconds = Math.floor(
                            (updatedOrder.readyAt.getTime() - new Date(order.timestamp).getTime()) / 1000
                        );
    
                        // 7. บันทึกประวัติการทำงาน (Action Log) เพื่อให้ตรวจสอบย้อนหลังได้
                        logAction(`ออเดอร์ #${orderId} เสร็จสิ้น ใช้เวลา ${updatedOrder.preparationTimeInSeconds} วินาที`);
                    }
                    
                    // 8. ส่งคืนออเดอร์ที่อัปเดตข้อมูลทั้งหมดแล้วกลับไป
                    return updatedOrder;
                }
                
                // ถ้าไม่ใช่ id ที่ต้องการแก้ไข ก็ส่งคืนออเดอร์เดิมกลับไป
                return order;
            });
    
            // ส่วนที่เหลือทำงานเหมือนเดิม คือการอัปเดต state และบันทึกลง localStorage
            const newData = { ...prevData, kitchenOrders: updatedKitchenOrders };
            localStorage.setItem(`${DAILY_DATA_KEY_PREFIX}${newData.date}`, JSON.stringify(newData));
            return newData;
        });
    };
    const handleCompleteOrder = (orderId: string) => {
        setDailyData(prevData => {
            if (!prevData) return null;
            const updatedKitchenOrders = prevData.kitchenOrders.filter(order => order.id !== orderId);
            const newData = { ...prevData, kitchenOrders: updatedKitchenOrders };
            localStorage.setItem(`${DAILY_DATA_KEY_PREFIX}${newData.date}`, JSON.stringify(newData));
            return newData;
        });
    };
    
    const generateNewDailyId = useCallback((allOrders: Order[]): string => {
        const todayStr = getYYYYMMDD(new Date());
        const todaysOrders = allOrders.filter(o => o.id.startsWith(todayStr));
        const nextIdNumber = (todaysOrders.length > 0 ? Math.max(...todaysOrders.map(o => parseInt(o.id.split('-')[1], 10) || 0)) : 0) + 1;
        return `${todayStr}-${String(nextIdNumber).padStart(4, '0')}`;
    }, []);

    const handleCancelBill = useCallback((orderToCancel: Order) => {
        if (!isAdminMode || orderToCancel.status === 'cancelled') return;
        
        setDailyData(prevData => {
            if (!prevData) return null;

            const reversalId = generateNewDailyId(prevData.completedOrders);
            const reversalOrder: Order = {
                id: reversalId, items: [...orderToCancel.items],
                subtotal: -orderToCancel.subtotal, tax: -orderToCancel.tax,
                discountValue: orderToCancel.discountValue, total: -orderToCancel.total,
                timestamp: new Date(), paymentMethod: orderToCancel.paymentMethod,
                vatRate: orderToCancel.vatRate, status: 'completed',
                syncStatus: 'pending', reversalOf: orderToCancel.id,
            };
            
            let updatedShift = prevData.currentShift;

            if (updatedShift && updatedShift.status === 'OPEN') {
                const refundActivity: CashDrawerActivity = {
                    id: `act-${Date.now()}`, timestamp: new Date(), type: 'REFUND',
                    amount: orderToCancel.total, paymentMethod: orderToCancel.paymentMethod,
                    description: `Bill cancellation #${orderToCancel.id}`, orderId: orderToCancel.id,
                };
                updatedShift = { ...updatedShift, activities: [...updatedShift.activities, refundActivity] };
                logAction(`บันทึกการคืนเงินสำหรับบิล #${orderToCancel.id} ในกะปัจจุบัน`);
            }

            const updatedOrders = prevData.completedOrders.map(order => order.id === orderToCancel.id ? { ...order, status: 'cancelled' as const, cancelledAt: new Date(), syncStatus: 'pending' as const } : order);
            const finalOrders = [reversalOrder, ...updatedOrders].sort((a,b) => b.id.localeCompare(a.id));
            
            logAction(`ยกเลิกบิล #${orderToCancel.id} และสร้างใบคืน #${reversalId} ยอดรวม ฿${reversalOrder.total.toFixed(2)}`);

            const newData = {
                ...prevData,
                completedOrders: finalOrders,
                currentShift: updatedShift,
            };

            localStorage.setItem(`${DAILY_DATA_KEY_PREFIX}${newData.date}`, JSON.stringify(newData));
            setTimeout(() => syncOrders(), 100);
            return newData;
        });
    }, [isAdminMode, syncOrders, generateNewDailyId, logAction]);

    const handleStartShift = (openingFloat: number) => {
        setDailyData(prevData => {
            if (!prevData) return null;

            const todayStr = getYYYYMMDD(new Date());
            const todayShifts = shiftHistory.filter(s => s.id.startsWith(todayStr));
            
            const newShift: Shift = {
                id: `${todayStr}-S${todayShifts.length + 1}`, status: 'OPEN',
                startTime: new Date(), openingFloatAmount: openingFloat,
                activities: [{
                    id: `act-${Date.now()}`, timestamp: new Date(),
                    type: 'SHIFT_START', amount: openingFloat,
                    paymentMethod: 'cash', description: 'เงินทอนเริ่มต้นกะ'
                }]
            };

            logAction(`เปิดกะใหม่ #${newShift.id} ด้วยเงินเริ่มต้น ฿${openingFloat.toFixed(2)}`);
            const newData = { ...prevData, currentShift: newShift };
            localStorage.setItem(`${DAILY_DATA_KEY_PREFIX}${newData.date}`, JSON.stringify(newData));
            
            return newData;
        });
    };

    const handlePaidInOut = (activity: { type: 'PAID_IN' | 'PAID_OUT', amount: number, description: string }) => {
        setDailyData(prevData => {
            if (!prevData || !prevData.currentShift) return prevData;

            const newActivity: CashDrawerActivity = {
                id: `act-${Date.now()}`, timestamp: new Date(),
                type: activity.type, amount: activity.amount,
                paymentMethod: 'cash', description: activity.description
            };
            const updatedShift = { ...prevData.currentShift, activities: [...prevData.currentShift.activities, newActivity] };
            
            logAction(`${activity.type === 'PAID_IN' ? 'นำเงินเข้า' : 'นำเงินออก'} ฿${activity.amount.toFixed(2)}: ${activity.description}`);
            
            const newData = { ...prevData, currentShift: updatedShift };
            localStorage.setItem(`${DAILY_DATA_KEY_PREFIX}${newData.date}`, JSON.stringify(newData));
            
            return newData;
        });
    };

    const handleManualDrawerOpen = (description: string) => {
        setDailyData(prevData => {
            if (!prevData) return null;
            if (!prevData.currentShift || prevData.currentShift.status !== 'OPEN') {
                showNotification('ไม่สามารถเปิดลิ้นชักได้: กรุณาเปิดกะก่อน', 'warning');
                return prevData;
            }
    
            const newActivity: CashDrawerActivity = {
                id: `act-${Date.now()}`,
                timestamp: new Date(),
                type: 'MANUAL_OPEN',
                amount: 0,
                paymentMethod: 'none',
                description: description,
            };
            const updatedShift = { ...prevData.currentShift, activities: [...prevData.currentShift.activities, newActivity] };
            
            logAction(`เปิดลิ้นชักด้วยตนเอง: ${description}`);
            
            const newData = { ...prevData, currentShift: updatedShift };
            localStorage.setItem(`${DAILY_DATA_KEY_PREFIX}${newData.date}`, JSON.stringify(newData));
            
            return newData;
        });
    };
    
    const handleEndShift = (endShiftData: { counted: number, nextShift: number }) => {
        if (!dailyData || !dailyData.currentShift || !shiftSummaryData) return;

        const { counted, nextShift } = endShiftData;
        const summary = shiftSummaryData;
        const overShort = counted - summary.expectedCashInDrawer;
        const toDeposit = counted - nextShift;

        const closedShift: Shift = {
            ...dailyData.currentShift, status: 'CLOSED', endTime: new Date(),
            closingCashCounted: counted, expectedCashInDrawer: summary.expectedCashInDrawer,
            cashOverShort: overShort, cashForNextShift: nextShift,
            cashToDeposit: toDeposit, totalSales: summary.totalSales,
            totalCashSales: summary.totalCashSales, totalQrSales: summary.totalQrSales,
            totalPaidIn: summary.totalPaidIn, totalPaidOut: summary.totalPaidOut,
            activities: [...dailyData.currentShift.activities, {
                id: `act-${Date.now()}`, timestamp: new Date(),
                type: 'SHIFT_END', amount: counted,
                paymentMethod: 'cash', description: 'ปิดยอด สรุปเงินสดในลิ้นชัก'
            }],
            ...{ totalCancellationsValue: summary.totalCancellationsValue, totalCancellationsCount: summary.totalCancellationsCount }
        };

        setShiftHistory(prev => [closedShift, ...prev]);
        
        setDailyData(prevData => {
            if (!prevData) return null;
            logAction(`ปิดกะ #${closedShift.id}. เงินขาด/เกิน: ฿${overShort.toFixed(2)}`);
            const newData = { ...prevData, currentShift: null };
            localStorage.setItem(`${DAILY_DATA_KEY_PREFIX}${newData.date}`, JSON.stringify(newData));
            return newData;
        });
    };

    const syncMenuChange = async (action: string, payload: object) => {
        if (!GOOGLE_SHEET_WEB_APP_URL || !GOOGLE_SHEET_WEB_APP_URL.startsWith('https://script.google.com/macros/s/')) {
            const errorMsg = 'Google Sheet URL ไม่ได้ตั้งค่า การเปลี่ยนแปลงจะถูกบันทึกแค่ในเครื่องเท่านั้น';
            showNotification(errorMsg, 'error');
            return { status: 'error', message: errorMsg };
        }
        try {
            const response = await fetch(GOOGLE_SHEET_WEB_APP_URL, {
                method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action, ...payload }),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'Unknown Apps Script error');
            logAction(`ซิงค์สำเร็จ: ${action}`);
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logAction(`ผิดพลาดในการซิงค์ข้อมูล: ${action} - ${errorMessage}`);
            showNotification(`เกิดข้อผิดพลาดในการบันทึกข้อมูลไปยัง Google Sheet: ${errorMessage}\n\nการเปลี่ยนแปลงถูกบันทึกในแอปชั่วคราว แต่จะไม่แสดงผลถาวรจนกว่าจะเชื่อมต่อสำเร็จ`, 'error');
            return { status: 'error', message: errorMessage };
        }
    };
    
    const handleSaveMenuItem = async (itemToSave: MenuItem) => {
        const isNew = !('id' in itemToSave && itemToSave.id);

        if (isNew) {
            const tempId = Date.now();
            const newItem = { ...itemToSave, id: tempId };
            setMenuItems(prev => [...prev, newItem]);
            logAction(`เพิ่มสินค้าใหม่ '${newItem.name}' (กำลังรอการยืนยัน)`);
            const result = await syncMenuChange('addMenuItem', { item: itemToSave });
            if (result.status === 'success' && result.item) {
                const finalItem = { ...result.item, price: parseFloat(result.item.price) };
                setMenuItems(prev => prev.map(item => (item.id === tempId ? finalItem : item)));
                logAction(`ยืนยันการเพิ่มสินค้า '${finalItem.name}' (ID: ${finalItem.id})`);
                showNotification(`เพิ่มสินค้า '${finalItem.name}' สำเร็จ`, 'success');
            } else {
                setMenuItems(prev => prev.filter(item => item.id !== tempId));
                logAction(`ล้มเหลวในการเพิ่มสินค้า '${newItem.name}'`);
            }
        } else {
            const originalItem = menuItems.find(i => i.id === itemToSave.id);
            if (!originalItem) return;
            setMenuItems(prev => prev.map(item => (item.id === itemToSave.id ? itemToSave : item)));
            logAction(`แก้ไขสินค้า '${itemToSave.name}' (ID: ${itemToSave.id})`);
            const result = await syncMenuChange('updateMenuItem', { item: itemToSave });
            if (result.status === 'success') {
                 showNotification(`บันทึกการเปลี่ยนแปลง '${itemToSave.name}' สำเร็จ`, 'success');
            } else {
                setMenuItems(prev => prev.map(item => (item.id === itemToSave.id ? originalItem : item)));
                logAction(`ล้มเหลวในการแก้ไขสินค้า '${itemToSave.name}'`);
            }
        }
    };

    const handleDeleteItem = async (itemId: number) => {
        const itemToDelete = menuItems.find(item => item.id === itemId);
        if (!itemToDelete) return;
        
        const originalItems = [...menuItems];
        setMenuItems(prev => prev.filter(item => item.id !== itemId));
        logAction(`ลบสินค้า '${itemToDelete.name}' (ID: ${itemId}).`);
        const result = await syncMenuChange('deleteMenuItem', { itemId });
        if (result.status === 'success') {
            showNotification(`ลบสินค้า '${itemToDelete.name}' สำเร็จ`, 'success');
        } else {
            setMenuItems(originalItems);
            logAction(`ล้มเหลวในการลบสินค้า '${itemToDelete.name}'`);
        }
    };

    const handleAddCategory = async (newCategoryName: string) => {
        if (categories.includes(newCategoryName)) {
            showNotification('มีหมวดหมู่นี้อยู่แล้ว', 'warning');
            return;
        }
        const originalCategories = [...categories];
        setCategories(prev => [...prev, newCategoryName]);
        logAction(`เพิ่มหมวดหมู่ใหม่: '${newCategoryName}'.`);
        const result = await syncMenuChange('addCategory', { category: newCategoryName });
        if (result.status === 'success') {
             showNotification(`เพิ่มหมวดหมู่ '${newCategoryName}' สำเร็จ`, 'success');
        } else {
            setCategories(originalCategories);
            logAction(`ล้มเหลวในการเพิ่มหมวดหมู่ '${newCategoryName}'`);
        }
    };
    
    const handleDeleteCategory = async (categoryToDelete: string) => {
        const itemsInCategory = menuItems.filter(item => item.category === categoryToDelete);
        if (itemsInCategory.length > 0) {
            showNotification(`ไม่สามารถลบหมวดหมู่ '${categoryToDelete}' ได้ เนื่องจากยังมีสินค้าอยู่ ${itemsInCategory.length} รายการ`, 'error');
            return;
        }

        const originalCategories = [...categories];
        setCategories(prev => prev.filter(cat => cat !== categoryToDelete));
        logAction(`ลบหมวดหมู่: '${categoryToDelete}'.`);
        const result = await syncMenuChange('deleteCategory', { category: categoryToDelete });
        if (result.status === 'success') {
            showNotification(`ลบหมวดหมู่ '${categoryToDelete}' สำเร็จ`, 'success');
        } else {
            setCategories(originalCategories);
            logAction(`ล้มเหลวในการลบหมวดหมู่ '${categoryToDelete}'`);
        }
    };

    if (!dailyData) {
        return null; 
    }

    const value: DataContextType = {
        ai, isInitialLoadComplete,
        dailyData, 
        setDailyData,
        shiftHistory, menuItems, categories,
        activeCategory, setActiveCategory,
        favoriteIds, toggleFavorite,
        shopSettings, setShopSettings,
        offlineReceiptLogo, setOfflineReceiptLogo,
        offlineReceiptPromo, setOfflineReceiptPromo,
        isMenuLoading, menuError, logAction,
        fetchMenuData, syncOrders,
        handleUpdateOrderStatus, handleCompleteOrder, handleCancelBill,
        handleStartShift, handlePaidInOut, handleManualDrawerOpen, handleEndShift,
        handleSaveMenuItem, handleDeleteItem, handleAddCategory, handleDeleteCategory,
        generateNewDailyId, navCategories, filteredMenuItems, shiftSummaryData, dailySummaryData,
        categoryItemRefs, menuItemRefs, menuGridRef, getCategoryItemRef, getMenuItemRef
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};