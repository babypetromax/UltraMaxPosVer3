import React, { useContext, useEffect } from 'react';
import { useStore } from './contexts/store';
import { AppProvider, useApp } from './contexts/AppContext';
// We no longer need CartProvider
import { NotificationProvider, NotificationContext } from './contexts/NotificationContext';
import { ConfirmationProvider } from './contexts/ConfirmationContext';

import TopNav from './components/TopNav';
import PosView from './views/pos/PosView';
import OrderManagementScreen from './views/orders/OrderManagementScreen';
import ReportsScreen from './views/reports/ReportsScreen';
import SettingsScreen from './views/settings/SettingsScreen';
import PaymentModal from './components/modals/PaymentModal';
import ReceiptModal from './components/modals/ReceiptModal';
import AdminLoginModal from './components/modals/AdminLoginModal';
import MenuItemModal from './components/modals/MenuItemModal';
import { StartShiftModal, PaidInOutModal, EndShiftModal } from './components/modals/ShiftModals';
import NotificationContainer from './components/NotificationContainer';

const AppContent = () => {
    const { 
        view, 
        showPaymentModal, 
        showReceiptModal, 
        showAdminLoginModal, 
        showMenuItemModal,
        showStartShiftModal,
        showEndShiftModal,
        showPaidInOutModal
    } = useApp();
    
    // === ULTRAMAX DEVS FIX: Corrected function name ===
    const initializeData = useStore(state => state.initializeData);
    const dailyData = useStore(state => state.dailyData);
    const shopSettings = useStore(state => state.shopSettings);

    useEffect(() => {
        initializeData();
    }, [initializeData]);
    
    const { notifications, removeNotification } = useContext(NotificationContext)!;
   
    if (!dailyData) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
                <span className="material-symbols-outlined sync-icon pending" style={{ fontSize: '3rem' }}>sync</span>
                <p>กำลังเตรียมข้อมูลเริ่มต้น...</p>
            </div>
        );
    }

    return (
        <div className={`app-container ${shopSettings.interactionMode === 'touch' ? 'touch-mode' : ''}`}>
            <NotificationContainer notifications={notifications} onClose={removeNotification} />
            <TopNav />
            {view === 'pos' && <PosView />}
            {view === 'orders' && <OrderManagementScreen />}
            {view === 'reports' && <ReportsScreen />}
            {view === 'settings' && <SettingsScreen />}
            
            {showPaymentModal && <PaymentModal />}
            {showReceiptModal && <ReceiptModal />}
            {showAdminLoginModal && <AdminLoginModal />}
            {showMenuItemModal && <MenuItemModal />}
            {showStartShiftModal && <StartShiftModal />}
            {showPaidInOutModal && <PaidInOutModal />}
            {showEndShiftModal && <EndShiftModal />}
        </div>
    );
}

const App = () => {
    return (
        <ConfirmationProvider>
            <NotificationProvider>
                <AppProvider>
                    {/* CartProvider is no longer needed as its logic is in the store */}
                    <AppContent />
                </AppProvider>
            </NotificationProvider>
        </ConfirmationProvider>
    );
};

export default App;
