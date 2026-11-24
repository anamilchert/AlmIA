import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

export default function Login() {
  const { usuario, entrar } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [esqueceu, setEsqueceu] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const destino = location.state?.de || '/dashboard';

  if (usuario) return <Navigate to={destino} replace />;

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
      navigate(destino, { replace: true });
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={enviar}>
        <div className="login-logo">
          <div className="login-logo-mark">A</div>
          <div>
            <div className="login-logo-name">Almia</div>
            <div className="login-logo-tag">CRM Inteligente</div>
          </div>
        </div>

        <h1 className="login-titulo">Entrar</h1>

        <div className="login-campo">
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            type="email"
            value={email}
            autoComplete="username"
            required
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="login-campo">
          <label htmlFor="login-senha">Senha</label>
          <div className="login-senha">
            <input
              id="login-senha"
              type={mostrarSenha ? 'text' : 'password'}
              value={senha}
              autoComplete="current-password"
              required
              onChange={(e) => setSenha(e.target.value)}
            />
            <button
              type="button"
              className="login-olho"
              onClick={() => setMostrarSenha((v) => !v)}
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {erro && <div className="login-erro" role="alert">{erro}</div>}

        <button className="login-botao" type="submit" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>

        <button type="button" className="login-link" onClick={() => setEsqueceu((v) => !v)}>
          Esqueci minha senha
        </button>
        {esqueceu && (
          <div className="login-aviso">
            Peça a redefinição ao gestor da sua clínica ou ao suporte da Almia.
          </div>
        )}
      </form>
    </div>
  );
}