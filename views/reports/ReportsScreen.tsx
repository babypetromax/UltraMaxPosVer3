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


type ReportTab = 'summary' | 'byProduct' | 'byCategory' | 'byPayment' | 'receipts' | 'discounts' | 'activityLog' | 'cancelledBills' | 'shiftActivities';

const ReportsScreen: React.FC = () => {
    const { dailyData, shiftHistory, handleCancelBill, ai } = useData();
    const { isAdminMode } = useApp();

    const [activeTab, setActiveTab] = useState<ReportTab>('summary');
    
    const tabs: {id: ReportTab, name: string, icon: string}[] = [
      {id: 'summary', name: 'สรุปยอดขาย', icon: 'summarize'},
      {id: 'receipts', name: 'บิลย้อนหลัง', icon: 'receipt_long'},
      {id: 'shiftActivities', name: 'ประวัติกะและลิ้นชัก', icon: 'history'},
      {id: 'byProduct', name: 'ยอดขายตามสินค้า', icon: 'inventory_2'},
      {id: 'byCategory', name: 'ยอดขายตามหมวดหมู่', icon: 'category'},
      {id: 'byPayment', name: 'ยอดขายตามการชำระเงิน', icon: 'payment'},
      {id: 'discounts', name: 'รายงานส่วนลด', icon: 'percent'},
      {id: 'cancelledBills', name: 'รายงานการลบบิล', icon: 'delete_forever'},
      {id: 'activityLog', name: 'ประวัติการทำงาน', icon: 'history_toggle_off'}
    ];
    
    const allOrders = useMemo(() => {
        if (!dailyData) return [];
        // This logic seems a bit complex, might need review but keeping it for now.
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
                {activeTab === 'shiftActivities' && <ShiftActivityReport shifts={shiftHistory} />}
                {activeTab === 'byProduct' && <SalesByProductReport orders={allOrders} />}
                {activeTab === 'byCategory' && <SalesByCategoryReport orders={allOrders} />}
                {activeTab === 'byPayment' && <SalesByPaymentReport orders={allOrders} />}
                {activeTab === 'discounts' && <DiscountReport orders={allOrders} />}
                {activeTab === 'cancelledBills' && <CancelledBillsReport orders={allOrders} />}
                {activeTab === 'activityLog' && <ActivityLogReport log={dailyData?.activityLog || []} />}
            </main>
        </div>
    )
};

export default ReportsScreen;