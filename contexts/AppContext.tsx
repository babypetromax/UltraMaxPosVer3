import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { MenuItem, Order } from '../types';

type View = 'pos' | 'orders' | 'reports' | 'settings';
type Theme = 'light' | 'dark';

interface AppContextType {
    view: View;
    setView: React.Dispatch<React.SetStateAction<View>>;
    theme: Theme;
    toggleTheme: () => void;
    zoomLevel: number;
    handleZoomIn: () => void;
    handleZoomOut: () => void;
    currentDate: string;
    isAdminMode: boolean;
    handleAdminLogin: (password: string) => boolean;
    handleAdminLogout: () => void;
    adminPassword: string;
    handlePasswordChange: (newPassword: string) => boolean;
    showPaymentModal: boolean;
    setShowPaymentModal: React.Dispatch<React.SetStateAction<boolean>>;
    showReceiptModal: boolean;
    setShowReceiptModal: React.Dispatch<React.SetStateAction<boolean>>;
    receiptData: (Order & { cashReceived?: number; }) | null;
    setReceiptData: React.Dispatch<React.SetStateAction<(Order & { cashReceived?: number; }) | null>>;
    showAdminLoginModal: boolean;
    setShowAdminLoginModal: React.Dispatch<React.SetStateAction<boolean>>;
    showMenuItemModal: boolean;
    setShowMenuItemModal: React.Dispatch<React.SetStateAction<boolean>>;
    editingItem: MenuItem | { category: string; } | null;
    setEditingItem: React.Dispatch<React.SetStateAction<MenuItem | { category: string; } | null>>;
    showStartShiftModal: boolean;
    setShowStartShiftModal: React.Dispatch<React.SetStateAction<boolean>>;
    showEndShiftModal: boolean;
    setShowEndShiftModal: React.Dispatch<React.SetStateAction<boolean>>;
    showPaidInOutModal: boolean;
    setShowPaidInOutModal: React.Dispatch<React.SetStateAction<boolean>>;
    isOrderPanelOpen: boolean;
    setIsOrderPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
    focusedItem: { pane: 'categories' | 'menu'; index: number; } | null;
    setFocusedItem: React.Dispatch<React.SetStateAction<{ pane: 'categories' | 'menu'; index: number; } | null>>;
    searchQuery: string;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    handleOpenMenuItemModal: (item: MenuItem | null, category?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [view, setView] = useState<View>('pos');
    const [theme, setTheme] = useState<Theme>('dark');
    const [zoomLevel, setZoomLevel] = useState(16);
    const [currentDate, setCurrentDate] = useState('');
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [adminPassword, setAdminPassword] = useState('1111');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [receiptData, setReceiptData] = useState<(Order & { cashReceived?: number }) | null>(null);
    const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
    const [showMenuItemModal, setShowMenuItemModal] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | { category: string } | null>(null);
    const [showStartShiftModal, setShowStartShiftModal] = useState(false);
    const [showEndShiftModal, setShowEndShiftModal] = useState(false);
    const [showPaidInOutModal, setShowPaidInOutModal] = useState(false);
    const [isOrderPanelOpen, setIsOrderPanelOpen] = useState(false);
    const [focusedItem, setFocusedItem] = useState<{ pane: 'categories' | 'menu'; index: number } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        document.body.className = theme;
        setCurrentDate(new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }));
    }, [theme]);

    useEffect(() => {
        document.documentElement.style.fontSize = `${zoomLevel}px`;
    }, [zoomLevel]);
    
    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 1, 24));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 1, 12));
    const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

    const handleAdminLogin = (password: string) => {
        if (password === adminPassword) {
            setIsAdminMode(true);
            setShowAdminLoginModal(false);
            // logAction('เข้าสู่ระบบผู้ดูแล'); // This will be called from DataContext
            return true;
        }
        return false;
    };

    const handleAdminLogout = () => {
        setIsAdminMode(false);
        // logAction('ออกจากระบบผู้ดูแล');
    };

    const handlePasswordChange = (newPassword: string): boolean => {
        setAdminPassword(newPassword);
        // logAction('เปลี่ยนรหัสผ่านผู้ดูแล');
        return true;
    };

    const handleOpenMenuItemModal = useCallback((item: MenuItem | null, category?: string) => {
        if (!isAdminMode) return;
        setEditingItem(item || { category: category || '' });
        setShowMenuItemModal(true);
    }, [isAdminMode]);


    const value = {
        view, setView,
        theme, toggleTheme,
        zoomLevel, handleZoomIn, handleZoomOut,
        currentDate,
        isAdminMode, handleAdminLogin, handleAdminLogout,
        adminPassword, handlePasswordChange,
        showPaymentModal, setShowPaymentModal,
        showReceiptModal, setShowReceiptModal,
        receiptData, setReceiptData,
        showAdminLoginModal, setShowAdminLoginModal,
        showMenuItemModal, setShowMenuItemModal,
        editingItem, setEditingItem,
        showStartShiftModal, setShowStartShiftModal,
        showEndShiftModal, setShowEndShiftModal,
        showPaidInOutModal, setShowPaidInOutModal,
        isOrderPanelOpen, setIsOrderPanelOpen,
        focusedItem, setFocusedItem,
        searchQuery, setSearchQuery,
        handleOpenMenuItemModal,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};