import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { DashboardPage } from './pages/DashboardPage';
import { WorkQueuePage } from './pages/WorkQueuePage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/cola" element={<WorkQueuePage />} />
        <Route path="/clientes/:id" element={<CustomerDetailPage />} />
      </Route>
    </Routes>
  );
}
