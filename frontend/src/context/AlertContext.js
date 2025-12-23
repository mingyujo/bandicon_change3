// [전체 코드] src/context/AlertContext.js
import React, { createContext, useState, useContext, useCallback } from 'react';

const AlertContext = createContext();

export const useAlert = () => {
  return useContext(AlertContext);
};

export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((title, message, onConfirm, showCancelButton = true) => {
    setAlert({ title, message, onConfirm, showCancelButton });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(null);
  }, []);

  const handleConfirm = () => {
    if (alert && alert.onConfirm) {
      alert.onConfirm();
    }
    hideAlert();
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alert && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{alert.title}</h3>
            <p style={{whiteSpace: 'pre-wrap'}}>{alert.message}</p>
            <div className="modal-actions">
              {alert.showCancelButton && <button className="btn btn-secondary" onClick={hideAlert}>취소</button>}
              <button className="btn btn-primary" onClick={handleConfirm}>확인</button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};