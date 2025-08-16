import React, { createContext, useState, useContext, useMemo, useCallback } from 'react';
import { CartItem, MenuItem, Order } from '../types';
import { TAX_RATE } from '../constants';
import { useApp } from './AppContext';
import { useData } from './DataContext';

interface CartContextType {
    cart: CartItem[];
    discount: string;
    setDiscount: React.Dispatch<React.SetStateAction<string>>;
    isVatEnabled: boolean;
    setIsVatEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    addToCart: (item: MenuItem) => void;
    updateQuantity: (itemId: number, delta: number) => void;
    clearCart: () => void;
    handlePlaceOrder: (paymentMethod: 'cash' | 'qr', cashReceived?: number) => void;
    cartCalculations: { subtotal: number; tax: number; discountValue: number; total: number; };
    cartItemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { setShowPaymentModal, setReceiptData, setShowReceiptModal, setIsOrderPanelOpen } = useApp();
    const { dailyData, setDailyData, syncOrders, generateNewDailyId, shopSettings, logAction } = useData();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [discount, setDiscount] = useState('');
    const [isVatEnabled, setIsVatEnabled] = useState(false);

    const addToCart = useCallback((item: MenuItem) => {
        // isAdminMode check is missing, but it was in the original App.tsx. 
        // Let's assume it should be checked where addToCart is called (e.g., in MenuGrid).
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    }, []);

    const updateQuantity = (itemId: number, delta: number) => {
        setCart(prev => {
            const item = prev.find(i => i.id === itemId);
            if (item && item.quantity + delta <= 0) {
                return prev.filter(i => i.id !== itemId);
            }
            return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity + delta } : i);
        });
    };
    
    const clearCart = useCallback(() => {
        setCart([]);
        setDiscount('');
        if (shopSettings) {
            setIsVatEnabled(shopSettings.isVatDefaultEnabled);
        }
    }, [shopSettings]);


    const cartCalculations = useMemo(() => {
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const discountValue = (discount.endsWith('%')
            ? subtotal * (parseFloat(discount.slice(0, -1)) / 100)
            : parseFloat(discount) || 0);
        const discountedSubtotal = subtotal - discountValue;
        const tax = isVatEnabled ? discountedSubtotal * TAX_RATE : 0;
        const total = discountedSubtotal + tax;
        return { subtotal, tax, discountValue, total: total < 0 ? 0 : total };
    }, [cart, discount, isVatEnabled]);

    const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
    
    const handlePlaceOrder = useCallback((paymentMethod: 'cash' | 'qr', cashReceived?: number) => {
        if (cart.length === 0 || !dailyData) return;
    
        setDailyData(prevData => {
            if (!prevData) return null;
    
            const { subtotal, tax, discountValue, total } = cartCalculations;
            const newOrderId = generateNewDailyId(prevData.completedOrders);
            
            const newOrder: Order = {
                id: newOrderId,
                items: cart,
                subtotal, tax, discountValue, total,
                timestamp: new Date(),
                paymentMethod,
                vatRate: isVatEnabled ? TAX_RATE : 0,
                status: 'completed',
                syncStatus: 'pending'
            };
    
            let updatedShift = prevData.currentShift;
            if (updatedShift && updatedShift.status === 'OPEN') {
                updatedShift = { 
                    ...updatedShift, 
                    activities: [
                        ...updatedShift.activities,
                        {
                            id: `act-${Date.now()}`,
                            timestamp: new Date(),
                            type: 'SALE',
                            amount: newOrder.total,
                            paymentMethod: newOrder.paymentMethod,
                            description: `Bill #${newOrder.id}`,
                            orderId: newOrder.id,
                        }
                    ] 
                };
            }
    
            const newData = {
                ...prevData,
                completedOrders: [newOrder, ...prevData.completedOrders].sort((a,b) => b.id.localeCompare(a.id)),
                kitchenOrders: [...prevData.kitchenOrders, { ...newOrder, status: 'cooking' as const }].sort((a,b) => a.id.localeCompare(b.id)),
                currentShift: updatedShift,
            };
            
            logAction(`บันทึกบิล #${newOrder.id} (สถานะ: รอส่งข้อมูล)`);
    
            setShowPaymentModal(false);
            setIsOrderPanelOpen(false);
            setReceiptData({ ...newOrder, cashReceived });
            setShowReceiptModal(true);
            clearCart();
            setTimeout(() => syncOrders(), 100);
    
            return newData;
        });
    }, [
        cart, dailyData, cartCalculations, isVatEnabled, 
        setDailyData, generateNewDailyId, clearCart, 
        syncOrders, setShowPaymentModal, setIsOrderPanelOpen, 
        setReceiptData, setShowReceiptModal, logAction
    ]);
    
    const value = {
        cart,
        discount, setDiscount,
        isVatEnabled, setIsVatEnabled,
        addToCart,
        updateQuantity,
        clearCart,
        handlePlaceOrder,
        cartCalculations,
        cartItemCount,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
