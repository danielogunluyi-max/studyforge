"use client";

import { useMemo } from "react";
import { ALL_ONTARIO_COURSES } from "~/lib/ontarioCourses";

const SUBJECTS = [
  "General",
  "Math",
  "Science",
  "English",
  "History",
  "Chemistry",
  "Physics",
  "Biology",
  "French",
] as const;

export type OntarioSubject = (typeof SUBJECTS)[number];

function coursesForGrades(grades?: number[]) {
  if (!grades || grades.length === 0) {
    return ALL_ONTARIO_COURSES.filter((course) => course.grade >= 11);
  }
  const set = new Set(grades);
  return ALL_ONTARIO_COURSES.filter((course) => set.has(course.grade));
}

export function subjectFromCourseCode(code: string): OntarioSubject {
  const course = ALL_ONTARIO_COURSES.find((item) => item.code === code.trim().toUpperCase());
  if (!course) return "General";
  const byName = SUBJECTS.find((item) => item === course.name);
  const byCategory = SUBJECTS.find((item) => item === course.category);
  return byName ?? byCategory ?? "General";
}

export function OntarioCourseField({
  id = "ontario-course-codes",
  value,
  onChange,
  grades,
  label = "Ontario course code (optional)",
  showChip = true,
  showHint = true,
}: {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  /** Limit datalist to these grades. Default: Grade 11–12 (existing Inbox behavior). */
  grades?: number[];
  label?: string;
  showChip?: boolean;
  showHint?: boolean;
}) {
  const options = useMemo(() => coursesForGrades(grades), [grades]);

  const hint = useMemo(() => {
    const course = options.find((item) => item.code === value.trim().toUpperCase());
    return course ? `${course.name} · Grade ${course.grade}` : "";
  }, [options, value]);

  const code = value.trim().toUpperCase();

  return (
    <div>
      <label htmlFor={`${id}-input`} className="kv-meta" style={{ display: "block", marginBottom: 8 }}>
        {label}
      </label>
      <input
        id={`${id}-input`}
        className="kv-field"
        list={id}
        value={value}
        onChange={(event) => onChange(event.target.value.trim().toUpperCase())}
        placeholder="e.g. SCH4U, MHF4U"
        autoComplete="off"
      />
      <datalist id={id}>
        {options.map((course) => (
          <option key={course.code} value={course.code}>
            {course.name} (Grade {course.grade})
          </option>
        ))}
      </datalist>
      {showChip && code ? (
        <span className="kv-chip kv-chip-course" style={{ display: "inline-flex", marginTop: 8 }}>
          {code}
        </span>
      ) : null}
      {showHint && hint ? (
        <p className="kv-meta" style={{ margin: "8px 0 0" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
