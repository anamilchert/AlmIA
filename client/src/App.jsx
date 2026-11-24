import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Components/Layout/Layout';
import { AreaProtegida, ExigePapel } from './Components/RotasProtegidas';
import ClinicConfig from './pages/ClinicConfig/ClinicConfig';
import ListaPacientes from './pages/Pacientes/ListaPacientes';
import HistoricoPaciente from './pages/HistoricoPaciente/HistoricoPaciente';
import ListaConversas from './pages/Conversas/ListaConversas';
import ChatConversa from './pages/Conversas/ChatConversa';
import Dashboard from './pages/Dashboard/Dashboard';
import Agendamentos from './pages/Agendamentos/Agendamentos';
import Login from './pages/Login/Login';
import { AuthProvider } from './context/AuthContext';
import './styles/theme.css';

function Pagina({ ativo, children }) {
  return <Layout ativo={ativo}>{children}</Layout>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AreaProtegida />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Pagina ativo="dashboard"><Dashboard /></Pagina>} />
            <Route path="/conversas" element={<Pagina ativo="conversas"><ListaConversas /></Pagina>} />
            <Route path="/conversas/:id" element={<Pagina ativo="conversas"><ChatConversa /></Pagina>} />
            <Route path="/agendamentos" element={<Pagina ativo="agendamentos"><Agendamentos /></Pagina>} />
            <Route path="/pacientes" element={<Pagina ativo="pacientes"><ListaPacientes /></Pagina>} />
            <Route path="/pacientes/:id" element={<Pagina ativo="pacientes"><HistoricoPaciente /></Pagina>} />
            <Route element={<ExigePapel papeis={['gestor']} />}>
              <Route path="/clinica" element={<Pagina ativo="clinica"><ClinicConfig /></Pagina>} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;