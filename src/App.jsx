import { useAuth, AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PendingApproval from './pages/PendingApproval';
import './index.css';

function AppContent() {
    const { user } = useAuth();
    if (!user) return <Login />;
    if (!user.is_approved || !user.role || user.role === 'unassigned') {
        return <PendingApproval />;
    }
    return <Dashboard />;
}

function App() {
    return (
        <ToastProvider>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </ToastProvider>
    );
}

export default App;
