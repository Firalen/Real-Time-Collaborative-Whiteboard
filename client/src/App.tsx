import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import Board from './pages/Board';
import Login from './pages/Login';
import MyTasks from './pages/MyTasks';
import Invite from './pages/Invite';
import Gallery from './pages/Gallery';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';
import './index.css';
import './App.css';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/workspace/:id" element={<Workspace />} />
            <Route path="/board/:id" element={<Board />} />
            <Route path="/tasks" element={<MyTasks />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/invite/:token" element={<Invite />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
