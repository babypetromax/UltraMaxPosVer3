import React, { useState, useMemo, useEffect, Fragment } from 'react';
import { Order } from '../../types';
import BillDetails from '../../components/BillDetails';
import { formatCurrency, getYYYYMMDD } from '../../helpers';
import ShiftManagementPanel from './ShiftManagementPanel';
import { useData } from '../../contexts/DataContext';
import { useApp } from '../../contexts/AppContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';

interface OrderManagementScreenProps {}

// --- ULTRAMAX DEVS FIX START ---
// Defined a separate interface for props for better compatibility with build tools.
interface TimeAgoProps {
    date: Date;
}

const TimeAgo: React.FC<TimeAgoProps> = ({ date }) => {
// --- ULTRAMAX DEVS FIX END ---
    const [time, setTime] = useState('');
    useEffect(() => {
        const update = () => {
            const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
            if (seconds < 0) {
                setTime('0s');
                return;
            }
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            if (hours > 23) setTime(`${Math.floor(hours/24)}d ago`);
            else if (hours > 0) setTime(`${hours}h ${minutes % 60}m ago`);
            else if (minutes > 0) setTime(`${minutes}m ${seconds % 60}s ago`);
            else setTime(`${seconds}s ago`);
        };
        update();
        const interval = setInterval(update, 5000);
        return () => clearInterval(interval);
    }, [date]);
    return <span className="time-ago">{time}</span>;
};


