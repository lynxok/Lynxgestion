import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import './ToastContext.css';

const ToastContext = createContext();

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, message, type }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = {
        success: (msg, duration) => addToast(msg, 'success', duration),
        error: (msg, duration) => addToast(msg, 'error', duration),
        info: (msg, duration) => addToast(msg, 'info', duration),
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="toast-container" aria-live="polite">
                {toasts.map(t => (
                    <div key={t.id} className={`toast-item toast-${t.type} glass slide-in`}>
                        <div className="toast-icon">
                            {t.type === 'success' && <CheckCircle2 size={18} />}
                            {t.type === 'error' && <AlertCircle size={18} />}
                            {t.type === 'info' && <Info size={18} />}
                        </div>
                        <div className="toast-message">{t.message}</div>
                        <button className="toast-close" onClick={() => removeToast(t.id)} aria-label="Cerrar">
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        return {
            toast: {
                success: (msg) => console.log('Toast:', msg),
                error: (msg) => console.error('Toast Error:', msg),
                info: (msg) => console.log('Toast Info:', msg),
            }
        };
    }
    return context;
}
