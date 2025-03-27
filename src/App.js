import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptLocale from '@fullcalendar/core/locales/pt';
import './App.css';

function App() {
  const [events, setEvents] = useState([
    { id: '1', title: 'Int. à Prog. Web (PL)', start: '2025-03-26T08:00:00', end: '2025-03-26T09:30:00', description: 'João F. Silva\nB128' },
    { id: '2', title: 'Lab. Microsisst. (TP)', start: '2025-03-26T16:30:00', end: '2025-03-26T18:00:00', description: 'Manuel Barros\nB257' }
  ]);

  const handleRemoveEvent = (eventId, eventTitle) => {
    const confirmDelete = window.confirm(`Tem a certeza de que deseja eliminar o evento '${eventTitle}'?`);
    if (confirmDelete) {
      setEvents(events.filter(event => event.id !== eventId));
    }
  };
//teste
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

  const formatTimeRange = (date) => {
    const start = new Date(date);
    const end = new Date(start.getTime() + 30 * 60000); // Adiciona 30 minutos
    const format = (date) => date.toLocaleTimeString([], { hour: '4-digit', minute: '2-digit', hour12: false });
    return `${format(start)} - ${format(end)}`;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>O Meu Horário</h1>
      </header>
      <div className="calendar-container">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          events={events}
          dateClick={handleDateClick}
          editable={true}
          droppable={true}
          eventDrop={handleEventDrop}
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
          hiddenDays={[0]}  // 0 represents Sunday
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridWeek,timeGridDay'
          }}
          eventContent={(eventInfo) => (
            <div className="custom-event">
              <span className="event-title">{eventInfo.event.title}</span>
              <button
                className="remove-event-btn"
                onClick={() => handleRemoveEvent(eventInfo.event.id, eventInfo.event.title)}
              >
                ✖
              </button>
            </div>
          )}
        />
      </div>
    </div>
  );
}

export default App; // exporta o componente