const OrderManagementScreen: React.FC<OrderManagementScreenProps> = () => {
    const { 
        dailyData, 
        dailySummaryData,
        handleCancelBill, 
        handleUpdateOrderStatus, 
        handleCompleteOrder,
    } = useData();
    const { isAdminMode } = useApp();
    const { showConfirmation } = useConfirmation();
    
    const { kitchenOrders, completedOrders } = dailyData;

    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [activeKdsTab, setActiveKdsTab] = useState<'bills' | 'shift'>('bills');
    const [isShiftPanelExpanded, setIsShiftPanelExpanded] = useState(false);

    const activeOrders = kitchenOrders.sort((a, b) => a.id.localeCompare(b.id)); 
    const activeOrderIds = new Set(kitchenOrders.map(o => o.id));

    const recentlyCompleted = completedOrders
        .filter(o => !activeOrderIds.has(o.id))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50);

    const onCancelBill = async (order: Order) => {
        const confirmed = await showConfirmation({
            title: 'ยืนยันการยกเลิกบิล',
            message: `คุณแน่ใจหรือไม่ว่าต้องการยกเลิกบิล #${order.id}? การกระทำนี้จะสร้างบิลติดลบเพื่อปรับยอดขายและไม่สามารถย้อนกลับได้`
        });
        if (confirmed) {
            handleCancelBill(order);
        }
    };

    return (
        <div className="order-management-screen">
            <section className="active-orders-section">
                <header className="kds-header">
                    <h1><span className="material-symbols-outlined">skillet</span> กำลังดำเนินการ ({activeOrders.length})</h1>
                </header>
                {activeOrders.length === 0 ? (
                    <p className="kds-empty-message">ไม่มีออเดอร์ที่กำลังดำเนินการ</p>
                ) : (
                    <div className="kitchen-order-grid">
                        {activeOrders.map(order => (
                            <div key={order.id} className={`order-card status-${order.status}`}>
                                <div className="order-card-header">
                                    <div className="order-card-title">
                                        <h3>{order.id}</h3>
                                        <span className={`status-badge status-${order.status}`}>
                                            {order.status === 'cooking' ? 'กำลังทำ' : 'พร้อมส่ง'}
                                        </span>
                                    </div>
                                    <TimeAgo date={order.timestamp} />
                                </div>
                                <ul className="order-card-items">
                                    {order.items.map(item => (
                                        <li key={`${order.id}-${item.id}`}>
                                            <span className="item-quantity">{item.quantity}x</span>
                                            <span className="item-name">{item.name}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="order-card-footer">
                                    {order.status === 'cooking' ? (
                                        <button className="kds-action-btn ready-btn" onClick={() => handleUpdateOrderStatus(order.id, 'ready')}>
                                            <span className="material-symbols-outlined">check_circle</span> ทำเสร็จแล้ว
                                        </button>
                                    ) : (
                                        <button className="kds-action-btn complete-btn" onClick={() => handleCompleteOrder(order.id)}>
                                            <span className="material-symbols-outlined">takeout_dining</span> ปิดบิล (รับแล้ว)
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
            <section className={`completed-bills-section ${isShiftPanelExpanded ? 'expanded' : ''}`}>
                 <header className="kds-header kds-tab-header">
                    <div className="kds-tabs">
                         <button className={`kds-tab-btn ${activeKdsTab === 'bills' ? 'active' : ''}`} onClick={() => setActiveKdsTab('bills')}>
                            <span className="material-symbols-outlined">history</span> บิลที่เสร็จสิ้นล่าสุด
                        </button>
                        <button className={`kds-tab-btn ${activeKdsTab === 'shift' ? 'active' : ''}`} onClick={() => setActiveKdsTab('shift')}>
                            <span className="material-symbols-outlined">savings</span> จัดการกะและเงินสด
                        </button>
                    </div>
                    <button className="expand-toggle-btn" onClick={() => setIsShiftPanelExpanded(p => !p)} title={isShiftPanelExpanded ? 'ย่อ' : 'ขยาย'}>
                        <span className="material-symbols-outlined">{isShiftPanelExpanded ? 'close_fullscreen' : 'open_in_full'}</span>
                    </button>
                </header>
                {activeKdsTab === 'bills' && (
                    <div className="completed-bills-list-container">
                        <div className="completed-bills-list">
                            <table className="report-table kds-completed-table">
                                <thead><tr><th>เลขที่บิล</th><th>เวลา</th><th>ยอดขาย</th><th>การชำระเงิน</th><th>สถานะ</th><th title="สถานะการซิงค์"><span className="material-symbols-outlined">cloud_sync</span></th><th></th></tr></thead>
                                <tbody>
                                    {recentlyCompleted.map(order => (
                                        <Fragment key={order.id}>
                                        <tr className={`expandable-row ${order.status === 'cancelled' ? 'cancelled-bill' : ''} ${order.total < 0 ? 'reversal-bill' : ''}`} onClick={() => order.status !== 'cancelled' && setExpandedId(prev => prev === order.id ? null : order.id)}>
                                            <td>{order.id} <span className={`chevron ${expandedId === order.id ? 'expanded' : ''}`}></span></td>
                                            <td>{new Date(order.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td>฿{formatCurrency(order.total)}</td>
                                            <td>{order.paymentMethod === 'cash' ? 'เงินสด' : 'QR Code'}</td>
                                            <td>
                                                <span className={`status-tag status-${order.status}`}>
                                                    {order.status === 'completed' ? (order.reversalOf ? 'คืนเงิน' : 'สำเร็จ') : 'ยกเลิก'}
                                                </span>
                                            </td>
                                            <td>
                                                {order.syncStatus === 'synced' && <span className="material-symbols-outlined sync-icon synced" title="ซิงค์ข้อมูลแล้ว">cloud_done</span>}
                                                {order.syncStatus === 'pending' && <span className="material-symbols-outlined sync-icon pending" title="รอซิงค์ข้อมูล">cloud_upload</span>}
                                                {order.syncStatus === 'failed' && <span className="material-symbols-outlined sync-icon failed" title="การซิงค์ล้มเหลว">cloud_off</span>}
                                            </td>
                                            <td>
                                                {isAdminMode && order.status === 'completed' && order.total > 0 && (
                                                    <button className="delete-bill-btn" title="ยกเลิกบิล" onClick={(e) => { e.stopPropagation(); onCancelBill(order); }}>
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                        {expandedId === order.id && <tr><BillDetails order={order} /></tr>}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* === ULTRAMAX DEVS UI FIX START: New Footer Design === */}
                        <footer className="kds-summary-footer-v2">
                            <div className="summary-item-v2">
                                <span className="summary-label">ยอดขาย (ก่อนหักลบ)</span>
                                <span className="summary-value" style={{ color: 'var(--primary-color)' }}>
                                    ฿{formatCurrency(dailySummaryData.grossSales + dailySummaryData.cancellationsTotal)}
                                </span>
                            </div>
                            <div className="summary-item-v2">
                                <span className="summary-label">
                                    ยอดบิลยกเลิก
                                    {dailySummaryData.cancellationsCount > 0 && (
                                        <span className="cancellation-badge-v2" title={`${dailySummaryData.cancellationsCount} บิล`}>
                                            {dailySummaryData.cancellationsCount}
                                        </span>
                                    )}
                                </span>
                                <span className="summary-value" style={{ color: 'var(--danger-color)' }}>
                                    ฿{formatCurrency(dailySummaryData.cancellationsTotal)}
                                </span>
                            </div>
                            <div className="summary-item-v2">
                                <span className="summary-label">ยอดขายสุทธิวันนี้</span>
                                <span className="summary-value" style={{ color: 'var(--success-color)' }}>
                                    ฿{formatCurrency(dailySummaryData.netSales)}
                                </span>
                            </div>
                        </footer>
                         {/* === ULTRAMAX DEVS UI FIX END === */}
                    </div>
                )}
                 {activeKdsTab === 'shift' && 
                    <ShiftManagementPanel />
                 }
            </section>
        </div>
    );
};

export default OrderManagementScreen;