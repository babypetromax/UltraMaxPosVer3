import React, { useState, useEffect } from 'react';
import { MenuItem } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { useData } from '../../contexts/DataContext';
import { useNotification } from '../../contexts/NotificationContext';

const MenuItemModal: React.FC = () => {
    const { showMenuItemModal, setShowMenuItemModal, editingItem } = useApp();
    const { categories, handleSaveMenuItem } = useData();
    const { showNotification } = useNotification();
    
    // State เดิมสำหรับข้อมูลในฟอร์ม
    const [formData, setFormData] = useState<Omit<MenuItem, 'id'>>({ name: '', price: 0, image: '', category: '' });
    // === ส่วนที่เพิ่มเข้ามา ===
    // State ใหม่สำหรับเก็บไฟล์รูปที่ผู้ใช้เลือก
    const [imageFile, setImageFile] = useState<File | null>(null); 
    // State ใหม่สำหรับแสดงรูปตัวอย่าง (Preview)
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        // เมื่อ modal เปิดขึ้นมา ให้ตั้งค่าข้อมูลเริ่มต้น
        if (editingItem) {
            const initialData = 'name' in editingItem 
                ? { name: editingItem.name, price: editingItem.price, image: editingItem.image, category: editingItem.category }
                : { name: '', price: 0, image: '', category: editingItem.category };
            
            setFormData(initialData);
            setImagePreview(initialData.image || null); // แสดงรูปเดิมที่มีอยู่
            setImageFile(null); // รีเซ็ตไฟล์ที่เคยเลือกไว้ก่อนหน้า
        }
    }, [editingItem]);

    if (!showMenuItemModal) return null;
    
    const isNew = !editingItem || !('id' in editingItem);

    // === ฟังก์ชันใหม่สำหรับจัดการเมื่อผู้ใช้เลือกไฟล์ ===
    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file); // เก็บไฟล์ไว้ใน state
            // สร้าง URL ชั่วคราวจากไฟล์เพื่อแสดงเป็นรูปตัวอย่าง
            setImagePreview(URL.createObjectURL(file)); 
        }
    };

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
        // === ส่วนที่แก้ไข ===
        // ส่ง `imageFile` ไปพร้อมกับข้อมูลอื่น ๆ
        handleSaveMenuItem({ ...formData, id: isNew ? 0 : (editingItem as MenuItem).id }, imageFile);
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
                    
                    {/* === UI ใหม่สำหรับอัปโหลดรูปภาพ === */}
                    <div className="form-group">
                        <label htmlFor="imageFile">รูปภาพ (แนะนำ: อัปโหลดไฟล์)</label>
                        <input type="file" id="imageFile" name="imageFile" accept="image/*" onChange={handleImageFileChange} style={{border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '0.375rem', width: '100%'}}/>
                        {imagePreview && <img src={imagePreview} alt="Preview" style={{ maxWidth: '100px', marginTop: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />}
                    </div>
                    <div className="form-group">
                        <label htmlFor="image">หรือวาง URL รูปภาพ (สำรอง)</label>
                        <input type="text" id="image" name="image" value={formData.image} onChange={handleChange} placeholder="https://..." />
                    </div>
                    {/* === จบส่วน UI ใหม่ === */}

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