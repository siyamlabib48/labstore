import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Gallery from '@/pages/Gallery';
import Feed from '@/pages/Feed';
import Announcements from '@/pages/Announcements';
import Chat from '@/pages/Chat';
import Notifications from '@/pages/Notifications';
import WorkDetail from '@/pages/WorkDetail';
import UploadWork from '@/pages/UploadWork';
import MyWorks from '@/pages/MyWorks';
import Leaderboard from '@/pages/Leaderboard';
import Profile from '@/pages/Profile';
import Friends from '@/pages/Friends';
import Admin from '@/pages/Admin';
import Progress from '@/pages/Progress';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Mfa from '@/pages/Mfa';
import ErrorBoundary from '@/components/ErrorBoundary';
import RoleGuard from '@/components/gates/RoleGuard';
import PendingApproval from '@/pages/PendingApproval';
import { canManageBatch } from '@/lib/staffRoles';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/mfa" element={<Mfa />} />
      <Route path="/pending-approval" element={<PendingApproval />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/golpo-gujob" element={<Feed />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/chats" element={<Chat />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/work/:id" element={<WorkDetail />} />
        <Route path="/upload" element={<UploadWork />} />
        <Route path="/my-works" element={<MyWorks />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/u/:id" element={<Profile />} />
        <Route
          path="/admin"
          element={
            <RoleGuard can={canManageBatch}>
              <Admin />
            </RoleGuard>
          }
        />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <ErrorBoundary>
            <AuthenticatedApp />
          </ErrorBoundary>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App