import React from 'react';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '320px', padding: '24px' }}>
                <h3 style={{ marginBottom: '16px' }}>로그아웃</h3>
                <p style={{ marginBottom: '24px', color: '#4b5563' }}>정말로 로그아웃 하시겠습니까?</p>
                <div className="modal-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        style={{ borderRadius: '12px', padding: '10px 20px', fontSize: '0.95rem' }}
                    >
                        취소
                    </button>
                    <button
                        className="btn btn-danger"
                        onClick={onConfirm}
                        style={{ borderRadius: '12px', padding: '10px 20px', fontSize: '0.95rem' }}
                    >
                        로그아웃
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutModal;
