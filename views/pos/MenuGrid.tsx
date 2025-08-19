import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { useData } from '../../contexts/DataContext';
import { useCart } from '../../contexts/CartContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
// === ULTRAMAX DEVS EDIT START: Import the new smart image component ===
import MenuCardImage from '../../components/MenuCardImage';
// === ULTRAMAX DEVS EDIT END ===

const MenuGrid: React.FC = () => {
    const { 
        searchQuery, 
        isAdminMode, 
        setFocusedItem,
        focusedItem,
        handleOpenMenuItemModal 
    } = useApp();
    const { 
        activeCategory, 
        isMenuLoading, 
        menuError, 
        menuGridRef, 
        filteredMenuItems, 
        handleDeleteItem, 
        toggleFavorite, 
        favoriteIds, 
        getMenuItemRef,
        shopSettings
    } = useData();
    const { addToCart } = useCart();
    const { showConfirmation } = useConfirmation();

    const onDeleteItem = async (itemId: number, itemName: string) => {
        const confirmed = await showConfirmation({
            title: 'ยืนยันการลบ',
            message: `คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า '${itemName}'?`
        });
        if (confirmed) {
            handleDeleteItem(itemId);
        }
    };

    return (
        <section className="menu-section">
            <header className="menu-header">
                <h1>{searchQuery.trim() !== '' ? `ผลการค้นหา` : activeCategory}</h1>
                 {isAdminMode && activeCategory !== 'รายการโปรด' && searchQuery.trim() === '' && !isMenuLoading && (
                    <button className="action-button add-item-btn" onClick={() => handleOpenMenuItemModal(null, activeCategory)}>
                        <span className="material-symbols-outlined">add</span> เพิ่มสินค้าใหม่
                    </button>
                )}
            </header>
            {isMenuLoading ? (
                <div className="menu-grid-message" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'}}>
                    <span className="material-symbols-outlined sync-icon pending" style={{fontSize: '2rem'}}>sync</span>
                    <p>กำลังโหลดเมนู...</p>
                </div>
            ) : menuError ? (
                <div className="menu-grid-message error-message" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'}}>
                    <span className="material-symbols-outlined" style={{fontSize: '2rem', color: 'var(--danger-color)'}}>error</span>
                    <p>{menuError}</p>
                    <p>กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองอีกครั้ง</p>
                </div>
            ) : (
                <div className="menu-grid" 
                    tabIndex={shopSettings.isKeyboardNavEnabled ? 0 : -1}
                    ref={menuGridRef}
                    onFocus={() => {
                        if (shopSettings.isKeyboardNavEnabled && filteredMenuItems.length > 0 && focusedItem?.pane !== 'menu') {
                            setFocusedItem({ pane: 'menu', index: 0 });
                        }
                    }}
                >
                    {filteredMenuItems.length === 0 && searchQuery.trim() !== '' && <p className="menu-grid-message">ไม่พบสินค้าที่ตรงกับ: "{searchQuery}"</p>}
                    {filteredMenuItems.length === 0 && searchQuery.trim() === '' && activeCategory === 'รายการโปรด' && <p className="menu-grid-message">ยังไม่มีรายการโปรด... กด ⭐️ เพื่อเพิ่ม</p>}
                    {filteredMenuItems.length === 0 && searchQuery.trim() === '' && activeCategory !== 'รายการโปรด' && <p className="menu-grid-message">ไม่มีสินค้าในหมวดหมู่นี้</p>}
                    {filteredMenuItems.map((item, index) => {
                        const isFocused = shopSettings.isKeyboardNavEnabled && focusedItem?.pane === 'menu' && focusedItem.index === index;
                        return (
                            <div key={item.id} className={`menu-card ${isFocused ? 'keyboard-focused' : ''}`} ref={getMenuItemRef(item.id)}>
                                {isAdminMode && (
                                    <div className="admin-item-controls">
                                        <button onClick={() => onDeleteItem(item.id, item.name)} title="ลบสินค้า"><span className="material-symbols-outlined">delete</span></button>
                                        <button onClick={() => handleOpenMenuItemModal(item)} title="แก้ไขสินค้า"><span className="material-symbols-outlined">edit</span></button>
                                    </div>
                                )}
                                <button className="menu-card-fav-btn" onClick={() => toggleFavorite(item.id)}>
                                    <span className={`material-symbols-outlined ${favoriteIds.has(item.id) ? 'filled' : ''}`}>star</span>
                                </button>
                                <div className="card-content" onClick={() => addToCart(item)}>
                                    {/* === ULTRAMAX DEVS EDIT START: Replace <img> with smart component === */}
                                    <MenuCardImage item={item} />
                                    {/* === ULTRAMAX DEVS EDIT END === */}
                                    <div className="menu-card-body">
                                        <h3 className="menu-card-title">{item.name}</h3>
                                        <p className="menu-card-price">฿{item.price.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default MenuGrid;