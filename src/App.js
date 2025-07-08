import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginRegister    from './LoginRegister';
import BackOfficeEscolas from './BackOfficeEscolas';
import BackOfficeCursos  from './BackOfficeCursos';
import MainView         from './MainView';

export default function App() {
  const [user, setUser] = React.useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  if (!user) {
    return <LoginRegister onLogin={setUser} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                   element={<MainView user={user} setUser={setUser} />} />
        <Route path="/backoffice/escolas" element={<BackOfficeEscolas />} />
        <Route path="/backoffice/cursos"  element={<BackOfficeCursos  />} />
        <Route path="*"                   element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
