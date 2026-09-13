/**
 * Moat Map v1 — unit-level study maps for top Ontario Grade 12 courses.
 * LEGAL: chapter/section references only. Zero copyrighted textbook prose.
 *
 * Strand letters verified against Ontario ministry curriculum documents:
 * - Science (SCH4U / SBI4U / SPH4U): The Ontario Curriculum, Grades 11 and 12:
 *   Science, 2008 (revised) — https://www.edu.gov.on.ca/eng/curriculum/secondary/2009science11_12.pdf
 *   Strand A = Scientific Investigation Skills & Career Exploration; content strands B–F.
 * - Mathematics (MHF4U / MCV4U): The Ontario Curriculum, Grades 11 and 12:
 *   Mathematics, 2007 — https://www.edu.gov.on.ca/eng/curriculum/secondary/math1112currb.pdf
 * - English (ENG4U): The Ontario Curriculum, Grades 11 and 12: English, 2007 (revised)
 *   — strands A–D (Oral, Reading, Writing, Media).
 *
 * Textbook titles are common Ontario classroom editions (reference only).
 */

export type MoatUnit = {
  /** Aligns with OntarioCurriculumUnit.code when seeded (ministry strand letter). */
  code: string;
  name: string;
  topics: string[];
  /** e.g. "Nelson Chemistry 12 · Ch. 1–2" — reference only */
  textbookRef: string;
  /** Honest Inbox hint — photograph pages into Inbox */
  inboxHint: string;
};

export type MoatCourseMap = {
  code: string;
  title: string;
  textbook: string;
  units: MoatUnit[];
};

export const MOAT_COURSE_CODES = [
  "SCH4U",
  "MHF4U",
  "ENG4U",
  "SBI4U",
  "SPH4U",
  "MCV4U",
] as const;

export type MoatCourseCode = (typeof MOAT_COURSE_CODES)[number];

