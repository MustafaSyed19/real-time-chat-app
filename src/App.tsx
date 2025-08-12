import { createBrowserRouter, RouterProvider, Navigate } from 'react-router';
import "./App.css";
import { Suspense, lazy } from "react";
import { AuthProvider } from '../backend/context/authContext';
function App() {
  const LoginForm = lazy(() => import("./pages/loginForm"));
  const Register = lazy(()=>import('./pages/registrationPage'));
  const Home = lazy(()=>import('./pages/homePage'));
  const router = createBrowserRouter([
    { path: '/', element:<Navigate to="/login" replace />},
    {path: "/login", element: <LoginForm></LoginForm> },
    {path:'/register',element:<Register></Register>},
    {path:'/home', element:<Home></Home>}
  ]);
  return (
    <AuthProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <RouterProvider router={router}></RouterProvider>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
