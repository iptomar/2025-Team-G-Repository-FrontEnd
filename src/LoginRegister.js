import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = 'https://localhost:7089/api';

export default function LoginRegister({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const toggleForm = () => setIsRegistering(!isRegistering);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isRegistering ? 'registo' : 'login';

    const payload = isRegistering
      ? { nome, email, password }
      : { email, password };

    try {
      const response = await axios.post(`${API_BASE}/utilizadores/${endpoint}`, payload);

      if (isRegistering) {
        alert("Conta criada com sucesso! Agora faz login.");
        setIsRegistering(false); // Voltar ao modo login
        setPassword('');
        setNome('');
      } else if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        onLogin(response.data);
      } else {
        alert("Erro: resposta inválida.");
      }
    } catch (err) {
      alert("Erro ao autenticar: " + err.message);
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>{isRegistering ? "Criar Conta" : "Login"}</h2>
      <form onSubmit={handleSubmit}>
        {isRegistering && (
          <input
            type="text"
            placeholder="Nome"
            value={nome}
            required
            onChange={e => setNome(e.target.value)}
            style={{ margin: '5px', padding: '8px' }}
          />
        )}<br />
        <input
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={e => setEmail(e.target.value)}
          style={{ margin: '5px', padding: '8px' }}
        /><br />
        <input
          type="password"
          placeholder="Password"
          value={password}
          required
          onChange={e => setPassword(e.target.value)}
          style={{ margin: '5px', padding: '8px' }}
        /><br />
        <button type="submit" style={{ padding: '10px 20px' }}>
          {isRegistering ? "Registar" : "Entrar"}
        </button>
      </form>
      <button onClick={toggleForm} style={{ marginTop: '10px' }}>
        {isRegistering ? "Já tens conta? Faz login" : "Ainda não tens conta? Regista-te"}
      </button>
    </div>
  );
}
