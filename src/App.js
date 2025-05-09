// App.js
import React, { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import ptLocale from '@fullcalendar/core/locales/pt';
import './App.css';

const TURMAS = ['Turma A', 'Turma B', 'Turma C'];
const SALAS = ['Sala A', 'Sala B', 'Sala C'];
const DOCENTES = ['Docente A', 'Docente B', 'Docente C'];

function App() {
  const [turma, setTurma] = useState(TURMAS[0]);
  const [sala, setSala] = useState(SALAS[0]);
  const [docente, setDocente] = useState(DOCENTES[0]);
  const [activeContext, setActiveContext] = useState('turma');

  const [eventosTurmas, setEventosTurmas] = useState({});
  const [eventosSalas, setEventosSalas] = useState({});
  const [eventosDocentes, setEventosDocentes] = useState({});

  const [availableBlocks, setAvailableBlocks] = useState([
    { id: 'a1', title: 'Bloco Livre 1', duration: '30 min' },
    { id: 'a2', title: 'Bloco Livre 2', duration: '1 hora' }
  ]);

  const draggableElRef = useRef(null);

  useEffect(() => {
    if (draggableElRef.current) {
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
  }, []);

  const parseDuration = (duration) => {
    const [h, m] = duration.split(':').map(Number);
    return (h * 60 + m) * 60000;
  };

  const formatTimeRange = (date) => {
    const start = new Date(date);
    const end = new Date(start.getTime() + 30 * 60000);
    const format = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${format(start)} - ${format(end)}`;
  };

  const currentEvents = {
    turma: eventosTurmas[turma] || [],
    sala: eventosSalas[sala] || [],
    docente: eventosDocentes[docente] || []
  }[activeContext];

  const updateEvents = (newEvents) => {
    if (activeContext === 'turma') {
      setEventosTurmas(prev => ({ ...prev, [turma]: newEvents }));
    } else if (activeContext === 'sala') {
      setEventosSalas(prev => ({ ...prev, [sala]: newEvents }));
    } else {
      setEventosDocentes(prev => ({ ...prev, [docente]: newEvents }));
    }
  };

  const handleDateClick = (arg) => {
    const isConflict = currentEvents.some(event => {
      const eventStart = new Date(event.start).getTime();
      const eventEnd = new Date(event.end).getTime();
      const clicked = new Date(arg.date).getTime();
      return clicked >= eventStart && clicked < eventEnd;
    });

    if (isConflict) {
      alert('Conflito de horário!');
      return;
    }

    const title = prompt('Título do evento:');
    if (title) {
      const newEvent = {
        id: Date.now().toString(),
        title,
        start: arg.date,
        end: new Date(new Date(arg.date).getTime() + 30 * 60000)
      };
      updateEvents([...currentEvents, newEvent]);
    }
  };

  const handleEventDrop = (info) => {
    const updatedEvent = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.start,
      end: info.event.end
    };
    updateEvents(currentEvents.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const handleRemoveEvent = (id) => {
    if (window.confirm('Eliminar evento?')) {
      updateEvents(currentEvents.filter(e => e.id !== id));
    }
  };

  const handleEditEvent = (id) => {
    const newTitle = prompt('Novo título:');
    if (newTitle) {
      updateEvents(currentEvents.map(e => e.id === id ? { ...e, title: newTitle } : e));
    }
  };

  const handleEventReceive = (info) => {
    const blockId = info.draggedEl.getAttribute('data-id');
    const duration = info.draggedEl.getAttribute('data-duration');
    const end = new Date(info.event.start.getTime() + parseDuration(duration));
    info.event.setEnd(end);

    setAvailableBlocks(prev => prev.filter(block => block.id !== blockId));

    const newEvent = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.start,
      end: end
    };

    updateEvents([...currentEvents, newEvent]);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>O Meu Horário</h1>
      </header>

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
            events={currentEvents}
            dateClick={handleDateClick}
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
            eventBackgroundColor="#4CAF50"
            eventBorderColor="#388E3C"
            eventContent={(eventInfo) => (
              <div className="custom-event">
                <span className="event-title">{eventInfo.event.title}</span>
                <button className="remove-event-btn" onClick={() => handleRemoveEvent(eventInfo.event.id)}>✖</button>
                <button className="edit-event-btn" onClick={() => handleEditEvent(eventInfo.event.id)}>📝</button>
              </div>
            )}
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
