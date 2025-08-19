import React, { useState, useMemo, useCallback } from 'react';
import { Order } from '../../types';
import { formatCurrency } from '../../helpers';
import { GoogleGenAI } from '@google/genai';
import { Bar } from 'react-chartjs-2';
import { useNotification } from '../../contexts/NotificationContext';

// --- UTILITY FUNCTIONS ---
const formatDate = (date: Date) => date.toISOString().split('T')[0];
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const startOfWeek = new Date(today);
startOfWeek.setDate(today.getDate() - today.getDay());
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);


// --- SUB-COMPONENTS ---
const DailySalesTable: React.FC<{ dailyData: { date: string; netSales: number; discount: number; }[] }> = ({ dailyData }) => {
    if (dailyData.length <= 1) return null; // Don't show table for a single day view
    return (
        <div className="report-table-container" style={{ marginTop: '2rem' }}>
            <table className="report-table">
                <thead>
                    <tr>
                        <th>วันที่</th>
                        <th>ส่วนลด</th>
                        <th>ยอดขายสุทธิ</th>
                    </tr>
                </thead>
                <tbody>
                    {dailyData.map(row => (
                        <tr key={row.date}>
                            <td>{new Date(row.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                            <td>฿{formatCurrency(row.discount)}</td>
                            <td>฿{formatCurrency(row.netSales)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


// --- MAIN COMPONENT ---
const SummaryReport: React.FC<{ orders: Order[]; ai: GoogleGenAI | null; }> = ({ orders, ai }) => {
    const [dateRange, setDateRange] = useState({ start: formatDate(startOfWeek), end: formatDate(today) });
    const [activePreset, setActivePreset] = useState('this_week');
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const { showNotification } = useNotification();

    const handlePresetChange = (preset: string) => {
        setActivePreset(preset);
        let start = new Date();
        const end = new Date();
        switch (preset) {
            case 'today':
                start = today;
                break;
            case 'yesterday':
                start = yesterday;
                break;
            case 'this_week':
                start = startOfWeek;
                break;
            case 'this_month':
                start = startOfMonth;
                break;
        }
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
        let grossSales = 0, totalDiscount = 0, netSales = 0, totalTax = 0, orderCount = 0;
        const dailySales: { [key: string]: { netSales: number, discount: number } } = {};

        for (const order of filteredOrders) {
            if (order.total > 0) {
                orderCount++;
                grossSales += order.subtotal;
                totalDiscount += order.discountValue;
                netSales += order.total;
                totalTax += order.tax;

                const day = formatDate(new Date(order.timestamp));
                if (!dailySales[day]) dailySales[day] = { netSales: 0, discount: 0 };
                dailySales[day].netSales += order.total;
                dailySales[day].discount += order.discountValue;
            }
        }
        
        const dailyDataArray = Object.entries(dailySales)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return { grossSales, totalDiscount, netSales, totalTax, orderCount, dailyData: dailyDataArray };
    }, [filteredOrders]);

    const chartData = useMemo(() => {
        const labels = reportData.dailyData.map(d => new Date(d.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }));
        const data = reportData.dailyData.map(d => d.netSales);

        if (data.length === 0) return { labels: [], datasets: [] };

        const maxSales = Math.max(...data);
        const minSales = Math.min(...data);

        const backgroundColors = data.map(value => {
            if (value === maxSales) return '#10b981'; // Green for best day
            if (value === minSales) return '#f87171'; // Red for worst day
            return 'rgba(79, 70, 229, 0.8)'; // Default primary color
        });

        return {
            labels,
            datasets: [{
                label: 'ยอดขายสุทธิ (บาท)',
                data,
                backgroundColor: backgroundColors,
            }]
        };
    }, [reportData.dailyData]);

    const analyzeSalesWithAI = useCallback(async () => {
        setIsAnalyzing(true);
        setAiAnalysis('');
        if (!ai) {
            setAiAnalysis("คุณสมบัติ AI ถูกปิดใช้งานเนื่องจากไม่ได้กำหนดค่า API Key");
            setIsAnalyzing(false);
            return;
        }

        const prompt = `
            Analyze the following sales data for a Takoyaki shop and provide a concise summary (1-2 sentences) followed by 3 actionable, short bullet-point suggestions to improve sales or operations. Respond in Thai.

            Data:
            - Time Period: ${dateRange.start} to ${dateRange.end}
            - Net Sales: ${reportData.netSales.toFixed(2)} THB
            - Total Bills: ${reportData.orderCount}
            - Daily Sales Data: ${JSON.stringify(reportData.dailyData)}
            
            Example Format:
            ยอดขายในช่วงนี้ดูดีมาก โดยเฉพาะวันเสาร์ที่เป็นวันทำเงินหลัก
            - ลองจัดโปรโมชันลดราคาสำหรับวันอังคารซึ่งเป็นวันที่ยอดขายน้อยที่สุด
            - เพิ่มเมนูเครื่องดื่มใหม่เพื่อเพิ่มยอดขายต่อบิล
            - โปรโมทชุดคอมโบ้สำหรับช่วงเวลา 14:00-16:00 ที่เป็นช่วงขายดี
        `;
        try {
            const result = await ai.getGenerativeModel({ model: "gemini-pro" }).generateContent(prompt);
            setAiAnalysis(result.response.text());
        } catch (error) {
            const errorMessage = "ขออภัย, เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล";
            setAiAnalysis(errorMessage);
            showNotification(errorMessage, 'error');
        } finally {
            setIsAnalyzing(false);
        }
    }, [reportData, dateRange, ai, showNotification]);

    const chartOptions = { responsive: true, plugins: { legend: { display: false } } };
    const presets = [
        { key: 'today', label: 'วันนี้' },
        { key: 'yesterday', label: 'เมื่อวาน' },
        { key: 'this_week', label: 'สัปดาห์นี้' },
        { key: 'this_month', label: 'เดือนนี้' },
    ];

    return (
        <div>
            <div className="report-header" style={{ alignItems: 'flex-start' }}>
                <h1>สรุปยอดขาย</h1>
                <div className="report-controls" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-end' }}>
                    <div className="preset-buttons" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {presets.map(p => (
                            <button key={p.key} className={`action-button ${activePreset === p.key ? '' : 'secondary'}`} onClick={() => handlePresetChange(p.key)}>{p.label}</button>
                        ))}
                    </div>
                    <div className="date-range-selector" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                         <input type="date" value={dateRange.start} onChange={e => { setDateRange(p => ({...p, start: e.target.value})); setActivePreset(''); }} />
                         <span>ถึง</span>
                         <input type="date" value={dateRange.end} onChange={e => { setDateRange(p => ({...p, end: e.target.value})); setActivePreset(''); }} />
                    </div>
                </div>
            </div>

            <div className="summary-cards">
                <div className="summary-card"><div className="summary-card-title">ยอดขายสุทธิ</div><div className="summary-card-value">฿{formatCurrency(reportData.netSales)}</div></div>
                <div className="summary-card"><div className="summary-card-title">จำนวนบิล</div><div className="summary-card-value">{reportData.orderCount}</div></div>
                <div className="summary-card"><div className="summary-card-title">ส่วนลด</div><div className="summary-card-value">฿{formatCurrency(reportData.totalDiscount)}</div></div>
                <div className="summary-card"><div className="summary-card-title">ภาษี</div><div className="summary-card-value">฿{formatCurrency(reportData.totalTax)}</div></div>
            </div>
             
            <div className="chart-container">
                <h3>ภาพรวมยอดขายรายวัน</h3>
                {reportData.dailyData.length > 0 ? (
                    <Bar options={chartOptions} data={chartData} />
                ) : <p style={{ textAlign: 'center', padding: '2rem' }}>ไม่มีข้อมูลการขายในช่วงเวลาที่เลือก</p>}
            </div>

            <DailySalesTable dailyData={reportData.dailyData} />
            
            <div className="ai-analysis-section">
               <div className="ai-analysis-header"><span className="material-symbols-outlined">psychology</span>AI วิเคราะห์ยอดขาย</div>
               <p className="text-secondary" style={{ margin: '0.5rem 0 1rem 0' }}>ให้ AI ช่วยสรุปและหาโอกาสในการเพิ่มยอดขายจากข้อมูลของคุณ</p>
               <button className="action-button" onClick={analyzeSalesWithAI} disabled={isAnalyzing || filteredOrders.length === 0}>{isAnalyzing ? 'กำลังวิเคราะห์...' : 'เริ่มการวิเคราะห์'}</button>
               {aiAnalysis && <div className="ai-analysis-content" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{aiAnalysis}</div>}
            </div>

        </div>
    );
};

export default SummaryReport;