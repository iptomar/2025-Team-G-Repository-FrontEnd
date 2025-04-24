import React, { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import ptLocale from '@fullcalendar/core/locales/pt';
import './App.css';

function App() {
  const [events, setEvents] = useState([
    { id: '1', title: 'Int. à Prog. Web (PL)', start: '2025-03-26T08:00:00', end: '2025-03-26T09:30:00', description: 'João F. Silva\nB128' },
    { id: '2', title: 'Lab. Microsisst. (TP)', start: '2025-03-26T16:30:00', end: '2025-03-26T18:00:00', description: 'Manuel Barros\nB257' }
  ]);

  const [availableBlocks, setAvailableBlocks] = useState([
    { id: 'a1', title: 'Bloco Livre 1', duration: '30 min' },
    { id: 'a2', title: 'Bloco Livre 2', duration: '1 hora' }
  ]);

  const draggableElRef = useRef(null);

  useEffect(() => {
    if (draggableElRef.current) {
      new Draggable(draggableElRef.current, {
        itemSelector: '.block',
        eventData: (eventEl) => {
          const id = eventEl.getAttribute('data-id');
          const title = eventEl.getAttribute('data-title');
          const duration = eventEl.getAttribute('data-duration');
          return { id, title, duration };
        }
      });
    }
  }, []);

  const handleRemoveEvent = (eventId, eventTitle) => {
    const confirmDelete = window.confirm(`Tem a certeza de que deseja eliminar o evento '${eventTitle}'?`);
    if (confirmDelete) {
      setEvents(events.filter(event => event.id !== eventId));
    }
  };

  const handleEditEvent = (eventId) => {
    const newTitle = prompt('Digite o novo título do evento:');
    if (newTitle) {
      setEvents(events.map(event =>
        event.id === eventId ? { ...event, title: newTitle } : event
      ));
    }
  };

  const handleDateClick = (arg) => {
    const isConflict = events.some(event => {
      const eventStart = new Date(event.start).getTime();
      const eventEnd = new Date(event.end).getTime();
      const argStart = new Date(arg.date).getTime();
      const argEnd = argStart + 30 * 60000; // Adiciona 30 minutos

      return (argStart < eventEnd && argEnd > eventStart);
    });

    if (isConflict) {
      alert('Conflito de horário! Não é possível adicionar o evento.');
      return;
    }

    const title = prompt('Digite o título do evento:');
    if (title) {
      setEvents([...events, { id: Date.now().toString(), title, start: arg.date, end: new Date(arg.date.getTime() + 30 * 60000), description: '' }]);
    }
  };

  const handleEventDrop = (info) => {
    const isConflict = events.some(event => {
      if (event.id === info.event.id) return false;

      const eventStart = new Date(event.start).getTime();
      const eventEnd = new Date(event.end).getTime();
      const argStart = new Date(info.event.start).getTime();
      const argEnd = new Date(info.event.end).getTime();

      return (argStart < eventEnd && argEnd > eventStart);
    });

    if (isConflict) {
      alert('Conflito de horário! Não é possível mover o evento.');
      info.revert();
      return;
    }

    const updatedEvents = events.map(event => {
      if (event.id === info.event.id) {
        return {
          ...event,
          start: info.event.start,
          end: info.event.end
        };
      }
      return event;
    });
    setEvents(updatedEvents);
  };

  const handleEventReceive = (info) => {
    const blockId = info.draggedEl.getAttribute('data-id');
    const duration = info.draggedEl.getAttribute('data-duration');
    const end = new Date(info.event.start.getTime() + parseDuration(duration));
    info.event.setEnd(end);

    // Remove o bloco da lista de blocos disponíveis
    setAvailableBlocks(availableBlocks.filter(block => block.id !== blockId));

    // Adiciona o evento ao calendário
    setEvents([...events, {
      id: info.event.id,
      title: info.event.title,
      start: info.event.start,
      end: end,
      description: ''
    }]);
  };

  const parseDuration = (duration) => {
    const [hours, minutes] = duration.split(':').map(Number);
    return (hours * 60 + minutes) * 60000; // Converte para milissegundos
  };

  const formatTimeRange = (date) => {
    const start = new Date(date);
    const end = new Date(start.getTime() + 30 * 60000); // Adiciona 30 minutos
    const format = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    return `${format(start)} - ${format(end)}`;
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
            events={events}
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
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }}
            slotLabelContent={(arg) => formatTimeRange(arg.date)}
            allDaySlot={false}
            hiddenDays={[0]} // 0 represents Sunday
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,timeGridDay'
            }}
            eventBackgroundColor="#4CAF50" // Cor de fundo dos eventos
            eventBorderColor="#388E3C" // Cor da borda dos eventos
            eventContent={(eventInfo) => (
              <div className="custom-event">
                <span className="event-title">{eventInfo.event.title}</span>
                <button
                  className="remove-event-btn"
                  onClick={() => handleRemoveEvent(eventInfo.event.id, eventInfo.event.title)}
                >
                  ✖
                </button>
                <button
                  className="edit-event-btn"
                  onClick={() => handleEditEvent(eventInfo.event.id)}
                >
                  📝
                </button>
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