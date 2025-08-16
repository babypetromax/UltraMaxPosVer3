import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useNotification } from '../../contexts/NotificationContext';

const SecuritySettings: React.FC = () => {
    const { adminPassword, handlePasswordChange } = useApp();
    const { showNotification } = useNotification();

    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (oldPass !== adminPassword) {
            setError('รหัสผ่านปัจจุบันไม่ถูกต้อง');
            return;
        }
        if (newPass.length < 4) {
            setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร');
            return;
        }
        if (newPass !== confirmPass) {
            setError('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน');
            return;
        }
        if (handlePasswordChange(newPass)) {
            showNotification('เปลี่ยนรหัสผ่านสำเร็จ!', 'success');
            setOldPass('');
            setNewPass('');
            setConfirmPass('');
        }
    };

    return (
        <div className="settings-card">
            <h3>เปลี่ยนรหัสผ่านผู้ดูแล</h3>
             <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="oldPass">รหัสผ่านปัจจุบัน</label>
                    <input type="password" id="oldPass" value={oldPass} onChange={e => setOldPass(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label htmlFor="newPass">รหัสผ่านใหม่</label>
                    <input type="password" id="newPass" value={newPass} onChange={e => setNewPass(e.target.value)} required />
                </div>
                 <div className="form-group">
                    <label htmlFor="confirmPass">ยืนยันรหัสผ่านใหม่</label>
                    <input type="password" id="confirmPass" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required />
                </div>
                {error && <p className="error-message">{error}</p>}
                <button type="submit" className="action-button">บันทึกรหัสผ่านใหม่</button>
            </form>
        </div>
    );
};

export default SecuritySettings;
