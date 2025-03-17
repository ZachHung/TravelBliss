import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import FullscreenLoader from '@/components/FullscreenLoader/FullscreenLoader';
import { ROUTES } from '../constants';
import ErrorPage from '../pages/Error/Error.page';

const RootLayout = lazy(() => import('@/layouts/Root.layout'));
const AuthProvider = lazy(() => import('@/contexts/AuthProvider'));
const HomePage = lazy(() => import('@/pages/Home.page'));
const SignInPage = lazy(() => import('@/pages/SignIn/SignIn.page'));
const RegisterPage = lazy(() => import('@/pages/Register/Register.page'));
const PublicRoute = lazy(() => import('./PublicRoute'));
const ProtectedRoute = lazy(() => import('./ProtectedRoute'));

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<FullscreenLoader />}>
        <AuthProvider>
          <RootLayout />
        </AuthProvider>
      </Suspense>
    ),
    errorElement: <ErrorPage />,
    children: [
      {
        path: ROUTES.ROOT,
        element: <HomePage />,
      },

      {
        element: <PublicRoute />,
        children: [
          {
            path: ROUTES.SIGN_IN,
            element: <SignInPage />,
          },
          {
            path: ROUTES.REGISTER,
            element: <RegisterPage />,
          },
        ],
      },

      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/protected',
            element: <p>Protected</p>,
          },
        ],
      },
    ],
  },
]);

export const Router = () => <RouterProvider router={router} />;
