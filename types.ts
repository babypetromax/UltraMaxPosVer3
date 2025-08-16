export interface MenuItem {
    id: number;
    name: string;
    price: number;
    image: string;
    category: string;
}

export interface MenuCache {
    timestamp: number;
    menuItems: MenuItem[];
    categories: string[];
}

export interface CartItem extends MenuItem {
    quantity: number;
}

export interface Order {
    id: string;
    items: CartItem[];
    subtotal: number;
    tax: number;
    discountValue: number;
    total: number;
    timestamp: Date;
    paymentMethod: 'cash' | 'qr';
    vatRate: number;
    status: 'completed' | 'cancelled';
    cancelledAt?: Date;
    syncStatus: 'pending' | 'synced' | 'failed';
    reversalOf?: string;
}

export interface KitchenOrder extends Omit<Order, 'status'> {
    status: 'cooking' | 'ready';
}

export interface LogEntry {
    timestamp: Date;
    action: string;
}

export interface ShopSettings {
    shopName: string;
    address: string;
    phone: string;
    taxId: string;
    isVatDefaultEnabled: boolean;
    logoUrl: string;
    promoUrl: string;
    headerText: string;
    footerText: string;
    logoSizePercent: number;
    promoSizePercent: number;
    receiptTopMargin: number;
    receiptBottomMargin: number;
    receiptLineSpacing: number;
    interactionMode: 'desktop' | 'touch';
    isKeyboardNavEnabled: boolean;
}

export interface CashDrawerActivity {
    id: string;
    timestamp: Date;
    type: 'SHIFT_START' | 'SALE' | 'REFUND' | 'PAID_IN' | 'PAID_OUT' | 'SHIFT_END' | 'MANUAL_OPEN';
    amount: number;
    paymentMethod: 'cash' | 'qr' | 'none';
    description: string;
    orderId?: string;
}

export interface Shift {
    id: string;
    status: 'OPEN' | 'CLOSED';
    startTime: Date;
    endTime?: Date;
    openingFloatAmount: number;
    closingCashCounted?: number;
    expectedCashInDrawer?: number;
    cashOverShort?: number;
    totalSales?: number;
    totalCashSales?: number;
    totalQrSales?: number;
    totalPaidIn?: number;
    totalPaidOut?: number;
    cashToDeposit?: number;
    cashForNextShift?: number;
    activities: CashDrawerActivity[];
}

export interface DailyData {
    date: string;
    completedOrders: Order[];
    kitchenOrders: KitchenOrder[];
    activityLog: LogEntry[];
    currentShift: Shift | null;
}