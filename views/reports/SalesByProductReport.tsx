import React, { useMemo } from 'react';
import { Order } from '../../types';
import { Bar, Pie } from 'react-chartjs-2';
import { formatCurrency } from '../../helpers';

interface SalesByProductReportProps {
    orders: Order[];
}

// --- สีสำหรับ Top 5 Products ---
const PRODUCT_COLORS = ['#34d399', '#60a5fa', '#f87171', '#fbbf24', '#a78bfa'];

const SalesByProductReport: React.FC<SalesByProductReportProps> = ({ orders }) => {

    // 1. คำนวณยอดขายรวมของสินค้าแต่ละชนิด
    const productSales = useMemo(() => {
        const validOrders = orders.filter(o => o.status !== 'cancelled' && o.total > 0);
        const sales: { [key: string]: { id: number, name: string, quantity: number, total: number } } = {};
        validOrders.forEach(order => {
            order.items.forEach(item => {
                if (!sales[item.id]) sales[item.id] = { id: item.id, name: item.name, quantity: 0, total: 0 };
                sales[item.id].quantity += item.quantity;
                sales[item.id].total += (item.price * item.quantity);
            });
        });
        return Object.values(sales).sort((a, b) => b.total - a.total);
    }, [orders]);

    // 2. คัดเลือก Top 5 และคำนวณยอดขายรายชั่วโมงสำหรับกราฟแท่ง
    const top5ProductSales = productSales.slice(0, 5);
    const top5ProductIds = new Set(top5ProductSales.map(p => p.id));

    const hourlyStackedData = useMemo(() => {
        const validOrders = orders.filter(o => o.status !== 'cancelled' && o.total > 0);
        const hourlySales: { [hour: number]: { [productId: number]: number } } = {};

        for (let i = 0; i < 24; i++) hourlySales[i] = {};

        validOrders.forEach(order => {
            const hour = new Date(order.timestamp).getHours();
            order.items.forEach(item => {
                if (top5ProductIds.has(item.id)) {
                    if (!hourlySales[hour][item.id]) hourlySales[hour][item.id] = 0;
                    hourlySales[hour][item.id] += item.price * item.quantity;
                }
            });
        });

        const labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
        const datasets = top5ProductSales.map((product, index) => ({
            label: product.name,
            data: labels.map((_, hour) => hourlySales[hour][product.id] || 0),
            backgroundColor: PRODUCT_COLORS[index],
        }));
        
        return { labels, datasets };
    }, [orders, top5ProductSales, top5ProductIds]);


    // 3. เตรียมข้อมูลสำหรับกราฟวงกลม
    const pieChartData = {
        labels: top5ProductSales.map(p => p.name),
        datasets: [{
            data: top5ProductSales.map(p => p.total),
            backgroundColor: PRODUCT_COLORS,
        }]
    };
    
    // --- ตัวแปรสำหรับ Chart Options ---
    const barChartOptions = {
        responsive: true,
        plugins: { legend: { position: 'top' as const } },
        scales: { x: { stacked: true }, y: { stacked: true } }
    };
    const pieChartOptions = { responsive: true, plugins: { legend: { position: 'top' as const } } };

    return (
        <div>
            {/* เราจะเพิ่มส่วน Control Panel ที่นี่ในอนาคต */}
            <div className="report-header"><h1>ยอดขายตามสินค้า</h1></div>
            
            {/* ส่วนแสดง Top 5 Products */}
            <div className="summary-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))' }}>
                {top5ProductSales.map((product, index) => (
                    <div key={product.id} className="summary-card" style={{ borderLeft: `5px solid ${PRODUCT_COLORS[index]}` }}>
                        <div className="summary-card-title" style={{ fontWeight: 600 }}>{index + 1}. {product.name}</div>
                        <div className="summary-card-value">฿{formatCurrency(product.total)}</div>
                        <p style={{ color: 'var(--text-secondary)' }}>ขายได้ {product.quantity} ชิ้น</p>
                    </div>
                ))}
            </div>

            {/* ส่วนแสดงกราฟ */}
            <div className="chart-container" style={{ marginTop: '2rem' }}>
                <h3>ยอดขายรายชั่วโมง (5 อันดับแรก)</h3>
                <Bar options={barChartOptions} data={hourlyStackedData} />
            </div>
            
            <div className="chart-container" style={{ marginTop: '2rem', maxWidth: '600px', margin: '2rem auto' }}>
                 <h3>สัดส่วนยอดขาย (5 อันดับแรก)</h3>
                 <Pie options={pieChartOptions} data={pieChartData} />
            </div>

            {/* ส่วนตารางข้อมูลทั้งหมด */}
            <div style={{ marginTop: '2rem' }}>
                <h3>รายการสินค้าที่ขายได้ทั้งหมด</h3>
                <table className="report-table">
                    <thead><tr><th>อันดับ</th><th>ชื่อสินค้า</th><th style={{textAlign: 'right'}}>จำนวนที่ขายได้ (สุทธิ)</th><th style={{textAlign: 'right'}}>ยอดขายรวม (สุทธิ)</th></tr></thead>
                    <tbody>
                        {productSales.map((product, index) => (
                            <tr key={product.id}>
                                <td>{index + 1}</td>
                                <td>{product.name}</td>
                                <td style={{textAlign: 'right'}}>{product.quantity}</td>
                                <td style={{textAlign: 'right'}}>฿{formatCurrency(product.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

             {/* Synapse's AI Section */}
            <div className="ai-analysis-section" style={{ marginTop: '2rem' }}>
               <div className="ai-analysis-header"><span className="material-symbols-outlined">psychology</span>AI วิเคราะห์สินค้าขายดี</div>
                <div className="ai-analysis-content" style={{ marginTop: '1rem' }}>
                    <p>
                        {productSales.length > 0
                            ? `สินค้าขายดีที่สุดคือ "${productSales[0].name}" ซึ่งสร้างยอดขายได้ถึง ฿${formatCurrency(productSales[0].total)}! ลองพิจารณาจัดโปรโมชันจับคู่กับสินค้าที่ขายดีรองลงมาเพื่อเพิ่มยอดขายเฉลี่ยต่อบิล`
                            : 'ยังไม่มีข้อมูลเพียงพอสำหรับวิเคราะห์'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SalesByProductReport;