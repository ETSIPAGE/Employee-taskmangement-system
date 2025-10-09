import React from 'react';
import ToastComponent, { Toast } from './Toast';
import { useToast } from '../../context/ToastContext';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      {toasts.map(toast => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
};

export default ToastContainer;