import React, { useState, useEffect } from 'react';
import { ShopSettings } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useApp } from '../../contexts/AppContext';
import { useNotification } from '../../contexts/NotificationContext';

const GeneralSettings: React.FC = () => {
    const { shopSettings, setShopSettings } = useData();
    const { isAdminMode } = useApp();
    const { showNotification } = useNotification();
    const [localSettings, setLocalSettings] = useState(shopSettings);

    useEffect(() => {
        if (!isAdminMode) { setLocalSettings(shopSettings); }
    }, [isAdminMode, shopSettings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { id, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        setLocalSettings(prev => ({ 
            ...prev, 
            [id]: isCheckbox ? (e.target as HTMLInputElement).checked : value 
        }));
    };

    const handleSave = () => {
        setShopSettings(localSettings);
        showNotification('บันทึกการตั้งค่าทั่วไปแล้ว', 'success');
    };

    return (
        <div className="settings-card">
            <h3>ข้อมูลร้านค้า</h3>
            <div className="form-group">
                <label htmlFor="shopName">ชื่อร้าน</label>
                <input type="text" id="shopName" value={localSettings.shopName} onChange={handleChange} disabled={!isAdminMode} />
            </div>
            <div className="form-group">
                <label htmlFor="address">ที่อยู่</label>
                <textarea id="address" rows={3} value={localSettings.address} onChange={handleChange} disabled={!isAdminMode}></textarea>
            </div>
            <div className="form-group">
                <label htmlFor="phone">เบอร์โทรศัพท์</label>
                <input type="text" id="phone" value={localSettings.phone} onChange={handleChange} disabled={!isAdminMode} />
            </div>
            <div className="form-group">
                <label htmlFor="taxId">เลขประจำตัวผู้เสียภาษี</label>
                <input type="text" id="taxId" value={localSettings.taxId} onChange={handleChange} disabled={!isAdminMode} />
            </div>

            <div className="settings-divider"></div>

            <h3>การตั้งค่าภาษี (VAT)</h3>
             <div className="form-group">
                <label>การคิดภาษีมูลค่าเพิ่มเริ่มต้น</label>
                 <p className="text-secondary" style={{marginBottom: '0.75rem', fontSize: '0.9rem'}}>
                    เปิดเพื่อตั้งค่าให้การขายทุกครั้งมีการคิด VAT 7% เป็นค่าเริ่มต้น
                 </p>
                <div className="vat-toggle">
                    <span>ปิด/เปิดใช้งาน VAT เริ่มต้น</span>
                    <label className="switch">
                        <input
                            type="checkbox"
                            id="isVatDefaultEnabled"
                            checked={localSettings.isVatDefaultEnabled}
                            onChange={handleChange}
                            disabled={!isAdminMode}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
            </div>

            <div className="settings-divider"></div>

            <h3>การตั้งค่าท้องถิ่น</h3>
            <div className="form-group">
                <label htmlFor="currency">สกุลเงิน</label>
                <select id="currency" defaultValue="THB" disabled={!isAdminMode}>
                    <option value="THB">บาท (THB)</option>
                </select>
            </div>
            {isAdminMode && <button className="action-button" onClick={handleSave}>บันทึกการเปลี่ยนแปลง</button>}
        </div>
    );
};

export default GeneralSettings;
