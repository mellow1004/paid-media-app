import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { AlertsPage } from './pages/AlertsPage';
import { SpendEntryPage } from './pages/SpendEntryPage';
import { CustomerOverviewPage } from './pages/CustomerOverviewPage';
import { PlatformDetailPage } from './pages/PlatformDetailPage';
import { GoogleAdsAdsPage } from './pages/GoogleAdsAdsPage';
import { ForecastingPage } from './pages/ForecastingPage';
import { CustomersIndexPage } from './pages/CustomersIndexPage';

function DashboardRedirect() {
  return <Navigate to="/customers" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected routes */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardRedirect />} />

          {/* Hierarchical drill-down */}
          <Route path="/customers" element={<CustomersIndexPage />} />
          <Route path="/customers/:customerId" element={<CustomerOverviewPage />} />
          <Route path="/customers/:customerId/platform/:channelId" element={<PlatformDetailPage />} />
          <Route path="/customers/:customerId/platform/:channelId/campaign/:campaignId/ads" element={<GoogleAdsAdsPage />} />

          {/* Utilities */}
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/forecasting" element={<ForecastingPage />} />
          <Route path="/simulation" element={<Navigate to="/forecasting" replace />} />
          <Route path="/spend-entry" element={<SpendEntryPage />} />
        </Route>
        
        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/customers" replace />} />
        
        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/customers" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
