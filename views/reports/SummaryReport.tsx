import React, { useState, useMemo, useCallback } from 'react';
import { Order } from '../../types';
import { formatCurrency } from '../../helpers';
import { GoogleGenAI } from '@google/genai';
import { Bar, Pie } from 'react-chartjs-2';
import { useNotification } from '../../contexts/NotificationContext';

const formatDate = (date: Date) => date.toISOString().split('T')[0];
const today = new Date();
const weekAgo = new Date(today);
weekAgo.setDate(today.getDate() - 7);

interface SummaryReportProps {
    orders: Order[];
    ai: GoogleGenAI | null;
}

const SummaryReport: React.FC<SummaryReportProps> = ({ orders, ai }) => {
    const [dateRange, setDateRange] = useState({ start: formatDate(weekAgo), end: formatDate(today) });
    const [preset, setPreset] = useState('7days');
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const { showNotification } = useNotification();

    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setPreset(value);
        const end = new Date();
        let start = new Date();
        if (value === 'today') start.setHours(0,0,0,0);
        else if (value === '7days') start.setDate(end.getDate() - 7);
        else if (value === '30days') start.setDate(end.getDate() - 30);
        setDateRange({ start: formatDate(start), end: formatDate(end) });
    };

    const filteredOrders = useMemo(() => {
        // === ULTRAMAX DEVS FIX: Stabilize Date objects outside the filter loop ===
        const start = new Date(dateRange.start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);

        // Convert to milliseconds once for performance
        const startTime = start.getTime();
        const endTime = end.getTime();

        return orders.filter(o => {
            // Convert order timestamp to milliseconds for direct comparison
            const orderTime = new Date(o.timestamp).getTime();
            return orderTime >= startTime && orderTime <= endTime && o.status !== 'cancelled';
        });
    }, [orders, dateRange]);
    
    const reportData = useMemo(() => {
        let grossSales = 0, totalDiscount = 0, netSales = 0, totalTax = 0;
        let cashSales = 0, qrSales = 0, orderCount = 0;
        const hourlySales = Array(24).fill(0);

        for (const order of filteredOrders) {
            if (order.total > 0) {
                orderCount++;
                grossSales += order.subtotal;
                totalDiscount += order.discountValue;
                netSales += order.total;
                totalTax += order.tax;
                if (order.paymentMethod === 'cash') cashSales += order.total;
                else qrSales += order.total;

                if (preset === 'today') {
                   const hour = new Date(order.timestamp).getHours();
                   hourlySales[hour] += order.total;
                }
            }
        }
        return { grossSales, totalDiscount, netSales, totalTax, cashSales, qrSales, orderCount, hourlySales };
    }, [filteredOrders, preset]);

    const exportToCSV = useCallback(() => {
        if (filteredOrders.length === 0) {
            showNotification('ไม่มีข้อมูลให้ส่งออก', 'info');
            return;
        }
        
        const headers = ['id', 'timestamp', 'status', 'subtotal', 'discountValue', 'tax', 'total', 'paymentMethod'];
        const csvRows = [headers.join(',')];
        for (const order of filteredOrders) {
            const values = headers.map(header => {
                const val = order[header as keyof Order];
                return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
            });
            csvRows.push(values.join(','));
        }
        
        const blob = new Blob(["\uFEFF" + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `sales_summary_${dateRange.start}_to_${dateRange.end}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('ส่งออกไฟล์ CSV สำเร็จ', 'success');
    }, [filteredOrders, dateRange, showNotification]);
    
    const analyzeSalesWithAI = useCallback(async () => {
        setIsAnalyzing(true);
        setAiAnalysis('');

        if (!ai) {
            const message = "คุณสมบัติ AI ถูกปิดใช้งานเนื่องจากไม่ได้กำหนดค่า API Key";
            setAiAnalysis(message);
            setIsAnalyzing(false);
            showNotification(message, 'warning');
            return;
        }
        
        if (filteredOrders.length === 0) {
             const message = "ไม่มีข้อมูลในช่วงเวลาที่เลือกให้วิเคราะห์";
            setAiAnalysis(message);
            setIsAnalyzing(false);
            showNotification(message, 'info');
            return;
        }

        const prompt = `
            Analyze the following sales data for a Takoyaki shop and provide 3 actionable suggestions to improve sales or operations (respond in Thai in markdown format with bold headers and bullet points):
            - Time Period: ${dateRange.start} to ${dateRange.end}
            - Gross Sales (before discount): ${reportData.grossSales.toFixed(2)} THB
            - Total Discounts: ${reportData.totalDiscount.toFixed(2)} THB
            - Net Sales: ${reportData.netSales.toFixed(2)} THB
            - Total Bills: ${reportData.orderCount}
            - Cash Sales: ${reportData.cashSales.toFixed(2)} THB
            - QR Code Sales: ${reportData.qrSales.toFixed(2)} THB
        `;
        try {
            const model = ai.getGenerativeModel({ model: "gemini-pro"});
            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            setAiAnalysis(text);
        } catch (error) {
            console.error("AI Analysis Error:", error);
            const errorMessage = "ขออภัย, เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล";
            setAiAnalysis(errorMessage);
            showNotification(errorMessage, 'error');
        } finally {
            setIsAnalyzing(false);
        }
    }, [reportData, dateRange, ai, showNotification, filteredOrders]);


    const chartOptions = { responsive: true, plugins: { legend: { position: 'top' as const } } };

    return (
        <div>
            <div className="report-header">
                <h1>สรุปยอดขาย</h1>
                <div className="report-controls">
                    <select value={preset} onChange={handlePresetChange}>
                        <option value="today">วันนี้</option>
                        <option value="7days">7 วันล่าสุด</option>
                        <option value="30days">30 วันล่าสุด</option>
                    </select>
                    <div className="control-group"><label>เริ่มต้น</label><input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({...p, start: e.target.value}))} /></div>
                    <div className="control-group"><label>สิ้นสุด</label><input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({...p, end: e.target.value}))} /></div>
                     <button className="action-button" onClick={exportToCSV}><span className="material-symbols-outlined">download</span>ส่งออก CSV</button>
                </div>
            </div>

            <div className="summary-cards">
                <div className="summary-card"><div className="summary-card-title">ยอดขายสุทธิ</div><div className="summary-card-value">฿{formatCurrency(reportData.netSales)}</div></div>
                <div className="summary-card"><div className="summary-card-title">จำนวนบิล</div><div className="summary-card-value">{reportData.orderCount}</div></div>
                <div className="summary-card"><div className="summary-card-title">ส่วนลด</div><div className="summary-card-value">฿{formatCurrency(reportData.totalDiscount)}</div></div>
                <div className="summary-card"><div className="summary-card-title">ภาษี</div><div className="summary-card-value">฿{formatCurrency(reportData.totalTax)}</div></div>
