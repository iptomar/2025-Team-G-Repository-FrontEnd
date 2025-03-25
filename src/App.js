import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptLocale from '@fullcalendar/core/locales/pt';
import './App.css';

function App() {
  const [events, setEvents] = useState([
    { title: 'Int. à Prog. Web (PL)', start: '2025-03-22T08:00:00', end: '2025-03-22T09:30:00', description: 'João F. Silva\nB128' },
    { title: 'Lab. Microsisst. (TP)', start: '2025-03-22T16:30:00', end: '2025-03-22T18:00:00', description: 'Manuel Barros\nB257' }
  ]);

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
      setEvents([...events, { title, start: arg.date, end: new Date(arg.date.getTime() + 30 * 60000), description: '' }]);
    }
  };

  const handleEventDrop = (info) => {
    const isConflict = events.some(event => {
      if (event.title === info.event.title) return false;

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
      if (event.title === info.event.title) {
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

  const handleEventClick = (info) => {
    if (window.confirm(`Deseja remover o evento '${info.event.title}'?`)) {
      setEvents(events.filter(event => event.title !== info.event.title));
    }
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
      <div className="calendar-container">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          events={events}
          dateClick={handleDateClick}
          editable={true}
          droppable={true}
          eventDrop={handleEventDrop}
          eventClick={handleEventClick}
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
            <>
              <b>{eventInfo.timeText}</b>
              <i>{eventInfo.event.title}</i>
              <p>{eventInfo.event.extendedProps.description}</p>
            </>
          )}
        />
      </div>
    </div>
  );
}

export default App;