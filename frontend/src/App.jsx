import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import DSASheet from './pages/DSASheet';
import Contests from './pages/Contests';
import Leaderboards from './pages/Leaderboards';
import PlacementStories from './pages/PlacementStories';
import Opportunities from './pages/Opportunities';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/auth',
    // In dev mode: skip login entirely, go straight to dashboard
    element: DEV_MODE ? <Navigate to="/dashboard" replace /> : <Auth />,
  },
  {
    // Protected area — requires auth, wrapped in Layout (header + sidebar)
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: <Dashboard />,
      },
      {
        path: '/profile',
        element: <div className="card p-8 text-center text-gray-400">Profile page — coming soon</div>,
      },
      {
        path: '/jobs',
        element: <div className="card p-8 text-center text-gray-400">Jobs page — coming soon</div>,
      },
      {
        path: '/students',
        element: <div className="card p-8 text-center text-gray-400">Students page — coming soon</div>,
      },
      {
        path: '/team',
        element: <div className="card p-8 text-center text-gray-400">Team page — coming soon</div>,
      },
      {
        path: '/settings',
        element: <div className="card p-8 text-center text-gray-400">Settings page — coming soon</div>,
      },
      {
        path: '/code-league/dsa-sheet',
        element: <DSASheet />,
      },
      {
        path: '/contests',
        element: <Contests />,
      },
      {
        path: '/leaderboards',
        element: <Leaderboards />,
      },
      {
        path: '/placement-stories',
        element: <PlacementStories />,
      },
      {
        path: '/opportunities',
        element: <Opportunities />,
      },
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

const App = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
