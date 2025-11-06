import React, { createContext, useState, useContext, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
  return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3000); // 3초 후에 알림 사라짐
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
      }}>
        {notifications.map((n) => (
          <div key={n.id} style={{
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '5px',
            marginBottom: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
          }}>
            {n.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};