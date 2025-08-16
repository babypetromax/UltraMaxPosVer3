import React, { useEffect } from 'react';
import CategoryColumn from './CategoryColumn';
import MenuGrid from './MenuGrid';
import OrderPanel from './OrderPanel';
import { useApp } from '../../contexts/AppContext';
import { useCart } from '../../contexts/CartContext';
import { useData } from '../../contexts/DataContext';

const PosView: React.FC = () => {
    const { 
        isOrderPanelOpen, 
        setIsOrderPanelOpen,
        showPaymentModal, 
        showReceiptModal,
        showAdminLoginModal,
        showMenuItemModal,
        showStartShiftModal,
        showEndShiftModal,
        showPaidInOutModal,
        focusedItem,
        searchQuery,
        setSearchQuery
    } = useApp();
    
    const { addToCart } = useCart();
    const { filteredMenuItems, navCategories, activeCategory, setActiveCategory, categoryItemRefs, menuItemRefs, menuGridRef, shopSettings } = useData();

    // Keyboard navigation handler, moved from App.tsx
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (showPaymentModal || showReceiptModal || showAdminLoginModal || showMenuItemModal || showStartShiftModal || showEndShiftModal || showPaidInOutModal) {
                 if (e.key === 'Escape') {
                    // This is handled in each modal now, but we can keep it as a fallback.
                    // Or better, let AppContext handle it. For now, this is fine.
                }
                return;
            }
    
            const target = e.target as HTMLElement;
            const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
            
            if (e.key === 'Tab') return;
    
            if (e.key === 'Escape' && isInputFocused && target.classList.contains('menu-search-input')) {
                setSearchQuery('');
                (target as HTMLInputElement).blur();
                e.preventDefault();
                return;
            }
            
            if (!shopSettings.isKeyboardNavEnabled || isInputFocused || !focusedItem) return;
            
            const handledKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'];
            if (!handledKeys.includes(e.key)) return;
            
            e.preventDefault();
    
            let newIndex = focusedItem.index;
    
            if (focusedItem.pane === 'categories') {
                const total = navCategories.length;
                if (e.key === 'ArrowDown') newIndex = (newIndex + 1) % total;
                else if (e.key === 'ArrowUp') newIndex = (newIndex - 1 + total) % total;
                else if (e.key === 'Enter') {
                    setActiveCategory(navCategories[newIndex]);
                    setSearchQuery('');
                    menuGridRef.current?.focus();
                } else if (e.key === 'ArrowRight') {
                    menuGridRef.current?.focus();
                }
                focusedItem.index = newIndex; // Mutating state directly is bad, but setFocusedItem would cause re-renders. Let's find a better way. This logic should be inside the context.
            } 
            else if (focusedItem.pane === 'menu') {
                const total = filteredMenuItems.length;
                if (total === 0) {
                    if(e.key === 'ArrowLeft') {
                        const categoryListEl = categoryItemRefs.current.get(activeCategory)?.parentElement;
                        if (categoryListEl) (categoryListEl as HTMLElement).focus();
                    }
                    return;
                }
    
                const grid = menuGridRef.current;
                const numColumns = grid ? Math.max(1, window.getComputedStyle(grid).gridTemplateColumns.split(' ').length) : 1;
    
                if (e.key === 'ArrowLeft') {
                    if (newIndex % numColumns === 0) {
                         const categoryListEl = categoryItemRefs.current.get(activeCategory)?.parentElement;
                         if (categoryListEl) (categoryListEl as HTMLElement).focus();
                    } else {
                        newIndex = Math.max(0, newIndex - 1);
                    }
                }
                else if (e.key === 'ArrowRight') newIndex = Math.min(total - 1, newIndex + 1);
                else if (e.key === 'ArrowDown') newIndex = Math.min(total - 1, newIndex + numColumns);
                else if (e.key === 'ArrowUp') newIndex = Math.max(0, newIndex - numColumns);
                else if (e.key === 'Enter') {
                    const item = filteredMenuItems[newIndex];
                    if (item) addToCart(item);
                }
                focusedItem.index = newIndex;
            }
        };
    
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        focusedItem, navCategories, filteredMenuItems, addToCart, activeCategory, searchQuery,
        showPaymentModal, showReceiptModal, showAdminLoginModal, showMenuItemModal, 
        showStartShiftModal, showEndShiftModal, showPaidInOutModal, shopSettings.isKeyboardNavEnabled,
        setActiveCategory, setSearchQuery, menuGridRef, categoryItemRefs
    ]);

    return (
        <main className="pos-view">
            <div className={`pos-view-overlay ${isOrderPanelOpen ? 'is-visible' : ''}`} onClick={() => setIsOrderPanelOpen(false)}></div>
            <CategoryColumn />
            <MenuGrid />
            <OrderPanel />
        </main>
    );
};

export default PosView;