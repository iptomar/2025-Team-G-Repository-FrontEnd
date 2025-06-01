import axios from 'axios';

const API_BASE = 'https://localhost:7089/api'; // Altera se necessário

// Buscar blocos e transformá-los em eventos para o FullCalendar
export const fetchBlocos = async () => {
  try {
    const res = await axios.get(`${API_BASE}/blocos`);
    const blocos = res.data;
    console.log("Resposta bruta do back-end:", blocos);

    return blocos;
  } catch (error) {
    console.error("Erro ao buscar blocos:", error);
    return [];
  }
};

// Criar novo bloco
export const criarBloco = async (bloco) => {
    const res = await axios.post(`${API_BASE}/blocos`, bloco);
    return res.data;
};
