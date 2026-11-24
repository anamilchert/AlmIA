import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HandoffsProvider } from '../context/HandoffsContext';

export function AreaProtegida() {
  const { usuario, carregando } = useAuth();
  const location = useLocation();

  if (carregando) return <div className="area-carregando">Carregando...</div>;
  if (!usuario) return <Navigate to="/login" state={{ de: location.pathname }} replace />;

  return (
    <HandoffsProvider>
      <Outlet />
    </HandoffsProvider>
  );
}

export function ExigePapel({ papeis }) {
  const { usuario } = useAuth();

  if (!usuario || !papeis.includes(usuario.papel)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}