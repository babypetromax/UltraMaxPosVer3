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
        const start = new Date(dateRange.start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        return orders.filter(o => {
            const orderDate = new Date(o.timestamp);
            return orderDate >= start && orderDate <= end && o.status !== 'cancelled';
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

    const exportToCSV = () => {
        const headers = ['id', 'timestamp', 'status', 'subtotal', 'discountValue', 'tax', 'total', 'paymentMethod'];
        const csvRows = [headers.join(',')];
        for (const order of filteredOrders) {
            const values = headers.map(header => {
                const val = order[header as keyof Order];
                return typeof val === 'string' ? `"${val}"` : val;
            });
            csvRows.push(values.join(','));
        }
        
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `sales_summary_${dateRange.start}_to_${dateRange.end}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    
    const analyzeSalesWithAI = useCallback(async () => {
        setIsAnalyzing(true);
        setAiAnalysis('');

        if (!ai) {
            const message = "คุณสมบัติ AI ถูกปิดใช้งานเนื่องจากไม่ได้กำหนดค่า API Key";
            setAiAnalysis(message);
            setIsAnalyzing(false);
            return;
        }

        const prompt = `
            Analyze the following sales data for a Takoyaki shop and provide 3 actionable suggestions to improve sales or operations (respond in Thai):
            - Time Period: ${dateRange.start} to ${dateRange.end}
            - Gross Sales (before discount): ${reportData.grossSales.toFixed(2)} THB
            - Total Discounts: ${reportData.totalDiscount.toFixed(2)} THB
            - Net Sales: ${reportData.netSales.toFixed(2)} THB
            - Total Bills: ${reportData.orderCount}
            - Cash Sales: ${reportData.cashSales.toFixed(2)} THB
            - QR Code Sales: ${reportData.qrSales.toFixed(2)} THB
        `;
        try {
            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
            setAiAnalysis(response.text);
        } catch (error) {
            console.error("AI Analysis Error:", error);
            const errorMessage = "ขออภัย, เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล";
            setAiAnalysis(errorMessage);
            showNotification(errorMessage, 'error');
        } finally {
            setIsAnalyzing(false);
        }
    }, [reportData, dateRange, ai, showNotification]);


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
            </div>
             
            {preset === 'today' && reportData.orderCount > 0 && <div className="chart-container"><h3>ยอดขายรายชั่วโมง</h3><Bar options={chartOptions} data={{labels: Array.from({length: 24}, (_, i) => `${i}:00`), datasets: [{label: 'ยอดขาย (บาท)', data: reportData.hourlySales, backgroundColor: 'rgba(79, 70, 229, 0.8)'}]}} /></div>}
            
             <div className="chart-container">
                <h3>รูปแบบการชำระเงิน</h3>
                {reportData.orderCount > 0 ? (
                    <Pie options={chartOptions} data={{labels: ['เงินสด', 'QR Code'], datasets: [{ label: 'ยอดขาย', data: [reportData.cashSales, reportData.qrSales], backgroundColor: ['#34d399', '#60a5fa'] }]}} />
                ) : <p>ไม่มีข้อมูล</p>}
            </div>
            
            <div className="ai-analysis-section">
               <div className="ai-analysis-header"><span className="material-symbols-outlined">psychology</span>AI วิเคราะห์ยอดขาย</div>
               <button className="action-button" style={{marginTop: '1rem'}} onClick={analyzeSalesWithAI} disabled={isAnalyzing || filteredOrders.length === 0}>{isAnalyzing ? 'กำลังวิเคราะห์...' : 'เริ่มการวิเคราะห์'}</button>
               {aiAnalysis && <div className="ai-analysis-content">{aiAnalysis}</div>}
            </div>

        </div>
    )
};

export default SummaryReport;
