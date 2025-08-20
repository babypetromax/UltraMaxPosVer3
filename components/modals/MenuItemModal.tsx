import React, { useState, useEffect } from 'react';
import { MenuItem } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { useNotification } from '../../contexts/NotificationContext';
// === ULTRAMAX DEVS EDIT START: Import the new central store ===
import { useStore } from '../../contexts/store';
// We no longer need useData
// === ULTRAMAX DEVS EDIT END ===

const MenuItemModal: React.FC = () => {
    const { showMenuItemModal, setShowMenuItemModal, editingItem } = useApp();
    const { showNotification } = useNotification();

    // === ULTRAMAX DEVS EDIT START: Selectively subscribe to the store ===
    const { categories, handleSaveMenuItem } = useStore(state => ({
        categories: state.categories,
        handleSaveMenuItem: state.handleSaveMenuItem,
    }));
    // === ULTRAMAX DEVS EDIT END ===

    const [formData, setFormData] = useState<Omit<MenuItem, 'id'>>({ name: '', price: 0, image: '', category: '' });

    useEffect(() => {
        if (editingItem && 'name' in editingItem) {
            setFormData({ name: editingItem.name, price: editingItem.price, image: editingItem.image, category: editingItem.category });
        } else if (editingItem) {
            setFormData({ name: '', price: 0, image: '', category: editingItem.category });
        }
    }, [editingItem]);

    if (!showMenuItemModal) return null;

    const isNew = !editingItem || !('id' in editingItem);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'price' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.category) {
            showNotification('กรุณากรอกชื่อและเลือกหมวดหมู่', 'warning');
            return;
        }
        // In a real scenario, you might handle imageFile separately
        handleSaveMenuItem({ ...formData, id: isNew ? 0 : (editingItem as MenuItem).id }, null);
        setShowMenuItemModal(false);
    };

    return (
        <div className="modal-overlay" onClick={() => setShowMenuItemModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="modal-header">
                        <h2 className="modal-title">{isNew ? 'เพิ่มสินค้าใหม่' : 'แก้ไขสินค้า'}</h2>
                        <button type="button" className="close-modal-btn" onClick={() => setShowMenuItemModal(false)}>&times;</button>
                    </div>
                    <div className="form-group"><label htmlFor="name">ชื่อสินค้า</label><input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required /></div>
                    <div className="form-group"><label htmlFor="price">ราคา</label><input type="number" id="price" name="price" value={formData.price} onChange={handleChange} required /></div>
                    <div className="form-group"><label htmlFor="image">URL รูปภาพ</label><input type="text" id="image" name="image" value={formData.image} onChange={handleChange} /></div>
                    <div className="form-group"><label htmlFor="category">หมวดหมู่</label>
                        <select id="category" name="category" value={formData.category} onChange={handleChange} required>
                            <option value="" disabled>-- เลือกหมวดหมู่ --</option>
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="action-button" style={{width: '100%', justifyContent: 'center'}}>{isNew ? 'เพิ่มสินค้า' : 'บันทึกการเปลี่ยนแปลง'}</button>
                </form>
            </div>
        </div>
    );
};

export default MenuItemModal;