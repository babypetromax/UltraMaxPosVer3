import React, { useState, useEffect } from 'react';
import { ShopSettings } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useApp } from '../../contexts/AppContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';

// --- DUMMY DATA ---
const dummyOrderData = {
    id: 'DEMO-0001',
    items: [
        { id: 1, name: 'ทาโกะยากิ Original', price: 60, quantity: 2, category: 'Main', image: '' },
        { id: 2, name: 'ชาเขียวเย็น', price: 25, quantity: 1, category: 'Drinks', image: '' },
        { id: 3, name: 'เพิ่มชีส', price: 15, quantity: 1, category: 'Topping', image: '' },
    ],
    subtotal: 160.00,
    discountValue: 10.00,
    tax: 10.50,
    total: 160.50,
    timestamp: new Date(),
    paymentMethod: 'cash' as const,
    vatRate: 0.07,
    status: 'completed' as const,
    cashReceived: 200,
    syncStatus: 'synced' as const
};


// --- SUB-COMPONENTS ---
const ReceiptPaperPreview: React.FC<{
    orderData: typeof dummyOrderData;
    shopSettings: ShopSettings;
    offlineLogo: string | null;
    offlinePromo: string | null;
    receiptWidth: '58mm' | '80mm';
}> = ({ orderData, shopSettings, offlineLogo, offlinePromo, receiptWidth }) => {
    
    const change = orderData.cashReceived ? orderData.cashReceived - orderData.total : 0;
    
    const receiptStyles = {
        '--receipt-logo-max-width': `${shopSettings.logoSizePercent}%`,
        '--receipt-promo-max-width': `${shopSettings.promoSizePercent}%`,
        '--receipt-top-margin': `${shopSettings.receiptTopMargin}px`,
        '--receipt-bottom-margin': `${shopSettings.receiptBottomMargin}px`,
        '--receipt-line-spacing': shopSettings.receiptLineSpacing
    } as React.CSSProperties;

    const logoToShow = offlineLogo || shopSettings.logoUrl;
    const promoToShow = offlinePromo || shopSettings.promoUrl;

    return (
        <div style={receiptStyles} className={`receipt-paper receipt-${receiptWidth}`}>
            <div className="receipt-header-content">
                {logoToShow && <img src={logoToShow} alt="Shop Logo" className="receipt-logo" />}
                <p><strong>{shopSettings.shopName}</strong></p>
                <p>{shopSettings.address}</p>
                {shopSettings.phone && <p>โทร: {shopSettings.phone}</p>}
                {shopSettings.taxId && <p>เลขประจำตัวผู้เสียภาษี: {shopSettings.taxId}</p>}
                <p>ใบเสร็จรับเงิน/ใบกำกับภาษีอย่างย่อ</p>
            </div>
            <hr className="receipt-hr" />
            <div className="receipt-info">
                <span>เลขที่: {orderData.id}</span>
                <span>วันที่: {new Date(orderData.timestamp).toLocaleString('th-TH', {dateStyle: 'short', timeStyle: 'short'})}</span>
            </div>
            <hr className="receipt-hr" />
            <table className="receipt-items-table">
                <thead><tr><th>รายการ</th><th className="col-qty">จำนวน</th><th className="col-price">ราคา</th><th className="col-total">รวม</th></tr></thead>
                <tbody>
                    {orderData.items.map(item => (
                        <tr key={item.id}><td>{item.name}</td><td className="col-qty">{item.quantity}</td><td className="col-price">{item.price.toFixed(2)}</td><td className="col-total">{(item.price * item.quantity).toFixed(2)}</td></tr>
                    ))}
                </tbody>
            </table>
            <hr className="receipt-hr" />
            <table className="receipt-summary-table">
                <tbody>
                    <tr><td>ยอดรวม</td><td>{orderData.subtotal.toFixed(2)}</td></tr>
                    {orderData.discountValue > 0 && <tr><td>ส่วนลด</td><td>-{orderData.discountValue.toFixed(2)}</td></tr>}
                    {orderData.tax > 0 && <tr><td>ภาษีมูลค่าเพิ่ม ({(orderData.vatRate * 100).toFixed(0)}%)</td><td>{orderData.tax.toFixed(2)}</td></tr>}
                    <tr className="total"><td><strong>ยอดสุทธิ</strong></td><td><strong>{orderData.total.toFixed(2)}</strong></td></tr>
                    {orderData.paymentMethod === 'cash' && typeof orderData.cashReceived !== 'undefined' && (
                        <>
                            <tr className="receipt-payment-separator"><td colSpan={2}><hr className="receipt-hr" /></td></tr>
                            <tr><td>รับเงินสด</td><td>{orderData.cashReceived.toFixed(2)}</td></tr>
                            <tr><td>เงินทอน</td><td>{change.toFixed(2)}</td></tr>
                        </>
                    )}
                </tbody>
            </table>
            <hr className="receipt-hr" />
            <div className="receipt-footer">
                <p>{shopSettings.headerText}</p>
                {promoToShow && <img src={promoToShow} alt="Promo" className="receipt-promo" />}
                <p>{shopSettings.footerText}</p>
            </div>
        </div>
    );
};

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" style={{width: '1.25rem', height: '1.25rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);


