import { useNavigate } from 'react-router-dom';
import { BellRing, Volume2, VolumeX } from 'lucide-react';
import { useHandoffs } from '../../context/HandoffsContext';
import './HandoffsAguardando.css';

const MOTIVOS = {
  sintomas_fisicos: 'Sintomas físicos',
  emergencia: 'Possível emergência',
  pedido_humano: 'Pediu atendimento humano',
  reclamacao: 'Reclamação',
  duvida_clinica: 'Dúvida clínica',
  falha_ia: 'IA indisponível',
  outro: 'Precisa de atenção'
};

function haQuanto(data) {
  const min = Math.max(0, Math.round((Date.now() - new Date(data)) / 60000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  return `há ${Math.floor(min / 60)} h`;
}

export default function HandoffsAguardando() {
  const { total, itens, somAtivo, alternarSom } = useHandoffs();
  const navigate = useNavigate();

  return (
    <div className={`hfa ${total > 0 ? 'hfa-alerta' : ''}`}>
      <div className="hfa-head">
        <div className="hfa-titulo">
          <BellRing size={18} />
          <span>Handoffs aguardando agora</span>
          <span className="hfa-contador">{total}</span>
        </div>
        <button className="hfa-som" onClick={alternarSom}>
          {somAtivo ? <Volume2 size={16} /> : <VolumeX size={16} />}
          {somAtivo ? 'Som ativado' : 'Ativar som'}
        </button>
      </div>

      {total === 0 ? (
        <div className="hfa-vazio">Nenhuma conversa aguardando atendente.</div>
      ) : (
        <div className="hfa-lista">
          {itens.map((h) => (
            <button key={h._id} className="hfa-item" onClick={() => navigate(`/conversas/${h._id}`)}>
              <span className={`hfa-urg urg-${h.urgencia}`} />
              <span className="hfa-nome">{h.nome}</span>
              <span className="hfa-motivo">{MOTIVOS[h.motivo] || MOTIVOS.outro}</span>
              <span className="hfa-tempo">{haQuanto(h.desde)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}