// App.js corrigido
import React, { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import ptLocale from '@fullcalendar/core/locales/pt';
import './App.css';
import { fetchBlocos, atualizarBloco, limparAlocacoes } from './api';
import * as signalR from '@microsoft/signalr';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import LoginRegister from './LoginRegister';
import GestaoUtilizadores from './GestaoUtilizadores';

function App() {
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  });

  const [eventos, setEventos] = useState([]);
  const [availableBlocks, setAvailableBlocks] = useState([]);
  const [sendingBlocks, setSendingBlocks] = useState(new Set());
  const draggableElRef = useRef(null);
  const [mostrandoGestao, setMostrandoGestao] = useState(false);
  const [conflitoAtivo, setConflitoAtivo] = useState(false);
  const [vistaAtual, setVistaAtual] = useState("todas"); // "todas" | "sala" | "docente" | "turma"
  const [valorSelecionado, setValorSelecionado] = useState(""); // nome da sala, docente ou ID da turma

  const [salasDisponiveis, setSalasDisponiveis] = useState([]);
  const [docentesDisponiveis, setDocentesDisponiveis] = useState([]);
  const [turmasDisponiveis, setTurmasDisponiveis] = useState([]);

  useEffect(() => {
    if (!user) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl("https://localhost:7089/horarioHub")
      .withAutomaticReconnect()
      .build();

    connection.start()
      .then(() => console.log("✅ Conectado ao SignalR"))
      .catch(err => console.error("❌ Erro ao conectar SignalR:", err));

    connection.on("BlocoAdicionado", bloco => {
      setEventos(prev => {
        if (prev.some(e => e.id === bloco.id.toString())) return prev;
        return [...prev, {
          id: bloco.id.toString(),
          title: `${bloco.unidadeCurricular} (${bloco.tipoAula})`,
          start: new Date(bloco.start),
          end: new Date(bloco.end),
          ...bloco
        }];
      });
    });

    connection.on("BlocoRemovido", bloco => {
      setEventos(prev => prev.filter(e => e.id !== bloco.id.toString()));
      if (!bloco.start && !bloco.end) {
        setAvailableBlocks(prev => [...prev, { ...bloco, id: bloco.id.toString() }]);
      }
    });

    connection.on("BlocoAtualizado", bloco => {
      setEventos(prev => prev.map(e => e.id === bloco.id.toString() ? { ...e, ...bloco } : e));
      setAvailableBlocks(prev => prev.filter(b => b.id !== bloco.id.toString()));
    });

    return () => connection.stop();
  }, [user]);

  useEffect(() => {
    if (user?.podeGerirBlocos && draggableElRef.current && availableBlocks.length > 0) {
      new Draggable(draggableElRef.current, {
        itemSelector: '.block',
        eventData: el => {
          const id = el.getAttribute('data-id');
          const title = el.getAttribute('data-title');
          const duration = el.getAttribute('data-duration');
          return { id, title, duration };
        }
      });
    }
  }, [user, availableBlocks]);

  useEffect(() => {
    const carregarBlocos = async () => {
      const blocos = await fetchBlocos();
      const eventosFormatados = blocos.map(b => {
        const startDate = new Date("2024-05-27T08:00:00");
        const endDate = new Date(startDate.getTime() + b.numeroSlots * 30 * 60 * 1000);
        return {
          id: b.id.toString(),
          title: `${b.unidadeCurricular} (${b.tipoAula})`,
          start: startDate,
          end: endDate,
          ...b
        };
      });
      setEventos(eventosFormatados);
      setAvailableBlocks(eventosFormatados);
      // Extrair listas únicas para os filtros de vistas
        const salas = [...new Set(blocos.map(b => b.sala).filter(Boolean))];
        const docentes = [...new Set(blocos.map(b => b.docente).filter(Boolean))];
        const turmas = [...new Set(blocos.map(b => b.turmaId).filter(Boolean).map(id => id.toString()))];

          setSalasDisponiveis(salas);
          setDocentesDisponiveis(docentes);
          setTurmasDisponiveis(turmas);
    };
    carregarBlocos();
  }, []);

  if (!user) return <LoginRegister onLogin={setUser} />;

  if (mostrandoGestao) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Gestão de Utilizadores</h1>
        </header>
        <button onClick={() => setMostrandoGestao(false)} style={{ margin: '10px' }}>⬅ Voltar</button>
        <GestaoUtilizadores />
      </div>
    );
  }

  const exportarPDF = () => {
    const element = document.getElementsByClassName("fc-view-harness")[0];
    if (!element) return alert("Horário não encontrado.");

    html2canvas(element, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("landscape", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
      pdf.save("horario.pdf");
    });
  };

  const handleEventReceive = async (info) => {
    const blocoOriginal = availableBlocks.find(b => b.id === info.event.id);
    if (!user?.podeGerirBlocos) {
      alert("Não tens permissão para alocar blocos.");
      return info.revert();
    }
    if (conflitoAtivo) return info.revert();
    if (!blocoOriginal || sendingBlocks.has(blocoOriginal.id)) return info.revert();

    setSendingBlocks(prev => new Set(prev).add(blocoOriginal.id));

    const start = info.event.start;
    const durationMinutes = blocoOriginal.numeroSlots * 30;
    const end = new Date(start.getTime() + durationMinutes * 60000);

    const conflito = eventos.some(event => {
      const eStart = new Date(event.start).getTime();
      const eEnd = new Date(event.end).getTime();
      return start.getTime() < eEnd && end.getTime() > eStart;
    });

    if (conflito) {
      setConflitoAtivo(true);
      alert("Conflito de horário! Já existe um bloco nesse horário.");
      setTimeout(() => setConflitoAtivo(false), 200);
      setSendingBlocks(prev => {
        const copy = new Set(prev);
        copy.delete(blocoOriginal.id);
        return copy;
      });
      return info.revert();
    }

    const blocoParaCriar = {
      ...blocoOriginal,
      start: start.toISOString(),
      end: end.toISOString()
    };

    try {
      await atualizarBloco(blocoOriginal.id, blocoParaCriar);
      setAvailableBlocks(prev => prev.filter(b => b.id !== blocoOriginal.id));
    } catch (err) {
      console.error("❌ Erro ao criar bloco:", err);
      alert("Erro ao criar o bloco no servidor.");
      info.revert();
    } finally {
      setSendingBlocks(prev => { const copy = new Set(prev); copy.delete(blocoOriginal.id); return copy; });
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>O Meu Horário</h1>
      </header>
      <button onClick={() => { localStorage.removeItem("user"); setUser(null); }}
        style={{ margin: '10px', backgroundColor: '#c00', color: 'white', padding: '8px 16px', borderRadius: '6px' }}>
        Sair / Logout
      </button>

      <button onClick={async () => {
        if (window.confirm("Tens a certeza que queres limpar todas as alocações de blocos?")) {
          await limparAlocacoes();
          setEventos([]);
        }
      }}>Limpar Alocações</button>
      <button onClick={exportarPDF}>Exportar Horário em PDF</button>
      {user?.perfil === "Admin" && (
        <button onClick={() => setMostrandoGestao(true)}
          style={{ margin: '10px', backgroundColor: '#444', color: 'white', padding: '8px 16px', borderRadius: '6px' }}>
          Gerir Utilizadores
        </button>
      )}
      <div className="filtros-vista">
  <select value={vistaAtual} onChange={(e) => {
    setVistaAtual(e.target.value);
    setValorSelecionado("");
  }}>
    <option value="todas">Vista Geral</option>
    <option value="sala">Vista por Sala</option>
    <option value="docente">Vista por Docente</option>
    <option value="turma">Vista por Turma</option>
  </select>

  {vistaAtual === "sala" && (
    <select value={valorSelecionado} onChange={e => setValorSelecionado(e.target.value)}>
      <option value="">-- Escolhe uma sala --</option>
      {salasDisponiveis.map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )}

  {vistaAtual === "docente" && (
    <select value={valorSelecionado} onChange={e => setValorSelecionado(e.target.value)}>
      <option value="">-- Escolhe um docente --</option>
      {docentesDisponiveis.map(d => (
        <option key={d} value={d}>{d}</option>
      ))}
    </select>
  )}

  {vistaAtual === "turma" && (
    <select value={valorSelecionado} onChange={e => setValorSelecionado(e.target.value)}>
      <option value="">-- Escolhe uma turma --</option>
      {turmasDisponiveis.map(t => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  )}
</div>
      <div className="main-container">
        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            initialDate="2025-06-20"
            editable={user?.podeGerirBlocos === true}
            droppable={user?.podeGerirBlocos === true}
            locale={ptLocale}
            events={eventos.filter(e => {
  if (vistaAtual === "sala") return valorSelecionado === "" || e.sala === valorSelecionado;
  if (vistaAtual === "docente") return valorSelecionado === "" || e.docente === valorSelecionado;
  if (vistaAtual === "turma") return valorSelecionado === "" || e.turmaId?.toString() === valorSelecionado;
  return true;
})}
            eventReceive={handleEventReceive}
            slotMinTime="08:00:00"
            slotMaxTime="24:00:00"
            slotDuration="00:30:00"
            slotLabelInterval="00:30:00"
            allDaySlot={false}
            hiddenDays={[0]}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay' }}
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            slotLabelContent={({ date }) => {
              const start = new Date(date);
              const end = new Date(start.getTime() + 30 * 60000);
              const fmt = d => d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.');
              return `${fmt(start)} - ${fmt(end)}`;
            }}
            eventClassNames={({ event }) => [`fc-${event.extendedProps.tipoAula?.toLowerCase()}`]}
            eventContent={({ event }) => {
              const { unidadeCurricular, tipoAula, docente, sala } = event.extendedProps;
              const durMin = (new Date(event.end) - new Date(event.start)) / 60000;
              const durStr = `${Math.floor(durMin / 60)}h${durMin % 60 > 0 ? ' ' + (durMin % 60) + 'min' : ''}`;
              return {
                html: `
                  <div style="font-size:0.85em;text-align:center;">
                    <strong>${unidadeCurricular} (${tipoAula})</strong><br/>
                    ${docente}<br/>
                    ${sala}<br/>
                    <span style="font-size:0.75em;">${durStr}</span>
                  </div>
                `
              };
            }}
          />
        </div>

        {user?.podeGerirBlocos && (
          <div className="blocks-container" ref={draggableElRef}>
            <h2>Blocos Disponíveis</h2>
            {availableBlocks.map(block => (
              <div
                key={block.id}
                className={`block ${block.tipoAula.toLowerCase()}`}
                data-id={block.id}
                data-title={block.unidadeCurricular}
                data-duration={`0${Math.floor(block.numeroSlots * 30 / 60)}:${(block.numeroSlots * 30 % 60).toString().padStart(2, '0')}`}
                style={{ color: 'white', padding: '8px', marginBottom: '8px', borderRadius: '6px', fontSize: '0.9em', cursor: 'grab', height: '60px' }}>
                <strong>{block.unidadeCurricular} ({block.tipoAula})</strong><br />
                {block.docente}<br />
                {block.sala}<br />
                <span style={{ fontSize: '0.75em' }}>{Math.floor(block.numeroSlots * 30 / 60)}h {(block.numeroSlots * 30 % 60)}min</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;