// --- MAIN COMPONENT ---
export default function SmartReceiptEditor() {
    const { 
        shopSettings, 
        setShopSettings, 
        logAction, 
        offlineReceiptLogo, 
        setOfflineReceiptLogo,
        offlineReceiptPromo,
        setOfflineReceiptPromo
    } = useData();
    const { isAdminMode } = useApp();
    const { showNotification } = useNotification();
    const { showConfirmation } = useConfirmation();

    const [localSettings, setLocalSettings] = useState<ShopSettings>(shopSettings);
    const [receiptWidth, setReceiptWidth] = useState<'58mm' | '80mm'>('58mm');
    
    useEffect(() => {
        setLocalSettings(shopSettings);
    }, [shopSettings]);

    const handleChange = (key: keyof ShopSettings, value: string | number) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        setShopSettings(localSettings);
        logAction('บันทึกการตั้งค่าใบเสร็จ (Smart Editor)');
        showNotification('บันทึกการตั้งค่าใบเสร็จและรูปแบบใหม่แล้ว', 'success');
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, stateSetter: (d: string | null) => void, storageKey: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            stateSetter(dataUrl);
            localStorage.setItem(storageKey, dataUrl);
            showNotification(`อัปโหลดและบันทึกรูปสำหรับ "${storageKey.replace('takoyaki_pos_offline_', '')}" เรียบร้อยแล้ว`, 'success');
        };
        reader.readAsDataURL(file);
    };

    const handleImageDelete = async (stateSetter: (d: string | null) => void, storageKey: string) => {
        const keyName = storageKey.replace('takoyaki_pos_offline_', '');
        const confirmed = await showConfirmation({
            title: `ลบรูปภาพ ${keyName}`,
            message: `คุณต้องการลบรูปภาพออฟไลน์สำหรับ "${keyName}" หรือไม่?`,
        });
        if (confirmed) {
            stateSetter(null);
            localStorage.removeItem(storageKey);
            showNotification(`ลบรูปภาพ "${keyName}" เรียบร้อยแล้ว`, 'success');
        }
    };


    return (
        <div className="receipt-editor-layout">
            <div className="receipt-editor-controls">
                <h3>ขนาดโลโก้ (%)</h3>
                <div className="form-group">
                    <div className="slider-group">
                        <input type="range" min="10" max="100" value={localSettings.logoSizePercent} onChange={(e) => handleChange('logoSizePercent', Number(e.target.value))} disabled={!isAdminMode} />
                        <span>{localSettings.logoSizePercent}%</span>
                    </div>
                </div>

                <h3>ขนาดรูปโปรโมชั่น (%)</h3>
                <div className="form-group">
                    <div className="slider-group">
                        <input type="range" min="10" max="100" value={localSettings.promoSizePercent} onChange={(e) => handleChange('promoSizePercent', Number(e.target.value))} disabled={!isAdminMode} />
                        <span>{localSettings.promoSizePercent}%</span>
                    </div>
                </div>

                <h3>ระยะห่างขอบบน (px)</h3>
                 <div className="form-group">
                    <div className="slider-group">
                        <input type="range" min="0" max="50" value={localSettings.receiptTopMargin} onChange={(e) => handleChange('receiptTopMargin', Number(e.target.value))} disabled={!isAdminMode} />
                        <span>{localSettings.receiptTopMargin}px</span>
                    </div>
                </div>

                <h3>ระยะห่างขอบล่าง (px)</h3>
                <div className="form-group">
                    <div className="slider-group">
                        <input type="range" min="0" max="50" value={localSettings.receiptBottomMargin} onChange={(e) => handleChange('receiptBottomMargin', Number(e.target.value))} disabled={!isAdminMode} />
                        <span>{localSettings.receiptBottomMargin}px</span>
                    </div>
                </div>

                <h3>ระยะห่างระหว่างบรรทัด</h3>
                <div className="form-group">
                    <div className="slider-group">
                        <input type="range" min="1" max="2" step="0.1" value={localSettings.receiptLineSpacing} onChange={(e) => handleChange('receiptLineSpacing', Number(e.target.value))} disabled={!isAdminMode} />
                        <span>{localSettings.receiptLineSpacing.toFixed(1)}</span>
                    </div>
                </div>

                <div className="settings-divider"></div>

                <h3>ข้อความ & รูปภาพ (ออนไลน์)</h3>
                 <div className="form-group">
                    <label htmlFor="headerText">ข้อความส่วนหัว</label>
                    <textarea id="headerText" rows={2} value={localSettings.headerText} onChange={(e) => handleChange('headerText', e.target.value)} disabled={!isAdminMode}></textarea>
                </div>
                 <div className="form-group">
                    <label htmlFor="footerText">ข้อความส่วนท้าย</label>
                    <textarea id="footerText" rows={2} value={localSettings.footerText} onChange={(e) => handleChange('footerText', e.target.value)} disabled={!isAdminMode}></textarea>
                </div>
                <div className="form-group">
                    <label htmlFor="logoUrl">URL โลโก้</label>
                    <input type="text" id="logoUrl" value={localSettings.logoUrl} onChange={(e) => handleChange('logoUrl', e.target.value)} disabled={!isAdminMode} placeholder="https://..." />
                </div>
                <div className="form-group">
                    <label htmlFor="promoUrl">URL รูปโปรโมชัน</label>
                    <input type="text" id="promoUrl" value={localSettings.promoUrl} onChange={(e) => handleChange('promoUrl', e.target.value)} disabled={!isAdminMode} placeholder="https://..." />
                </div>
                
                <div className="settings-divider"></div>

                <h3>รูปภาพสำหรับโหมดออฟไลน์</h3>
                <p className="text-secondary" style={{marginBottom: '1rem', fontSize: '0.9rem'}}>รูปภาพเหล่านี้จะถูกบันทึกลงในเครื่อง และจะแสดงบนใบเสร็จเมื่อไม่มีการเชื่อมต่ออินเทอร์เน็ต</p>
                
                <div className="form-group">
                    <label>โลโก้ (ออฟไลน์)</label>
                    <div className="upload-control">
                        <div className="upload-preview">
                            {offlineReceiptLogo ? (
                                <>
                                    <img src={offlineReceiptLogo} alt="Offline Logo Preview" />
                                    {isAdminMode && <button className="delete-upload-btn" onClick={() => handleImageDelete(setOfflineReceiptLogo, 'takoyaki_pos_offline_logo')}>&times;</button>}
                                </>
                            ) : <p className="text-secondary" style={{fontSize: '0.9rem'}}>ไม่มีรูป</p>}
                        </div>
                        {isAdminMode && (
                            <label className="action-button">
                                <UploadIcon />
                                <span>อัปโหลด</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setOfflineReceiptLogo, 'takoyaki_pos_offline_logo')} />
                            </label>
                        )}
                    </div>
                </div>

                <div className="form-group">
                    <label>รูปโปรโมชัน (ออฟไลน์)</label>
                    <div className="upload-control">
                        <div className="upload-preview">
                            {offlineReceiptPromo ? (
                                <>
                                    <img src={offlineReceiptPromo} alt="Offline Promo Preview" />
                                    {isAdminMode && <button className="delete-upload-btn" onClick={() => handleImageDelete(setOfflineReceiptPromo, 'takoyaki_pos_offline_promo')}>&times;</button>}
                                </>
                            ) : <p className="text-secondary" style={{fontSize: '0.9rem'}}>ไม่มีรูป</p>}
                        </div>
                        {isAdminMode && (
                            <label className="action-button">
                                <UploadIcon />
                                <span>อัปโหลด</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setOfflineReceiptPromo, 'takoyaki_pos_offline_promo')} />
                            </label>
                        )}
                    </div>
                </div>

                {isAdminMode && <button className="action-button save-button" onClick={handleSave}>บันทึกการตั้งค่าใบเสร็จ</button>}
            </div>
            <div className="receipt-editor-preview-area">
                 <div className="receipt-size-toggle" style={{width: '200px', backgroundColor: 'var(--surface-color)'}}>
                    <button className={receiptWidth === '58mm' ? 'active' : ''} onClick={() => setReceiptWidth('58mm')}>58mm</button>
                    <button className={receiptWidth === '80mm' ? 'active' : ''} onClick={() => setReceiptWidth('80mm')}>80mm</button>
                </div>
                <ReceiptPaperPreview 
                    orderData={dummyOrderData} 
                    shopSettings={localSettings} 
                    offlineLogo={offlineReceiptLogo}
                    offlinePromo={offlineReceiptPromo}
                    receiptWidth={receiptWidth}
                />
            </div>
        </div>
    );
}