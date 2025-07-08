// src/BackOfficeEscolas.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function BackOfficeEscolas() {
  const [nome, setNome] = useState('');
  const [escolas, setEscolas] = useState([]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = user.token;

  // Aponta para o backend completo
  const api = axios.create({
    baseURL: 'https://localhost:44363/api/escolas',
    headers: { Authorization: `Bearer ${token}` }
  });

  useEffect(() => {
    api.get('')
       .then(res => setEscolas(res.data))
       .catch(err => console.error('Erro ao carregar escolas:', err));
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await api.post('', { nome });
      setNome('');
      const res = await api.get('');
      setEscolas(res.data);
    } catch (err) {
      console.error('Erro ao criar escola:', err);
      alert('Falha ao criar escola.');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>BackOffice – Gestão de Escolas</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Nome da Escola"
          value={nome}
          required
          onChange={e => setNome(e.target.value)}
          style={{ padding: '8px', width: '250px', marginRight: '8px' }}
        />
        <button type="submit" style={{ padding: '8px 16px' }}>
          Adicionar Escola
        </button>
      </form>
      <ul>
        {escolas.map(e => (
          <li key={e.id}>{e.nome} (ID: {e.id})</li>
        ))}
      </ul>
    </div>
  );
}
