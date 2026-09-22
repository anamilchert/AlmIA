import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import ClinicConfig from './pages/ClinicConfig/ClinicConfig';
import ListaPacientes from './pages/Pacientes/ListaPacientes';
import HistoricoPaciente from './pages/HistoricoPaciente/HistoricoPaciente';
import './styles/theme.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/clinica"
          element={
            <Layout ativo="clinica">
              <ClinicConfig />
            </Layout>
          }
        />
        <Route
          path="/pacientes"
          element={
            <Layout ativo="pacientes">
              <ListaPacientes />
            </Layout>
          }
        />
        <Route
          path="/pacientes/:id"
          element={
            <Layout ativo="pacientes">
              <HistoricoPaciente />
            </Layout>
          }
        />
        <Route
          path="/"
          element={
            <Layout ativo="clinica">
              <ClinicConfig />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;