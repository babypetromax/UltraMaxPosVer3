import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
// === ULTRAMAX DEVS EDIT START: Import the new central store ===
import { useStore } from '../../contexts/store';
// We no longer need useCart
// === ULTRAMAX DEVS EDIT END ===

const PaymentModal: React.FC = () => {
    // AppContext is still used for controlling UI state (modals)
    const { setShowPaymentModal, setReceiptData, setShowReceiptModal } = useApp();
    
    // === ULTRAMAX DEVS EDIT START: Selectively subscribe to the store ===
    const { cart, discount, isVatEnabled, handlePlaceOrder } = useStore(state => ({
        cart: state.cart,
        discount: state.discount,
        isVatEnabled: state.isVatEnabled,
        handlePlaceOrder: state.handlePlaceOrder,
    }));
    // === ULTRAMAX DEVS EDIT END ===

    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr'>('cash');
    const [cashReceived, setCashReceived] = useState('');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    
    // Calculations are now derived from the store's state
    const cartCalculations = useMemo(() => {
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const discountValue = (discount.endsWith('%')
            ? subtotal * (parseFloat(discount.slice(0, -1)) / 100)
            : parseFloat(discount) || 0);
        const discountedSubtotal = subtotal - discountValue;
        const tax = isVatEnabled ? discountedSubtotal * 0.07 : 0;
        const total = discountedSubtotal + tax;
        return { subtotal, tax, discountValue, total: total < 0 ? 0 : total };
    }, [cart, discount, isVatEnabled]);

    const { total } = cartCalculations;
    const change = parseFloat(cashReceived) - total;

    const handleConfirm = async () => {
        setIsPlacingOrder(true);
        try {
            // === ULTRAMAX DEVS EDIT START: New Order Placement Flow ===
            // 1. Call handlePlaceOrder from the store. It now returns the new order object.
            const newOrder = handlePlaceOrder(paymentMethod, cashReceived ? parseFloat(cashReceived) : undefined);

            // 2. If the order was created successfully...
            if (newOrder) {
                // 3. Use AppContext to show the receipt modal with the new order data.
                setShowPaymentModal(false);
                setReceiptData({ ...newOrder, cashReceived: cashReceived ? parseFloat(cashReceived) : undefined });
                setShowReceiptModal(true);
            }
            // === ULTRAMAX DEVS EDIT END ===
        } finally {
            setIsPlacingOrder(false);
        }
    }
    
    return (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2 className="modal-title">การชำระเงิน</h2><button className="close-modal-btn" onClick={() => setShowPaymentModal(false)}>&times;</button></div>
                <div className="payment-total"><p>ยอดที่ต้องชำระ</p><h3>฿{total.toFixed(2)}</h3></div>
                <div className="payment-methods">
                    <button className={`payment-method-btn ${paymentMethod === 'cash' ? 'active' : ''}`} onClick={() => setPaymentMethod('cash')}><span className="material-symbols-outlined">payments</span> เงินสด</button>
                    <button className={`payment-method-btn ${paymentMethod === 'qr' ? 'active' : ''}`} onClick={() => setPaymentMethod('qr')}><span className="material-symbols-outlined">qr_code_2</span> QR Code</button>
                </div>
                {paymentMethod === 'cash' && (
                    <div className="cash-input-area">
                        <label htmlFor="cashReceived">รับเงินสด</label>
                        <input id="cashReceived" type="number" className="cash-input" value={cashReceived} onChange={e => setCashReceived(e.target.value)} placeholder="0.00" autoFocus />
                        {change >= 0 && <p className="cash-change">เงินทอน: ฿{change.toFixed(2)}</p>}
                    </div>
                )}
                {paymentMethod === 'qr' && (
                    <div className="qr-area" style={{textAlign: 'center'}}>
                        <p>สแกน QR code เพื่อชำระเงิน</p>
                    </div>
                )}
                <button className="confirm-payment-btn" onClick={handleConfirm} disabled={isPlacingOrder || (paymentMethod === 'cash' && (change < 0 || cashReceived === ''))}>
                    ยืนยันการชำระเงิน
                </button>
            </div>
        </div>
    );
};

export default PaymentModal;
