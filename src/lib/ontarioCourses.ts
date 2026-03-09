export interface OntarioCourse {
  code: string;
  name: string;
  grade: number;
  category: string;
  type: string;
  description: string;
}

export const ALL_ONTARIO_COURSES: OntarioCourse[] = [
  // ================================================================
  // GRADE 9
  // ================================================================

  // Mathematics
  { code: "MPM1D", name: "Principles of Mathematics", grade: 9, category: "Math", type: "Academic", description: "This course enables students to develop an understanding of mathematical concepts related to algebra, analytic geometry, and measurement and geometry through investigation, the effective use of technology, and abstract reasoning." },
  { code: "MFM1P", name: "Foundations of Mathematics", grade: 9, category: "Math", type: "Applied", description: "This course enables students to develop an understanding of mathematical concepts related to introductory algebra, proportional reasoning, and measurement and geometry through investigation, the effective use of technology, and hands-on activities." },
  { code: "MAT1L", name: "Mathematics Transfer Course", grade: 9, category: "Math", type: "Essentials", description: "This course is designed to help students make connections between mathematics and the real world and develop the skills needed for everyday life." },

  // Science
  { code: "SNC1D", name: "Science", grade: 9, category: "Science", type: "Academic", description: "This course enables students to develop their understanding of basic concepts in biology, chemistry, earth and space science, and physics, and to relate science to technology, society, and the environment." },
  { code: "SNC1P", name: "Science", grade: 9, category: "Science", type: "Applied", description: "This course enables students to develop their understanding of basic concepts in biology, chemistry, earth and space science, and physics through hands-on investigations and the effective use of technology." },
  { code: "SNC1L", name: "Science Transfer Course", grade: 9, category: "Science", type: "Essentials", description: "This course is designed to help students develop scientific literacy and connect science to everyday life." },

  // English
  { code: "ENG1D", name: "English", grade: 9, category: "English", type: "Academic", description: "This course is designed to develop the oral communication, reading, writing, and media literacy skills that students need for success in secondary school and daily life." },
  { code: "ENG1P", name: "English", grade: 9, category: "English", type: "Applied", description: "This course is designed to develop the key reading, writing, oral communication, and media literacy skills students need for success in secondary school and daily life." },
  { code: "ENG1L", name: "English Transfer Course", grade: 9, category: "English", type: "Essentials", description: "This course is designed to develop reading, writing, and oral communication skills in meaningful, real-life contexts." },
  { code: "EAE1D", name: "English as a Second Language, Level 1", grade: 9, category: "English", type: "Open", description: "This course is designed to give students who are learning English as a second language the skills needed to listen, speak, read, and write in English." },

  // French
  { code: "FSF1D", name: "Core French", grade: 9, category: "French", type: "Academic", description: "This course draws on a variety of themes to promote extensive development of French-language skills. Students will develop their ability to understand and speak French and will also develop their reading and writing skills." },
  { code: "FSF1P", name: "Core French", grade: 9, category: "French", type: "Applied", description: "This course provides opportunities for students to use French in a variety of situations and contexts, building on their prior learning of the language." },
  { code: "FIF1O", name: "French Immersion", grade: 9, category: "French", type: "Open", description: "This course is designed for students who have been studying in a French immersion program." },

  // Geography
  { code: "CGC1D", name: "Issues in Canadian Geography", grade: 9, category: "Social Studies", type: "Academic", description: "This course examines interrelationships between Canadians and their physical and human environments. Students will use the concepts of geographic thinking and the geographic inquiry process to investigate issues related to Canadian geography." },
  { code: "CGC1P", name: "Issues in Canadian Geography", grade: 9, category: "Social Studies", type: "Applied", description: "This course focuses on geographic inquiry and the use of geographic tools as students examine issues relating to Canadian geography." },

  // Physical Education
  { code: "PPL1O", name: "Healthy Active Living Education", grade: 9, category: "Physical Education", type: "Open", description: "This course equips students with the knowledge and skills they need to make healthy choices now and lead healthy, active lives in the future." },

  // Arts
  { code: "AVI1O", name: "Visual Arts", grade: 9, category: "Arts", type: "Open", description: "This course offers a balance of practical and theory components to teach students the fundamentals of visual arts." },
  { code: "AMU1O", name: "Music", grade: 9, category: "Arts", type: "Open", description: "This course provides students with opportunities to sing and play music in a variety of ensembles and develop their understanding of music." },
  { code: "ADA1O", name: "Drama", grade: 9, category: "Arts", type: "Open", description: "This course provides students with opportunities to explore dramatic forms and techniques, using stories and material from a variety of sources." },
  { code: "AMV1O", name: "Media Arts", grade: 9, category: "Arts", type: "Open", description: "This course introduces students to media arts, including film, video, and digital technologies." },

  // Tech Education
  { code: "TGJ1O", name: "Communications Technology", grade: 9, category: "Technology", type: "Open", description: "This course introduces students to communications technology through project-based activities." },
  { code: "TEJ1O", name: "Computer Engineering Technology", grade: 9, category: "Technology", type: "Open", description: "This course introduces students to computer engineering and electronics through hands-on activities." },

  // ================================================================
  // GRADE 10
  // ================================================================

  // Mathematics
  { code: "MPM2D", name: "Principles of Mathematics", grade: 10, category: "Math", type: "Academic", description: "This course enables students to broaden their understanding of relationships and extend their problem-solving and algebraic skills through investigation, the effective use of technology, and abstract reasoning." },
  { code: "MFM2P", name: "Foundations of Mathematics", grade: 10, category: "Math", type: "Applied", description: "This course enables students to consolidate their understanding of linear relations and extend their problem-solving and algebraic skills through investigation." },
  { code: "MAT2L", name: "Mathematics Transfer Course", grade: 10, category: "Math", type: "Essentials", description: "This course is designed to help students strengthen their mathematical knowledge and skills to meet everyday needs." },

  // Science
  { code: "SNC2D", name: "Science", grade: 10, category: "Science", type: "Academic", description: "This course enables students to enhance their understanding of concepts in biology, chemistry, earth and space science, and physics, and of the interrelationships between science, technology, society, and the environment." },
  { code: "SNC2P", name: "Science", grade: 10, category: "Science", type: "Applied", description: "This course enables students to develop a deeper understanding of concepts in biology, chemistry, earth and space science, and physics through hands-on investigations." },
  { code: "SNC2L", name: "Science Transfer Course", grade: 10, category: "Science", type: "Essentials", description: "This course helps students develop scientific literacy through everyday contexts." },

  // English
  { code: "ENG2D", name: "English", grade: 10, category: "English", type: "Academic", description: "This course is designed to extend the range of oral communication, reading, writing, and media literacy skills that students need for success in secondary school and daily life." },
  { code: "ENG2P", name: "English", grade: 10, category: "English", type: "Applied", description: "This course is designed to extend the range of reading, writing, oral communication, and media literacy skills that students need for success in secondary school and daily life." },
  { code: "ENG2L", name: "English Transfer Course", grade: 10, category: "English", type: "Essentials", description: "This course develops reading, writing, and oral communication skills in real-life contexts." },

  // French
  { code: "FSF2D", name: "Core French", grade: 10, category: "French", type: "Academic", description: "This course uses a variety of themes to promote development of French-language skills. Students continue to build competency in listening, speaking, reading, and writing." },
  { code: "FSF2P", name: "Core French", grade: 10, category: "French", type: "Applied", description: "This course provides students with opportunities to use French in a range of situations and contexts." },

  // History
  { code: "CHC2D", name: "Canadian History Since World War I", grade: 10, category: "History", type: "Academic", description: "This course explores social, economic, political, and military developments and events and their impact on the lives of different groups in Canada since 1914." },
  { code: "CHC2P", name: "Canadian History Since World War I", grade: 10, category: "History", type: "Applied", description: "This course focuses on the experiences of various groups in Canada since 1914 and how those experiences have shaped Canadian identity and society." },

  // Civics and Careers (half-credit)
  { code: "CHV2O", name: "Civics and Citizenship", grade: 10, category: "Social Studies", type: "Open", description: "This course explores rights and responsibilities associated with being an active citizen in a democratic society." },
  { code: "GLC2O", name: "Career Studies", grade: 10, category: "Guidance", type: "Open", description: "This course teaches students how to develop and achieve personal goals for future learning, work, and community involvement." },

  // Physical Education
  { code: "PPL2O", name: "Healthy Active Living Education", grade: 10, category: "Physical Education", type: "Open", description: "This course develops the knowledge and skills for healthy active living that are essential for lifelong health and wellness." },

  // Arts
  { code: "AVI2O", name: "Visual Arts", grade: 10, category: "Arts", type: "Open", description: "This course enables students to develop their skills in producing and interpreting art." },
  { code: "AMU2O", name: "Music", grade: 10, category: "Arts", type: "Open", description: "This course enables students to develop musical skills in ensemble and solo performance." },
  { code: "ADA2O", name: "Drama", grade: 10, category: "Arts", type: "Open", description: "This course provides students with opportunities to further develop their skills in drama and to explore dramatic forms." },

  // Tech
  { code: "TGJ2O", name: "Communications Technology", grade: 10, category: "Technology", type: "Open", description: "This course introduces students to communications technology through project-based activities in a variety of areas." },
  { code: "TEJ2O", name: "Computer Engineering Technology", grade: 10, category: "Technology", type: "Open", description: "This course further develops students knowledge and skills in computer engineering." },

  // ================================================================
  // GRADE 11
  // ================================================================

  // Mathematics
  { code: "MCR3U", name: "Functions", grade: 11, category: "Math", type: "University", description: "This course introduces the mathematical concept of the function by extending students experiences with linear and quadratic relations." },
  { code: "MCF3M", name: "Functions and Applications", grade: 11, category: "Math", type: "University/College", description: "This course introduces basic features of the function by extending students experiences with quadratic relations and introducing exponential functions." },
  { code: "MBF3C", name: "Foundations for College Mathematics", grade: 11, category: "Math", type: "College", description: "This course enables students to broaden their understanding of mathematics as a problem-solving tool in the real world." },
  { code: "MEL3E", name: "Mathematics for Everyday Life", grade: 11, category: "Math", type: "Workplace", description: "This course enables students to broaden their understanding of mathematics as it is applied in the workplace and daily life." },
  { code: "ICS3U", name: "Introduction to Computer Science", grade: 11, category: "Computer Science", type: "University", description: "This course introduces students to computer science and provides them with tools to explore programming concepts." },
  { code: "ICS3C", name: "Introduction to Computer Studies", grade: 11, category: "Computer Science", type: "College", description: "This course introduces students to computer studies through project-based activities using various software applications." },

  // Science
  { code: "SBI3U", name: "Biology", grade: 11, category: "Science", type: "University", description: "This course furthers students understanding of the processes involved in biological systems." },
  { code: "SCH3U", name: "Chemistry", grade: 11, category: "Science", type: "University", description: "This course enables students to deepen their understanding of chemistry through the study of matter and chemical bonding." },
  { code: "SPH3U", name: "Physics", grade: 11, category: "Science", type: "University", description: "This course develops students understanding of the basic concepts of physics." },
  { code: "SES3U", name: "Earth and Space Science", grade: 11, category: "Science", type: "University", description: "This course develops students understanding of earth and space science concepts." },
  { code: "SVN3M", name: "Environmental Science", grade: 11, category: "Science", type: "University/College", description: "This course provides students with the fundamental knowledge of and skills relating to environmental science." },
  { code: "SBI3C", name: "Biology", grade: 11, category: "Science", type: "College", description: "This course focuses on the processes of life systems for students who plan to pursue college programs." },
  { code: "SCH3C", name: "Chemistry", grade: 11, category: "Science", type: "College", description: "This course enables students to deepen their understanding of chemistry for college-bound students." },
  { code: "SPH3C", name: "Physics", grade: 11, category: "Science", type: "College", description: "This course focuses on physics concepts for students who plan to pursue college programs." },

  // English
  { code: "ENG3U", name: "English", grade: 11, category: "English", type: "University", description: "This course emphasizes the development of literacy, communication, and critical and creative thinking skills through the study of literature, language, media, and oral communication." },
  { code: "ENG3C", name: "English", grade: 11, category: "English", type: "College", description: "This course emphasizes the development of literacy and communication skills through study of literature and other texts." },
  { code: "ENG3E", name: "English", grade: 11, category: "English", type: "Workplace", description: "This course emphasizes the development of practical communication skills for the workplace." },
  { code: "NBE3U", name: "English: Understanding Contemporary First Nations, Metis, and Inuit Voices", grade: 11, category: "English", type: "University", description: "This course emphasizes the development of literacy and communication skills through the study of First Nations, Metis, and Inuit literature and other texts." },
  { code: "NBE3C", name: "Contemporary First Nations, Metis, and Inuit Voices", grade: 11, category: "English", type: "College", description: "This course develops literacy and communication through contemporary First Nations, Metis, and Inuit texts." },

  // French
  { code: "FSF3U", name: "Core French", grade: 11, category: "French", type: "University", description: "This course draws on a variety of themes to promote extensive development of French-language skills." },
  { code: "FSF3C", name: "Core French", grade: 11, category: "French", type: "College", description: "This course uses a variety of themes to promote development of French-language skills for college-bound students." },
  { code: "FEF3O", name: "French as a Second Language", grade: 11, category: "French", type: "Open", description: "This course is designed for students who wish to continue developing their French language skills." },

  // History / Social Studies
  { code: "CHW3M", name: "World History to the End of the Fifteenth Century", grade: 11, category: "History", type: "University/College", description: "This course investigates the history of humanity from earliest times to the end of the fifteenth century." },
  { code: "CHE3M", name: "Ancient Civilizations", grade: 11, category: "History", type: "University/College", description: "This course investigates the great civilizations of the ancient world." },
  { code: "CGF3M", name: "Forces of Nature: Physical Processes and Disasters", grade: 11, category: "Geography", type: "University/College", description: "This course focuses on natural processes and how they affect human societies." },
  { code: "CGG3O", name: "Travel and Tourism: A Geographic Perspective", grade: 11, category: "Geography", type: "Open", description: "This course focuses on travel and tourism from a geographic perspective." },
  { code: "CLU3M", name: "Understanding Canadian Law", grade: 11, category: "Social Studies", type: "University/College", description: "This course explores the Canadian legal system and the rights and responsibilities of Canadians." },
  { code: "HSP3U", name: "Introduction to Anthropology, Psychology, and Sociology", grade: 11, category: "Social Sciences", type: "University", description: "This course provides students with opportunities to think like social scientists as they investigate human behaviour." },
  { code: "HHG3O", name: "Human Development Throughout the Lifespan", grade: 11, category: "Social Sciences", type: "Open", description: "This course focuses on human development from birth to old age." },
  { code: "HFA3C", name: "Food and Culture", grade: 11, category: "Social Sciences", type: "College", description: "This course examines the role of food in various cultures and traditions." },
  { code: "HHS3C", name: "Raising Healthy Children", grade: 11, category: "Social Sciences", type: "College", description: "This course examines the knowledge and skills needed to raise healthy children." },
  { code: "HIP3O", name: "Navigating the Mental Health System", grade: 11, category: "Social Sciences", type: "Open", description: "This course examines mental health and available support systems." },
  { code: "PPL3O", name: "Healthy Active Living Education", grade: 11, category: "Physical Education", type: "Open", description: "This course focuses on healthy active living through physical activity and health knowledge." },

  // Business
  { code: "BAF3M", name: "Financial Accounting Fundamentals", grade: 11, category: "Business", type: "University/College", description: "This course introduces students to the fundamental principles of accounting." },
  { code: "BDI3C", name: "The Entrepreneurial Adventure", grade: 11, category: "Business", type: "College", description: "This course focuses on the process of identifying and pursuing entrepreneurial opportunities." },
  { code: "BMI3C", name: "Marketing: From Theory to Practice", grade: 11, category: "Business", type: "College", description: "This course introduces students to the fundamental principles and practices of marketing." },
  { code: "BTT3O", name: "Information and Communication Technology in Business", grade: 11, category: "Business", type: "Open", description: "This course introduces students to information and communication technology skills in a business context." },

  // Arts
  { code: "AVI3M", name: "Visual Arts", grade: 11, category: "Arts", type: "University/College", description: "This course enables students to develop their art-making skills and their understanding of art history and contemporary practice." },
  { code: "AMU3M", name: "Music", grade: 11, category: "Arts", type: "University/College", description: "This course enables students to continue their development as musical performers and to broaden their understanding of music." },
  { code: "ADA3M", name: "Drama", grade: 11, category: "Arts", type: "University/College", description: "This course enables students to develop their skills in dramatic forms and to explore social and personal issues through drama." },
  { code: "AWR3M", name: "Writer's Craft", grade: 11, category: "Arts", type: "University/College", description: "This course focuses on the development of writing skills and styles across a variety of forms." },

  // ================================================================
  // GRADE 12
  // ================================================================

  // Mathematics
  { code: "MHF4U", name: "Advanced Functions", grade: 12, category: "Math", type: "University", description: "This course extends students experience with functions. Students will investigate the properties of polynomial, rational, logarithmic, and trigonometric functions." },
  { code: "MCV4U", name: "Calculus and Vectors", grade: 12, category: "Math", type: "University", description: "This course builds on students previous experience with functions and their developing understanding of rates of change." },
  { code: "MDM4U", name: "Mathematics of Data Management", grade: 12, category: "Math", type: "University", description: "This course broadens students understanding of mathematics as it relates to managing data." },
  { code: "MAP4C", name: "Foundations for College Mathematics", grade: 12, category: "Math", type: "College", description: "This course enables students to broaden their understanding of real-world applications of mathematics." },
  { code: "MEL4E", name: "Mathematics for Everyday Life", grade: 12, category: "Math", type: "Workplace", description: "This course enables students to broaden their understanding of mathematics as it is applied in the workplace." },
  { code: "ICS4U", name: "Computer Science", grade: 12, category: "Computer Science", type: "University", description: "This course enables students to further develop knowledge and skills in computer science." },
  { code: "ICS4C", name: "Computer Studies", grade: 12, category: "Computer Science", type: "College", description: "This course further develops students knowledge and skills in computing for college programs." },

  // Science
  { code: "SBI4U", name: "Biology", grade: 12, category: "Science", type: "University", description: "This course provides students with the opportunity for in-depth study of the concepts and processes associated with biological systems." },
  { code: "SCH4U", name: "Chemistry", grade: 12, category: "Science", type: "University", description: "This course enables students to deepen their understanding of chemistry through the study of organic chemistry, energy changes and rates of reaction." },
  { code: "SPH4U", name: "Physics", grade: 12, category: "Science", type: "University", description: "This course enables students to deepen their understanding of physics concepts and theories." },
  { code: "SES4U", name: "Earth and Space Science", grade: 12, category: "Science", type: "University", description: "This course develops students understanding of earth and space science at an advanced level." },
  { code: "SVN4M", name: "Environmental Science", grade: 12, category: "Science", type: "University/College", description: "This course provides students with an in-depth understanding of environmental science concepts." },
  { code: "SBI4C", name: "Biology", grade: 12, category: "Science", type: "College", description: "This course focuses on biology concepts for students who plan to pursue college programs." },
  { code: "SCH4C", name: "Chemistry", grade: 12, category: "Science", type: "College", description: "This course enables students to deepen their understanding of chemistry for college programs." },
  { code: "SPH4C", name: "Physics", grade: 12, category: "Science", type: "College", description: "This course focuses on physics concepts for college-bound students." },

  // English
  { code: "ENG4U", name: "English", grade: 12, category: "English", type: "University", description: "This course emphasizes the consolidation of the literacy, communication, and critical and creative thinking skills necessary for success in academic and daily life." },
  { code: "ENG4C", name: "English", grade: 12, category: "English", type: "College", description: "This course emphasizes the consolidation of literacy and communication skills for students entering the workplace or college." },
  { code: "ENG4E", name: "English", grade: 12, category: "English", type: "Workplace", description: "This course emphasizes the consolidation of practical literacy and communication skills for the workplace." },
  { code: "OLC4O", name: "Ontario Secondary School Literacy Course", grade: 12, category: "English", type: "Open", description: "This course is designed to help students who have been eligible to write the Ontario Secondary School Literacy Test acquire the essential reading and writing skills." },
  { code: "NBE4U", name: "English: Understanding Contemporary First Nations, Metis, and Inuit Voices", grade: 12, category: "English", type: "University", description: "This course emphasizes the refinement of literacy and communication skills through study of First Nations, Metis, and Inuit voices." },
  { code: "NBE4C", name: "Contemporary First Nations, Metis, and Inuit Voices", grade: 12, category: "English", type: "College", description: "This course develops literacy through contemporary First Nations, Metis, and Inuit texts for college-bound students." },

  // French
  { code: "FSF4U", name: "Core French", grade: 12, category: "French", type: "University", description: "This course draws on a variety of themes to promote extensive development of French-language skills at an advanced level." },
  { code: "FSF4C", name: "Core French", grade: 12, category: "French", type: "College", description: "This course uses a variety of themes to promote development of French-language skills for college-bound students." },

  // History / Social Studies
  { code: "CHY4U", name: "World History Since the Fifteenth Century", grade: 12, category: "History", type: "University", description: "This course traces the development of the modern world from the Renaissance to the present day." },
  { code: "CHI4U", name: "Canada: History, Identity, and Culture", grade: 12, category: "History", type: "University", description: "This course explores the dynamic relationship between the changing identity and culture of Canada and its role in the world." },
  { code: "CHW4U", name: "The West and the World", grade: 12, category: "History", type: "University", description: "This course investigates the evolution of Western civilization from the Renaissance to the present day." },
  { code: "CPW4U", name: "Canadian and World Politics", grade: 12, category: "Social Studies", type: "University", description: "This course explores political thought and democratic institutions in Canada and around the world." },
  { code: "CGU4M", name: "Canadian and World Issues: A Geographic Analysis", grade: 12, category: "Geography", type: "University/College", description: "This course examines current Canadian and international issues from a geographic perspective." },
  { code: "CGO4M", name: "Geomatics: Technological Approaches to Geographic Challenges", grade: 12, category: "Geography", type: "University/College", description: "This course focuses on the use of geomatics technologies to address geographic challenges." },
  { code: "CLN4U", name: "Canadian and International Law", grade: 12, category: "Social Studies", type: "University", description: "This course examines how individuals, groups, and governments function within a legal framework." },
  { code: "CLU4M", name: "Law", grade: 12, category: "Social Studies", type: "University/College", description: "This course examines the legal framework and institutions of Canada in relation to individuals and society." },

  // Social Sciences
  { code: "HSB4U", name: "Challenge and Change in Society", grade: 12, category: "Social Sciences", type: "University", description: "This course focuses on the use of social science theories, perspectives, and methodologies to investigate and explain shifts in knowledge, attitudes, and behaviours." },
  { code: "HZT4U", name: "Philosophy: Questions and Theories", grade: 12, category: "Social Sciences", type: "University", description: "This course enables students to acquire an understanding of the nature of philosophy and philosophical reasoning skills." },
  { code: "HFA4C", name: "Food and Nutrition Sciences", grade: 12, category: "Social Sciences", type: "College", description: "This course examines the role of food in maintaining good health across the lifespan." },
  { code: "HHS4C", name: "Working with School-Age Children and Adolescents", grade: 12, category: "Social Sciences", type: "College", description: "This course focuses on the development of children and adolescents and the role of caregivers." },
  { code: "HRE4M", name: "World Religions and Belief Traditions: Perspectives, Practices, and Challenges", grade: 12, category: "Social Sciences", type: "University/College", description: "This course explores the beliefs, practices, rituals, and ethical teachings of world religions." },
  { code: "HPC4O", name: "Participation in Recreation and Fitness Industries", grade: 12, category: "Social Sciences", type: "Open", description: "This course focuses on participation in various recreation and fitness activities." },

  // Business
  { code: "BOH4M", name: "Business Leadership: Management Fundamentals", grade: 12, category: "Business", type: "University/College", description: "This course focuses on the development of leadership skills used in managing a successful business." },
  { code: "BAT4M", name: "Financial Accounting Principles", grade: 12, category: "Business", type: "University/College", description: "This course introduces students to the fundamental principles of financial accounting." },
  { code: "BBB4M", name: "International Business Fundamentals", grade: 12, category: "Business", type: "University/College", description: "This course provides an overview of the importance of international business and trade in the global economy." },
  { code: "BTA4O", name: "Information and Communication Technology in Business", grade: 12, category: "Business", type: "Open", description: "This course focuses on the use of information and communication technology in business contexts." },
  { code: "BMX4E", name: "Marketing: A Culminating Activity", grade: 12, category: "Business", type: "Workplace", description: "This course enables students to apply their marketing knowledge and skills in a culminating project." },
  { code: "BDP4O", name: "Entrepreneurship: The Venture", grade: 12, category: "Business", type: "Open", description: "This course focuses on the planning and operation of a small business venture." },

  // Arts
  { code: "AVI4M", name: "Visual Arts", grade: 12, category: "Arts", type: "University/College", description: "This course enables students to refine their art-making skills and develop a body of work that reflects a personal visual voice." },
  { code: "AMU4M", name: "Music", grade: 12, category: "Arts", type: "University/College", description: "This course enables students to develop their musical artistry and to reflect on the role of music in society." },
  { code: "ADA4M", name: "Drama", grade: 12, category: "Arts", type: "University/College", description: "This course enables students to develop their skills to create, perform, and reflect on dramatic works." },
  { code: "AWR4M", name: "Writer's Craft", grade: 12, category: "Arts", type: "University/College", description: "This course focuses on the development and revision of creative and analytical writing." },
  { code: "AMV4M", name: "Media Arts", grade: 12, category: "Arts", type: "University/College", description: "This course enables students to refine their media arts skills and develop a personal artistic voice." },

  // Physical Education
  { code: "PPL4O", name: "Healthy Active Living Education", grade: 12, category: "Physical Education", type: "Open", description: "This course enables students to further develop the knowledge and skills needed for lifelong healthy active living." },

  // Technology
  { code: "TGJ4M", name: "Communications Technology", grade: 12, category: "Technology", type: "University/College", description: "This course enables students to further develop their knowledge and skills in communications technology." },
  { code: "TEJ4M", name: "Computer Engineering Technology", grade: 12, category: "Technology", type: "University/College", description: "This course enables students to further develop knowledge and skills in computer engineering and electronics." },
  { code: "TIJ4E", name: "Exploring Technologies", grade: 12, category: "Technology", type: "Workplace", description: "This course introduces students to a variety of technological skills in a hands-on environment." },
];
