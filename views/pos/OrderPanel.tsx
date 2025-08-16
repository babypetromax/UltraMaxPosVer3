import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { useData } from '../../contexts/DataContext';
import { useCart } from '../../contexts/CartContext';

const OrderPanel: React.FC = () => {
    const { isOrderPanelOpen, setIsOrderPanelOpen, setShowPaymentModal } = useApp();
    const { dailyData } = useData();
    const { 
        cart, 
        clearCart, 
        updateQuantity, 
        cartCalculations,
        discount,
        setDiscount,
        isVatEnabled,
        setIsVatEnabled
    } = useCart();
    
    return (
        <aside className={`order-panel ${isOrderPanelOpen ? 'is-open' : ''}`}>
            <header className="order-header">
                <h2>ออเดอร์ปัจจุบัน</h2>
                 <div className="order-header-actions">
                    {cart.length > 0 && <button className="clear-cart-btn" onClick={clearCart}>ล้างทั้งหมด</button>}
                    <button className="close-panel-btn" onClick={() => setIsOrderPanelOpen(false)}>&times;</button>
                </div>
            </header>
            <div className="cart-items-container">
                {cart.length === 0 ? (
                    <p className="cart-empty-message">คลิกที่สินค้าเพื่อเพิ่มลงในออเดอร์</p>
                ) : (
                    cart.map(item => (
                        <div key={item.id} className="cart-item">
                           <div className="cart-item-info">
                                <p className="cart-item-name">{item.name}</p>
                                <p className="cart-item-price">฿{item.price.toFixed(2)}</p>
                            </div>
                            <div className="cart-item-quantity">
                                <button className="quantity-btn" onClick={() => updateQuantity(item.id, -1)}>−</button>
                                <span className="quantity-value">{item.quantity}</span>
                                <button className="quantity-btn" onClick={() => updateQuantity(item.id, 1)}>+</button>
                            </div>
                            <div className="cart-item-total">฿{(item.price * item.quantity).toFixed(2)}</div>
                        </div>
                    ))
                )}
            </div>
            {cart.length > 0 && (
                <div className="order-summary">
                    <div className="summary-row"><span>ยอดรวม</span><span>฿{cartCalculations.subtotal.toFixed(2)}</span></div>
                    <div className="summary-row">
                        <label htmlFor="discount" className="discount-label">ส่วนลด</label>
                        <input type="text" id="discount" className="discount-input" placeholder="เช่น 50 หรือ 10%" value={discount} onChange={(e) => setDiscount(e.target.value)}/>
                    </div>
                    {cartCalculations.discountValue > 0 && <div className="summary-row"><span>ใช้ส่วนลดแล้ว</span><span>-฿{cartCalculations.discountValue.toFixed(2)}</span></div>}
                    <div className="summary-row">
                        <div className="vat-toggle">
                            <span>ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
                            <label className="switch"><input type="checkbox" checked={isVatEnabled} onChange={() => setIsVatEnabled(!isVatEnabled)} /><span className="slider"></span></label>
                        </div>
                    </div>
                    {isVatEnabled && <div className="summary-row"><span>ภาษี (7%)</span><span>฿{cartCalculations.tax.toFixed(2)}</span></div>}
                    <div className="summary-row total"><span>ยอดสุทธิ</span><span>฿{cartCalculations.total.toFixed(2)}</span></div>
                    <button className="charge-btn" onClick={() => setShowPaymentModal(true)} disabled={cart.length === 0 || (dailyData?.currentShift === null)}>
                        {dailyData?.currentShift === null ? 'กรุณาเปิดกะก่อนขาย' : `ชำระเงิน ฿${cartCalculations.total.toFixed(2)}`}
                    </button>
                </div>
            )}
        </aside>
    );
};

export default OrderPanel;