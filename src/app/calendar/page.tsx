'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const TIMETABLE_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
const TIMETABLE_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'] as const;
const TIMETABLE_COLORS = ['#f0b429', '#5b7fff', '#2dd4bf', '#f97316', '#ef4444', '#a855f7'] as const;

const TYPE_COLORS: Record<string, string> = {
  exam: 'var(--accent-red)',
  study: 'var(--accent-blue)',
  deadline: 'var(--accent-orange)',
  assignment: 'var(--accent-purple)',
  reminder: 'var(--accent-blue)',
  other: 'var(--accent-green)',
};

const TYPE_LABELS: Record<string, string> = {
  exam: '📝 Exam',
  study: '📅 Study',
  deadline: '⏰ Deadline',
  assignment: '📋 Assignment',
  reminder: '🔔 Reminder',
  other: '📌 Other',
};

type CalEvent = {
  id: string;
  title: string;
  date: string;
  type: string;
  color: string;
  completed: boolean;
  description?: string;
};

type TimetableClass = {
  id: string;
  className: string;
  subject: string;
  room: string;
  teacher: string;
  day: (typeof TIMETABLE_DAYS)[number];
  startTime: (typeof TIMETABLE_SLOTS)[number];
  endTime: (typeof TIMETABLE_SLOTS)[number];
  color: string;
};

function formatDateInput(date: Date) {
  return date.toISOString().split('T')[0] ?? '';
}

