import React, { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
// === ULTRAMAX DEVS EDIT START: Import the new central store ===
import { useStore } from '../../contexts/store';
// We no longer need useData here
// === ULTRAMAX DEVS EDIT END ===

const CategoryColumn: React.FC = () => {
    const { searchQuery, setSearchQuery, setFocusedItem, focusedItem, isAdminMode } = useApp();
    const { showConfirmation } = useConfirmation();

    // === ULTRAMAX DEVS EDIT START: Selectively subscribe to the store ===
    const {
        categories,
        activeCategory,
        setActiveCategory,
        handleDeleteCategory,
        handleAddCategory,
        shopSettings
    } = useStore(state => ({
        categories: state.categories,
        activeCategory: state.activeCategory,
        setActiveCategory: state.setActiveCategory,
        handleDeleteCategory: state.handleDeleteCategory,
        handleAddCategory: state.handleAddCategory,
        shopSettings: state.shopSettings,
    }));

    // Recreate navCategories logic which was previously in DataContext
    const navCategories = useMemo(() => ['รายการโปรด', ...categories], [categories]);
    // === ULTRAMAX DEVS EDIT END ===


    const onAddCategory = () => {
        if (!isAdminMode) return;
        const newCategoryName = prompt('กรุณาใส่ชื่อหมวดหมู่ใหม่:');
        if (newCategoryName && newCategoryName.trim() !== '') {
            handleAddCategory(newCategoryName.trim());
        }
    };

    const onDeleteCategory = async (cat: string) => {
        if (!isAdminMode) return;
        const confirmed = await showConfirmation({
            title: 'ยืนยันการลบหมวดหมู่',
            message: `คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ '${cat}'? การกระทำนี้ไม่สามารถย้อนกลับได้`,
        });
        if (confirmed) {
            handleDeleteCategory(cat);
        }
    };

    return (
        <aside className="category-column">
            <div className="search-bar-container">
                 <span className="material-symbols-outlined search-icon">search</span>
                 <input
                    type="text"
                    placeholder="ค้นหาเมนู (เช่น แซลมอน)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="menu-search-input"
                    onFocus={() => setFocusedItem(null)}
                 />
            </div>
            <h2>หมวดหมู่</h2>
            <ul className="category-list"
                tabIndex={shopSettings.isKeyboardNavEnabled ? 0 : -1}
                onFocus={() => {
                    if (shopSettings.isKeyboardNavEnabled && focusedItem?.pane !== 'categories') {
                        setFocusedItem({ pane: 'categories', index: navCategories.indexOf(activeCategory) ?? 0 });
                    }
                }}
            >
                {navCategories.map((cat, index) => {
                    const isFocused = shopSettings.isKeyboardNavEnabled && focusedItem?.pane === 'categories' && focusedItem.index === index;
                    return (
                        <li key={cat}
                            className={`category-list-item ${activeCategory === cat && searchQuery.trim() === '' ? 'active' : ''} ${isFocused ? 'keyboard-focused' : ''}`}
                            onClick={() => {
                                setSearchQuery('');
                                setActiveCategory(cat);
                            }}>
                            <span className={`material-symbols-outlined ${cat === 'รายการโปรด' ? 'favorite-icon' : ''}`}>{
                                { 
                                    'รายการโปรด': 'star', 'ทาโกะดั้งเดิม': 'ramen_dining', 'ทาโกะเบคอน': 'outdoor_grill', 
                                    'ทาโกะแซลมอน': 'set_meal', 'ทาโกะคอมโบ้': 'restaurant_menu', 'ท็อปปิ้งพิเศษ': 'add_circle',
                                    'เดลิเวอรี่': 'delivery_dining', 'ไอศครีม': 'icecream', 'เครื่องดื่ม': 'local_bar',
                                    'สินค้าพิเศษ': 'shopping_bag'
                                }[cat] || 'label'
                            }</span>
                            <span className="category-name">{cat}</span>
                            {isAdminMode && cat !== 'รายการโปรด' && (
                                 <button className="delete-category-btn" onClick={(e) => { e.stopPropagation(); onDeleteCategory(cat); }}>&times;</button>
                            )}
                        </li>
                    );
                })}
                {isAdminMode && (
                    <li className="category-list-item add-category-btn" onClick={onAddCategory}>
                        <span className="material-symbols-outlined">add_circle</span>
                        <span className="category-name">เพิ่มหมวดหมู่</span>
                    </li>
                )}
            </ul>
        </aside>
    );
};

export default CategoryColumn;
