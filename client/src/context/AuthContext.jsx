import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  EVENTO_SESSAO_EXPIRADA,
  buscarUsuarioLogado,
  entrar,
  lerToken,
  limparToken,
  salvarToken,
} from '../api/auth';

const AuthContext = createContext({
  usuario: null,
  carregando: false,
  entrar: async () => {},
  sair: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(() => Boolean(lerToken()));

  useEffect(() => {
    if (!lerToken()) return undefined;
    let ativo = true;
    buscarUsuarioLogado()
      .then((dados) => {
        if (ativo) setUsuario(dados.usuario);
      })
      .catch(() => limparToken())
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    const aoExpirar = () => setUsuario(null);
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  }, []);

  const fazerLogin = useCallback(async (email, senha) => {
    const dados = await entrar(email, senha);
    salvarToken(dados.token);
    setUsuario(dados.usuario);
    return dados.usuario;
  }, []);

  const sair = useCallback(() => {
    limparToken();
    setUsuario(null);
  }, []);

  const valor = useMemo(
    () => ({ usuario, carregando, entrar: fazerLogin, sair }),
    [usuario, carregando, fazerLogin, sair]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}