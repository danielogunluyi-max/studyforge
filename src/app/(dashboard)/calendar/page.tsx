'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Skeleton from '@/app/_components/skeleton';
import { formatTorontoDate } from '~/lib/toronto-time';

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
  exam: 'Exam',
  study: 'Study',
  deadline: 'Deadline',
  assignment: 'Assignment',
  reminder: 'Reminder',
  other: 'Other',
};

const ONTARIO_COURSE = /^[A-Z]{3,4}\d[A-Z]$/i;

function courseChip(value: string) {
  const token = value.trim();
  if (!ONTARIO_COURSE.test(token)) return null;
  return <span className="kv-chip kv-chip-course">{token}</span>;
}

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
  const [error, setError] = useState('');

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
    setError('');
    try {
      const response = await fetch(`/api/calendar?year=${currentYear}&month=${currentMonth}`);
      const data = (await response.json().catch(() => ({}))) as { events?: CalEvent[] };
      setEvents(data.events ?? []);
    } catch {
      setEvents([]);
      setError('Failed to load calendar events');
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
    try {
      await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
      await loadEvents();
    } catch {
      setError('Failed to delete event');
    }
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    if (id.startsWith('exam-') || id.startsWith('study-')) return;
    try {
      await fetch(`/api/calendar/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      });
      await loadEvents();
    } catch {
      setError('Failed to update event');
    }
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
    <main className="kv-page" style={{ padding: '24px 16px 100px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {error ? <p className="kv-meta" style={{ color: '#E5484D' }}>{error}</p> : null}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="kv-crumb">Kyvex / <b>Calendar</b></div>
          <h1 className="kv-title" style={{ marginTop: 14 }}>Calendar</h1>
          <p className="kv-sub" style={{ marginTop: 10 }}>Exams, study sessions, and deadlines.</p>
          <div className="kv-tabs" style={{ marginTop: 22 }}>
            <button
              type="button"
              className={activeTab === 'calendar' ? 'kv-tab on' : 'kv-tab'}
              onClick={() => setActiveTab('calendar')}
            >
              Calendar
            </button>
            <button
              type="button"
              className={activeTab === 'timetable' ? 'kv-tab on' : 'kv-tab'}
              onClick={() => setActiveTab('timetable')}
            >
              Timetable
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (activeTab === 'calendar') {
              setNewDate(formatDateInput(today));
              setShowAddModal(true);
              return;
            }
            openNewClassModal();
          }}
          className="kv-btn"
        >
          {activeTab === 'calendar' ? 'Add event' : 'Add class'}
        </button>
      </div>

      <div style={{ display: activeTab === 'calendar' ? 'grid' : 'none', gridTemplateColumns: 'minmax(0,1fr) minmax(240px,280px)', gap: 24, alignItems: 'start', marginTop: 28 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <button type="button" onClick={prevMonth} className="kv-btn-ghost">Prev</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <h2 className="kv-title" style={{ fontSize: 20, margin: 0 }}>
                {MONTHS[currentMonth]} {currentYear}
              </h2>
              <button
                type="button"
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
            <button type="button" onClick={nextMonth} className="kv-btn-ghost">Next</button>
          </div>

          <div className="kv-cal-grid">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="kv-cal-hd kv-meta">{weekday}</div>
            ))}
            {calendarCells.map((date, index) => {
              const isCurrentMonth = date.getMonth() === currentMonth;
              const isToday = date.toDateString() === today.toDateString();
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              const dayEvents = getEventsForDate(date);
              const cls = [
                'kv-cal-cell',
                isCurrentMonth ? '' : 'muted',
                isToday ? 'today' : '',
                isSelected ? 'sel' : '',
              ].filter(Boolean).join(' ');

              return (
                <button
                  key={`${date.toISOString()}-${index}`}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={cls}
                >
                  <span className="num" style={{ fontSize: 12, fontWeight: isToday ? 600 : 400 }}>
                    {date.getDate()}
                  </span>
                  <div style={{ marginTop: 4 }}>
                    {dayEvents.slice(0, 3).map((event, eventIndex) => (
                      <div
                        key={`${event.id}-${eventIndex}`}
                        className="kv-meta"
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          textDecoration: event.completed ? 'line-through' : 'none',
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 ? (
                      <div className="kv-meta">+{dayEvents.length - 3}</div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedDate ? (
            <div style={{ marginTop: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <h3 className="kv-meta" style={{ margin: 0 }}>{formatTorontoDate(selectedDate)}</h3>
                <button
                  type="button"
                  onClick={() => {
                    setNewDate(formatDateInput(selectedDate));
                    setShowAddModal(true);
                  }}
                  className="kv-btn-ghost"
                >
                  Add
                </button>
              </div>

              {selectedEvents.length === 0 ? (
                <p className="kv-sub" style={{ marginTop: 12 }}>No events scheduled.</p>
              ) : (
                selectedEvents.map((event) => {
                  const eventDay = new Date(event.date);
                  const isEventToday = eventDay.toDateString() === today.toDateString();
                  return (
                    <div key={event.id} className="kv-row" style={{ opacity: event.completed ? 0.55 : 1 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="kv-row-title" style={{ textDecoration: event.completed ? 'line-through' : 'none' }}>
                          {event.title}
                        </div>
                        <div className="kv-row-sub">
                          {isEventToday ? <span className="dot" aria-label="Today" /> : null}
                          {courseChip(event.title)}
                          <span className="kv-chip">{TYPE_LABELS[event.type] ?? event.type}</span>
                        </div>
                        {event.description ? (
                          <p className="kv-sub" style={{ marginTop: 6, fontSize: 13 }}>{event.description}</p>
                        ) : null}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span className="kv-row-side">{formatTorontoDate(event.date)}</span>
                        {!event.id.startsWith('exam-') && !event.id.startsWith('study-') ? (
                          <>
                            <button
                              type="button"
                              className="kv-btn-ghost"
                              style={{ padding: '6px 8px' }}
                              onClick={() => void handleToggleComplete(event.id, event.completed)}
                            >
                              {event.completed ? 'Undo' : 'Done'}
                            </button>
                            <button
                              type="button"
                              className="kv-btn-danger"
                              style={{ padding: '6px 8px' }}
                              onClick={() => void handleDeleteEvent(event.id)}
                            >
                              Delete
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}
        </div>

        <div className="kv-hide-mobile">
          <p className="kv-meta">Next 7 days</p>
          {loading ? (
            <Skeleton variant="text" count={4} />
          ) : upcomingEvents.length === 0 ? (
            <p className="kv-sub" style={{ marginTop: 10 }}>Nothing scheduled this week.</p>
          ) : (
            upcomingEvents.map((event) => {
              const date = new Date(event.date);
              const isEventToday = date.toDateString() === today.toDateString();
              return (
                <button
                  key={event.id}
                  type="button"
                  className="kv-row"
                  onClick={() => {
                    setCurrentMonth(date.getMonth());
                    setCurrentYear(date.getFullYear());
                    setSelectedDate(date);
                  }}
                  style={{ width: '100%', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="kv-row-title">{event.title}</div>
                    <div className="kv-row-sub">
                      {isEventToday ? <span className="dot" aria-label="Today" /> : null}
                      {courseChip(event.title)}
                      <span className="kv-chip">{TYPE_LABELS[event.type] ?? event.type}</span>
                    </div>
                  </div>
                  <span className="kv-row-side">{formatTorontoDate(event.date)}</span>
                </button>
              );
            })
          )}

          <p className="kv-meta" style={{ marginTop: 28 }}>This month</p>
          <div className="kv-stats" style={{ marginTop: 12, gridTemplateColumns: '1fr 1fr' }}>
            <div className="kv-stat">
              <span className="kv-meta">Events</span>
              <b className="num">{events.length}</b>
            </div>
            <div className="kv-stat">
              <span className="kv-meta">Exams</span>
              <b className="num">{events.filter((event) => event.type === 'exam').length}</b>
            </div>
            <div className="kv-stat">
              <span className="kv-meta">Study</span>
              <b className="num">{events.filter((event) => event.type === 'study').length}</b>
            </div>
            <div className="kv-stat">
              <span className="kv-meta">Done</span>
              <b className="num">{events.filter((event) => event.completed).length}</b>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: activeTab === 'timetable' ? 'block' : 'none', marginTop: 28, overflowX: 'auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '80px repeat(5, minmax(0, 1fr))',
            minWidth: 720,
            borderTop: '1px solid var(--border-default)',
            borderLeft: '1px solid var(--border-default)',
          }}
        >
          <div className="kv-cal-hd kv-meta">Time</div>
          {TIMETABLE_DAYS.map((day) => (
            <div key={`head-${day}`} className="kv-cal-hd kv-meta" style={{ textAlign: 'center' }}>{day}</div>
          ))}

          {TIMETABLE_SLOTS.map((slot) => (
            <div key={`slot-row-${slot}`} style={{ display: 'contents' }}>
              <div className="kv-cal-hd kv-meta num">{slot}</div>
              {TIMETABLE_DAYS.map((day) => {
                const classes = getClassForCell(day, slot);
                return (
                  <div
                    key={`${day}-${slot}`}
                    style={{
                      minHeight: 64,
                      padding: 6,
                      borderRight: '1px solid var(--border-default)',
                      borderBottom: '1px solid var(--border-default)',
                    }}
                  >
                    {classes.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => openEditClassModal(entry)}
                        className="kv-row"
                        style={{
                          width: '100%',
                          padding: '8px 0',
                          background: 'transparent',
                          textAlign: 'left',
                          cursor: 'pointer',
                          border: 'none',
                        }}
                      >
                        <div>
                          <div className="kv-row-title">{entry.className}</div>
                          <div className="kv-row-sub">
                            {courseChip(entry.subject)}
                            {entry.subject && !ONTARIO_COURSE.test(entry.subject.trim()) ? (
                              <span className="kv-chip">{entry.subject}</span>
                            ) : null}
                            {entry.room ? <span className="kv-chip">{entry.room}</span> : null}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {showAddModal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '24px 16px',
            overflowY: 'auto',
            background: 'rgba(0,0,0,0.72)',
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowAddModal(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              border: '1px solid var(--border-default)',
              background: 'var(--bg-base)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border-default)' }}>
              <h2 className="kv-title" style={{ fontSize: 18 }}>Add Event</h2>
              <button type="button" onClick={() => setShowAddModal(false)} className="kv-btn-ghost" style={{ padding: '6px 8px' }} aria-label="Close">
                Close
              </button>
            </div>
            <div style={{ padding: '16px 18px', display: 'grid', gap: 12 }}>
              <div>
                <label className="kv-meta" style={{ display: 'block', marginBottom: 8 }}>Title</label>
                <input
                  className="kv-field"
                  placeholder="Chemistry assignment due"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                />
              </div>
              <div>
                <label className="kv-meta" style={{ display: 'block', marginBottom: 8 }}>Date</label>
                <input className="kv-field" type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} />
              </div>
              <div>
                <label className="kv-meta" style={{ display: 'block', marginBottom: 8 }}>Type</label>
                <select className="kv-field" value={newType} onChange={(event) => setNewType(event.target.value)}>
                  <option value="deadline">Deadline</option>
                  <option value="assignment">Assignment</option>
                  <option value="reminder">Reminder</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="kv-meta" style={{ display: 'block', marginBottom: 8 }}>Notes</label>
                <textarea
                  className="kv-field"
                  rows={2}
                  placeholder="Optional details"
                  value={newDesc}
                  onChange={(event) => setNewDesc(event.target.value)}
                />
              </div>
              <button
                type="button"
                className="kv-btn"
                disabled={!newTitle.trim() || !newDate || saving}
                onClick={() => void handleAddEvent()}
              >
                {saving ? 'Saving…' : 'Add to calendar'}
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
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '24px 16px',
            overflowY: 'auto',
            background: 'rgba(0,0,0,0.72)',
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowClassModal(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              border: '1px solid var(--border-default)',
              background: 'var(--bg-base)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border-default)' }}>
              <h2 className="kv-title" style={{ fontSize: 18 }}>{editingClassId ? 'Edit class' : 'Add class'}</h2>
              <button type="button" onClick={() => setShowClassModal(false)} className="kv-btn-ghost" style={{ padding: '6px 8px' }} aria-label="Close">
                Close
              </button>
            </div>
            <div style={{ padding: '16px 18px', display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <input className="kv-field" placeholder="Class name" value={className} onChange={(e) => setClassName(e.target.value)} />
              <input className="kv-field" placeholder="Subject" value={classSubject} onChange={(e) => setClassSubject(e.target.value)} />
              <input className="kv-field" placeholder="Room" value={classRoom} onChange={(e) => setClassRoom(e.target.value)} />
              <input className="kv-field" placeholder="Teacher" value={classTeacher} onChange={(e) => setClassTeacher(e.target.value)} />
              <select className="kv-field" value={classDay} onChange={(e) => setClassDay(e.target.value as (typeof TIMETABLE_DAYS)[number])}>
                {TIMETABLE_DAYS.map((day) => (
                  <option key={`day-${day}`} value={day}>{day}</option>
                ))}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select className="kv-field" value={classStart} onChange={(e) => setClassStart(e.target.value as (typeof TIMETABLE_SLOTS)[number])}>
                  {TIMETABLE_SLOTS.map((slot) => (
                    <option key={`start-${slot}`} value={slot}>{slot}</option>
                  ))}
                </select>
                <select className="kv-field" value={classEnd} onChange={(e) => setClassEnd(e.target.value as (typeof TIMETABLE_SLOTS)[number])}>
                  {TIMETABLE_SLOTS.map((slot) => (
                    <option key={`end-${slot}`} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '0 18px 16px', flexWrap: 'wrap' }}>
              {TIMETABLE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Color ${color}`}
                  onClick={() => setClassColor(color)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 0,
                    border: classColor === color ? '1px solid var(--kv-text-primary)' : '1px solid var(--border-default)',
                    background: color,
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '14px 18px', borderTop: '1px solid var(--border-default)' }}>
              {editingClassId ? (
                <button type="button" className="kv-btn-danger" onClick={() => deleteClass(editingClassId)}>
                  Delete
                </button>
              ) : null}
              <button type="button" className="kv-btn-ghost" onClick={() => setShowClassModal(false)}>Cancel</button>
              <button type="button" className="kv-btn" onClick={saveClass} disabled={!className.trim()}>Save class</button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </main>
  );
}
