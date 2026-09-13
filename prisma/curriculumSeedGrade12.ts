import type { CurriculumSeedCourse } from "./curriculumSeed";

/**
 * Grade 12 top-target courses — unit/expectation skeleton aligned with
 * Moat Map ministry strand letters (Science A = SIS; content B–F).
 * Expectations are overall-style summaries (not full ministry wording dumps).
 * Seed via prisma/seedCurriculum.ts upsert.
 */
export const ontarioGrade12TopSeed: CurriculumSeedCourse[] = [
  {
    code: "SCH4U",
    title: "Chemistry",
    grade: 12,
    subject: "Chemistry",
    destination: "University",
    description:
      "Organic chemistry, structure and properties, energy and rates, equilibrium, and electrochemistry for university preparation.",
    keywords: ["organic", "equilibrium", "electrochemistry", "enthalpy", "bonding"],
    units: [
      {
        code: "A",
        title: "Scientific Investigation Skills and Career Exploration",
        description: "Develop inquiry, lab, and career skills across chemistry contexts.",
        weight: 10,
        expectations: [
          { code: "A1", title: "Scientific investigation", description: "Plan and conduct chemistry investigations safely and systematically.", strand: "SIS" },
          { code: "A2", title: "Career exploration", description: "Explore chemistry-related careers and required skills.", strand: "SIS" },
        ],
      },
      {
        code: "B",
        title: "Organic Chemistry",
        description: "Analyze organic compounds, reactions, and applications.",
        weight: 18,
        expectations: [
          { code: "B1", title: "Organic structures", description: "Represent and name organic compounds using accepted conventions.", strand: "Organic" },
          { code: "B2", title: "Organic reactions", description: "Predict products and pathways for common organic reactions.", strand: "Organic" },
          { code: "B3", title: "Organic applications", description: "Assess societal and environmental impacts of organic chemistry.", strand: "Organic" },
        ],
      },
      {
        code: "C",
        title: "Structure and Properties of Matter",
        description: "Relate atomic/molecular structure to physical and chemical properties.",
        weight: 18,
        expectations: [
          { code: "C1", title: "Atomic models", description: "Use quantum models to explain periodicity and bonding trends.", strand: "Structure" },
          { code: "C2", title: "Bonding and shape", description: "Predict molecular shape and polarity from bonding theory.", strand: "Structure" },
          { code: "C3", title: "Bulk properties", description: "Relate intermolecular forces to observable properties.", strand: "Structure" },
        ],
      },
      {
        code: "D",
        title: "Energy Changes and Rates of Reaction",
        description: "Quantify energy changes and analyze factors affecting reaction rates.",
        weight: 18,
        expectations: [
          { code: "D1", title: "Thermochemistry", description: "Calculate enthalpy changes using calorimetry and Hess’s law.", strand: "Energy" },
          { code: "D2", title: "Rates", description: "Analyze collision theory and experimental rate data.", strand: "Energy" },
          { code: "D3", title: "Energy applications", description: "Evaluate energy technologies using thermochemical reasoning.", strand: "Energy" },
        ],
      },
      {
        code: "E",
        title: "Chemical Systems and Equilibrium",
        description: "Solve equilibrium problems for chemical and acid–base systems.",
        weight: 18,
        expectations: [
          { code: "E1", title: "Equilibrium systems", description: "Apply Keq and Le Chatelier’s principle to closed systems.", strand: "Equilibrium" },
          { code: "E2", title: "Acid–base", description: "Analyze acid–base equilibria, pH, and buffers.", strand: "Equilibrium" },
          { code: "E3", title: "Equilibrium applications", description: "Assess industrial or environmental equilibrium systems.", strand: "Equilibrium" },
        ],
      },
      {
        code: "F",
        title: "Electrochemistry",
        description: "Analyze redox processes in galvanic and electrolytic cells.",
        weight: 18,
        expectations: [
          { code: "F1", title: "Redox processes", description: "Balance redox reactions and identify oxidizing/reducing agents.", strand: "Electrochemistry" },
          { code: "F2", title: "Electrochemical cells", description: "Analyze galvanic and electrolytic cell operation.", strand: "Electrochemistry" },
          { code: "F3", title: "Cell applications", description: "Evaluate electrochemical technologies and impacts.", strand: "Electrochemistry" },
        ],
      },
    ],
  },
  {
    code: "MHF4U",
    title: "Advanced Functions",
    grade: 12,
    subject: "Mathematics",
    destination: "University",
    description:
      "Polynomial, rational, trigonometric, exponential, and logarithmic functions with combined function analysis.",
    keywords: ["functions", "logarithms", "trigonometry", "polynomials"],
    units: [
      {
        code: "A",
        title: "Exponential and Logarithmic Functions",
        description: "Investigate exponential and logarithmic relationships.",
        weight: 25,
        expectations: [
          { code: "A1", title: "Exponential models", description: "Represent and solve exponential relationships.", strand: "Exp/Log" },
          { code: "A2", title: "Logarithmic models", description: "Apply logarithmic laws and graphs to problems.", strand: "Exp/Log" },
          { code: "A3", title: "Exp/log applications", description: "Solve real-world problems with exp/log models.", strand: "Exp/Log" },
        ],
      },
      {
        code: "B",
        title: "Trigonometric Functions",
        description: "Analyze sinusoidal and trigonometric relationships.",
        weight: 25,
        expectations: [
          { code: "B1", title: "Trig graphs", description: "Graph and transform trigonometric functions.", strand: "Trig" },
          { code: "B2", title: "Trig identities", description: "Prove and apply trigonometric identities.", strand: "Trig" },
          { code: "B3", title: "Trig equations", description: "Solve trigonometric equations in context.", strand: "Trig" },
        ],
      },
      {
        code: "C",
        title: "Polynomial and Rational Functions",
        description: "Analyze polynomial and rational behaviour and solve related problems.",
        weight: 25,
        expectations: [
          { code: "C1", title: "Polynomial graphs", description: "Connect equations to graphical features of polynomials.", strand: "Polynomials" },
          { code: "C2", title: "Factor and divide", description: "Use factor/remainder theorems and division algorithms.", strand: "Polynomials" },
          { code: "C3", title: "Polynomial solving", description: "Solve polynomial equations and inequalities.", strand: "Polynomials" },
        ],
      },
      {
        code: "D",
        title: "Characteristics of Functions",
        description: "Combine functions and analyze rates of change.",
        weight: 25,
        expectations: [
          { code: "D1", title: "Function operations", description: "Combine and compose functions algebraically and graphically.", strand: "Characteristics" },
          { code: "D2", title: "Rates of change", description: "Compare average and instantaneous rates of change.", strand: "Characteristics" },
          { code: "D3", title: "Solving with functions", description: "Solve problems involving combinations of functions.", strand: "Characteristics" },
        ],
      },
    ],
  },
  {
    code: "ENG4U",
    title: "English",
    grade: 12,
    subject: "English",
    destination: "University",
    description:
      "University-preparation English emphasizing oral communication, literature, writing, and media studies.",
    keywords: ["literature", "essay", "media", "rhetoric"],
    units: [
      {
        code: "A",
        title: "Oral Communication",
        description: "Listen and speak for academic and public purposes.",
        weight: 25,
        expectations: [
          { code: "A1", title: "Listening", description: "Demonstrate understanding of oral texts and discussions.", strand: "Oral" },
          { code: "A2", title: "Speaking", description: "Communicate ideas orally with purpose and audience awareness.", strand: "Oral" },
          { code: "A3", title: "Reflecting on oral", description: "Reflect on oral communication strategies and growth.", strand: "Oral" },
        ],
      },
      {
        code: "B",
        title: "Reading and Literature Studies",
        description: "Read and interpret a range of literary and informational texts.",
        weight: 25,
        expectations: [
          { code: "B1", title: "Reading for meaning", description: "Analyze texts for theme, form, and style.", strand: "Reading" },
          { code: "B2", title: "Critical interpretation", description: "Apply critical lenses to literature.", strand: "Reading" },
          { code: "B3", title: "Text connections", description: "Make connections across texts and contexts.", strand: "Reading" },
        ],
      },
      {
        code: "C",
        title: "Writing",
        description: "Write for academic and creative purposes with revision.",
        weight: 25,
        expectations: [
          { code: "C1", title: "Developing ideas", description: "Generate and organize ideas for written texts.", strand: "Writing" },
          { code: "C2", title: "Form and style", description: "Use appropriate form, voice, and conventions.", strand: "Writing" },
          { code: "C3", title: "Revising writing", description: "Revise and edit to strengthen clarity and impact.", strand: "Writing" },
        ],
      },
      {
        code: "D",
        title: "Media Studies",
        description: "Analyze and create media texts.",
        weight: 25,
        expectations: [
          { code: "D1", title: "Understanding media", description: "Interpret media forms, audiences, and messages.", strand: "Media" },
          { code: "D2", title: "Creating media", description: "Produce media texts for defined purposes.", strand: "Media" },
          { code: "D3", title: "Reflecting on media", description: "Reflect on media practices and impacts.", strand: "Media" },
        ],
      },
    ],
  },
  {
    code: "SBI4U",
    title: "Biology",
    grade: 12,
    subject: "Biology",
    destination: "University",
    description:
      "Biochemistry, metabolic processes, molecular genetics, homeostasis, and population dynamics.",
    keywords: ["DNA", "enzymes", "homeostasis", "populations", "metabolism"],
    units: [
      {
        code: "A",
        title: "Scientific Investigation Skills and Career Exploration",
        description: "Develop inquiry, lab, and career skills across biology contexts.",
        weight: 10,
        expectations: [
          { code: "A1", title: "Scientific investigation", description: "Plan and conduct biology investigations safely and systematically.", strand: "SIS" },
          { code: "A2", title: "Career exploration", description: "Explore biology-related careers and required skills.", strand: "SIS" },
        ],
      },
      {
        code: "B",
        title: "Biochemistry",
        description: "Analyze chemical processes in living systems.",
        weight: 18,
        expectations: [
          { code: "B1", title: "Macromolecules", description: "Relate structure of macromolecules to function.", strand: "Biochemistry" },
          { code: "B2", title: "Enzymes", description: "Analyze enzyme activity and factors that affect it.", strand: "Biochemistry" },
          { code: "B3", title: "Biochem applications", description: "Assess biochemical technologies and issues.", strand: "Biochemistry" },
        ],
      },
      {
        code: "C",
        title: "Metabolic Processes",
        description: "Investigate cellular energy transformations.",
        weight: 18,
        expectations: [
          { code: "C1", title: "Cellular respiration", description: "Analyze stages and energy yield of respiration.", strand: "Metabolism" },
          { code: "C2", title: "Photosynthesis", description: "Analyze photosynthetic pathways and factors.", strand: "Metabolism" },
          { code: "C3", title: "Metabolism applications", description: "Evaluate metabolic technologies and impacts.", strand: "Metabolism" },
        ],
      },
      {
        code: "D",
        title: "Molecular Genetics",
        description: "Investigate DNA, gene expression, and biotechnology.",
        weight: 18,
        expectations: [
          { code: "D1", title: "DNA and genes", description: "Explain DNA structure, replication, and mutation.", strand: "Genetics" },
          { code: "D2", title: "Protein synthesis", description: "Analyze transcription and translation.", strand: "Genetics" },
          { code: "D3", title: "Biotechnology", description: "Assess genetic technologies and ethics.", strand: "Genetics" },
        ],
      },
      {
        code: "E",
        title: "Homeostasis",
        description: "Analyze physiological feedback systems.",
        weight: 18,
        expectations: [
          { code: "E1", title: "Feedback systems", description: "Explain negative and positive feedback mechanisms.", strand: "Homeostasis" },
          { code: "E2", title: "Endocrine/nervous", description: "Analyze endocrine and nervous coordination.", strand: "Homeostasis" },
          { code: "E3", title: "Homeostasis issues", description: "Assess disorders and treatments related to homeostasis.", strand: "Homeostasis" },
        ],
      },
      {
        code: "F",
        title: "Population Dynamics",
        description: "Analyze factors affecting populations and communities.",
        weight: 18,
        expectations: [
          { code: "F1", title: "Population growth", description: "Model population growth and limiting factors.", strand: "Populations" },
          { code: "F2", title: "Interactions", description: "Analyze species interactions in communities.", strand: "Populations" },
          { code: "F3", title: "Population issues", description: "Evaluate human impacts on populations and ecosystems.", strand: "Populations" },
        ],
      },
    ],
  },
  {
    code: "SPH4U",
    title: "Physics",
    grade: 12,
    subject: "Physics",
    destination: "University",
    description:
      "Dynamics, energy and momentum, fields, wave nature of light, and modern physics.",
    keywords: ["dynamics", "fields", "waves", "momentum", "quantum"],
    units: [
      {
        code: "A",
        title: "Scientific Investigation Skills and Career Exploration",
        description: "Develop inquiry, lab, and career skills across physics contexts.",
        weight: 10,
        expectations: [
          { code: "A1", title: "Scientific investigation", description: "Plan and conduct physics investigations safely and systematically.", strand: "SIS" },
          { code: "A2", title: "Career exploration", description: "Explore physics-related careers and required skills.", strand: "SIS" },
        ],
      },
      {
        code: "B",
        title: "Dynamics",
        description: "Analyze forces and motion in inertial frames.",
        weight: 18,
        expectations: [
          { code: "B1", title: "Forces and motion", description: "Apply Newton’s laws to multi-force systems.", strand: "Dynamics" },
          { code: "B2", title: "Circular motion", description: "Analyze uniform circular motion and related forces.", strand: "Dynamics" },
          { code: "B3", title: "Dynamics applications", description: "Solve contextual dynamics problems.", strand: "Dynamics" },
        ],
      },
      {
        code: "C",
        title: "Energy and Momentum",
        description: "Apply conservation laws to mechanical systems.",
        weight: 18,
        expectations: [
          { code: "C1", title: "Work and energy", description: "Analyze work–energy relationships.", strand: "Energy" },
          { code: "C2", title: "Momentum", description: "Apply momentum conservation to collisions.", strand: "Energy" },
          { code: "C3", title: "Energy applications", description: "Evaluate technologies using conservation laws.", strand: "Energy" },
        ],
      },
      {
        code: "D",
        title: "Gravitational, Electric, and Magnetic Fields",
        description: "Analyze gravitational, electric, and magnetic fields.",
        weight: 18,
        expectations: [
          { code: "D1", title: "Gravitational fields", description: "Analyze gravitational field strength and potential.", strand: "Fields" },
          { code: "D2", title: "Electric fields", description: "Analyze electric force, field, and potential.", strand: "Fields" },
          { code: "D3", title: "Magnetic fields", description: "Analyze magnetic forces on charges and currents.", strand: "Fields" },
        ],
      },
      {
        code: "E",
        title: "The Wave Nature of Light",
        description: "Investigate wave properties of light.",
        weight: 18,
        expectations: [
          { code: "E1", title: "Wave properties", description: "Analyze interference and diffraction of light.", strand: "Waves" },
          { code: "E2", title: "Light models", description: "Compare wave and particle models of light.", strand: "Waves" },
          { code: "E3", title: "Optics applications", description: "Assess technologies based on wave optics.", strand: "Waves" },
        ],
      },
      {
        code: "F",
        title: "Revolutions in Modern Physics",
        description: "Explore quantum, relativity, and nuclear ideas.",
        weight: 18,
        expectations: [
          { code: "F1", title: "Quantum ideas", description: "Explain photoelectric and quantum phenomena.", strand: "Modern" },
          { code: "F2", title: "Special relativity", description: "Analyze time dilation and length contraction qualitatively.", strand: "Modern" },
          { code: "F3", title: "Nuclear", description: "Analyze radioactive decay and nuclear energy.", strand: "Modern" },
        ],
      },
    ],
  },
  {
    code: "MCV4U",
    title: "Calculus and Vectors",
    grade: 12,
    subject: "Mathematics",
    destination: "University",
    description:
      "Rates of change, derivatives and applications, vectors, and lines and planes in three-space.",
    keywords: ["derivatives", "vectors", "optimization", "planes"],
    units: [
      {
        code: "A",
        title: "Rates of Change",
        description: "Develop the derivative concept from rates of change.",
        weight: 25,
        expectations: [
          { code: "A1", title: "Limits", description: "Use limits to describe instantaneous rates of change.", strand: "Rates" },
          { code: "A2", title: "Derivative concept", description: "Define and interpret the derivative.", strand: "Rates" },
          { code: "A3", title: "Rate applications", description: "Solve problems involving instantaneous rates.", strand: "Rates" },
        ],
      },
      {
        code: "B",
        title: "Derivatives and Their Applications",
        description: "Differentiate and apply derivatives to problems.",
        weight: 25,
        expectations: [
          { code: "B1", title: "Derivative rules", description: "Apply differentiation rules to algebraic and trigonometric functions.", strand: "Derivatives" },
          { code: "B2", title: "Curve analysis", description: "Analyze curves using first and second derivatives.", strand: "Derivatives" },
          { code: "B3", title: "Optimization", description: "Solve optimization and related-rates problems.", strand: "Derivatives" },
        ],
      },
      {
        code: "C",
        title: "Geometry and Algebra of Vectors",
        description: "Operate with vectors in two and three dimensions.",
        weight: 25,
        expectations: [
          { code: "C1", title: "Vector operations", description: "Perform algebraic and geometric vector operations.", strand: "Vectors" },
          { code: "C2", title: "Dot product", description: "Apply the dot product to angles and projections.", strand: "Vectors" },
          { code: "C3", title: "Vector applications", description: "Model physical and geometric situations with vectors.", strand: "Vectors" },
        ],
      },
      {
        code: "D",
        title: "Lines and Planes",
        description: "Analyze lines and planes in three-space.",
        weight: 25,
        expectations: [
          { code: "D1", title: "Lines in space", description: "Represent lines with vector, parametric, and symmetric equations.", strand: "Lines/Planes" },
          { code: "D2", title: "Planes", description: "Represent planes and analyze intersections.", strand: "Lines/Planes" },
          { code: "D3", title: "3D applications", description: "Solve geometric problems involving lines and planes.", strand: "Lines/Planes" },
        ],
      },
    ],
  },
];
