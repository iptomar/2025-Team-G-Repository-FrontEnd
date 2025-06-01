// App.js (com remoção de blocos e validação de colisão)
import React, { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import ptLocale from '@fullcalendar/core/locales/pt';
import './App.css';
import { fetchBlocos } from './api';

function App() {
  const [eventos, setEventos] = useState([]);
  const [availableBlocks, setAvailableBlocks] = useState([]);
  const draggableElRef = useRef(null);

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
          title: "",
          start: startDate,
          end: endDate,
          unidadeCurricular: b.unidadeCurricular,
          tipoAula: b.tipoAula,
          docente: b.docente,
          sala: b.sala,
          numeroSlots: b.numeroSlots
        };
      });

      setEventos(eventosFormatados);
      setAvailableBlocks(eventosFormatados);
    };

    carregarBlocos();
  }, []);

  const handleEventReceive = (info) => {
    const start = info.event.start;
    const blocoOriginal = availableBlocks.find(b => b.id === info.event.id);
    if (!blocoOriginal) return;

    const durationMinutes = blocoOriginal.numeroSlots * 30;
    const end = new Date(start.getTime() + durationMinutes * 60000);

    if (!(start instanceof Date) || isNaN(start)) return info.revert();
    if (!(end instanceof Date) || isNaN(end)) return info.revert();

    const conflito = eventos.some(event => {
      const eStart = new Date(event.start).getTime();
      const eEnd = new Date(event.end).getTime();
      const nStart = start.getTime();
      const nEnd = end.getTime();
      return nStart < eEnd && nEnd > eStart;
    });

    if (conflito) {
      alert("Conflito de horário! Já existe um bloco nesse horário.");
      return info.revert();
    }

    const novoEvento = {
      id: blocoOriginal.id,
      title: "",
      start,
      end,
      unidadeCurricular: blocoOriginal.unidadeCurricular,
      tipoAula: blocoOriginal.tipoAula,
      docente: blocoOriginal.docente,
      sala: blocoOriginal.sala,
      numeroSlots: blocoOriginal.numeroSlots
    };

    setEventos(prev => [...prev, novoEvento]);
    setAvailableBlocks(prev => prev.filter(b => b.id !== blocoOriginal.id));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>O Meu Horário</h1>
      </header>

      <div className="main-container">
        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            editable={true}
            droppable={true}
            locale={ptLocale}
            events={eventos}
            eventReceive={handleEventReceive}
            eventResizableFromStart={false}
            eventDurationEditable={false}
            slotMinTime="08:00:00"
            slotMaxTime="24:00:00"
            slotDuration="00:30:00"
            slotLabelInterval="00:30:00"
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
            eventDragStop={(info) => {
              const dropArea = draggableElRef.current;
              const dropBounds = dropArea.getBoundingClientRect();
              const { clientX, clientY } = info.jsEvent;
              const isInside =
                clientX >= dropBounds.left &&
                clientX <= dropBounds.right &&
                clientY >= dropBounds.top &&
                clientY <= dropBounds.bottom;

              if (isInside) {
                setEventos(prev => prev.filter(e => e.id !== info.event.id));

                const bloco = {
                  id: info.event.id,
                  unidadeCurricular: info.event.extendedProps.unidadeCurricular,
                  tipoAula: info.event.extendedProps.tipoAula,
                  docente: info.event.extendedProps.docente,
                  sala: info.event.extendedProps.sala,
                  numeroSlots: info.event.extendedProps.numeroSlots
                };

                setAvailableBlocks(prev => [...prev, bloco]);
              }
            }}
            eventDrop={(info) => {
              const start = info.event.start;
              const end = info.event.end;
              if (!start || !end) return info.revert();

              const movedStart = start.getTime();
              const movedEnd = end.getTime();

              const conflito = eventos.some(event => {
                if (event.id === info.event.id) return false;
                const s = new Date(event.start).getTime();
                const e = new Date(event.end).getTime();
                return movedStart < e && movedEnd > s;
              });

              if (conflito) {
                alert("Conflito de horário! Já existe um bloco nesse horário.");
                return info.revert();
              }

              setEventos(prev => prev.map(e =>
                e.id === info.event.id ? { ...e, start, end } : e
              ));
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
              style={{
                color: 'white',
                padding: '8px',
                marginBottom: '8px',
                borderRadius: '6px',
                fontSize: '0.9em',
                cursor: 'grab',
                height: '60px'
              }}
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