export const CURRICULUM_MOAT_MAPS: Record<MoatCourseCode, MoatCourseMap> = {
  SCH4U: {
    code: "SCH4U",
    title: "Chemistry",
    textbook: "Nelson Chemistry 12",
    units: [
      {
        code: "A",
        name: "Scientific Investigation Skills and Career Exploration",
        topics: ["inquiry skills", "lab safety", "data analysis", "science careers"],
        textbookRef: "Nelson Chemistry 12 · skills / lab intro (course-wide)",
        inboxHint: "Photograph a lab procedure page or safety/WHMIS sheet into Inbox.",
      },
      {
        code: "B",
        name: "Organic Chemistry",
        topics: ["hydrocarbons", "functional groups", "reactions of organics", "polymers"],
        textbookRef: "Nelson Chemistry 12 · Ch. 1–2",
        inboxHint: "Photograph organic nomenclature tables or reaction maps into Inbox.",
      },
      {
        code: "C",
        name: "Structure and Properties of Matter",
        topics: ["atomic structure", "bonding", "VSEPR", "intermolecular forces"],
        textbookRef: "Nelson Chemistry 12 · Ch. 3–4",
        inboxHint: "Capture bonding diagrams or VSEPR examples into Inbox.",
      },
      {
        code: "D",
        name: "Energy Changes and Rates of Reaction",
        topics: ["enthalpy", "calorimetry", "collision theory", "rate laws"],
        textbookRef: "Nelson Chemistry 12 · Ch. 5–6",
        inboxHint: "Snap calorimetry worked examples or rate graphs into Inbox.",
      },
      {
        code: "E",
        name: "Chemical Systems and Equilibrium",
        topics: ["equilibrium constant", "Le Chatelier", "acids and bases", "buffers"],
        textbookRef: "Nelson Chemistry 12 · Ch. 7–8",
        inboxHint: "Photograph ICE table practice or titration curves into Inbox.",
      },
      {
        code: "F",
        name: "Electrochemistry",
        topics: ["redox", "galvanic cells", "electrolysis", "cell potential"],
        textbookRef: "Nelson Chemistry 12 · Ch. 9–10",
        inboxHint: "Capture cell diagrams or E° tables into Inbox.",
      },
    ],
  },
  MHF4U: {
    code: "MHF4U",
    title: "Advanced Functions",
    textbook: "Nelson Advanced Functions 12",
    units: [
      {
        code: "A",
        name: "Exponential and Logarithmic Functions",
        topics: ["exponentials", "logarithms", "laws of logs", "applications"],
        textbookRef: "Nelson Advanced Functions 12 · exponential / log chapters",
        inboxHint: "Photograph log-law examples or growth/decay problems into Inbox.",
      },
      {
        code: "B",
        name: "Trigonometric Functions",
        topics: ["radians", "sinusoidal graphs", "identities", "equations"],
        textbookRef: "Nelson Advanced Functions 12 · trigonometry chapters",
        inboxHint: "Snap unit-circle or identity proofs into Inbox.",
      },
      {
        code: "C",
        name: "Polynomial and Rational Functions",
        topics: ["polynomial graphs", "factor theorem", "rational functions", "inequalities"],
        textbookRef: "Nelson Advanced Functions 12 · polynomial / rational chapters",
        inboxHint: "Capture polynomial or rational graph sketches into Inbox.",
      },
      {
        code: "D",
        name: "Characteristics of Functions",
        topics: ["combinations", "rates of change", "inverses", "solving"],
        textbookRef: "Nelson Advanced Functions 12 · characteristics chapters",
        inboxHint: "Photograph combination/inverse function examples into Inbox.",
      },
    ],
  },
  ENG4U: {
    code: "ENG4U",
    title: "English",
    textbook: "Course anthology / board-selected texts (varies by school)",
    units: [
      {
        code: "A",
        name: "Oral Communication",
        topics: ["listening", "speaking", "presentations", "discussion"],
        textbookRef: "Board anthology · Oral / media units (varies)",
        inboxHint: "Photograph rubric criteria or speech outlines into Inbox.",
      },
      {
        code: "B",
        name: "Reading and Literature Studies",
        topics: ["literary analysis", "themes", "form", "critical lenses"],
        textbookRef: "Assigned novel / play / poetry set (school-specific)",
        inboxHint: "Capture annotated passages or essay outlines into Inbox.",
      },
      {
        code: "C",
        name: "Writing",
        topics: ["essay structure", "rhetoric", "revision", "voice"],
        textbookRef: "Writing handbook / teacher package (varies)",
        inboxHint: "Snap exemplar thesis paragraphs or peer-edit checklists into Inbox.",
      },
      {
        code: "D",
        name: "Media Studies",
        topics: ["media forms", "audience", "representation", "production"],
        textbookRef: "Media unit package (board / teacher)",
        inboxHint: "Photograph media analysis frameworks into Inbox.",
      },
    ],
  },
  SBI4U: {
    code: "SBI4U",
    title: "Biology",
    textbook: "Nelson Biology 12",
    units: [
      {
        code: "A",
        name: "Scientific Investigation Skills and Career Exploration",
        topics: ["inquiry skills", "lab safety", "data analysis", "science careers"],
        textbookRef: "Nelson Biology 12 · skills / lab intro (course-wide)",
        inboxHint: "Photograph a lab method page or data table template into Inbox.",
      },
      {
        code: "B",
        name: "Biochemistry",
        topics: ["macromolecules", "enzymes", "cell chemistry"],
        textbookRef: "Nelson Biology 12 · biochemistry chapters",
        inboxHint: "Capture macromolecule charts or enzyme graphs into Inbox.",
      },
      {
        code: "C",
        name: "Metabolic Processes",
        topics: ["cellular respiration", "photosynthesis", "energy transfer"],
        textbookRef: "Nelson Biology 12 · metabolism chapters",
        inboxHint: "Photograph respiration/photosynthesis pathway diagrams into Inbox.",
      },
      {
        code: "D",
        name: "Molecular Genetics",
        topics: ["DNA", "protein synthesis", "biotechnology"],
        textbookRef: "Nelson Biology 12 · genetics chapters",
        inboxHint: "Snap DNA replication or transcription diagrams into Inbox.",
      },
      {
        code: "E",
        name: "Homeostasis",
        topics: ["endocrine", "nervous", "feedback systems"],
        textbookRef: "Nelson Biology 12 · homeostasis chapters",
        inboxHint: "Capture feedback-loop figures into Inbox.",
      },
      {
        code: "F",
        name: "Population Dynamics",
        topics: ["growth models", "interactions", "communities"],
        textbookRef: "Nelson Biology 12 · population chapters",
        inboxHint: "Photograph population graphs or interaction charts into Inbox.",
      },
    ],
  },
  SPH4U: {
    code: "SPH4U",
    title: "Physics",
    textbook: "Nelson Physics 12",
    units: [
      {
        code: "A",
        name: "Scientific Investigation Skills and Career Exploration",
        topics: ["inquiry skills", "lab safety", "data analysis", "science careers"],
        textbookRef: "Nelson Physics 12 · skills / lab intro (course-wide)",
        inboxHint: "Photograph an error-analysis or lab design page into Inbox.",
      },
      {
        code: "B",
        name: "Dynamics",
        topics: ["forces", "Newton’s laws", "circular motion"],
        textbookRef: "Nelson Physics 12 · dynamics chapters",
        inboxHint: "Snap free-body diagrams or circular-motion examples into Inbox.",
      },
      {
        code: "C",
        name: "Energy and Momentum",
        topics: ["work", "energy", "collisions", "conservation"],
        textbookRef: "Nelson Physics 12 · energy / momentum chapters",
        inboxHint: "Photograph collision / conservation worked examples into Inbox.",
      },
      {
        code: "D",
        name: "Gravitational, Electric, and Magnetic Fields",
        topics: ["gravitational", "electric", "magnetic fields"],
        textbookRef: "Nelson Physics 12 · fields chapters",
        inboxHint: "Capture field-line diagrams or Coulomb’s-law problems into Inbox.",
      },
      {
        code: "E",
        name: "The Wave Nature of Light",
        topics: ["interference", "diffraction", "wave optics"],
        textbookRef: "Nelson Physics 12 · wave optics chapters",
        inboxHint: "Snap interference pattern problems into Inbox.",
      },
      {
        code: "F",
        name: "Revolutions in Modern Physics",
        topics: ["quantum", "special relativity", "modern physics"],
        textbookRef: "Nelson Physics 12 · modern physics chapters",
        inboxHint: "Photograph modern-physics summary tables into Inbox.",
      },
    ],
  },
  MCV4U: {
    code: "MCV4U",
    title: "Calculus and Vectors",
    textbook: "Nelson Calculus and Vectors",
    units: [
      {
        code: "A",
        name: "Rate of Change",
        topics: ["limits", "derivatives", "instantaneous rate"],
        textbookRef: "Nelson Calculus and Vectors · rate of change chapters",
        inboxHint: "Capture limit / first-principles derivative examples into Inbox.",
      },
      {
        code: "B",
        name: "Derivatives and Their Applications",
        topics: ["rules", "curve sketching", "optimization"],
        textbookRef: "Nelson Calculus and Vectors · derivatives chapters",
        inboxHint: "Photograph optimization or related-rates problems into Inbox.",
      },
      {
        code: "C",
        name: "Geometry and Algebra of Vectors",
        topics: ["vector operations", "dot product", "applications"],
        textbookRef: "Nelson Calculus and Vectors · vectors chapters",
        inboxHint: "Snap vector diagram problems into Inbox.",
      },
      {
        code: "D",
        name: "Lines and Planes",
        topics: ["equations of lines", "planes", "intersections"],
        textbookRef: "Nelson Calculus and Vectors · lines and planes chapters",
        inboxHint: "Capture line/plane intersection examples into Inbox.",
      },
    ],
  },
};

export function getMoatMap(code: string): MoatCourseMap | null {
  const normalized = code.trim().toUpperCase();
  if (normalized in CURRICULUM_MOAT_MAPS) {
    return CURRICULUM_MOAT_MAPS[normalized as MoatCourseCode];
  }
  return null;
}

export function isMoatCourse(code: string): boolean {
  return getMoatMap(code) !== null;
}
