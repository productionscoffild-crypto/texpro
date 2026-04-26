import { useAppStore } from './store';
import Layout from './components/Layout';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import AnalyticsPage from './components/AnalyticsPage';
import ProductsPage from './components/ProductsPage';
import InvoicesPage from './components/InvoicesPage';
import InvoiceNewPage from './components/InvoiceNewPage';
import InvoiceDetailPage from './components/InvoiceDetailPage';
import EmployeesPage from './components/EmployeesPage';
import ChatPage from './components/ChatPage';
import ProfilePage from './components/ProfilePage';
import { ToastProvider } from './components/ui/Toast';

function AppContent() {
  const { page, currentUserId } = useAppStore();

  if (!currentUserId) return <AuthPage />;

  const renderContent = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'analytics': return <AnalyticsPage />;
      case 'products': return <ProductsPage />;
      case 'invoices': return <InvoicesPage />;
      case 'invoice-new': return <InvoiceNewPage />;
      case 'invoice-detail': return <InvoiceDetailPage />;
      case 'employees': return <EmployeesPage />;
      case 'chat': return <ChatPage />;
      case 'profile': return <ProfilePage />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout>
      {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
