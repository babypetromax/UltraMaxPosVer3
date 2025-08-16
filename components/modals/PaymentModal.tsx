import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCart } from '../../contexts/CartContext';

const PaymentModal: React.FC = () => {
    const { setShowPaymentModal } = useApp();
    const { cartCalculations, handlePlaceOrder } = useCart();

    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr'>('cash');
    const [cashReceived, setCashReceived] = useState('');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    
    const { total } = cartCalculations;
    const change = parseFloat(cashReceived) - total;

    const handleConfirm = async () => {
        setIsPlacingOrder(true);
        try {
            await handlePlaceOrder(paymentMethod, cashReceived ? parseFloat(cashReceived) : undefined);
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