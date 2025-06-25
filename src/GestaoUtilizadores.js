import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = 'https://localhost:7089/api';

export default function GestaoUtilizadores() {
  const [utilizadores, setUtilizadores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarUtilizadores();
  }, []);

  const carregarUtilizadores = async () => {
    try {
      const res = await axios.get(`${API_BASE}/utilizadores`);
      setUtilizadores(res.data);
    } catch (err) {
      console.error("Erro ao buscar utilizadores:", err);
      alert("Erro ao buscar utilizadores.");
    } finally {
      setLoading(false);
    }
  };

  const atualizarPermissao = async (id, novoValor) => {
    try {
      await axios.put(`${API_BASE}/utilizadores/${id}/permissao`, {
        podeGerirBlocos: novoValor
      });
      setUtilizadores(prev =>
        prev.map(u => u.id === id ? { ...u, podeGerirBlocos: novoValor } : u)
      );
    } catch (err) {
      console.error("Erro ao atualizar permissão:", err);
      alert("Erro ao atualizar permissão.");
    }
  };

  if (loading) return <p>Carregando utilizadores...</p>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Gestão de Utilizadores</h2>
      <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Perfil</th>
            <th>Pode Gerir Blocos</th>
          </tr>
        </thead>
        <tbody>
          {utilizadores.map(u => (
            <tr key={u.id}>
              <td>{u.nome}</td>
              <td>{u.email}</td>
              <td>{u.perfil}</td>
              <td style={{ textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={u.podeGerirBlocos}
                  onChange={e => atualizarPermissao(u.id, e.target.checked)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
