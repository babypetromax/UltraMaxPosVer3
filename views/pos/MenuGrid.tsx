import React, { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
// === ULTRAMAX DEVS EDIT START: Import the new central store ===
import { useStore } from '../../contexts/store';
import MenuCardImage from '../../components/MenuCardImage';
// We no longer need useData or useCart here
// === ULTRAMAX DEVS EDIT END ===


const MenuGrid: React.FC = () => {
    const { 
        searchQuery, 
        isAdminMode, 
        setFocusedItem,
        focusedItem,
        handleOpenMenuItemModal 
    } = useApp();
    const { showConfirmation } = useConfirmation();

    // === ULTRAMAX DEVS EDIT START: Selectively subscribe to the store ===
    const {
        menuItems,
        activeCategory,
        favoriteIds,
        isMenuLoading,
        menuError,
        handleDeleteItem,
        toggleFavorite,
        addToCart,
        shopSettings
    } = useStore(state => ({
        menuItems: state.menuItems,
        activeCategory: state.activeCategory,
        favoriteIds: state.favoriteIds,
        isMenuLoading: state.isMenuLoading,
        menuError: state.menuError,
        handleDeleteItem: state.handleDeleteItem,
        toggleFavorite: state.toggleFavorite,
        addToCart: state.addToCart,
        shopSettings: state.shopSettings,
    }));

    // The logic for filtering menu items is now derived from the store's state
    const filteredMenuItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (query !== '') {
            return menuItems.filter(item => item.name.toLowerCase().includes(query));
        }
        if (activeCategory === 'รายการโปรด') {
            return menuItems.filter(item => favoriteIds.has(item.id));
        }
        return menuItems.filter(item => item.category === activeCategory);
    }, [menuItems, activeCategory, favoriteIds, searchQuery]);
    // === ULTRAMAX DEVS EDIT END ===

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
                    // Refs for keyboard navigation would be handled differently or removed
                    // for simplicity in this refactor. We'll omit them for now.
                >
                    {filteredMenuItems.length === 0 && searchQuery.trim() !== '' && <p className="menu-grid-message">ไม่พบสินค้าที่ตรงกับ: "{searchQuery}"</p>}
                    {filteredMenuItems.length === 0 && searchQuery.trim() === '' && activeCategory === 'รายการโปรด' && <p className="menu-grid-message">ยังไม่มีรายการโปรด... กด ⭐️ เพื่อเพิ่ม</p>}
                    {filteredMenuItems.length === 0 && searchQuery.trim() === '' && activeCategory !== 'รายการโปรด' && <p className="menu-grid-message">ไม่มีสินค้าในหมวดหมู่นี้</p>}
                    {filteredMenuItems.map((item, index) => {
                        const isFocused = shopSettings.isKeyboardNavEnabled && focusedItem?.pane === 'menu' && focusedItem.index === index;
                        return (
                            <div key={item.id} className={`menu-card ${isFocused ? 'keyboard-focused' : ''}`}>
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
                                    <MenuCardImage item={item} />
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
