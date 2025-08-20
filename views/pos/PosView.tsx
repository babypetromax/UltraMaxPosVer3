import React from 'react';
import CategoryColumn from './CategoryColumn';
import MenuGrid from './MenuGrid';
import OrderPanel from './OrderPanel';
import { useApp } from '../../contexts/AppContext';

// === ULTRAMAX DEVS REFACTOR: No longer needs useCart, useData, or useStore ===
// This component's only job is to manage the layout and the visibility of the order panel on mobile.

const PosView: React.FC = () => {
    // We only need useApp for UI state that is specific to this view layout
    const { isOrderPanelOpen, setIsOrderPanelOpen } = useApp();

    // All complex logic (like keyboard navigation) has been moved to the child components (MenuGrid, CategoryColumn)
    // where it belongs. This makes PosView clean, simple, and highly maintainable.

    return (
        <main className="pos-view">
            {/* This overlay is for closing the side panel when clicking outside on smaller screens */}
            <div className={`pos-view-overlay ${isOrderPanelOpen ? 'is-visible' : ''}`} onClick={() => setIsOrderPanelOpen(false)}></div>
            
            <CategoryColumn />
            <MenuGrid />
            <OrderPanel />
        </main>
    );
};

export default PosView;