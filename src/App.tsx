import { createBrowserRouter, RouterProvider, Navigate } from "react-router";
import "./App.css";
import { Suspense, lazy } from "react";

function App() {
  const LoginForm = lazy(() => import("./components/loginForm"));
  const Register = lazy(()=>import('./components/register'));
  const router = createBrowserRouter([
    { path: '/', element:<Navigate to="/login" replace />},
    {path: "/login", element: <LoginForm></LoginForm> },
    {path:'/register',element:<Register></Register>},
    {path:'/home', element:<></>}
  ]);
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RouterProvider router={router}></RouterProvider>
    </Suspense>
  );
}

export default App;