export default function CalendarPage() {
  const today = new Date();
  const [activeTab, setActiveTab] = useState<'calendar' | 'timetable'>('calendar');
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('deadline');
  const [newDate, setNewDate] = useState(formatDateInput(today));
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const [timetableClasses, setTimetableClasses] = useState<TimetableClass[]>([]);
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClassId, setEditingClassId] = useState('');
  const [className, setClassName] = useState('');
  const [classSubject, setClassSubject] = useState('');
  const [classRoom, setClassRoom] = useState('');
  const [classTeacher, setClassTeacher] = useState('');
  const [classDay, setClassDay] = useState<(typeof TIMETABLE_DAYS)[number]>('Mon');
  const [classStart, setClassStart] = useState<(typeof TIMETABLE_SLOTS)[number]>('08:00');
  const [classEnd, setClassEnd] = useState<(typeof TIMETABLE_SLOTS)[number]>('09:00');
  const [classColor, setClassColor] = useState<string>(TIMETABLE_COLORS[0]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/calendar?year=${currentYear}&month=${currentMonth}`);
      const data = (await response.json().catch(() => ({}))) as { events?: CalEvent[] };
      setEvents(data.events ?? []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('kyvex-timetable');
      if (!raw) return;
      const parsed = JSON.parse(raw) as TimetableClass[];
      if (Array.isArray(parsed)) {
        setTimetableClasses(parsed);
      }
    } catch {
      setTimetableClasses([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('kyvex-timetable', JSON.stringify(timetableClasses));
  }, [timetableClasses]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((year) => year - 1);
      return;
    }
    setCurrentMonth((month) => month - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((year) => year + 1);
      return;
    }
    setCurrentMonth((month) => month + 1);
  };

  const getEventsForDate = useCallback(
    (date: Date) =>
      events.filter((event) => {
        const value = new Date(event.date);
        return (
          value.getFullYear() === date.getFullYear() &&
          value.getMonth() === date.getMonth() &&
          value.getDate() === date.getDate()
        );
      }),
    [events],
  );

  const selectedEvents = useMemo(() => (selectedDate ? getEventsForDate(selectedDate) : []), [selectedDate, getEventsForDate]);

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarCells = useMemo(() => {
    const cells: Date[] = [];

    for (let index = firstDay - 1; index >= 0; index -= 1) {
      cells.push(new Date(currentYear, currentMonth - 1, daysInPrevMonth - index));
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(currentYear, currentMonth, day));
    }

    const remaining = 42 - cells.length;
    for (let day = 1; day <= remaining; day += 1) {
      cells.push(new Date(currentYear, currentMonth + 1, day));
    }

    return cells;
  }, [currentYear, currentMonth, firstDay, daysInMonth, daysInPrevMonth]);

  const handleAddEvent = async () => {
    if (!newTitle.trim() || !newDate) return;
    setSaving(true);
    try {
      await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          date: new Date(newDate).toISOString(),
          type: newType,
          color: TYPE_COLORS[newType] ?? TYPE_COLORS.deadline,
          description: newDesc,
        }),
      });

      setNewTitle('');
      setNewType('deadline');
      setNewDate('');
      setNewDesc('');
      setShowAddModal(false);
      await loadEvents();
    } catch {
      // keep modal open on failure
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (id.startsWith('exam-') || id.startsWith('study-')) return;
    await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
    await loadEvents();
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    if (id.startsWith('exam-') || id.startsWith('study-')) return;
    await fetch(`/api/calendar/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !completed }),
    });
    await loadEvents();
  };

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((event) => {
          const value = new Date(event.date);
          const diff = value.getTime() - today.getTime();
          return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [events, today],
  );

  const openNewClassModal = () => {
    setEditingClassId('');
    setClassName('');
    setClassSubject('');
    setClassRoom('');
    setClassTeacher('');
    setClassDay('Mon');
    setClassStart('08:00');
    setClassEnd('09:00');
    setClassColor(TIMETABLE_COLORS[0]);
    setShowClassModal(true);
  };

  const openEditClassModal = (entry: TimetableClass) => {
    setEditingClassId(entry.id);
    setClassName(entry.className);
    setClassSubject(entry.subject);
    setClassRoom(entry.room);
    setClassTeacher(entry.teacher);
    setClassDay(entry.day);
    setClassStart(entry.startTime);
    setClassEnd(entry.endTime);
    setClassColor(entry.color);
    setShowClassModal(true);
  };

  const saveClass = () => {
    if (!className.trim()) return;

    const payload: TimetableClass = {
      id: editingClassId || `tt-${Date.now()}`,
      className: className.trim(),
      subject: classSubject.trim(),
      room: classRoom.trim(),
      teacher: classTeacher.trim(),
      day: classDay,
      startTime: classStart,
      endTime: classEnd,
      color: classColor,
    };

    setTimetableClasses((prev) => {
      if (!editingClassId) return [...prev, payload];
      return prev.map((entry) => (entry.id === editingClassId ? payload : entry));
    });
    setShowClassModal(false);
  };

  const deleteClass = (id: string) => {
    setTimetableClasses((prev) => prev.filter((entry) => entry.id !== id));
    setShowClassModal(false);
  };

  const getClassForCell = (day: (typeof TIMETABLE_DAYS)[number], slot: (typeof TIMETABLE_SLOTS)[number]) => {
    return timetableClasses.filter((entry) => entry.day === day && entry.startTime === slot);
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }} className="kv-page animate-fade-in-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="kv-page-title" style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '6px' }}>
            📆 Calendar
          </h1>
          <p className="kv-page-subtitle" style={{ fontSize: '14px' }}>
            All your exams, study sessions, and deadlines in one place
          </p>
          <div className="kv-tabs" style={{ marginTop: 10 }}>
            <button
              type="button"
              className={`kv-tab ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveTab('calendar')}
            >
              Calendar
            </button>
            <button
              type="button"
              className={`kv-tab ${activeTab === 'timetable' ? 'active' : ''}`}
              onClick={() => setActiveTab('timetable')}
            >
              Timetable
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'calendar') {
              setNewDate(formatDateInput(today));
              setShowAddModal(true);
              return;
            }
            openNewClassModal();
          }}
          className="kv-btn-primary"
        >
          {activeTab === 'calendar' ? '+ Add event' : 'Add Class'}
        </button>
      </div>

      <div style={{ display: activeTab === 'calendar' ? 'grid' : 'none', gridTemplateColumns: 'minmax(0,1fr) minmax(260px,300px)', gap: '20px', alignItems: 'start' }}>
        <div>
          <div className="kv-card" style={{ padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
              <button onClick={prevMonth} className="kv-btn-ghost">← Prev</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {MONTHS[currentMonth]} {currentYear}
                </h2>
                <button
                  onClick={() => {
                    setCurrentMonth(today.getMonth());
                    setCurrentYear(today.getFullYear());
                    setSelectedDate(today);
                  }}
                  className="kv-btn-ghost"
                >
                  Today
                </button>
              </div>
              <button onClick={nextMonth} className="kv-btn-ghost">Next →</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
              {WEEKDAYS.map((weekday) => (
                <div
                  key={weekday}
                  style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', padding: '6px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  {weekday}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {calendarCells.map((date, index) => {
                const isCurrentMonth = date.getMonth() === currentMonth;
                const isToday = date.toDateString() === today.toDateString();
                const isSelected = selectedDate?.toDateString() === date.toDateString();
                const dayEvents = getEventsForDate(date);

                return (
                  <div
                    key={`${date.toISOString()}-${index}`}
                    onClick={() => setSelectedDate(date)}
                    style={{
                      minHeight: '72px',
                      padding: '6px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: `1px solid ${isSelected ? 'var(--accent-blue)' : isToday ? 'rgba(91,127,255,0.4)' : 'transparent'}`,
                      background: isSelected ? 'var(--glow-blue)' : isToday ? 'rgba(91,127,255,0.05)' : 'transparent',
                      opacity: isCurrentMonth ? 1 : 0.3,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(event) => {
                      if (!isSelected) event.currentTarget.style.background = 'var(--bg-elevated)';
                    }}
                    onMouseLeave={(event) => {
                      if (!isSelected) event.currentTarget.style.background = isToday ? 'rgba(91,127,255,0.05)' : 'transparent';
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isToday ? 'var(--accent-blue)' : 'transparent',
                        fontSize: '12px',
                        fontWeight: isToday ? 800 : 500,
                        color: isToday ? 'white' : 'var(--text-primary)',
                        marginBottom: '4px',
                      }}
                    >
                      {date.getDate()}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {dayEvents.slice(0, 3).map((event, eventIndex) => (
                        <div
                          key={`${event.id}-${eventIndex}`}
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            color: 'white',
                            background: event.color || TYPE_COLORS[event.type] || TYPE_COLORS.other,
                            borderRadius: '3px',
                            padding: '1px 4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textDecoration: event.completed ? 'line-through' : 'none',
                            opacity: event.completed ? 0.6 : 1,
                          }}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 ? (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+{dayEvents.length - 3} more</div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedDate ? (
            <div className="kv-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedDate.toLocaleDateString('en-CA', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>
                <button
                  onClick={() => {
                    setNewDate(formatDateInput(selectedDate));
                    setShowAddModal(true);
                  }}
                  className="kv-btn-ghost"
                >
                  + Add
                </button>
              </div>

              {selectedEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No events on this day.{' '}
                  <span
                    onClick={() => {
                      setNewDate(formatDateInput(selectedDate));
                      setShowAddModal(true);
                    }}
                    style={{ color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Add one →
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedEvents.map((event) => (
                    <div
                      key={event.id}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                        padding: '12px',
                        background: 'var(--bg-elevated)',
                        borderRadius: '10px',
                        borderLeft: `3px solid ${event.color || TYPE_COLORS[event.type] || TYPE_COLORS.other}`,
                        opacity: event.completed ? 0.6 : 1,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textDecoration: event.completed ? 'line-through' : 'none' }}>
                            {event.title}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: event.color || TYPE_COLORS[event.type] || TYPE_COLORS.other,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: `${event.color || TYPE_COLORS[event.type] || TYPE_COLORS.other}20`,
                            }}
                          >
                            {TYPE_LABELS[event.type] ?? event.type}
                          </span>
                        </div>
                        {event.description ? (
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{event.description}</p>
                        ) : null}
                      </div>

                      {!event.id.startsWith('exam-') && !event.id.startsWith('study-') ? (
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button
                            onClick={() => void handleToggleComplete(event.id, event.completed)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
                          >
                            {event.completed ? '↩' : '✓'}
                          </button>
                          <button
                            onClick={() => void handleDeleteEvent(event.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--accent-red)', padding: '4px' }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="kv-card" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Legend
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(TYPE_LABELS).map(([type, label]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '2px', background: TYPE_COLORS[type] ?? TYPE_COLORS.other, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="kv-card" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Next 7 Days
            </h3>
            {loading ? (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>Loading...</div>
            ) : upcomingEvents.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>Nothing coming up 🎉</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {upcomingEvents.map((event) => {
                  const date = new Date(event.date);
                  const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <div
                      key={event.id}
                      onClick={() => {
                        setCurrentMonth(date.getMonth());
                        setCurrentYear(date.getFullYear());
                        setSelectedDate(date);
                      }}
                      style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start',
                        padding: '10px',
                        background: 'var(--bg-elevated)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        borderLeft: `3px solid ${event.color || TYPE_COLORS[event.type] || TYPE_COLORS.other}`,
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--bg-elevated)';
                      }}
                    >
                      <div style={{ textAlign: 'center', flexShrink: 0, minWidth: '32px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: diff <= 2 ? 'var(--accent-red)' : 'var(--accent-blue)', lineHeight: 1 }}>
                          {diff === 0 ? 'Today' : diff === 1 ? 'Tmrw' : `${diff}d`}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                          {event.title}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="kv-card" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              This Month
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Total events', value: events.length, color: 'var(--text-primary)' },
                { label: 'Exams', value: events.filter((event) => event.type === 'exam').length, color: TYPE_COLORS.exam },
                { label: 'Study sessions', value: events.filter((event) => event.type === 'study').length, color: TYPE_COLORS.study },
                { label: 'Deadlines', value: events.filter((event) => event.type === 'deadline').length, color: TYPE_COLORS.deadline },
                { label: 'Completed', value: events.filter((event) => event.completed).length, color: 'var(--accent-green)' },
              ].map((stat) => (
                <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{stat.label}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: stat.color }}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: activeTab === 'timetable' ? 'block' : 'none' }}>
        <div className="kv-card" style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(5, minmax(0, 1fr))', gap: 8, alignItems: 'stretch' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Time</div>
            {TIMETABLE_DAYS.map((day) => (
              <div key={`head-${day}`} style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>
                {day}
              </div>
            ))}

            {TIMETABLE_SLOTS.map((slot) => (
              <div key={`slot-row-${slot}`} style={{ display: 'contents' }}>
                <div className="kv-card-sm" style={{ display: 'grid', placeItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {slot}
                </div>
                {TIMETABLE_DAYS.map((day) => {
                  const classes = getClassForCell(day, slot);
                  return (
                    <div
                      key={`${day}-${slot}`}
                      className="kv-card-sm"
                      style={{ minHeight: 68, padding: 6, display: 'flex', flexDirection: 'column', gap: 6 }}
                    >
                      {classes.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => openEditClassModal(entry)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            background: `${entry.color}22`,
                            border: `1px solid ${entry.color}`,
                            borderRadius: 8,
                            padding: '6px 8px',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{entry.className}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{entry.subject || 'Subject'} • {entry.room || 'Room'}</div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddModal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowAddModal(false);
          }}
        >
          <div className="kv-card animate-fade-in-up" style={{ padding: '28px', width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Add Event</h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Title
                </label>
                <input
                  className="kv-input"
                  placeholder='e.g. "Chemistry assignment due"'
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Date
                </label>
                <input className="kv-input" type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Type
                </label>
                <select className="kv-select" value={newType} onChange={(event) => setNewType(event.target.value)}>
                  <option value="deadline">⏰ Deadline</option>
                  <option value="assignment">📋 Assignment</option>
                  <option value="reminder">🔔 Reminder</option>
                  <option value="other">📌 Other</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Notes (optional)
                </label>
                <textarea
                  className="kv-textarea"
                  rows={2}
                  placeholder="Any extra details..."
                  value={newDesc}
                  onChange={(event) => setNewDesc(event.target.value)}
                />
              </div>

              <button
                onClick={() => void handleAddEvent()}
                disabled={!newTitle.trim() || !newDate || saving}
                className="kv-btn-primary"
                style={{ width: '100%', marginTop: '4px' }}
              >
                {saving ? 'Saving...' : '+ Add to calendar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showClassModal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowClassModal(false);
          }}
        >
          <div className="kv-card animate-fade-in-up" style={{ padding: '24px', width: '100%', maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{editingClassId ? 'Edit Class' : 'Add Class'}</h2>
              <button
                onClick={() => setShowClassModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <input className="kv-input" placeholder="Class name" value={className} onChange={(e) => setClassName(e.target.value)} />
              <input className="kv-input" placeholder="Subject" value={classSubject} onChange={(e) => setClassSubject(e.target.value)} />
              <input className="kv-input" placeholder="Room" value={classRoom} onChange={(e) => setClassRoom(e.target.value)} />
              <input className="kv-input" placeholder="Teacher" value={classTeacher} onChange={(e) => setClassTeacher(e.target.value)} />

              <select className="kv-select" value={classDay} onChange={(e) => setClassDay(e.target.value as (typeof TIMETABLE_DAYS)[number])}>
                {TIMETABLE_DAYS.map((day) => (
                  <option key={`day-${day}`} value={day}>{day}</option>
                ))}
              </select>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select className="kv-select" value={classStart} onChange={(e) => setClassStart(e.target.value as (typeof TIMETABLE_SLOTS)[number])}>
                  {TIMETABLE_SLOTS.map((slot) => (
                    <option key={`start-${slot}`} value={slot}>{slot}</option>
                  ))}
                </select>
                <select className="kv-select" value={classEnd} onChange={(e) => setClassEnd(e.target.value as (typeof TIMETABLE_SLOTS)[number])}>
                  {TIMETABLE_SLOTS.map((slot) => (
                    <option key={`end-${slot}`} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {TIMETABLE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setClassColor(color)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: classColor === color ? '2px solid white' : '1px solid var(--border-default)',
                    background: color,
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              {editingClassId ? (
                <button className="kv-btn-danger" onClick={() => deleteClass(editingClassId)}>
                  Delete
                </button>
              ) : null}
              <button className="kv-btn-secondary" onClick={() => setShowClassModal(false)}>Cancel</button>
              <button className="kv-btn-primary" onClick={saveClass} disabled={!className.trim()}>Save Class</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
