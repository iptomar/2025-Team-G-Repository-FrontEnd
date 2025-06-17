// App.js (original solicitado) recriado conforme pedido
import React, { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import ptLocale from '@fullcalendar/core/locales/pt';
import './App.css';
import { fetchBlocos, atualizarBloco, limparAlocacoes } from './api';
import * as signalR from '@microsoft/signalr';

function App() {
  const [eventos, setEventos] = useState([]);
  const [availableBlocks, setAvailableBlocks] = useState([]);
  const [sendingBlocks, setSendingBlocks] = useState(new Set());
  const draggableElRef = useRef(null);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl("https://localhost:7089/horarioHub")
      .withAutomaticReconnect()
      .build();

    connection.start()
      .then(() => console.log("✅ Conectado ao SignalR"))
      .catch(err => console.error("❌ Erro na conexão SignalR:", err));

    connection.on("BlocoAdicionado", bloco => {
      setEventos(prev => {
        if (prev.some(e => e.id === bloco.id.toString())) return prev;
        return [...prev, {
          id: bloco.id.toString(),
          title: `${bloco.unidadeCurricular} (${bloco.tipoAula})`,
          start: new Date(bloco.start),
          end: new Date(bloco.end),
          unidadeCurricular: bloco.unidadeCurricular,
          tipoAula: bloco.tipoAula,
          docente: bloco.docente,
          sala: bloco.sala,
          numeroSlots: bloco.numeroSlots
        }];
      });
    });

    connection.on("BlocoRemovido", bloco => {
      setEventos(prev => prev.filter(e => e.id !== bloco.id.toString()));

      // ✅ Só adiciona à lista lateral se estiver desalocado (sem start/end)
      if (!bloco.start && !bloco.end) {
        const blocoConvertido = {
          id: bloco.id.toString(),
          title: `${bloco.unidadeCurricular} (${bloco.tipoAula})`,
          start: null,
          end: null,
          unidadeCurricular: bloco.unidadeCurricular,
          tipoAula: bloco.tipoAula,
          docente: bloco.docente,
          sala: bloco.sala,
          numeroSlots: bloco.numeroSlots,
          repetirSemanas: bloco.repetirSemanas,
          unidadeCurricularId: bloco.unidadeCurricularId,
          turmaId: bloco.turmaId,
          docenteId: bloco.docenteId,
          salaId: bloco.salaId,
          horarioId: bloco.horarioId,
          utilizadorId: bloco.utilizadorId
        };

        setAvailableBlocks(prev => [...prev, blocoConvertido]);
      }
    });

    connection.on("BlocoAtualizado", bloco => {
      const startDate = new Date(bloco.start);
      const endDate = new Date(bloco.end);
      setEventos(prev =>
        prev.map(e =>
          e.id === bloco.id.toString()
            ? { ...e, start: startDate, end: endDate, ...bloco }
            : e
        )
      );
      // 🔁 Remover da lista lateral se foi alocado
      setAvailableBlocks(prev => prev.filter(b => b.id !== bloco.id.toString()));
    });

    return () => connection.stop();
  }, []);

  useEffect(() => {
    if (draggableElRef.current && availableBlocks.length > 0) {
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
  }, [availableBlocks]);

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
    };
    carregarBlocos();
  }, []);

  const handleEventReceive = async (info) => {
    const blocoOriginal = availableBlocks.find(b => b.id === info.event.id);
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
      alert("Conflito de horário! Já existe um bloco nesse horário.");
      setSendingBlocks(prev => { const copy = new Set(prev); copy.delete(blocoOriginal.id); return copy; });
      return info.revert();
    }

    const blocoParaCriar = {
      ...blocoOriginal,
      start: start.toISOString(),
      end: end.toISOString()
    };

    try {
      console.log("📤 Enviando para POST:", blocoParaCriar);
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
      <button
        style={{ margin: '10px', padding: '8px 16px' }}
        onClick={async () => {
          if (window.confirm("Tens a certeza que queres limpar todas as alocações de blocos?")) {
            await limparAlocacoes();
            setEventos([]);
          }
        }}
      >
        Limpar Alocações
      </button>
      <div className="main-container">
        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            initialDate="2025-06-20"
            editable={true}
            droppable={true}
            locale={ptLocale}
            events={eventos}
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
                html: `<div style="font-size:0.85em;text-align:center;">
                  <strong>${unidadeCurricular} (${tipoAula})</strong><br/>
                  ${docente}<br/>
                  ${sala}<br/>
                  <span style="font-size:0.75em;">${durStr}</span>
                </div>`
              };
            }}
          />
        </div>

        <div className="blocks-container" ref={draggableElRef}>
          <h2>Blocos Disponíveis</h2>
          {availableBlocks.map(block => (
            <div
              key={block.id}
              className={`block ${block.tipoAula.toLowerCase()}`}
              data-id={block.id}
              data-title={block.unidadeCurricular}
              data-duration={`0${Math.floor(block.numeroSlots * 30 / 60)}:${(block.numeroSlots * 30 % 60).toString().padStart(2, '0')}`}
              style={{ color: 'white', padding: '8px', marginBottom: '8px', borderRadius: '6px', fontSize: '0.9em', cursor: 'grab', height: '60px' }}
            >
              <strong>{block.unidadeCurricular} ({block.tipoAula})</strong><br />
              {block.docente}<br />
              {block.sala}<br />
              <span style={{ fontSize: '0.75em' }}>{Math.floor(block.numeroSlots * 30 / 60)}h {(block.numeroSlots * 30 % 60)}min</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;