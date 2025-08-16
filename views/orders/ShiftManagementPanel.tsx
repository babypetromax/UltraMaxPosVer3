import React, { useMemo } from 'react';
import { getYYYYMMDD, formatCurrency } from '../../helpers';
import { MAX_SHIFTS_PER_DAY } from '../../constants';
import { useData } from '../../contexts/DataContext';
import { useApp } from '../../contexts/AppContext';

const ShiftManagementPanel: React.FC = () => {
    const { dailyData, shiftHistory, shiftSummaryData } = useData();
    const { setShowStartShiftModal, setShowPaidInOutModal, setShowEndShiftModal } = useApp();

    const { currentShift } = dailyData;

    const todaysShifts = useMemo(() => {
        const todayStr = getYYYYMMDD(new Date());
        return shiftHistory.filter(s => s.id.startsWith(todayStr));
    }, [shiftHistory]);

    if (!currentShift && todaysShifts.length >= MAX_SHIFTS_PER_DAY) {
         return (
            <div className="shift-management-panel">
                <div className="shift-start-screen">
                    <span className="material-symbols-outlined">event_busy</span>
                    <p>เปิดกะการขายสำหรับวันนี้ครบจำนวนสูงสุดแล้ว</p>
                </div>
            </div>
        )
    }

    if (!currentShift) {
        return (
            <div className="shift-management-panel">
                <div className="shift-start-screen">
                    <span className="material-symbols-outlined">storefront</span>
                    <p>ยังไม่มีการเปิดกะการขายสำหรับวันนี้</p>
                    <button className="action-button" onClick={() => setShowStartShiftModal(true)}>
                        <span className="material-symbols-outlined">play_circle</span> เปิดกะที่ {todaysShifts.length + 1}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="shift-management-grid">
            <div className="current-shift-summary">
                <div className="shift-header-info">
                    <h3><span className="material-symbols-outlined">monitoring</span> กะปัจจุบัน: <strong>{currentShift.id.slice(-2)}</strong></h3>
                    <p>เริ่มเมื่อ: <strong>{new Date(currentShift.startTime).toLocaleTimeString('th-TH')}</strong></p>
                </div>
                <div className="summary-item-list">
                    <div className="summary-item"><span>เงินเริ่มต้น</span> <span>฿{formatCurrency(currentShift.openingFloatAmount)}</span></div>
                    <div className="summary-item"><span>ยอดขายเงินสด</span> <span>฿{formatCurrency(shiftSummaryData?.totalCashSales || 0)}</span></div>
                    <div className="summary-item"><span>ยอดขาย QR</span> <span>฿{formatCurrency(shiftSummaryData?.totalQrSales || 0)}</span></div>
                    <div className="summary-item total"><span>เงินสดที่ควรมีในลิ้นชัก (คาดการณ์)</span> <span>฿{formatCurrency(shiftSummaryData?.expectedCashInDrawer || 0)}</span></div>
                </div>
                <div className="shift-actions">
                    <button className="action-button" onClick={() => setShowPaidInOutModal(true)}>
                       <span className="material-symbols-outlined">swap_horiz</span> นำเงินเข้า/ออก
                    </button>
                    <button className="action-button danger-button" onClick={() => setShowEndShiftModal(true)}>
                       <span className="material-symbols-outlined">stop_circle</span> ปิดกะการขาย
                    </button>
                </div>
            </div>
            <div className="shift-history-grid">
                {Array.from({ length: MAX_SHIFTS_PER_DAY }, (_, i) => {
                    const shiftNumber = i + 1;
                    const shiftIdSuffix = `-S${shiftNumber}`;
                    const closedShift = todaysShifts.find(s => s.id.endsWith(shiftIdSuffix));
                    const isActive = currentShift.id.endsWith(shiftIdSuffix);

                    if (isActive) {
                        return (
                            <div key={shiftNumber} className="shift-history-card active">
                                <div className="card-header">
                                    <h4>กะ {shiftNumber} (กำลังดำเนินการ)</h4>
                                    <span>{new Date(currentShift.startTime).toLocaleTimeString('th-TH')} - ปัจจุบัน</span>
                                </div>
                                <div className="card-body">
                                    <div><span>เงินเริ่มต้น:</span> <span>฿{formatCurrency(currentShift.openingFloatAmount)}</span></div>
                                    <div><span>ยอดขายเงินสด:</span> <span>฿{formatCurrency(shiftSummaryData?.totalCashSales || 0)}</span></div>
                                    <div><span>ยอดขาย QR:</span> <span>฿{formatCurrency(shiftSummaryData?.totalQrSales || 0)}</span></div>
                                    <div className="total"><span>เงินสดคาดการณ์:</span> <span>฿{formatCurrency(shiftSummaryData?.expectedCashInDrawer || 0)}</span></div>
                                </div>
                            </div>
                        );
                    }

                    if (closedShift) {
                        return (
                            <div key={shiftNumber} className="shift-history-card closed">
                                <div className="card-header">
                                    <h4>กะ {shiftNumber} (ปิดแล้ว)</h4>
                                    <span>{new Date(closedShift.startTime).toLocaleTimeString('th-TH')} - {closedShift.endTime ? new Date(closedShift.endTime).toLocaleTimeString('th-TH') : ''}</span>
                                </div>
                                <div className="card-body">
                                    <div><span>เงินเริ่มต้น:</span> <span>฿{formatCurrency(closedShift.openingFloatAmount)}</span></div>
                                    <div><span>ยอดขายเงินสด:</span> <span>฿{formatCurrency(closedShift.totalCashSales || 0)}</span></div>
                                    <div><span>ยอดขาย QR:</span> <span>฿{formatCurrency(closedShift.totalQrSales || 0)}</span></div>
                                    <div className="total"><span>เงินสดที่นับได้:</span> <span>฿{formatCurrency(closedShift.closingCashCounted || 0)}</span></div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={shiftNumber} className="shift-history-card placeholder">
                            <div className="card-header"><h4>กะ {shiftNumber}</h4></div>
                            <div className="card-body"><p>ยังไม่เปิด</p></div>
                        </div>
                    );
                })}
            </div>
        </div>
    )
};

export default ShiftManagementPanel;