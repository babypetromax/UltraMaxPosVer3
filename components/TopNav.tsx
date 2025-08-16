import React from 'react';
import { useApp } from '../contexts/AppContext';
import { useData } from '../contexts/DataContext';
import { useCart } from '../contexts/CartContext';

const TopNav: React.FC = () => {
    const { 
        view, 
        setView, 
        currentDate, 
        isAdminMode, 
        handleAdminLogout, 
        setShowAdminLoginModal, 
        toggleTheme, 
        theme, 
        handleZoomOut, 
        handleZoomIn, 
        setIsOrderPanelOpen 
    } = useApp();
    const { fetchMenuData } = useData();
    const { cartItemCount } = useCart();

    return (
        <nav className="top-nav">
            <div className="logo">UltraMaxPosVer 4.1</div>
            <div className="nav-buttons">
                <button className={`nav-button ${view === 'pos' ? 'active' : ''}`} onClick={() => setView('pos')}>
                    <span className="material-symbols-outlined">point_of_sale</span> <span>ขาย</span>
                </button>
                <button className={`nav-button ${view === 'orders' ? 'active' : ''}`} onClick={() => setView('orders')}>
                    <span className="material-symbols-outlined">receipt_long</span> <span>บิลขาย</span>
                </button>
                <button className={`nav-button ${view === 'reports' ? 'active' : ''}`} onClick={() => setView('reports')}>
                    <span className="material-symbols-outlined">bar_chart</span> <span>รายงาน</span>
                </button>
                <button className={`nav-button ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
                    <span className="material-symbols-outlined">settings</span> <span>ตั้งค่า</span>
                </button>
            </div>
            <div className="nav-right">
                <div className="date-display">{currentDate}</div>
                <div className="app-controls">
                    {isAdminMode && (
                        <button className="control-btn" onClick={() => fetchMenuData(true)} title="รีเฟรชข้อมูลเมนู">
                            <span className="material-symbols-outlined">refresh</span>
                        </button>
                    )}
                    {(view === 'pos' || view === 'orders' || view === 'settings' || view === 'reports') && (
                         <button className={`control-btn admin-toggle ${isAdminMode ? 'active' : ''}`} onClick={isAdminMode ? handleAdminLogout : () => setShowAdminLoginModal(true)} title={isAdminMode ? 'ออกจากโหมดแก้ไข' : 'แก้ไขเมนู/บิล/ตั้งค่า'}>
                            <span className="material-symbols-outlined">{isAdminMode ? 'lock' : 'edit'}</span>
                        </button>
                    )}
                    <button className="control-btn" onClick={toggleTheme} title={theme === 'light' ? 'โหมดกลางคืน' : 'โหมดกลางวัน'}>
                        <span className="material-symbols-outlined">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
                    </button>
                    <button className="control-btn" onClick={handleZoomOut} title="ลดขนาด">
                        <span className="material-symbols-outlined">zoom_out</span>
                    </button>
                    <button className="control-btn" onClick={handleZoomIn} title="เพิ่มขนาด">
                        <span className="material-symbols-outlined">zoom_in</span>
                    </button>
                </div>
                <button className="cart-toggle-btn" onClick={() => setIsOrderPanelOpen(prev => !prev)}>
                    <span className="material-symbols-outlined">shopping_cart</span>
                    {cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
                </button>
            </div>
        </nav>
    );
};

export default TopNav;