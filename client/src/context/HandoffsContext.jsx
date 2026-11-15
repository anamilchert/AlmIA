import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { listarHandoffs } from '../api/conversaApi';

const HandoffsContext = createContext({ total: 0, itens: [], somAtivo: false, alternarSom: () => {} });
export const useHandoffs = () => useContext(HandoffsContext);

function lerSom() {
  try { return localStorage.getItem('almia:som') === '1'; } catch { return false; }
}
function salvarSom(v) {
  try { localStorage.setItem('almia:som', v ? '1' : '0'); } catch { /* ignora */ }
}

export function HandoffsProvider({ children }) {
  const [dados, setDados] = useState({ total: 0, itens: [] });
  const [somAtivo, setSomAtivo] = useState(lerSom);
  const somRef = useRef(somAtivo);
  const audioRef = useRef(null);
  const vistos = useRef(null);
  somRef.current = somAtivo;

  const prepararAudio = useCallback(async () => {
    try {
      if (!audioRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) audioRef.current = new Ctx();
      }
      await audioRef.current?.resume();
    } catch { /* ignora */ }
  }, []);

  const tocar = useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx || ctx.state !== 'running') return;
    [0, 0.28].forEach((atraso, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + atraso;
      osc.type = 'sine';
      osc.frequency.value = i === 0 ? 880 : 1175;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }, []);

  const alternarSom = useCallback(async () => {
    const novo = !somRef.current;
    setSomAtivo(novo);
    salvarSom(novo);
    if (novo) {
      await prepararAudio();
      tocar();
    }
  }, [prepararAudio, tocar]);


  useEffect(() => {
    const liberar = () => { if (somRef.current) prepararAudio(); };
    window.addEventListener('pointerdown', liberar, { once: true });
    return () => window.removeEventListener('pointerdown', liberar);
  }, [prepararAudio]);

  useEffect(() => {
    let ativo = true;
    async function buscar() {
      try {
        const res = await listarHandoffs();
        if (!ativo) return;
        const ids = new Set(res.itens.map((i) => i._id));
        const temNovo = vistos.current && res.itens.some((i) => !vistos.current.has(i._id));
        if (temNovo && somRef.current) tocar();
        vistos.current = ids;
        setDados(res);
      } catch { /* mantém o último estado */ }
    }
    buscar();
    const timer = setInterval(buscar, 5000);
    return () => { ativo = false; clearInterval(timer); };
  }, [tocar]);

  useEffect(() => {
    document.title = dados.total > 0 ? `(${dados.total}) Almia` : 'Almia';
  }, [dados.total]);

  return (
    <HandoffsContext.Provider value={{ ...dados, somAtivo, alternarSom }}>
      {children}
    </HandoffsContext.Provider>
  );
}