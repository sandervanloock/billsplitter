import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { CreateScreen } from './screens/Create';
import { HostScreen } from './screens/host/HostScreen';
import { JoinScreen } from './screens/Join';
import { LandingScreen } from './screens/Landing';
import { ParticipantScreen } from './screens/Participant';

function JRedirect() {
  // In production /j/* is served by the Cloud Function (OG tags for WhatsApp);
  // if the SPA ever receives it, fall through to the join route.
  const { id } = useParams();
  return <Navigate to={`/join/${id}`} replace />;
}

/** Mobile-first phone column for the app screens; the landing page renders full-width. */
function AppShell() {
  return (
    <div className="app-col">
      <Outlet />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<LandingScreen />} />
        <Route element={<AppShell />}>
          <Route path="/new" element={<CreateScreen />} />
          <Route path="/s/:id" element={<HostScreen />} />
          <Route path="/s/:id/me" element={<ParticipantScreen />} />
          <Route path="/join/:id" element={<JoinScreen />} />
          <Route path="/j/:id" element={<JRedirect />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
