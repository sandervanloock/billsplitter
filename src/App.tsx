import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { CreateScreen } from './screens/Create';
import { HostScreen } from './screens/host/HostScreen';
import { JoinScreen } from './screens/Join';
import { ParticipantScreen } from './screens/Participant';

function JRedirect() {
  // In production /j/* is served by the Cloud Function (OG tags for WhatsApp);
  // if the SPA ever receives it, fall through to the join route.
  const { id } = useParams();
  return <Navigate to={`/join/${id}`} replace />;
}

export default function App() {
  return (
    <ToastProvider>
      <div className="app-col">
        <Routes>
          <Route path="/" element={<CreateScreen />} />
          <Route path="/s/:id" element={<HostScreen />} />
          <Route path="/s/:id/me" element={<ParticipantScreen />} />
          <Route path="/join/:id" element={<JoinScreen />} />
          <Route path="/j/:id" element={<JRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </ToastProvider>
  );
}
