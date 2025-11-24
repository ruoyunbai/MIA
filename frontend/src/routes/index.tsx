import { createBrowserRouter, Navigate } from 'react-router';
import { ChatPage, KnowledgePage, DashboardPage } from '../pages';
import { RootLayout } from './RootLayout';

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <ChatPage /> },
      { path: 'knowledge', element: <KnowledgePage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
