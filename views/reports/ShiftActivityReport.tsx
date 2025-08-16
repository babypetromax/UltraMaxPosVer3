import React, { Fragment } from 'react';
import { Shift, CashDrawerActivity } from '../../types';
import { formatCurrency } from '../../helpers';

interface ShiftActivityReportProps {
    shifts: Shift[];
}

const getActivityTypeDisplay = (type: CashDrawerActivity['type']) => {
    switch (type) {
        case 'SHIFT_START': return { text: 'เปิดกะ', icon: 'play_circle', color: 'var(--success-color)' };
        case 'SHIFT_END': return { text: 'ปิดกะ', icon: 'stop_circle', color: 'var(--danger-color)' };
        case 'SALE': return { text: 'การขาย', icon: 'point_of_sale', color: 'var(--primary-color)' };
        case 'REFUND': return { text: 'คืนเงิน/ยกเลิก', icon: 'undo', color: 'var(--danger-hover)' };
        case 'PAID_IN': return { text: 'นำเงินเข้า', icon: 'add_card', color: 'var(--success-hover)' };
        case 'PAID_OUT': return { text: 'นำเงินออก', icon: 'remove_shopping_cart', color: 'var(--warning-color)' };
        case 'MANUAL_OPEN': return { text: 'เปิดลิ้นชัก', icon: 'savings', color: '#D97706' };
        default: return { text: type, icon: 'help', color: 'var(--text-secondary)' };
    }
}

const ShiftActivityReport: React.FC<ShiftActivityReportProps> = ({ shifts }) => {
    return (
        <div>
            <div className="report-header"><h1>ประวัติกะและลิ้นชัก</h1></div>
            <div className="info-box" style={{ margin: '0 0 1.5rem 0' }}>
                <span className="material-symbols-outlined">info</span>
                <p>รายงานนี้แสดงกิจกรรมทางการเงินทั้งหมดที่เกิดขึ้นในแต่ละกะ รวมถึงการเปิดลิ้นชักด้วยตนเอง (MANUAL_OPEN) เพื่อความโปร่งใสและตรวจสอบได้</p>
            </div>
            <table className="report-table">
                <thead>
                    <tr>
                        <th>รหัสกะ</th>
                        <th>เวลา</th>
                        <th>ประเภทกิจกรรม</th>
                        <th>จำนวนเงิน</th>
                        <th>การชำระเงิน</th>
                        <th>หมายเหตุ/เหตุผล</th>
                    </tr>
                </thead>
                <tbody>
                    {shifts.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center' }}>ยังไม่มีประวัติกะ</td></tr>}
                    {shifts.map(shift => (
                        <Fragment key={shift.id}>
                            {shift.activities.map((activity, index) => {
                                const display = getActivityTypeDisplay(activity.type);
                                const isManualOpen = activity.type === 'MANUAL_OPEN';
                                return (
                                    <tr key={activity.id} style={{ backgroundColor: isManualOpen ? 'rgba(245, 158, 11, 0.1)' : '' }}>
                                        <td>{index === 0 ? <strong>{shift.id}</strong> : ''}</td>
                                        <td>{new Date(activity.timestamp).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: display.color }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>{display.icon}</span>
                                                <strong style={{ fontWeight: isManualOpen ? 700 : 500 }}>{display.text}</strong>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', color: (activity.amount < 0 || activity.type === 'PAID_OUT' || activity.type === 'REFUND') ? 'var(--danger-color)' : 'inherit' }}>
                                            {activity.amount !== 0 ? `฿${formatCurrency(activity.amount)}` : '-'}
                                        </td>
                                        <td>{activity.paymentMethod !== 'none' ? (activity.paymentMethod === 'cash' ? 'เงินสด' : 'QR') : '-'}</td>
                                        <td style={{ fontStyle: isManualOpen ? 'italic' : 'normal' }}>{activity.description}</td>
                                    </tr>
                                );
                            })}
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ShiftActivityReport;
