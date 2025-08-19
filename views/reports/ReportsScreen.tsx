import React, { useState, useMemo } from 'react';
import { Order } from '../../types';
import BillDetails from '../../components/BillDetails';
import SummaryReport from './SummaryReport';
import ReceiptsHistory from './ReceiptsHistory';
import SalesByProductReport from './SalesByProductReport';
import SalesByCategoryReport from './SalesByCategoryReport';
import SalesByPaymentReport from './SalesByPaymentReport';
import DiscountReport from './DiscountReport';
import CancelledBillsReport from './CancelledBillsReport';
import ActivityLogReport from './ActivityLogReport';
import ShiftActivityReport from './ShiftActivityReport'; // Import the new component
import { useData } from '../../contexts/DataContext';
import { useApp } from '../../contexts/AppContext';


type ReportTab = 'summary' | 'byProduct' | 'byCategory' | 'byEmployee' | 'byPayment' | 'receipts' | 'byModifier' | 'discounts' | 'taxes' | 'shifts' | 'activityLog' | 'cancelledBills';

const ReportsScreen: React.FC = () => {
    const { dailyData, shiftHistory, handleCancelBill, ai } = useData();
    const { isAdminMode } = useApp();

    const [activeTab, setActiveTab] = useState<ReportTab>('summary');
    
    // --- UPDATE: Added new report tabs based on the proposal ---
    const tabs: {id: ReportTab, name: string, icon: string}[] = [
      {id: 'summary', name: 'สรุปยอดขาย', icon: 'summarize'},
      {id: 'byProduct', name: 'ยอดขายตามสินค้า', icon: 'inventory_2'},
      {id: 'byCategory', name: 'ยอดขายตามหมวดหมู่', icon: 'category'},
      {id: 'byEmployee', name: 'ยอดขายตามพนักงาน', icon: 'badge'},
      {id: 'byPayment', name: 'ยอดขายตามการชำระเงิน', icon: 'payment'},
      {id: 'receipts', name: 'ใบเสร็จรับเงิน', icon: 'receipt_long'},
      {id: 'byModifier', name: 'ยอดขายตามตัวเลือก', icon: 'add_notes'},
      {id: 'discounts', name: 'ส่วนลด', icon: 'percent'},
      {id: 'taxes', name: 'ภาษี', icon: 'paid'},
      {id: 'shifts', name: 'กะ', icon: 'history'},
      // --- Separating system logs for clarity ---
      {id: 'cancelledBills', name: 'รายงานการลบบิล', icon: 'delete_forever'},
      {id: 'activityLog', name: 'ประวัติการทำงาน', icon: 'history_toggle_off'}
    ];
    
    const allOrders = useMemo(() => {
        if (!dailyData) return [];
        return [...dailyData.completedOrders, ...shiftHistory.flatMap(s => s.activities.filter(a => a.orderId).map(a => dailyData.completedOrders.find(o => o.id === a.orderId))).filter(Boolean) as Order[]];
    }, [dailyData, shiftHistory]);


    return (
        <div className="settings-screen">
            <nav className="settings-nav">
                <h2>รายงาน</h2>
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
                {activeTab === 'summary' && <SummaryReport orders={allOrders} ai={ai} />}
                {activeTab === 'receipts' && <ReceiptsHistory orders={dailyData?.completedOrders || []} BillDetailsComponent={BillDetails} onCancelBill={handleCancelBill} isAdminMode={isAdminMode} />}
                {activeTab === 'shifts' && <ShiftActivityReport shifts={shiftHistory} />}
                {activeTab === 'byProduct' && <SalesByProductReport orders={allOrders} />}
                {activeTab === 'byCategory' && <SalesByCategoryReport orders={allOrders} />}
                {activeTab === 'byPayment' && <SalesByPaymentReport orders={allOrders} />}
                {activeTab === 'discounts' && <DiscountReport orders={allOrders} />}
                {activeTab === 'cancelledBills' && <CancelledBillsReport orders={allOrders} />}
                {activeTab === 'activityLog' && <ActivityLogReport log={dailyData?.activityLog || []} />}
                
                {/* --- UPDATE: Placeholder for new reports --- */}
                {['byEmployee', 'byModifier', 'taxes'].includes(activeTab) && (
                    <div className="settings-card placeholder">
                        <h3>{tabs.find(t => t.id === activeTab)?.name}</h3>
                        <p>ส่วนนี้ยังอยู่ในระหว่างการพัฒนา</p>
                    </div>
                )}
            </main>
        </div>
    )
};

export default ReportsScreen;