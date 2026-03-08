export type CurriculumSeedExpectation = {
  code: string;
  title: string;
  description: string;
  strand: string;
};

export type CurriculumSeedUnit = {
  code: string;
  title: string;
  description: string;
  weight: number;
  expectations: CurriculumSeedExpectation[];
};

export type CurriculumSeedCourse = {
  code: string;
  title: string;
  grade: number;
  subject: string;
  destination: string;
  description: string;
  keywords: string[];
  units: CurriculumSeedUnit[];
};

export const ontarioGrade11CurriculumSeed: CurriculumSeedCourse[] = [
  {
    code: "MCR3U",
    title: "Functions",
    grade: 11,
    subject: "Mathematics",
    destination: "University",
    description:
      "This course introduces students to mathematical functions and their representations, with emphasis on algebraic and graphical reasoning.",
    keywords: ["functions", "transformations", "quadratics", "trigonometry", "discrete"],
    units: [
      {
        code: "A",
        title: "Characteristics of Functions",
        description: "Investigate function notation, representations, and key features of different families of functions.",
        weight: 25,
        expectations: [
          { code: "A1", title: "Represent Functions", description: "Represent functions using equations, tables, graphs, and verbal descriptions.", strand: "Functions" },
          { code: "A2", title: "Analyze Features", description: "Determine intercepts, domain, range, and rates of change from multiple representations.", strand: "Functions" },
          { code: "A3", title: "Compare Families", description: "Compare linear, quadratic, and exponential function behaviour in context.", strand: "Functions" },
        ],
      },
      {
        code: "B",
        title: "Transformations",
        description: "Apply translations, reflections, stretches, and compressions to parent functions.",
        weight: 25,
        expectations: [
          { code: "B1", title: "Identify Transformations", description: "Identify transformations applied to parent functions from equations and graphs.", strand: "Transformations" },
          { code: "B2", title: "Model Transformations", description: "Model transformed functions to satisfy specified constraints.", strand: "Transformations" },
          { code: "B3", title: "Solve Problems", description: "Solve contextual problems using transformed function models.", strand: "Transformations" },
        ],
      },
      {
        code: "C",
        title: "Trigonometric Functions",
        description: "Explore sine and cosine functions, periodic behaviour, and real-world modelling.",
        weight: 25,
        expectations: [
          { code: "C1", title: "Use Radian Measure", description: "Convert and interpret angle measure in degrees and radians.", strand: "Trigonometry" },
          { code: "C2", title: "Graph Trig Functions", description: "Graph and analyze sinusoidal functions with amplitude, period, and phase shift.", strand: "Trigonometry" },
          { code: "C3", title: "Model Cyclical Data", description: "Use trigonometric models to interpret periodic phenomena.", strand: "Trigonometry" },
        ],
      },
      {
        code: "D",
        title: "Discrete Functions",
        description: "Develop reasoning with sequences, series, and financial applications of discrete models.",
        weight: 25,
        expectations: [
          { code: "D1", title: "Arithmetic and Geometric Patterns", description: "Represent and analyze arithmetic and geometric sequences and series.", strand: "Discrete" },
          { code: "D2", title: "Financial Models", description: "Apply discrete models to simple and compound interest contexts.", strand: "Discrete" },
          { code: "D3", title: "Evaluate Strategies", description: "Compare strategies and justify decisions using discrete mathematics.", strand: "Discrete" },
        ],
      },
    ],
  },
  {
    code: "SBI3U",
    title: "Biology",
    grade: 11,
    subject: "Science",
    destination: "University",
    description:
      "This course focuses on cellular processes, genetic continuity, anatomy, evolution, and plant biology.",
    keywords: ["cells", "genetics", "evolution", "homeostasis", "plants"],
    units: [
      {
        code: "A",
        title: "Diversity of Living Things",
        description: "Analyze classification systems and evolutionary relationships among organisms.",
        weight: 20,
        expectations: [
          { code: "A1", title: "Classify Organisms", description: "Use taxonomic systems to classify organisms and justify placements.", strand: "Diversity" },
          { code: "A2", title: "Evolutionary Evidence", description: "Evaluate evidence supporting evolutionary relationships.", strand: "Diversity" },
          { code: "A3", title: "Biodiversity and Society", description: "Assess impacts of human activity on biodiversity.", strand: "Diversity" },
        ],
      },
      {
        code: "B",
        title: "Evolution",
        description: "Investigate mechanisms of evolution and population change over time.",
        weight: 20,
        expectations: [
          { code: "B1", title: "Natural Selection", description: "Explain natural selection and adaptation with case studies.", strand: "Evolution" },
          { code: "B2", title: "Population Genetics", description: "Use population models to describe changes in allele frequency.", strand: "Evolution" },
          { code: "B3", title: "Speciation", description: "Describe pathways to speciation and extinction.", strand: "Evolution" },
        ],
      },
      {
        code: "C",
        title: "Genetic Processes",
        description: "Connect DNA, gene expression, inheritance, and biotechnology applications.",
        weight: 30,
        expectations: [
          { code: "C1", title: "Cell Division", description: "Compare mitosis and meiosis and predict outcomes.", strand: "Genetics" },
          { code: "C2", title: "Inheritance Patterns", description: "Solve inheritance problems using Punnett models and pedigree analysis.", strand: "Genetics" },
          { code: "C3", title: "Biotechnology", description: "Evaluate benefits and risks of genetic technologies.", strand: "Genetics" },
        ],
      },
      {
        code: "D",
        title: "Animals and Plants",
        description: "Explore systems that support growth, transport, and regulation in organisms.",
        weight: 30,
        expectations: [
          { code: "D1", title: "Homeostasis", description: "Explain mechanisms that maintain stable internal conditions in animals.", strand: "Systems" },
          { code: "D2", title: "Plant Transport", description: "Describe transport and gas exchange in plants.", strand: "Systems" },
          { code: "D3", title: "Structure and Function", description: "Relate specialized structures to biological function.", strand: "Systems" },
        ],
      },
    ],
  },
  {
    code: "SCH3U",
    title: "Chemistry",
    grade: 11,
    subject: "Science",
    destination: "University",
    description:
      "This course introduces atomic theory, chemical bonding, quantities in chemical reactions, and solutions and solubility.",
    keywords: ["atoms", "bonding", "stoichiometry", "solutions", "reactions"],
    units: [
      {
        code: "A",
        title: "Matter, Chemical Trends, and Bonding",
        description: "Examine periodic trends and explain chemical bonding in compounds.",
        weight: 30,
        expectations: [
          { code: "A1", title: "Periodic Trends", description: "Predict properties using periodic table trends.", strand: "Matter" },
          { code: "A2", title: "Bonding Models", description: "Represent ionic, covalent, and metallic bonding models.", strand: "Matter" },
          { code: "A3", title: "Compound Properties", description: "Relate bonding type to physical and chemical properties.", strand: "Matter" },
        ],
      },
      {
        code: "B",
        title: "Chemical Reactions",
        description: "Classify and predict chemical reactions and balance equations.",
        weight: 20,
        expectations: [
          { code: "B1", title: "Reaction Types", description: "Classify synthesis, decomposition, single and double displacement reactions.", strand: "Reactions" },
          { code: "B2", title: "Balance Equations", description: "Balance equations and validate conservation of mass.", strand: "Reactions" },
          { code: "B3", title: "Applications", description: "Apply reaction concepts to industrial and environmental contexts.", strand: "Reactions" },
        ],
      },
      {
        code: "C",
        title: "Quantities in Chemical Reactions",
        description: "Use mole relationships and stoichiometry to solve quantitative problems.",
        weight: 30,
        expectations: [
          { code: "C1", title: "Mole Concepts", description: "Use Avogadro's number and molar mass conversions accurately.", strand: "Stoichiometry" },
          { code: "C2", title: "Stoichiometric Calculations", description: "Solve mass-mass and limiting reagent problems.", strand: "Stoichiometry" },
          { code: "C3", title: "Percent Yield", description: "Calculate theoretical yield, actual yield, and percent yield.", strand: "Stoichiometry" },
        ],
      },
      {
        code: "D",
        title: "Solutions and Solubility",
        description: "Investigate concentration, dilution, and factors affecting solubility.",
        weight: 20,
        expectations: [
          { code: "D1", title: "Concentration", description: "Calculate concentrations in multiple units.", strand: "Solutions" },
          { code: "D2", title: "Dilution", description: "Apply dilution formulas in laboratory scenarios.", strand: "Solutions" },
          { code: "D3", title: "Solubility Factors", description: "Analyze how temperature and pressure affect solubility.", strand: "Solutions" },
        ],
      },
    ],
  },
  {
    code: "SPH3U",
    title: "Physics",
    grade: 11,
    subject: "Science",
    destination: "University",
    description:
      "This course develops understanding of kinematics, forces, energy, waves, and electricity through inquiry and problem solving.",
    keywords: ["kinematics", "forces", "energy", "waves", "electricity"],
    units: [
      {
        code: "A",
        title: "Kinematics",
        description: "Represent motion with vectors, equations, and graphs in one and two dimensions.",
        weight: 25,
        expectations: [
          { code: "A1", title: "Motion Variables", description: "Relate displacement, velocity, and acceleration in context.", strand: "Kinematics" },
          { code: "A2", title: "Graphical Analysis", description: "Interpret position-time and velocity-time graphs.", strand: "Kinematics" },
          { code: "A3", title: "Problem Solving", description: "Solve multi-step kinematics problems using models and units.", strand: "Kinematics" },
        ],
      },
      {
        code: "B",
        title: "Forces",
        description: "Apply Newtonian mechanics to forces, motion, and equilibrium.",
        weight: 25,
        expectations: [
          { code: "B1", title: "Newton's Laws", description: "Apply Newton's laws to analyze motion and interactions.", strand: "Dynamics" },
          { code: "B2", title: "Free-Body Diagrams", description: "Construct and interpret free-body diagrams.", strand: "Dynamics" },
          { code: "B3", title: "Net Force Calculations", description: "Solve quantitative force and acceleration problems.", strand: "Dynamics" },
        ],
      },
      {
        code: "C",
        title: "Energy and Society",
        description: "Analyze work, power, and energy transformations in natural and engineered systems.",
        weight: 25,
        expectations: [
          { code: "C1", title: "Work and Energy", description: "Relate work, kinetic energy, and potential energy in systems.", strand: "Energy" },
          { code: "C2", title: "Efficiency", description: "Evaluate efficiency and losses in real devices.", strand: "Energy" },
          { code: "C3", title: "Energy Decisions", description: "Assess social and environmental impacts of energy use.", strand: "Energy" },
        ],
      },
      {
        code: "D",
        title: "Waves and Sound",
        description: "Model wave behaviour and applications in communication and technology.",
        weight: 25,
        expectations: [
          { code: "D1", title: "Wave Properties", description: "Describe wavelength, frequency, period, and amplitude relationships.", strand: "Waves" },
          { code: "D2", title: "Wave Behaviour", description: "Explain reflection, refraction, diffraction, and interference.", strand: "Waves" },
          { code: "D3", title: "Sound Applications", description: "Apply wave principles to sound and real-world devices.", strand: "Waves" },
        ],
      },
    ],
  },
  {
    code: "ENG3U",
    title: "English",
    grade: 11,
    subject: "English",
    destination: "University",
    description:
      "This course emphasizes critical literacy, oral communication, media interpretation, and formal writing for diverse audiences.",
    keywords: ["literary analysis", "writing", "media", "communication", "research"],
    units: [
      {
        code: "A",
        title: "Reading and Literature Studies",
        description: "Analyze literary texts for theme, structure, style, and perspective.",
        weight: 30,
        expectations: [
          { code: "A1", title: "Close Reading", description: "Interpret texts using evidence and literary terminology.", strand: "Reading" },
          { code: "A2", title: "Comparative Analysis", description: "Compare themes and perspectives across texts.", strand: "Reading" },
          { code: "A3", title: "Context and Voice", description: "Evaluate how context and authorial choices shape meaning.", strand: "Reading" },
        ],
      },
      {
        code: "B",
        title: "Writing",
        description: "Develop planning, drafting, revision, and editing strategies across forms.",
        weight: 30,
        expectations: [
          { code: "B1", title: "Argument Writing", description: "Write clear, supported arguments for academic audiences.", strand: "Writing" },
          { code: "B2", title: "Organization and Style", description: "Use purposeful organization, diction, and syntax.", strand: "Writing" },
          { code: "B3", title: "Revision Practices", description: "Apply feedback to improve clarity and coherence.", strand: "Writing" },
        ],
      },
      {
        code: "C",
        title: "Oral Communication",
        description: "Strengthen speaking and listening skills in discussion and presentation settings.",
        weight: 20,
        expectations: [
          { code: "C1", title: "Discussion Skills", description: "Contribute thoughtfully to collaborative discussions.", strand: "Oral" },
          { code: "C2", title: "Presentation", description: "Deliver engaging oral presentations using supporting media.", strand: "Oral" },
          { code: "C3", title: "Listening and Response", description: "Respond critically and constructively to spoken texts.", strand: "Oral" },
        ],
      },
      {
        code: "D",
        title: "Media Studies",
        description: "Examine media forms and produce messages for specific purposes and audiences.",
        weight: 20,
        expectations: [
          { code: "D1", title: "Media Analysis", description: "Analyze techniques used to construct media messages.", strand: "Media" },
          { code: "D2", title: "Audience and Purpose", description: "Assess how audience and purpose influence media design.", strand: "Media" },
          { code: "D3", title: "Create Media Texts", description: "Create media products with clear communicative intent.", strand: "Media" },
        ],
      },
    ],
  },
  {
    code: "CHW3M",
    title: "World History to the End of the Fifteenth Century",
    grade: 11,
    subject: "History",
    destination: "University/College",
    description:
      "This course explores global civilizations and major developments from prehistory to the end of the fifteenth century.",
    keywords: ["civilizations", "empires", "belief systems", "trade", "historical inquiry"],
    units: [
      {
        code: "A",
        title: "Historical Inquiry and Skill Building",
        description: "Develop inquiry, evidence interpretation, and communication strategies used in history.",
        weight: 20,
        expectations: [
          { code: "A1", title: "Inquiry Process", description: "Formulate historical questions and gather relevant evidence.", strand: "Inquiry" },
          { code: "A2", title: "Source Analysis", description: "Assess reliability and perspective in primary and secondary sources.", strand: "Inquiry" },
          { code: "A3", title: "Historical Communication", description: "Communicate findings using historical conventions.", strand: "Inquiry" },
        ],
      },
      {
        code: "B",
        title: "Civilizations and Societies",
        description: "Investigate social, political, and cultural features of key ancient and medieval societies.",
        weight: 30,
        expectations: [
          { code: "B1", title: "Structures of Power", description: "Explain governance and social hierarchy in selected civilizations.", strand: "Civilizations" },
          { code: "B2", title: "Belief Systems", description: "Analyze the influence of religion and philosophy on societies.", strand: "Civilizations" },
          { code: "B3", title: "Cultural Exchange", description: "Assess contributions and interactions among civilizations.", strand: "Civilizations" },
        ],
      },
      {
        code: "C",
        title: "Conflict and Change",
        description: "Analyze causes and consequences of conflict, migration, and political transformation.",
        weight: 25,
        expectations: [
          { code: "C1", title: "Drivers of Conflict", description: "Explain political, economic, and cultural causes of conflict.", strand: "Change" },
          { code: "C2", title: "Consequences", description: "Evaluate social and territorial consequences of conflict.", strand: "Change" },
          { code: "C3", title: "Continuity and Change", description: "Assess long-term continuity and change across periods.", strand: "Change" },
        ],
      },
      {
        code: "D",
        title: "Trade and Technology",
        description: "Investigate how trade routes and technologies shaped interconnected societies.",
        weight: 25,
        expectations: [
          { code: "D1", title: "Trade Networks", description: "Map and analyze key trade routes and exchanges.", strand: "Interconnections" },
          { code: "D2", title: "Technological Change", description: "Assess how innovations influenced social organization.", strand: "Interconnections" },
          { code: "D3", title: "Global Connections", description: "Explain interdependence among regions before 1500.", strand: "Interconnections" },
        ],
      },
    ],
  },
];
