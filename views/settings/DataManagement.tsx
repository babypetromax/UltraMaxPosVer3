/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';


// In a real app, these would be imported from a central types file.
interface Shift {
    id: string;
    startTime: Date | string; // Allow string for serialized data
    [key: string]: any;
}

interface BillItem {
    name: string;
    category?: string;
    quantity: number;
    price: number;
    [key: string]: any;
}

interface Bill {
    id: string;
    timestamp: string | Date;
    items: BillItem[];
    paymentMethod: string;
    [key: string]: any;
}

const DATA_PREFIX = 'takoyaki_pos_';

export default function DataManagement() {
    const { isAdminMode } = useApp();
    const { showNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    const [activeTab, setActiveTab] = useState<'export' | 'restore'>('export');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [confirmText, setConfirmText] = useState('');
    const [fileWarning, setFileWarning] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getTodayString = () => new Date().toISOString().split('T')[0];
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const getAllPrefixedData = (): { [key: string]: any } => {
        const allData: { [key: string]: any } = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(DATA_PREFIX)) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        allData[key] = JSON.parse(data);
                    } catch (e) {
                        allData[key] = data;
                    }
                }
            }
        }
        return allData;
    };

    const handleExportData = (format: 'json' | 'csv') => {
        setIsProcessing(true);
        // Use a short timeout to allow the UI to update to the "processing" state
        setTimeout(() => {
            try {
                if (format === 'json') {
                    exportAsJson();
                } else {
                    exportAsCsv();
                }
            } catch (error) {
                console.error(`Export to ${format.toUpperCase()} failed:`, error);
                showNotification(`เกิดข้อผิดพลาดในการสร้างไฟล์ ${format.toUpperCase()}`, 'error');
            } finally {
                setIsProcessing(false);
            }
        }, 100);
    };

    const exportAsJson = () => {
        let dataToExport = getAllPrefixedData();
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            
            const filteredData: { [key: string]: any } = {};
            Object.entries(dataToExport).forEach(([key, value]) => {
                if (key.startsWith(`${DATA_PREFIX}daily_data_`)) {
                    const dateStr = key.replace(`${DATA_PREFIX}daily_data_`, '');
                    const dataDate = new Date(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`);
                    if (dataDate >= start && dataDate <= end) filteredData[key] = value;
                } else if (key === `${DATA_PREFIX}shift_history` && Array.isArray(value)) {
                    filteredData[key] = value.filter((shift: Shift) => {
                        const shiftDate = new Date(shift.startTime);
                        return shiftDate >= start && shiftDate <= end;
                    });
                } else if (!key.startsWith(`${DATA_PREFIX}daily_data_`) && key !== `${DATA_PREFIX}shift_history`) {
                    filteredData[key] = value;
                }
            });
            dataToExport = filteredData;
        }
        
        if (Object.keys(dataToExport).length === 0) {
            showNotification("ไม่พบข้อมูลในฐานข้อมูล หรือในช่วงเวลาที่เลือก", 'warning');
            return;
        }

        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ultramax_pos_backup_${getTodayString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
        showNotification("สำรองข้อมูล (JSON) สำเร็จ!", 'success');
    };

    const exportAsCsv = () => {
        const allData = getAllPrefixedData();
        const dailyDataKeys = Object.keys(allData).filter(k => k.startsWith(`${DATA_PREFIX}daily_data_`));
        
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (end) end.setHours(23, 59, 59, 999);

        let flatSalesData: Record<string, any>[] = [];
        for (const key of dailyDataKeys) {
            const dateStr = key.replace(`${DATA_PREFIX}daily_data_`, '');
            const dataDate = new Date(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`);
            if ((start && dataDate < start) || (end && dataDate > end)) continue;

            const dayData = allData[key];
            if (dayData && Array.isArray(dayData.bills)) {
                for (const bill of (dayData.bills as Bill[])) {
                    if (bill && Array.isArray(bill.items)) {
                        for (const item of bill.items) {
                            flatSalesData.push({
                                'Date': new Date(bill.timestamp).toLocaleDateString('th-TH'),
                                'Timestamp': new Date(bill.timestamp).toLocaleTimeString('th-TH'),
                                'BillID': bill.id,
                                'ItemName': item.name,
                                'Category': item.category || 'N/A',
                                'Quantity': item.quantity,
                                'UnitPrice': item.price,
                                'TotalPrice': item.quantity * item.price,
                                'PaymentMethod': bill.paymentMethod
                            });
                        }
                    }
                }
            }
        }

        if (flatSalesData.length === 0) {
            showNotification("ไม่พบข้อมูลการขายในช่วงเวลาที่เลือกสำหรับสร้างไฟล์ CSV", 'warning');
            return;
        }

        const headers = Object.keys(flatSalesData[0]);
        const csvRows = [
            headers.join(','),
            ...flatSalesData.map(row => headers.map(header => {
                let cell = row[header] === null || row[header] === undefined ? '' : String(row[header]);
                if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                    cell = `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(','))
        ];
        
        const csvString = csvRows.join('\n');
        const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ultramax_pos_sales_export_${getTodayString()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
        showNotification("ส่งออกข้อมูลการขาย (CSV) สำเร็จ!", 'success');
    };
    
    const handleFileSelect = (files: FileList | null) => {
        setFileWarning('');
        setRestoreFile(null);
        setConfirmText('');
        if (fileInputRef.current) fileInputRef.current.value = "";

        if (files && files[0]) {
            const file = files[0];
            const fileName = file.name.toLowerCase();

            if (fileName.endsWith('.json')) {
                setRestoreFile(file);
            } else if (fileName.endsWith('.csv')) {
                setRestoreFile(file);
                setFileWarning('ไฟล์ CSV ใช้สำหรับวิเคราะห์ข้อมูลเท่านั้น ไม่สามารถใช้กู้คืนระบบได้');
            } else {
                setRestoreFile(file);
                setFileWarning('ไฟล์ไม่ถูกต้อง! กรุณาเลือกไฟล์ .json ที่ได้จากการสำรองข้อมูลเท่านั้น');
            }
        }
    };

    const handleRestoreData = async () => {
        if (!restoreFile || confirmText.trim().toLowerCase() !== 'ยืนยัน' || !!fileWarning) return;
        try {
            const currentData = getAllPrefixedData();
            if (Object.keys(currentData).length > 0) {
                const jsonString = JSON.stringify(currentData, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `backup-before-restore-${new Date().toISOString().replace(/:/g, '-')}.json`;
                a.click();
                URL.revokeObjectURL(a.href);
                a.remove();
                showNotification("สำรองข้อมูลปัจจุบันฉุกเฉินเรียบร้อยแล้ว", 'info');
            }
        } catch (e) {
            console.error("Safety backup failed:", e);
            const confirmed = await showConfirmation({
                title: 'คำเตือน',
                message: 'ไม่สามารถสร้างไฟล์สำรองข้อมูลฉุกเฉินได้! คุณต้องการดำเนินการต่อหรือไม่?',
                danger: true,
                confirmText: 'ดำเนินการต่อ'
            });
            if (!confirmed) return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const dataToRestore = JSON.parse(event.target?.result as string);
                if (typeof dataToRestore !== 'object' || !Object.keys(dataToRestore).some(k => k.startsWith(DATA_PREFIX))) {
                    throw new Error("ไฟล์นี้ไม่มีข้อมูลที่ถูกต้องสำหรับแอปพลิเคชัน");
                }
                Object.keys(localStorage).filter(key => key.startsWith(DATA_PREFIX)).forEach(key => localStorage.removeItem(key));
                Object.entries(dataToRestore).forEach(([key, value]) => {
                    if (key.startsWith(DATA_PREFIX)) {
                        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                    }
                });
                showNotification("กู้คืนข้อมูลสำเร็จ! แอปพลิเคชันจะทำการรีโหลดใหม่ทั้งหมด", 'success');
                setTimeout(() => window.location.reload(), 2000);
            } catch (error) {
                console.error("Restore failed:", error);
                const message = error instanceof Error ? error.message : 'ไฟล์อาจจะเสียหาย';
                showNotification(`เกิดข้อผิดพลาดในการกู้คืนข้อมูล: ${message}`, 'error');
            }
        };
        reader.readAsText(restoreFile);
    };

    const handlePresetChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        const today = new Date();
        let start = new Date();
        
        switch (value) {
            case 'today':
                setStartDate(formatDate(today));
                setEndDate(formatDate(today));
                break;
            case '7d':
                start.setDate(today.getDate() - 6);
                setStartDate(formatDate(start));
                setEndDate(formatDate(today));
                break;
            case '15d':
                start.setDate(today.getDate() - 14);
                setStartDate(formatDate(start));
                setEndDate(formatDate(today));
                break;
            case 'this_month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                setStartDate(formatDate(start));
                setEndDate(formatDate(today));
                break;
            case '3m':
                 start.setMonth(today.getMonth() - 3);
                 setStartDate(formatDate(start));
                 setEndDate(formatDate(today));
                break;
            case 'current_shift':
                try {
                    const historyRaw = localStorage.getItem(`${DATA_PREFIX}shift_history`);
                    if (!historyRaw) throw new Error('ไม่พบข้อมูลกะ');
                    const shifts: Shift[] = JSON.parse(historyRaw);
                    if (shifts.length === 0) throw new Error('ไม่พบข้อมูลกะ');
                    const latestShift = shifts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];
                    setStartDate(formatDate(new Date(latestShift.startTime)));
                    setEndDate(getTodayString());
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
                    showNotification(message, 'error');
                }
                break;
            case 'q1': case 'q2': case 'q3': case 'q4':
                const q = parseInt(value.replace('q', ''));
                const year = today.getFullYear();
                const startMonth = (q - 1) * 3;
                setStartDate(formatDate(new Date(year, startMonth, 1)));
                setEndDate(formatDate(new Date(year, startMonth + 3, 0)));
                break;
            case 'all':
                setStartDate('');
                setEndDate('');
                break;
            default:
                break;
        }
    };

    return (
        <div className="settings-card">
            <div className="tabs-container">
                <button className={`tab-button ${activeTab === 'export' ? 'active' : ''}`} onClick={() => setActiveTab('export')} role="tab" aria-selected={activeTab === 'export'}>
                    <span className="material-symbols-outlined">download</span>ส่งออกข้อมูล
                </button>
                <button className={`tab-button ${activeTab === 'restore' ? 'active' : ''}`} onClick={() => setActiveTab('restore')} role="tab" aria-selected={activeTab === 'restore'}>
                    <span className="material-symbols-outlined">upload</span>กู้คืนข้อมูล
                </button>
            </div>

            {activeTab === 'export' && (
                <section id="export-panel" role="tabpanel" className="tab-content">
                    <div className="form-group">
                        <label htmlFor="preset-select">เลือกช่วงเวลาสำเร็จรูป</label>
                        <div className="preset-select">
                            <select id="preset-select" onChange={handlePresetChange} disabled={!isAdminMode || isProcessing}>
                                <option value="all">ข้อมูลทั้งหมด</option>
                                <option value="today">วันนี้</option>
                                <option value="7d">7 วันล่าสุด</option>
                                <option value="15d">15 วันล่าสุด</option>
                                <option value="this_month">เดือนนี้</option>
                                <option value="3m">3 เดือนล่าสุด</option>
                                <option value="current_shift">กะปัจจุบัน</option>
                                <option value="q1">ไตรมาสที่ 1</option>
                                <option value="q2">ไตรมาสที่ 2</option>
                                <option value="q3">ไตรมาสที่ 3</option>
                                <option value="q4">ไตรมาสที่ 4</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>หรือกำหนดช่วงเวลาเอง</label>
                        <div className="date-range-selector">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={!isAdminMode || isProcessing} aria-label="Start Date" />
                            <span>ถึง</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={!isAdminMode || isProcessing} aria-label="End Date" />
                        </div>
                    </div>
                    <div className="export-buttons-container">
                        <button className="action-button primary" onClick={() => handleExportData('json')} disabled={isProcessing || !isAdminMode}>
                            <span className="material-symbols-outlined">{isProcessing ? 'hourglass_top' : 'archive'}</span>
                            {isProcessing ? 'กำลังประมวลผล...' : 'สำรองข้อมูล (JSON)'}
                        </button>
                        <button className="action-button secondary" onClick={() => handleExportData('csv')} disabled={isProcessing || !isAdminMode}>
                            <span className="material-symbols-outlined">{isProcessing ? 'hourglass_top' : 'table_chart'}</span>
                            {isProcessing ? 'กำลังประมวลผล...' : 'ส่งออกการขาย (CSV)'}
                        </button>
                    </div>
                </section>
            )}

            {activeTab === 'restore' && (
                <section id="restore-panel" role="tabpanel" className="tab-content restore-section">
                    <div 
                        className={`file-drop-zone ${restoreFile ? 'has-file' : ''} ${!!fileWarning ? 'has-warning' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e: DragEvent<HTMLDivElement>) => e.preventDefault()}
                        onDrop={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
                        role="button" tabIndex={isAdminMode ? 0 : -1} aria-label="File upload zone"
                    >
                        <input type="file" ref={fileInputRef} onChange={(e: ChangeEvent<HTMLInputElement>) => handleFileSelect(e.target.files)} accept=".json,.csv" className="hidden" disabled={!isAdminMode} />
                        <span className="material-symbols-outlined">upload_file</span>
                        {restoreFile ? (
                            <p>ไฟล์ที่เลือก: <span className="filename">{restoreFile.name}</span></p>
                        ) : (
                            <p>ลากไฟล์ .json มาวาง หรือคลิกเพื่อเลือกไฟล์</p>
                        )}
                    </div>

                    {fileWarning && <div className="info-box" role="alert"><span className="material-symbols-outlined">info</span>{fileWarning}</div>}
                    
                    <div className="warning-box" role="alert">
                        <span className="material-symbols-outlined">warning</span>
                        <p><strong>คำเตือน:</strong> การกู้คืนข้อมูลจะเขียนทับข้อมูลทั้งหมดที่มีอยู่ การกระทำนี้ไม่สามารถย้อนกลับได้ โปรดสำรองข้อมูลปัจจุบันของคุณก่อนดำเนินการต่อ</p>
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="restore-confirm">เพื่อยืนยัน, กรุณาพิมพ์คำว่า "ยืนยัน"</label>
                        <input id="restore-confirm" type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder='พิมพ์ "ยืนยัน" ที่นี่' disabled={!isAdminMode || !restoreFile || !!fileWarning} />
                    </div>
                    
                    <button className="action-button danger-button" onClick={handleRestoreData} disabled={!isAdminMode || !restoreFile || confirmText.trim().toLowerCase() !== 'ยืนยัน' || !!fileWarning}>
                        <span className="material-symbols-outlined">history</span>
                        ยืนยันการกู้คืนข้อมูล
                    </button>
                </section>
            )}
        </div>
    );
}