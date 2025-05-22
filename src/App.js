// App.js
import React, { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import ptLocale from '@fullcalendar/core/locales/pt';
import './App.css';
import * as XLSX from 'xlsx';

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
    //{ id: 'a1', title: 'Bloco Livre 1', duration: '30 min' },
    //{ id: 'a2', title: 'Bloco Livre 2', duration: '1 hora' }
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

  useEffect(() => {
    fetch(process.env.PUBLIC_URL + '/blocos.xlsx')
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => {
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Sheet das UCs (primeira sheet)
        const sheetUC = workbook.Sheets[workbook.SheetNames[0]];
        const jsonUC = XLSX.utils.sheet_to_json(sheetUC);

        // Sheet dos Cursos
        const sheetCursos = workbook.Sheets['Cursos'];
        const jsonCursos = XLSX.utils.sheet_to_json(sheetCursos);

        // Cria um mapa de Código_Curso_ID para Nome_Curso
        const cursosMap = {};
        jsonCursos.forEach(curso => {
          cursosMap[curso.Código_Curso_ID] = curso.Nome_Curso;
        });

        // Sheet dos Docentes (se já estiveres a usar IDs para docentes)
        const sheetDocentes = workbook.Sheets['Docentes'];
        const jsonDocentes = sheetDocentes ? XLSX.utils.sheet_to_json(sheetDocentes) : [];
        const docentesMap = {};
        jsonDocentes.forEach(doc => {
          docentesMap[doc.ID] = doc.Nome;
        });
        const getDocentesNomes = (ids) => {
          if (!ids) return '';
          return ids
            .toString()
            .split(',')
            .map(id => docentesMap[id.trim()] || '')
            .filter(Boolean)
            .join(', ');
        };

        // Mapeia os blocos, substituindo IDs pelos nomes
        const blocks = jsonUC.map((row, idx) => ({
          id: row.Código ? String(row.Código) : `block${idx}`,
          nome: row.Nome || '',
          codigo: row.Código || '',
          codCurso: cursosMap[row.Código_Curso_ID] || '', // Aqui vai o nome do curso!
          horasPL: row['Horas PL'] || '',
          horasTP: row['Horas TP'] || '',
          docentePL: getDocentesNomes(row['ID_Docente_PL']),
          docentesTP: getDocentesNomes(row['ID_Docente_TP']),
          ano: row.Ano || '',
          semestre: row.Semestre || '',
          duration: "02:00"
        }));
        setAvailableBlocks(blocks);
      })
      .catch(err => {
        console.log('Erro ao carregar o Excel:', err);
      });
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
    const block = availableBlocks.find(b => b.id === blockId);
    const duration = 2 * 60 * 60000; // 2 horas em ms
    const end = new Date(info.event.start.getTime() + duration);
    info.event.setEnd(end);

    setAvailableBlocks(prev => prev.filter(block => block.id !== blockId));

    const newEvent = {
      id: info.event.id,
      title: block.nome,
      start: info.event.start,
      end: end,
      tipo: block.horasPL ? 'PL' : 'TP',
      docentes: block.horasPL ? block.docentePL : block.docentesTP,
      ...block // <-- adiciona todas as props do bloco ao evento!
    };

    updateEvents([...currentEvents, newEvent]);
  };

  const handleEventDragStop = (info) => {
    const blocksContainer = draggableElRef.current;
    const rect = blocksContainer.getBoundingClientRect();
    const { clientX, clientY } = info.jsEvent;

    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      // Remove do calendário
      updateEvents(currentEvents.filter(e => e.id !== info.event.id));
      // Adiciona de volta à lista de blocos, mantendo todas as props
      setAvailableBlocks(prev => [
        ...prev,
        {
          id: info.event.id,
          nome: info.event.title,
          codigo: info.event.extendedProps.codigo || '',
          codCurso: info.event.extendedProps.codCurso || '',
          horasPL: info.event.extendedProps.horasPL || '',
          horasTP: info.event.extendedProps.horasTP || '',
          docentePL: info.event.extendedProps.docentePL || '',
          docentesTP: info.event.extendedProps.docentesTP || '',
          ano: info.event.extendedProps.ano || '',
          semestre: info.event.extendedProps.semestre || '',
          duration: "02:00"
        }
      ]);
    }
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      // Espera-se que cada linha tenha: id, title, duration
      const blocks = json.map((row, idx) => ({
        id: row.id ? String(row.id) : `block${idx}`,
        title: row.title || `Bloco ${idx + 1}`,
        duration: row.duration || '00:30'
      }));
      setAvailableBlocks(blocks);
    };
    reader.readAsArrayBuffer(file);
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
            eventContent={(eventInfo) => {
              const tipo = eventInfo.event.extendedProps.tipo;
              const docentes = eventInfo.event.extendedProps.docentes;
              return (
                <div className="custom-event">
                  <span className="event-title">{eventInfo.event.title}</span><br />
                  <span>{tipo === 'PL' ? '(PL)' : '(TP)'}</span><br />
                  <span style={{ fontSize: '0.9em' }}>{docentes}</span>
                </div>
              );
            }}
            eventDragStop={handleEventDragStop}
          />
        </div>

        <div className="blocks-container" ref={draggableElRef}>
        <h2>Blocos Disponíveis</h2>
        {availableBlocks.map(block => (
          <div
            key={block.id}
            className="block"
            data-id={block.id}
            data-title={block.nome}
            data-duration="02:00" // <-- aqui!
          >
            <strong>{block.nome}</strong><br />
            Código: {block.codigo}<br />
            Curso: {block.codCurso}<br />
            PL: {block.horasPL}h ({block.docentePL})<br />
            TP: {block.horasTP}h ({block.docentesTP})<br />
            Ano: {block.ano} &nbsp;|&nbsp; Semestre: {block.semestre}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

export default App;
