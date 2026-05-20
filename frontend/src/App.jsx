import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import TakeToken from './pages/TakeToken.jsx';
import MyToken from './pages/MyToken.jsx';
import Lookup from './pages/Lookup.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminAnalytics from './pages/AdminAnalytics.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"               element={<Home />} />
        <Route path="/take"           element={<TakeToken />} />
        <Route path="/lookup"         element={<Lookup />} />
        <Route path="/token/:id"      element={<MyToken />} />
        <Route path="/admin">
          <Route path="login" element={<AdminLogin />} />
          <Route path="" element={<AdminDashboard />} />
          <Route path="analytics" element={<AdminAnalytics />} />
        </Route>
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
