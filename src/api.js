import axios from 'axios';

const API_BASE = 'https://localhost:44363/api'; // Altera se necessário

// Buscar blocos existentes da base de dados
export const fetchBlocos = async () => {
  try {
    const res = await axios.get(`${API_BASE}/blocos`);
    const blocos = res.data;
    console.log("Resposta bruta do back-end:", blocos);

    // Transforma blocos para eventos que o FullCalendar entende
    return blocos.map(b => {
      const startDate = new Date("2024-05-27T08:00:00"); // Data inicial modelo
      const endDate = new Date(startDate.getTime() + b.numeroSlots * 30 * 60 * 1000);

      return {
        id: b.id.toString(),
        title: "",
        start: startDate,
        end: endDate,
        unidadeCurricular: b.unidadeCurricular,
        tipoAula: b.tipoAula,
        docente: b.docente,
        sala: b.sala,
        numeroSlots: b.numeroSlots,
        repetirSemanas: b.repetirSemanas,
        unidadeCurricularId: b.unidadeCurricularId,
        turmaId: b.turmaId,
        docenteId: b.docenteId,
        salaId: b.salaId,
        horarioId: b.horarioId,
        utilizadorId: b.utilizadorId
      };
    });
  } catch (error) {
    console.error("Erro ao buscar blocos:", error);
    return [];
  }
};

// Criar novo bloco (quando ainda não existe na base de dados)
export const criarBloco = async (bloco) => {
  try {
    const res = await axios.post(`${API_BASE}/blocos`, bloco);
    return res.data;
  } catch (error) {
    console.error("❌ Erro ao criar bloco:", error);
    throw error;
  }
};

// Atualizar um bloco existente (alocação no calendário)
export const atualizarBloco = async (id, bloco) => {
  try {
    console.log("📦 PUT atualizar bloco:", bloco);

    const res = await axios.put(`${API_BASE}/blocos/${id}`, bloco);

    return res.data;
  } catch (error) {
    console.error("❌ Erro ao atualizar bloco:", error);
    throw error;
  }
};

export const limparAlocacoes = async () => {
  await axios.post('https://localhost:44363/api/blocos/limpar-alocacoes');
};
