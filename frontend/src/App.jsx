import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import TakeToken from './pages/TakeToken.jsx';
import MyToken from './pages/MyToken.jsx';
import Lookup from './pages/Lookup.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"               element={<Home />} />
        <Route path="/take"           element={<TakeToken />} />
        <Route path="/lookup"         element={<Lookup />} />
        <Route path="/token/:id"      element={<MyToken />} />
        <Route path="/admin/login"    element={<AdminLogin />} />
        <Route path="/admin"          element={<AdminDashboard />} />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
