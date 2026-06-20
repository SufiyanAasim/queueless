import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import TakeToken from './pages/TakeToken.jsx';
import MyToken from './pages/MyToken.jsx';
import Lookup from './pages/Lookup.jsx';
import Feedback from './pages/Feedback.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminSetup from './pages/AdminSetup.jsx';
import AdminAnalytics from './pages/AdminAnalytics.jsx';
import AdminReport from './pages/AdminReport.jsx';
import AdminFeedback from './pages/AdminFeedback.jsx';
import AdminStaff from './pages/AdminStaff.jsx';
import AdminChangePassword from './pages/AdminChangePassword.jsx';
import StaffLogin from './pages/StaffLogin.jsx';
import StaffKiosk from './pages/StaffKiosk.jsx';
import StaffDashboard from './pages/StaffDashboard.jsx';
import Display from './pages/Display.jsx';
import TokenHistory from './pages/TokenHistory.jsx';
import { StaffProvider } from './context/StaffContext.jsx';

export default function App() {
  return (
    <StaffProvider>
      <Layout>
        <Routes>
          <Route path="/"                   element={<Home />} />
          <Route path="/take"               element={<TakeToken />} />
          <Route path="/lookup"             element={<Lookup />} />
          <Route path="/token/:id"          element={<MyToken />} />
          <Route path="/feedback/:tokenId"  element={<Feedback />} />
          <Route path="/display"            element={<Display />} />
          <Route path="/history"            element={<TokenHistory />} />
          <Route path="/staff/login"        element={<StaffLogin />} />
          <Route path="/kiosk"              element={<StaffKiosk />} />
          <Route path="/staff"              element={<StaffDashboard />} />
          <Route path="/admin">
            <Route path="login"     element={<AdminLogin />} />
            <Route path=""          element={<AdminDashboard />} />
            <Route path="setup"     element={<AdminSetup />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="report"    element={<AdminReport />} />
            <Route path="feedback"         element={<AdminFeedback />} />
            <Route path="staff"            element={<AdminStaff />} />
            <Route path="change-password"  element={<AdminChangePassword />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </StaffProvider>
  );
}
