export const NAV_SECTIONS = [
  {
    key: 'home',
    label: 'Home',
    icon: '🏠',
    color: '#f0b429',
    items: [
      { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: '🏠' },
      { key: 'content-hub', label: 'Content Hub', href: '/content-hub', icon: '📦' },
      { key: 'study-mode', label: 'Study Mode', href: '/study-mode', icon: '🎯' },
    ]
  },
  {
    key: 'create',
    label: 'Create',
    icon: '✨',
    color: '#f0b429',
    items: [
      { key: 'generator', label: 'Note Generator', href: '/generator', icon: '✨' },
      { key: 'smart-upload', label: 'Smart Upload', href: '/smart-upload', icon: '⚡' },
      { key: 'audio', label: 'Audio to Notes', href: '/audio', icon: '🎙' },
      { key: 'youtube-import', label: 'YouTube Import', href: '/youtube-import', icon: '🎬' },
      { key: 'handwriting', label: 'Handwriting', href: '/handwriting', icon: '✍️' },
      { key: 'lecture', label: 'Live Lecture', href: '/lecture', icon: '🎤' },
      { key: 'classroom-import', label: 'Classroom Import', href: '/classroom-import', icon: '🎓' },
    ]
  },
  {
    key: 'study',
    label: 'Study',
    icon: '📚',
    color: '#2dd4bf',
    items: [
      { key: 'my-notes', label: 'My Notes', href: '/my-notes', icon: '📝' },
      { key: 'flashcards', label: 'Flashcards', href: '/flashcards', icon: '🃏' },
      { key: 'feynman', label: 'Feynman', href: '/feynman', icon: '🔬' },
      { key: 'micro-lessons', label: 'Micro-Lessons', href: '/micro-lessons', icon: '📖' },
      { key: 'adaptive-notes', label: 'Adaptive Notes', href: '/adaptive-notes', icon: '🎯' },
      { key: 'cornell', label: 'Cornell Notes', href: '/cornell', icon: '📋' },
      { key: 'reading-speed', label: 'Reading Trainer', href: '/reading-speed', icon: '⚡' },
      { key: 'pdf-library', label: 'PDF Library', href: '/pdfs', icon: '📄' },
    ]
  },
  {
    key: 'deep-learn',
    label: 'Deep Learn',
    icon: '🧠',
    color: '#8b5cf6',
    items: [
      { key: 'tutor', label: 'AI Tutor', href: '/tutor', icon: '🤖' },
      { key: 'voice-tutor', label: 'Voice Tutor', href: '/voice-tutor', icon: '🗣' },
      { key: 'debate', label: 'AI Debate', href: '/debate', icon: '⚔️' },
      { key: 'counterargument', label: 'Counterargument', href: '/counterargument', icon: '🗡' },
      { key: 'concept-collision', label: 'Concept Collision', href: '/concept-collision', icon: '💥' },
    ]
  },
  {
    key: 'test',
    label: 'Test',
    icon: '📋',
    color: '#ef4444',
    items: [
      { key: 'mock-exam', label: 'Mock Exam', href: '/mock-exam', icon: '📋' },
      { key: 'battle', label: 'Battle Arena', href: '/battle', icon: '⚔️' },
      { key: 'games', label: 'Boss Battle', href: '/games', icon: '🎮' },
      { key: 'battle-royale', label: 'Battle Royale', href: '/battle-royale', icon: '👑' },
      { key: 'crossover', label: 'Crossover', href: '/crossover', icon: '🔀' },
      { key: 'predictor', label: 'Exam Predictor', href: '/predictor', icon: '📊' },
    ]
  },
  {
    key: 'track',
    label: 'Track',
    icon: '📊',
    color: '#10b981',
    items: [
      { key: 'mastery', label: 'Mastery', href: '/mastery', icon: '🏆' },
      { key: 'kyvex-iq', label: 'Kyvex IQ', href: '/kyvex-iq', icon: '🧬' },
      { key: 'autopsy', label: 'Exam Autopsy', href: '/autopsy', icon: '🔬' },
      { key: 'decay-alerts', label: 'Decay Alerts', href: '/decay-alerts', icon: '⏳' },
      { key: 'focus-score', label: 'Focus Score', href: '/focus-score', icon: '🎯' },
    ]
  },
  {
    key: 'plan',
    label: 'Plan',
    icon: '📅',
    color: '#f97316',
    items: [
      { key: 'planner', label: 'AI Planner', href: '/planner', icon: '📅' },
      { key: 'calendar', label: 'Calendar', href: '/calendar', icon: '📆' },
      { key: 'contract', label: 'Study Contract', href: '/contract', icon: '📜' },
      { key: 'grade-calc', label: 'Grade Calculator', href: '/grade-calc', icon: '🎯' },
      { key: 'syllabus', label: 'Syllabus Scanner', href: '/syllabus', icon: '📄' },
    ]
  },
  {
    key: 'social',
    label: 'Social',
    icon: '🌍',
    color: '#ec4899',
    items: [
      { key: 'community', label: 'Community', href: '/community', icon: '🌍' },
      { key: 'rooms', label: 'Study Rooms', href: '/rooms', icon: '🏠' },
      { key: 'library', label: 'Study Library', href: '/library', icon: '📚' },
      { key: 'peer-review', label: 'Peer Review', href: '/peer-review', icon: '🤝' },
    ]
  },
  {
    key: 'grow',
    label: 'Grow',
    icon: '🧬',
    color: '#22d3ee',
    items: [
      { key: 'achievements', label: 'Achievements', href: '/achievements', icon: '🏆' },
      { key: 'study-ghost', label: 'Study Ghost', href: '/study-ghost', icon: '👻' },
      { key: 'wrapped', label: 'Kyvex Wrapped', href: '/wrapped', icon: '🎬' },
      { key: 'career-path', label: 'Career Path', href: '/career-path', icon: '🗺️' },
      { key: 'wellness', label: 'Wellness', href: '/wellness', icon: '💚' },
      { key: 'habits', label: 'Habits', href: '/habits', icon: '✅' },
    ]
  },
  {
    key: 'tools',
    label: 'Tools',
    icon: '🛠',
    color: '#8892b0',
    items: [
      { key: 'diagrams', label: 'Diagrams', href: '/diagrams', icon: '🗺' },
      { key: 'presentations', label: 'Presentations', href: '/presentation', icon: '📊' },
      { key: 'citations', label: 'Citations', href: '/citations', icon: '📚' },
      { key: 'essay-grade', label: 'Essay Grader', href: '/essay-grade', icon: '📝' },
      { key: 'grammar', label: 'Grammar Check', href: '/grammar', icon: '✍️' },
      { key: 'plagiarism', label: 'Originality Check', href: '/plagiarism', icon: '🔍' },
      { key: 'quizlet-import', label: 'Quizlet Import', href: '/quizlet-import', icon: '📥' },
      { key: 'curriculum', label: 'Ontario Curriculum', href: '/curriculum', icon: '🍁' },
    ]
  },
] as const

export type NavSection = (typeof NAV_SECTIONS)[number]
export type NavItem = NavSection['items'][number]
export type NavStyle = 'minimal' | 'icons' | 'bottom' | 'topnav'
