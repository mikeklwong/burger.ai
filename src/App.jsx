import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Explore from '@/pages/Explore';
import Upload from '@/pages/Upload';
import PostDetail from '@/pages/PostDetail';
import Profile from '@/pages/Profile';
import Onboarding from '@/pages/Onboarding';
import Settings from '@/pages/Settings';
import Notifications from '@/pages/Notifications';
import ProUpgrade from '@/pages/ProUpgrade';
import WhoViewed from '@/pages/WhoViewed';
import TagPage from '@/pages/TagPage';
import EditProfile from '@/pages/EditProfile';
import FollowList from '@/pages/FollowList';
import PostAnalytics from '@/pages/PostAnalytics';
import BlockedUsers from '@/pages/BlockedUsers';
import CollectionDetail from '@/pages/CollectionDetail';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Send users who haven't finished onboarding there
  if (user && user.onboarding_complete === false && !window.location.pathname.startsWith('/onboarding')) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/profile/:id/followers" element={<FollowList />} />
        <Route path="/profile/:id/following" element={<FollowList />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/pro" element={<ProUpgrade />} />
        <Route path="/who-viewed" element={<WhoViewed />} />
        <Route path="/tag/:tag" element={<TagPage />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/post/:id/analytics" element={<PostAnalytics />} />
        <Route path="/blocked" element={<BlockedUsers />} />
        <Route path="/collection/:id" element={<CollectionDetail />} />
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
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
              <Route path="/*" element={<AuthenticatedApp />} />
            </Route>
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App