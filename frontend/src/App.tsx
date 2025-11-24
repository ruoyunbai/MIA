import { RouterProvider } from 'react-router';
import { appRouter } from './routes';

export default function App() {
  return <RouterProvider router={appRouter} />;
}
