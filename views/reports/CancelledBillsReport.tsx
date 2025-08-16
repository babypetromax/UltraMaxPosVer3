import React, { useMemo } from 'react';
import { Order } from '../../types';
import { formatCurrency } from '../../helpers';

interface CancelledBillsReportProps {
    orders: Order[];
}

const CancelledBillsReport: React.FC<CancelledBillsReportProps> = ({ orders }) => {
    const cancelled = useMemo(() => orders.filter(o => o.status === 'cancelled').sort((a,b) => (b.cancelledAt ? new Date(b.cancelledAt).getTime() : 0) - (a.cancelledAt ? new Date(a.cancelledAt).getTime() : 0)), [orders]);

    return (
        <div>
            <div className="report-header"><h1>รายงานการลบบิล</h1></div>
            <table className="report-table">
                <thead><tr><th>เลขที่บิล</th><th>เวลาที่สร้าง</th><th>เวลายกเลิก</th><th>ยอดรวม</th></tr></thead>
                <tbody>
                    {cancelled.length === 0 && <tr><td colSpan={4} style={{textAlign: 'center'}}>ไม่มีบิลที่ถูกยกเลิก</td></tr>}
                    {cancelled.map(order => (
                        <tr key={order.id} className="cancelled-bill">
                            <td>{order.id}</td>
                            <td>{new Date(order.timestamp).toLocaleString('th-TH')}</td>
                            <td>{order.cancelledAt ? new Date(order.cancelledAt).toLocaleString('th-TH') : 'N/A'}</td>
                            <td>฿{formatCurrency(order.total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CancelledBillsReport;
