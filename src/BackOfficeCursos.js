// src/BackOfficeCursos.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function BackOfficeCursos() {
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [escolaId, setEscolaId] = useState('');
  const [escolas, setEscolas] = useState([]);
  const [cursos, setCursos] = useState([]);

  // Leitura do token do localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = user.token;

  // Instâncias axios com baseURL absoluto para evitar problemas de CORS
  const apiEscolas = axios.create({
    baseURL: 'https://localhost:44363/api/escolas',
    headers: { Authorization: `Bearer ${token}` }
  });
  const apiCursos = axios.create({
    baseURL: 'https://localhost:44363/api/cursos',
    headers: { Authorization: `Bearer ${token}` }
  });

  // Carrega escolas e cursos no arranque
  useEffect(() => {
    apiEscolas.get('')
      .then(res => setEscolas(res.data))
      .catch(err => console.error('Erro ao carregar escolas:', err));

    apiCursos.get('')
      .then(res => setCursos(res.data))
      .catch(err => console.error('Erro ao carregar cursos:', err));
  }, []);

  // Quando criar um novo curso
  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await apiCursos.post('', {
        codigoCurso: codigo,
        nome,
        escolaId: Number(escolaId)
      });
      setCodigo('');
      setNome('');
      setEscolaId('');
      const res = await apiCursos.get('');
      setCursos(res.data);
    } catch (err) {
      console.error('Erro ao criar curso:', err);
      alert('Falha ao criar curso.');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>BackOffice – Gestão de Cursos</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Código do Curso"
          value={codigo}
          required
          onChange={e => setCodigo(e.target.value)}
          style={{ padding: '8px', width: '150px', marginRight: '8px' }}
        />
        <input
          type="text"
          placeholder="Nome do Curso"
          value={nome}
          required
          onChange={e => setNome(e.target.value)}
          style={{ padding: '8px', width: '250px', marginRight: '8px' }}
        />
        <select
          value={escolaId}
          required
          onChange={e => setEscolaId(e.target.value)}
          style={{ padding: '8px', marginRight: '8px' }}
        >
          <option value="">– Escolhe Escola –</option>
          {escolas.map(e => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </select>
        <button type="submit" style={{ padding: '8px 16px' }}>
          Adicionar Curso
        </button>
      </form>
      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Código</th>
            <th>Nome</th>
            <th>Escola ID</th>
          </tr>
        </thead>
        <tbody>
          {cursos.map(c => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.codigoCurso}</td>
              <td>{c.nome}</td>
              <td>{c.escolaId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
