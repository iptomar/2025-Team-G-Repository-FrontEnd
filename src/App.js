import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptLocale from '@fullcalendar/core/locales/pt';
import './App.css';

function App() {
  const [events, setEvents] = useState([
    { title: 'Int. à Prog. Web (PL)', start: '2025-03-17T08:00:00', end: '2025-03-17T08:30:00', description: 'João F. Silva\nB128' },
    { title: 'Mat. Computac. (TP)', start: '2025-03-18T08:00:00', end: '2025-03-18T11:30:00', description: 'L. Merca / C. Perq.\nB255' },
    { title: 'Lab. Microsisst. (PL)', start: '2025-03-14T09:30:00', end: '2025-03-14T11:00:00', description: 'Pedro Correia\nI184' },
    { title: 'Prog. Orient. Obj. (PL)', start: '2025-03-10T13:30:00', end: '2025-03-10T15:00:00', description: 'Paulo A. Santos\nB128' },
    { title: 'An. Matemática II (TP)', start: '2025-03-11T13:30:00', end: '2025-03-11T15:00:00', description: 'Cristina Costa\nB257' },
    { title: 'Int. à Prog. Web (TP)', start: '2025-03-10T16:30:00', end: '2025-03-10T18:00:00', description: 'Paulo Santos\nB257' },
    { title: 'Prog. Orient. Obj. (TP)', start: '2025-03-11T16:30:00', end: '2025-03-11T18:00:00', description: 'António Manso\nB257' },
    { title: 'Mat. Computac. (TP)', start: '2025-03-13T10:00:00', end: '2025-03-13T11:30:00', description: 'L. Merca / C. Perq.\nB255' },
    { title: 'An. Matemática II (TP)', start: '2025-03-13T13:30:00', end: '2025-03-13T15:00:00', description: 'Cristina Costa\nB257' },
    { title: 'Lab. Microsisst. (TP)', start: '2025-03-13T16:30:00', end: '2025-03-13T18:00:00', description: 'Manuel Barros\nB257' }
  ]);

  const handleDateClick = (arg) => {
    const title = prompt('Digite o título do evento:');
    if (title) {
      setEvents([...events, { title, start: arg.date, allDay: arg.allDay }]);
    }
  };

  const handleEventDrop = (info) => {
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
        <h1>Meu Calendário</h1>
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