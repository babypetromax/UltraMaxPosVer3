import React, { useState } from 'react';
import GeneralSettings from './GeneralSettings';
import SmartReceiptEditor from './SmartReceiptEditor';
import FeatureSettings from './FeatureSettings';
import SecuritySettings from './SecuritySettings';
import DataManagement from './DataManagement';

type SettingTab = 'general' | 'receipts' | 'features' | 'payments' | 'security' | 'data';


const SettingsScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SettingTab>('general');
    
    const tabs: {id: SettingTab, name: string, icon: string}[] = [
      {id: 'general', name: 'ตั้งค่าทั่วไป', icon: 'storefront'},
      {id: 'receipts', name: 'ใบเสร็จ', icon: 'print'},
      {id: 'features', name: 'โหมด & การใช้งาน', icon: 'toggle_on'},
      {id: 'data', name: 'จัดการข้อมูล', icon: 'database'},
      {id: 'payments', name: 'ประเภทการชำระเงิน', icon: 'credit_card'},
      {id: 'security', name: 'ผู้ใช้ & ความปลอดภัย', icon: 'lock'},
    ];

    return (
        <div className="settings-screen">
            <nav className="settings-nav">
                <h2>ตั้งค่า</h2>
                <ul className="settings-nav-list">
                    {tabs.map(tab => (
                         <li key={tab.id} className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                            <span className="material-symbols-outlined">{tab.icon}</span>
                            <span>{tab.name}</span>
                        </li>
                    ))}
                </ul>
            </nav>
            <main className="settings-content">
                <div className="settings-page-header">
                    <h1>{tabs.find(t => t.id === activeTab)?.name}</h1>
                </div>
                {activeTab === 'general' && <GeneralSettings />}
                {activeTab === 'receipts' && <SmartReceiptEditor />}
                {activeTab === 'features' && <FeatureSettings />}
                {activeTab === 'security' && <SecuritySettings />}
                {activeTab === 'data' && <DataManagement />}
                {['payments'].includes(activeTab) && (
                    <div className="settings-card placeholder">
                        <h3>{tabs.find(t => t.id === activeTab)?.name}</h3>
                        <p>ส่วนนี้ยังอยู่ในระหว่างการพัฒนา</p>
                    </div>
                )}
            </main>
        </div>
    )
};

export default SettingsScreen;