import React, { useState, Fragment } from 'react';
import { Order } from '../../types';
import { formatCurrency } from '../../helpers';
import { useConfirmation } from '../../contexts/ConfirmationContext';

interface ReceiptsHistoryProps {
    orders: Order[];
    BillDetailsComponent: React.FC<{ order: Order }>;
    onCancelBill: (order: Order) => void;
    isAdminMode: boolean;
}

const ReceiptsHistory: React.FC<ReceiptsHistoryProps> = ({ orders, BillDetailsComponent, onCancelBill, isAdminMode }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const { showConfirmation } = useConfirmation();

    const handleCancelClick = async (e: React.MouseEvent, order: Order) => {
        e.stopPropagation();
        const confirmed = await showConfirmation({
            title: 'ยืนยันการยกเลิกบิล',
            message: `คุณแน่ใจหรือไม่ว่าต้องการยกเลิกบิล #${order.id}? การกระทำนี้จะสร้างบิลติดลบเพื่อปรับยอดขายและไม่สามารถย้อนกลับได้`
        });
        if (confirmed) {
            onCancelBill(order);
        }
    };

    return (
        <div>
            <div className="report-header"><h1>บิลย้อนหลัง</h1></div>
            <table className="report-table">
                <thead><tr><th>เลขที่บิล</th><th>เวลา</th><th>การชำระเงิน</th><th>จำนวนรายการ</th><th>ยอดรวม</th><th>สถานะ</th><th></th></tr></thead>
                <tbody>
                    {orders.map(order => (
                        <Fragment key={order.id}>
                            <tr className={`expandable-row ${order.status === 'cancelled' ? 'cancelled-bill' : ''} ${order.total < 0 ? 'reversal-bill' : ''}`} onClick={() => order.status !== 'cancelled' && setExpandedId(prev => prev === order.id ? null : order.id)}>
                                <td>{order.id} <span className={`chevron ${expandedId === order.id ? 'expanded' : ''}`}></span></td>
                                <td>{new Date(order.timestamp).toLocaleString('th-TH')}</td>
                                <td>{order.paymentMethod === 'cash' ? 'เงินสด' : 'QR Code'}</td>
                                <td>{order.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
                                <td>฿{formatCurrency(order.total)}</td>
                                <td>
                                   <span className={`status-tag status-${order.status}`}>
                                       {order.status === 'completed' ? (order.reversalOf ? 'คืนเงิน' : 'สำเร็จ') : 'ยกเลิก'}
                                   </span>
                                </td>
                                <td>
                                    {isAdminMode && order.status === 'completed' && order.total > 0 && (
                                        <button className="delete-bill-btn" title="ยกเลิกบิล" onClick={(e) => handleCancelClick(e, order)}>
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    )}
                                </td>
                            </tr>
                            {expandedId === order.id && <tr><BillDetailsComponent order={order} /></tr>}
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    )
};

export default ReceiptsHistory;