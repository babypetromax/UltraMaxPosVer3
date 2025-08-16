import React, { useState, useEffect } from 'react';
import { ShopSettings } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useApp } from '../../contexts/AppContext';
import { useNotification } from '../../contexts/NotificationContext';

const FeatureSettings: React.FC = () => {
    const { shopSettings, setShopSettings, logAction } = useData();
    const { isAdminMode } = useApp();
    const { showNotification } = useNotification();
    const [localSettings, setLocalSettings] = useState(shopSettings);

    useEffect(() => {
        if (!isAdminMode) { setLocalSettings(shopSettings); }
    }, [isAdminMode, shopSettings]);
    
    const handleChange = (key: keyof ShopSettings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        setShopSettings(localSettings);
        logAction('บันทึกการตั้งค่าโหมดการใช้งาน');
        showNotification('บันทึกการตั้งค่าโหมดการใช้งานแล้ว', 'success');
    };

    return (
        <div className="settings-card">
            <h3>โหมดการใช้งานและหน้าจอ</h3>
            <div className="form-group">
                <label>โหมดการป้อนข้อมูลหลัก</label>
                <p className="text-secondary" style={{marginBottom: '0.75rem', fontSize: '0.9rem'}}>เลือกโหมดที่เหมาะสมกับอุปกรณ์ของคุณ</p>
                <div className="radio-group">
                    <label className="radio-label">
                        <input
                            type="radio"
                            name="interactionMode"
                            value="desktop"
                            checked={localSettings.interactionMode === 'desktop'}
                            onChange={() => handleChange('interactionMode', 'desktop')}
                            disabled={!isAdminMode}
                        />
                        <span className="radio-custom"></span>
                        <span>
                            <strong>เดสก์ท็อป (เมาส์และคีย์บอร์ด)</strong>
                            <small>เหมาะสำหรับคอมพิวเตอร์ที่มีเมาส์และคีย์บอร์ด</small>
                        </span>
                    </label>
                    <label className="radio-label">
                        <input
                            type="radio"
                            name="interactionMode"
                            value="touch"
                            checked={localSettings.interactionMode === 'touch'}
                            onChange={() => handleChange('interactionMode', 'touch')}
                            disabled={!isAdminMode}
                        />
                         <span className="radio-custom"></span>
                         <span>
                            <strong>หน้าจอสัมผัส (แท็บเล็ต/มือถือ)</strong>
                            <small>ปรับปุ่มและระยะห่างให้ใหญ่ขึ้นเพื่อการสัมผัส</small>
                        </span>
                    </label>
                </div>
            </div>

            <div className="form-group">
                <label>การนำทางด้วยคีย์บอร์ด</label>
                 <p className="text-secondary" style={{marginBottom: '0.75rem', fontSize: '0.9rem'}}>เปิดเพื่อแสดงไฮไลท์และใช้งานคีย์บอร์ดเพื่อเลือกเมนู (เหมาะสำหรับโหมดเดสก์ท็อป)</p>
                <div className="vat-toggle">
                    <span>ปิด/เปิดใช้งานไฮไลท์</span>
                    <label className="switch">
                        <input
                            type="checkbox"
                            checked={localSettings.isKeyboardNavEnabled}
                            onChange={(e) => handleChange('isKeyboardNavEnabled', e.target.checked)}
                            disabled={!isAdminMode}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
            </div>

             <div className="form-group">
                <label>การปรับหน้าจอ (Responsive)</label>
                <p className="text-secondary" style={{fontSize: '0.9rem'}}>
                    แอปพลิเคชันถูกออกแบบมาให้ปรับขนาดตามความกว้างของหน้าจอโดยอัตโนมัติ (Smart Display) เพื่อให้แสดงผลได้ดีที่สุดทั้งในโหมดแนวนอน (แนะนำ) และแนวตั้งบนอุปกรณ์ต่างๆ
                </p>
            </div>

            {isAdminMode && <button className="action-button" onClick={handleSave}>บันทึกการเปลี่ยนแปลง</button>}
        </div>
    );
};

export default FeatureSettings;
