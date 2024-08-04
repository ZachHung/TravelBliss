import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import RootLayout from '../layouts/Root.layout';
import { HomePage } from '../pages/Home.page';
import SignInPage from '../pages/SignIn/SignIn.page';
import { ROUTES } from '../constants';
import ErrorPage from '../pages/Error/Error.page';
import ProtectedRoute from './ProtectedRoute';
import AuthProvider from '@/contexts/AuthProvider';
import PublicRoute from './PublicRoute';
import RegisterPage from '@/pages/Register/Register.page';

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AuthProvider>
        <RootLayout />
      </AuthProvider>
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
