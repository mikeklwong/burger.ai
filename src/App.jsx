import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
import Layout from '@/components/Layout';
const Home = lazy(() => import('@/pages/Home'));
const Explore = lazy(() => import('@/pages/Explore'));
const Upload = lazy(() => import('@/pages/Upload'));
const PostDetail = lazy(() => import('@/pages/PostDetail'));
const Profile = lazy(() => import('@/pages/Profile'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const Settings = lazy(() => import('@/pages/Settings'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const ProUpgrade = lazy(() => import('@/pages/ProUpgrade'));
const WhoViewed = lazy(() => import('@/pages/WhoViewed'));
const TagPage = lazy(() => import('@/pages/TagPage'));
const EditProfile = lazy(() => import('@/pages/EditProfile'));
const FollowList = lazy(() => import('@/pages/FollowList'));
const PostAnalytics = lazy(() => import('@/pages/PostAnalytics'));
const BlockedUsers = lazy(() => import('@/pages/BlockedUsers'));
const CollectionDetail = lazy(() => import('@/pages/CollectionDetail'));

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, user } = useAuth();

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
    } else {
      return <div role="alert" className="p-8 text-center">{authError.message}<button className="block mx-auto mt-4 underline" onClick={() => window.location.reload()}>Retry</button></div>;
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
          <Suspense fallback={<div role="status" className="p-10 text-center">Loading…</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
              <Route path="/*" element={<AuthenticatedApp />} />
            </Route>
          </Routes>
          </Suspense>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App