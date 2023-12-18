import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import RootLayout from './layouts/Root.layout';
import { HomePage } from './pages/Home.page';
import SignInPage from './pages/SignIn/SignIn.page';
import { ROUTES } from './constants';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: ROUTES.ROOT,
        element: <HomePage />,
      },
      {
        path: ROUTES.SIGN_IN,
        element: <SignInPage />,
      },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
