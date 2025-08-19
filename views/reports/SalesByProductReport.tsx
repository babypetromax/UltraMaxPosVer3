import React, { useMemo, useState } from 'react';
import { Order } from '../../types';
import { formatCurrency } from '../../helpers';
import { Bar, Pie } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';

// --- Helper function to generate colors for charts ---
const generatePastelColors = (numColors: number) => {
    const colors = [];
    for (let i = 0; i < numColors; i++) {
        const hue = (i * 360) / numColors;
        colors.push(`hsla(${hue}, 70%, 80%, 0.9)`);
    }
    return colors;
};


interface SalesByProductReportProps {
    orders: Order[];
}

type ChartType = 'bar' | 'pie' | 'table';

const SalesByProductReport: React.FC<SalesByProductReportProps> = ({ orders }) => {
    const [chartType, setChartType] = useState<ChartType>('bar');
    const [dateRange, setDateRange] = useState({ 
        start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0], 
        end: new Date().toISOString().split('T')[0] 
    });

    // --- Core Data Processing Logic (Memoized for performance) ---
    const processedData = useMemo(() => {
        const start = new Date(dateRange.start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);

        const validOrders = orders.filter(o => {
            const orderDate = new Date(o.timestamp);
            return o.status !== 'cancelled' && orderDate >= start && orderDate <= end;
        });

        // 1. Aggregate total sales per product
        const salesByProduct: { [key: string]: { name: string, quantity: number, total: number } } = {};
        validOrders.forEach(order => {
            order.items.forEach(item => {
                if (!salesByProduct[item.id]) salesByProduct[item.id] = { name: item.name, quantity: 0, total: 0 };
                const sign = Math.sign(order.total) || 1;
                salesByProduct[item.id].quantity += item.quantity * sign;
                salesByProduct[item.id].total += (item.price * item.quantity) * sign;
            });
        });
        const productRanking = Object.values(salesByProduct).sort((a, b) => b.total - a.total);

        // 2. Aggregate sales by hour for stacked bar chart
        const salesByHour: { [hour: number]: { [productName: string]: number } } = {};
        for (let i = 0; i < 24; i++) salesByHour[i] = {};

        validOrders.forEach(order => {
            const hour = new Date(order.timestamp).getHours();
            order.items.forEach(item => {
                if (!salesByHour[hour][item.name]) salesByHour[hour][item.name] = 0;
                salesByHour[hour][item.name] += item.price * item.quantity;
            });
        });

        return { productRanking, salesByHour };
    }, [orders, dateRange]);

    // --- Chart Configurations ---
    const top5Products = useMemo(() => processedData.productRanking.slice(0, 5), [processedData.productRanking]);
    const top5ProductNames = useMemo(() => top5Products.map(p => p.name), [top5Products]);
    const chartColors = useMemo(() => generatePastelColors(top5Products.length), [top5Products]);

    const barChartData = {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [
            ...top5Products.map((product, index) => ({
                label: product.name,
                data: Array.from({ length: 24 }, (_, hour) => processedData.salesByHour[hour]?.[product.name] || 0),
                backgroundColor: chartColors[index],
            })),
        ],
    };

    const pieChartData = {
        labels: top5Products.map(p => p.name),
        datasets: [{
            label: 'ยอดขาย',
            data: top5Products.map(p => p.total),
            backgroundColor: chartColors,
            borderColor: 'rgba(255, 255, 255, 0.5)',
            borderWidth: 1,
        }],
    };
    
    const chartOptions: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' as const } },
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
    };

    return (
        <div>
            <div className="report-header">
                <h1>ยอดขายตามสินค้า</h1>
                <div className="report-controls">
                    <div className="control-group">
                        <label>เริ่มต้น</label>
                        <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} />
                    </div>
                    <div className="control-group">
                        <label>สิ้นสุด</label>
                        <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} />
                    </div>
                </div>
            </div>

            <div className="report-view-toggle">
                <button className={chartType === 'bar' ? 'active' : ''} onClick={() => setChartType('bar')}>
                    <span className="material-symbols-outlined">bar_chart</span>กราฟแท่ง
                </button>
                <button className={chartType === 'pie' ? 'active' : ''} onClick={() => setChartType('pie')}>
                    <span className="material-symbols-outlined">pie_chart</span>กราฟวงกลม
                </button>
                 <button className={chartType === 'table' ? 'active' : ''} onClick={() => setChartType('table')}>
                    <span className="material-symbols-outlined">table_rows</span>ตารางข้อมูล
                </button>
            </div>
            
            {chartType === 'bar' && (
                 <div className="chart-container" style={{height: '500px'}}>
                    <h3>ยอดขายรายชั่วโมง (5 อันดับแรก)</h3>
                    <Bar options={chartOptions} data={barChartData} />
                </div>
            )}
            
            {chartType === 'pie' && (
                <div className="chart-container" style={{maxWidth: '600px', margin: 'auto'}}>
                    <h3>สัดส่วนยอดขาย (5 อันดับแรก)</h3>
                    <Pie data={pieChartData} />
                </div>
            )}

            {chartType === 'table' && (
                 <div>
                    <h3>ตารางสรุปยอดขายตามสินค้า (ขายดีที่สุด)</h3>
                    <table className="report-table" style={{marginTop: '1rem'}}>
                        <thead>
                            <tr>
                                <th>อันดับ</th>
                                <th>ชื่อสินค้า</th>
                                <th>จำนวนที่ขายได้ (สุทธิ)</th>
                                <th>ยอดขายรวม (สุทธิ)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.productRanking.map((product, index) => (
                                <tr key={product.name}>
                                    <td>{index + 1}</td>
                                    <td>{product.name}</td>
                                    <td>{product.quantity}</td>
                                    <td>฿{formatCurrency(product.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default SalesByProductReport;