import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import ptLocale from '@fullcalendar/core/locales/pt';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import GestaoUtilizadores from './GestaoUtilizadores';
import './App.css';

export default function MainView({ user, setUser }) {
  const [eventos, setEventos] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [horariosFiltrados, setHorariosFiltrados] = useState([]);

  const [escolas, setEscolas] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [selEscola, setSelEscola] = useState('');
  const [selCurso, setSelCurso] = useState('');
  const [selSemestre, setSelSemestre] = useState('');
  const [mostrandoGestao, setMostrandoGestao] = useState(false);

  const draggableElRef = useRef(null);

  // Buscar todos os horários e extrair escolas e cursos únicos
  useEffect(() => {
    async function carregarHorarios() {
      const { data, error } = await supabase.from('unidades_curriculares').select('*');

      if (error) {
        console.error('Erro ao carregar horários:', error);
      } else {
        setHorarios(data);

        const escolasUnicas = [...new Set(data.map(h => h.escola))];
        const cursosUnicos = [...new Set(data.map(h => h.curso))];

        setEscolas(escolasUnicas);
        setCursos(cursosUnicos);
      }
    }

    carregarHorarios();
  }, []);

 useEffect(() => {
  console.log('🎯 Filtros atuais:', selEscola, selCurso, selSemestre);

  if (!selEscola || !selCurso || !selSemestre) {
    setHorariosFiltrados([]);
    console.log('⚠️ Falta preencher todos os filtros');
    return;
  }

  async function filtrarHorarios() {
    const { data, error } = await supabase
      .from('unidades_curriculares')
      .select('*')
      .eq('escola_id', selEscola)
      .eq('curso_id', selCurso)
      .eq('semestre', parseInt(selSemestre));

    if (error) {
      console.error('❌ Erro ao filtrar horários:', error);
      setHorariosFiltrados([]);
    } else {
      console.log('✅ Resultados encontrados:', data);
      setHorariosFiltrados(data);
    }
  }

  filtrarHorarios();
}, [selEscola, selCurso, selSemestre]);


 // Setup drag & drop UMA ÚNICA VEZ
useEffect(() => {
  if (!user.podeGerirBlocos || !draggableElRef.current) return;

  const draggable = new Draggable(draggableElRef.current, {
    itemSelector: '.block',
    eventData: el => ({
      // tira o id para o FC gerar o seu próprio
      title: el.getAttribute('data-title'),
      duration: el.getAttribute('data-duration'),
      extendedProps: { originalId: el.getAttribute('data-id') }
    })
  });

  return () => {
    // remove listeners quando o componente desmontar
    draggable.destroy();
  };
}, [user.podeGerirBlocos]); // <<— só depende desta prop


  const exportarPDF = () => {
    const el = document.querySelector('.fc-view-harness');
    if (!el) {
      alert('Calendário não encontrado.');
      return;
    }

    html2canvas(el, { scale: 2 }).then(canvas => {
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, 'PNG', 0, 10, w, h);
      pdf.save('horario.pdf');
    });
  };

  return (
    <div className="App">
      <header className="App-header"><h1>O Meu Horário</h1></header>

      <div className="toolbar">
        <button className="logout" onClick={() => { localStorage.removeItem('user'); setUser(null); }}>Sair</button>
        <button className="exportar" onClick={exportarPDF}>Exportar PDF</button>
        {user?.perfil === 'Admin' && (
          <button className="gestao" onClick={() => setMostrandoGestao(true)}>Gerir Utilizadores</button>
        )}
      </div>

      <div className="filtros-dependentes">
        <select value={selEscola} onChange={e => { setSelEscola(e.target.value); setSelCurso(''); }}>
          <option value="">– Seleciona Escola –</option>
          <option value="ESTT">ESTT</option>
          <option value="EGTT">EGTT</option>
        </select>

        <select value={selCurso} onChange={e => setSelCurso(e.target.value)}>
          <option value="">– Seleciona Curso –</option>
          <option value="Engenharia Informática">Engenharia Informática</option>
        </select>

        <select value={selSemestre} onChange={e => setSelSemestre(e.target.value)}>
          <option value="">– Semestre –</option>
          <option value="1">1º Semestre</option>
          <option value="2">2º Semestre</option>
        </select>
      </div>

      <div className="main-container">
        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            editable={user.podeGerirBlocos}
            droppable={user.podeGerirBlocos}
            locale={ptLocale}
            events={eventos}
            slotMinTime="08:00:00"
            slotMaxTime="24:00:00"
            slotDuration="00:30:00"
            hiddenDays={[0]}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,timeGridDay'
            }}

            eventReceive={(info) => {
              // Verifica se já existe um evento com o mesmo título e hora
              const existe = eventos.some(e => 
                e.title === info.event.title &&
                e.startStr === info.event.startStr
              );

              if (existe) {
                info.event.remove(); // Remove o evento duplicado
              } else {
                setEventos(prev => [...prev, info.event]);
              }
            }}
          />
        </div>

        {user.podeGerirBlocos && (
          <div className="blocks-container" ref={draggableElRef}>
            <h2>Horários Disponíveis</h2>
            {horariosFiltrados.map((h) => (
              <div
                key={h.id}
                className="block horario"
                data-id="1"
                data-title={h.nome}
                //data-duration="00:30:00"
              >
                <strong>{h.nome}</strong><br />
                {h.escola}<br />
                Semestre {h.semestre}
              </div>
            ))}
          </div>
        )}
      </div>

      {mostrandoGestao && <GestaoUtilizadores />}
    </div>
  );
}