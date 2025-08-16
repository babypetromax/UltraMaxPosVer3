import React, { useMemo } from 'react';
import { Order } from '../../types';
import { formatCurrency } from '../../helpers';

interface SalesByProductReportProps {
    orders: Order[];
}

const SalesByProductReport: React.FC<SalesByProductReportProps> = ({ orders }) => {
    const productSales = useMemo(() => {
        const validOrders = orders.filter(o => o.status !== 'cancelled');
        const sales: { [key: string]: { name: string, quantity: number, total: number } } = {};
        validOrders.forEach(order => {
            order.items.forEach(item => {
                if (!sales[item.id]) sales[item.id] = { name: item.name, quantity: 0, total: 0 };
                const sign = Math.sign(order.total) || 1;
                sales[item.id].quantity += item.quantity * sign;
                sales[item.id].total += (item.price * item.quantity) * sign;
            });
        });
        return Object.values(sales).sort((a, b) => b.quantity - a.quantity);
    }, [orders]);

    return (
        <div>
            <div className="report-header"><h1>ยอดขายตามสินค้า (ขายดีที่สุด)</h1></div>
            <table className="report-table">
                <thead><tr><th>อันดับ</th><th>ชื่อสินค้า</th><th>จำนวนที่ขายได้ (สุทธิ)</th><th>ยอดขายรวม (สุทธิ)</th></tr></thead>
                <tbody>
                    {productSales.map((product, index) => (
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
    );
};

export default SalesByProductReport;
