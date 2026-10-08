import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import AlertsPage from './pages/AlertsPage';
import PriorityPage from './pages/PriorityPage';
import WhatIfPage from './pages/WhatIfPage';

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/priority" element={<PriorityPage />} />
          <Route path="/whatif" element={<WhatIfPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
