import React, { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import ptLocale from '@fullcalendar/core/locales/pt';
import './App.css';
import { fetchBlocos, criarBloco, atualizarBloco, limparAlocacoes  } from './api';
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
        if (prev.some(e => e.id === bloco.id.toString())) {
          console.log(`⚠️ Ignorando duplicado id=${bloco.id}`);
          return prev;
        }
        const startDate = new Date(bloco.start);
        const endDate = new Date(bloco.end);
        return [...prev, {
          id: bloco.id.toString(),
          title: `${bloco.unidadeCurricular} (${bloco.tipoAula})`,
          start: startDate,
          end: endDate,
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

      const startDate = new Date("2024-05-27T08:00:00"); // início modelo
      const endDate = new Date(startDate.getTime() + bloco.numeroSlots * 30 * 60 * 1000);

      const blocoConvertido = {
        id: bloco.id.toString(),
        title: "",
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

      // Adiciona de volta à lista de blocos disponíveis
      setAvailableBlocks(prev => [...prev, blocoConvertido]);
    });

    connection.on("BlocoAtualizado", bloco => {
      const startDate = new Date(bloco.start);
      const endDate = new Date(bloco.end);
      setEventos(prev =>
        prev.map(e =>
          e.id === bloco.id.toString()
            ? {
              ...e,
              start: startDate,
              end: endDate,
              unidadeCurricular: bloco.unidadeCurricular,
              tipoAula: bloco.tipoAula,
              docente: bloco.docente,
              sala: bloco.sala,
              numeroSlots: bloco.numeroSlots
            }
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
        eventData: (el) => {
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
      setEventos(eventosFormatados);
      setAvailableBlocks(eventosFormatados);
    };
    carregarBlocos();
  }, []);

  const handleEventReceive = async (info) => {
    const blocoOriginal = availableBlocks.find(b => b.id === info.event.id);
    if (!blocoOriginal) {
      console.log(`❌ Bloco original não encontrado para evento id=${info.event.id}`);
      return info.revert();
    }

    if (sendingBlocks.has(blocoOriginal.id)) {
      console.log(`⏳ Envio do bloco ${blocoOriginal.id} já em curso. Ignorando novo envio.`);
      return info.revert();
    }

    setSendingBlocks(prev => new Set(prev).add(blocoOriginal.id));

    const start = info.event.start;
    const durationMinutes = blocoOriginal.numeroSlots * 30;
    const end = new Date(start.getTime() + durationMinutes * 60000);

    if (!(start instanceof Date) || isNaN(start)) {
      console.log(`❌ Data start inválida:`, start);
      setSendingBlocks(prev => {
        const copy = new Set(prev);
        copy.delete(blocoOriginal.id);
        return copy;
      });
      return info.revert();
    }
    if (!(end instanceof Date) || isNaN(end)) {
      console.log(`❌ Data end inválida:`, end);
      setSendingBlocks(prev => {
        const copy = new Set(prev);
        copy.delete(blocoOriginal.id);
        return copy;
      });
      return info.revert();
    }

    const conflito = eventos.some(event => {
      const eStart = new Date(event.start).getTime();
      const eEnd = new Date(event.end).getTime();
      const nStart = start.getTime();
      const nEnd = end.getTime();
      return nStart < eEnd && nEnd > eStart;
    });

    if (conflito) {
      alert("Conflito de horário! Já existe um bloco nesse horário.");
      setSendingBlocks(prev => {
        const copy = new Set(prev);
        copy.delete(blocoOriginal.id);
        return copy;
      });
      return info.revert();
    }

    const blocoParaCriar = {
      tipoAula: blocoOriginal.tipoAula,
      numeroSlots: blocoOriginal.numeroSlots,
      unidadeCurricularId: blocoOriginal.unidadeCurricularId,
      turmaId: blocoOriginal.turmaId,
      docenteId: blocoOriginal.docenteId,
      salaId: blocoOriginal.salaId,
      horarioId: blocoOriginal.horarioId,
      utilizadorId: blocoOriginal.utilizadorId,
      repetirSemanas: blocoOriginal.repetirSemanas,
      start: start.toISOString(),
      end: end.toISOString()
    };

    try {
      console.log("📤 Enviando para POST:", blocoParaCriar);
      await atualizarBloco(blocoOriginal.id, blocoParaCriar);

      // Remove bloco da lista de disponíveis
      setAvailableBlocks(prev => prev.filter(b => b.id !== blocoOriginal.id));
    } catch (err) {
      console.error("❌ Erro ao criar bloco:", err);

      if (err.response?.status === 409) {
        alert("⚠️ Este bloco já foi criado por outro utilizador. Atualize a página ou verifique o calendário.");
      } else {
        alert("❌ Erro inesperado ao criar o bloco no servidor.");
      }

      info.revert(); // deve estar dentro do catch
    } finally {
      setSendingBlocks(prev => {
        const copy = new Set(prev);
        copy.delete(blocoOriginal.id);
        return copy;
      });
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
            setEventos([]); // <- limpa o calendário
          }
        }}
      >
        Limpar Alocações
      </button>
      <div className="main-container">
        <div className="calendar-container" style={{ position: 'relative' }}>
          <div className="fc-toolbar-selects">
            <select value={turma} onChange={e => { setTurma(e.target.value); setActiveContext('turma'); }}>
              {TURMAS.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={sala} onChange={e => { setSala(e.target.value); setActiveContext('sala'); }}>
              {SALAS.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={docente} onChange={e => { setDocente(e.target.value); setActiveContext('docente'); }}>
              {DOCENTES.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            initialDate="2025-06-20"
            editable={true}
            droppable={true}
            eventDrop={handleEventDrop}
            eventReceive={handleEventReceive}
            locale={ptLocale}
            slotMinTime="08:00:00"
            slotMaxTime="24:00:00"
            slotDuration="00:30:00"
            slotLabelInterval="00:30:00"
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            slotLabelContent={(arg) => formatTimeRange(arg.date)}
            allDaySlot={false}
            hiddenDays={[0]}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay' }}
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            slotLabelContent={(arg) => {
              const start = new Date(arg.date);
              const end = new Date(start.getTime() + 30 * 60000);
              const fmt = (d) => d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.');
              return `${fmt(start)} - ${fmt(end)}`;
            }}
            eventClassNames={(arg) => {
              const tipo = arg.event.extendedProps.tipoAula?.toLowerCase();
              return tipo ? [`fc-${tipo}`] : [];
            }}
            eventContent={(eventInfo) => {
              const { unidadeCurricular, tipoAula, docente, sala } = eventInfo.event.extendedProps;
              const start = new Date(eventInfo.event.start);
              const end = new Date(eventInfo.event.end);
              const durMin = (end - start) / 60000;
              const horas = Math.floor(durMin / 60);
              const minutos = durMin % 60;
              const durStr = `${horas}h${minutos > 0 ? ' ' + minutos + 'min' : ''}`;
              return {
                html: `
                  <div style="line-height: 1.2em; font-size: 0.85em; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                    <strong>${unidadeCurricular} (${tipoAula})</strong><br/>
                    ${docente}<br/>
                    ${sala}<br/>
                    <span style="font-size: 0.75em;">${durStr}</span>
                  </div>
                `
              };
            }}
          />
        </div>

        <div className="blocks-container" ref={draggableElRef}>
          <h2>Blocos Disponíveis</h2>
          {availableBlocks.map(block => (
            <div
              key={block.id}
              className="block"
              data-id={block.id}
              data-title={block.title}
              data-duration={block.duration === '30 min' ? '00:30' : '01:00'}
            >
              {block.title} ({block.duration})
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
