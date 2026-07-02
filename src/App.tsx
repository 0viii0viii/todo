import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { AuthForm } from './components/AuthForm';
import { TodoApp } from './components/TodoApp';
import { LoadingScreen } from './components/LoadingScreen';
import './App.css';

export default function App() {
  const { user, loading, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  if (loading) return <LoadingScreen />;

  return user ? (
    <TodoApp user={user} onLogout={logout} theme={theme} setTheme={setTheme} />
  ) : (
    <AuthForm />
  );
}
