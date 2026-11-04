// Demo content for AcademiaConnect. Every person, course detail and date here is fictional sample data.

export type CourseDef = {
  code: string;
  title: string;
  dept: string;
  credits: number;
  cat: string;
  pre: string[];
  summary: string;
  topics: string[];
  vids: string[];
  tags: string[];
  extra?: string[];
  featured?: boolean;
};

const D = {
  CSE: "Computer Science & Engineering",
  EEE: "Electrical & Electronic Engineering",
  BBA: "Business Administration",
  ENG: "English",
  MAT: "Mathematics",
  PHY: "Physics",
  STA: "Statistics",
  ECO: "Economics",
  GED: "General Education",
};

const c = (
  code: string,
  title: string,
  dept: keyof typeof D,
  cat: string,
  pre: string,
  summary: string,
  topics: string,
  vids: string,
  tags: string,
  extra = "",
  credits = 3,
  featured = false,
): CourseDef => ({
  code,
  title,
  dept: D[dept],
  credits,
  cat,
  pre: pre ? pre.split(",") : [],
  summary,
  topics: topics.split(";").map((s) => s.trim()),
  vids: vids ? vids.split(",") : [],
  tags: tags.split(",").map((s) => s.trim()),
  extra: extra ? extra.split(",") : [],
  featured,
});

export const COURSES: CourseDef[] = [
  c("ENG 1101", "English Composition", "ENG", "english", "", "Write clear, well argued paragraphs and essays for university study.", "Sentence structure and common errors;Paragraph unity and flow;Summaries and paraphrasing;Argumentative essays;Citing sources and avoiding plagiarism;Peer review and revision;Short oral presentations", "essay-writing", "writing,communication"),
  c("ENG 1201", "Technical Writing and Presentation", "ENG", "english", "ENG 1101", "Turn technical work into reports, emails, slides and documentation people actually read.", "Audience and purpose;Professional emails;Lab and project reports;Slide design that works;Reading research papers;Documentation and README files;Group presentations", "technical-presentation", "writing,reports"),
  c("MAT 1101", "Differential Calculus", "MAT", "math", "", "Limits, derivatives and the way rates of change describe the world.", "Functions and limits;Continuity;Derivatives and rules;Chain rule and implicit differentiation;Applications: optimisation and related rates;Mean value theorem;Series and approximations", "calculus", "calculus,derivatives"),
  c("MAT 1201", "Integral Calculus and Differential Equations", "MAT", "math", "MAT 1101", "Integration techniques, areas and volumes, and first order differential equations.", "Definite and indefinite integrals;Techniques of integration;Area and volume;Improper integrals;First order ODEs;Second order linear ODEs;Applications in science and engineering", "calculus", "calculus,integrals"),
  c("MAT 2101", "Linear Algebra", "MAT", "math", "MAT 1101", "Vectors, matrices and the geometry behind data, graphics and machine learning.", "Vectors and spaces;Matrices and systems of equations;Determinants;Linear transformations;Eigenvalues and eigenvectors;Orthogonality and projections;Singular value decomposition", "linear-algebra", "matrices,vectors", "", 3, true),
  c("PHY 1101", "Physics I: Mechanics and Waves", "PHY", "physics", "", "Motion, forces, energy and waves, from first principles to worked problems.", "Vectors and kinematics;Newton's laws;Work and energy;Momentum and collisions;Rotational motion;Oscillations;Waves and sound", "physics-mechanics", "mechanics,waves"),
  c("PHY 1201", "Physics II: Electricity and Magnetism", "PHY", "physics", "PHY 1101", "Electric and magnetic fields, circuits and the physics behind everyday electronics.", "Electric charge and fields;Gauss's law;Electric potential;Capacitance and dielectrics;Current and resistance;Magnetic fields;Induction", "circuits-electricity", "electricity,magnetism"),
  c("STA 2101", "Probability and Statistics", "STA", "math", "", "Reason about uncertainty and learn from data with confidence.", "Counting and probability rules;Random variables;Common distributions;Sampling and the central limit theorem;Estimation and confidence intervals;Hypothesis testing;Regression basics", "probability-statistics", "statistics,probability"),
  c("ECO 2101", "Principles of Economics", "ECO", "economics", "", "How markets, prices and incentives shape choices at home and across the country.", "Scarcity and choice;Demand and supply;Elasticity;Costs and firms;Market structures;National income;Money, banks and inflation", "microeconomics", "economics,markets"),
  c("BDS 1101", "Emergence of Bangladesh", "GED", "history", "", "A grounded look at the history that led to the creation of Bangladesh.", "Bengal before 1947;Partition and the new state;The language movement of 1952;Political change in the 1960s;The six point programme;The 1970 election;The Liberation War of 1971;Building the new state", "bangladesh-history", "history,society", "history"),
  c("BUS 3101", "Entrepreneurship and Innovation", "BBA", "business", "BUS 1101", "Find a real problem, test an idea cheaply and pitch it with confidence.", "Spotting opportunities;Customer interviews;Business model canvas;Prototyping and testing;Pricing and unit economics;Funding options;Pitching your idea", "entrepreneurship", "startups,innovation", "", 3, true),

  c("CSE 1101", "Introduction to Computer Science", "CSE", "programming", "", "How computers work and how to think in programs, using Python as the first language.", "What a computer does;Variables and data types;Conditions and loops;Functions;Lists and dictionaries;Files and errors;Small projects", "python", "python,basics", "", 3, true),
  c("CSE 1111", "Structured Programming", "CSE", "programming", "", "Write careful, efficient programs in C and understand memory along the way.", "Program structure in C;Operators and control flow;Functions and recursion;Arrays and strings;Pointers;Structures and files;Debugging habits", "c-programming", "c,programming"),
  c("CSE 1121", "Object Oriented Programming", "CSE", "programming", "CSE 1111", "Model problems with classes, objects and clean interfaces.", "Classes and objects;Encapsulation;Inheritance;Polymorphism;Interfaces and abstract classes;Exceptions;Design principles", "oop", "oop,java", "dsa"),
  c("CSE 2101", "Data Structures", "CSE", "programming", "CSE 1121", "Choose and build the right structure: lists, stacks, queues, trees, heaps and graphs.", "Complexity analysis;Arrays and linked lists;Stacks and queues;Trees and BSTs;Heaps and priority queues;Hash tables;Graphs", "data-structures", "dsa,trees", "dsa", 3, true),
  c("CSE 2111", "Discrete Mathematics", "CSE", "math", "", "The logic, sets and counting that computer science is built on.", "Propositional logic;Proof techniques;Sets and relations;Functions;Counting and combinatorics;Graphs and trees;Recurrences", "discrete-math", "logic,proofs"),
  c("CSE 2201", "Algorithms", "CSE", "programming", "CSE 2101,CSE 2111", "Design and analyse algorithms that stay fast as the input grows.", "Asymptotic analysis;Divide and conquer;Greedy methods;Dynamic programming;Graph traversal;Shortest paths;NP completeness", "algorithms", "algorithms,dp", "dsa", 3, true),
  c("CSE 2211", "Database Systems", "CSE", "systems", "CSE 2101", "Model data, query it in SQL and understand how databases stay correct.", "Relational model;SQL queries;Joins and aggregation;Normalisation;Indexes;Transactions;NoSQL overview", "sql-databases", "sql,databases", "db"),
  c("CSE 2221", "Computer Organization and Architecture", "CSE", "systems", "", "From logic gates to the processor pipeline and memory hierarchy.", "Number systems;Logic and arithmetic circuits;Instruction sets;Datapath and control;Pipelining;Cache memory;Input and output", "computer-architecture,digital-logic", "hardware,cpu"),
  c("CSE 3101", "Operating Systems", "CSE", "systems", "CSE 2221,CSE 2101", "How an operating system shares a computer between many programs safely.", "Processes and threads;CPU scheduling;Synchronisation;Deadlocks;Memory management;Virtual memory;File systems", "operating-systems", "os,scheduling", "os"),
  c("CSE 3111", "Computer Networks", "CSE", "networks", "CSE 2221", "Follow a message across the internet, layer by layer.", "Network layers;Application protocols;Transport layer and TCP;IP addressing and routing;Link layer and Ethernet;Wireless networks;Network security basics", "computer-networks", "networks,tcp", "net"),
  c("CSE 3121", "Software Engineering", "CSE", "programming", "CSE 2101", "Plan, build, test and ship software as a team.", "Software processes;Requirements;Design and UML;Version control;Testing strategies;Code review;Agile delivery", "software-engineering,git-github", "agile,teams"),
  c("CSE 3131", "Web Engineering", "CSE", "programming", "CSE 1121", "Build full stack web applications with HTML, CSS, JavaScript and modern frameworks.", "HTML and semantics;CSS layout;JavaScript essentials;React components;REST APIs;Databases for the web;Deployment", "web-html-css-js,react", "web,react", "web", 3, true),
  c("CSE 3201", "Artificial Intelligence", "CSE", "data-ai", "CSE 2201", "Search, reasoning and learning: the ideas behind intelligent systems.", "Intelligent agents;Search strategies;Constraint satisfaction;Logic and knowledge;Probabilistic reasoning;Learning from data;Ethics of AI", "neural-networks,machine-learning", "ai,search"),
  c("CSE 3211", "Machine Learning", "CSE", "data-ai", "CSE 2201,MAT 2101,STA 2101", "Train models that learn from data and judge them honestly.", "Learning problems;Linear and logistic regression;Evaluation and validation;Decision trees and ensembles;Neural networks;Clustering;Responsible ML", "machine-learning,neural-networks", "ml,python", "ml", 3, true),
  c("CSE 3221", "Information Security", "CSE", "security", "CSE 3111", "Protect systems and data: cryptography, secure design and common attacks.", "Security principles;Symmetric and public key cryptography;Authentication;Web vulnerabilities;Network defence;Secure software practices;Privacy and law", "cybersecurity", "security,crypto", "sec"),
  c("CSE 4101", "Computer Graphics", "CSE", "programming", "CSE 2201,MAT 2101", "Draw with maths: transformations, shading and real time rendering.", "Coordinate systems;Transformations;Rasterisation;Lighting and shading;Textures;Ray tracing basics;Graphics APIs", "linear-algebra,algorithms", "graphics,3d"),
  c("CSE 4111", "Distributed Systems", "CSE", "systems", "CSE 3101,CSE 3111", "Make many machines act like one reliable service.", "Models of distribution;Remote calls;Time and ordering;Replication;Consensus;Fault tolerance;Cloud architecture", "operating-systems,computer-networks", "cloud,scale"),
  c("CSE 4121", "Data Mining", "CSE", "data-ai", "CSE 2211,CSE 3211", "Find patterns in large datasets and turn them into decisions.", "The data mining pipeline;Preprocessing;Association rules;Classification;Clustering;Anomaly detection;Case studies", "machine-learning,probability-statistics", "data,mining"),
  c("CSE 4131", "Mobile Application Development", "CSE", "programming", "CSE 3131,CSE 3121", "Design and build apps people carry in their pockets.", "Mobile design basics;Layouts and navigation;State management;Local storage;Networking and APIs;Device features;Publishing", "react,web-html-css-js", "mobile,apps", "web"),

  c("EEE 1101", "Basic Electrical Circuits", "EEE", "electronics", "", "Analyse circuits with Ohm's law, Kirchhoff's laws and network theorems.", "Voltage, current and power;Resistive circuits;Kirchhoff's laws;Network theorems;Capacitors and inductors;First order circuits;AC fundamentals", "circuits-electricity", "circuits,basics"),
  c("EEE 2101", "Digital Logic Design", "EEE", "electronics", "", "Design the combinational and sequential circuits inside every digital device.", "Boolean algebra;Logic gates;Combinational design;Adders and multiplexers;Flip flops;Counters and registers;State machines", "digital-logic", "logic,gates"),
  c("EEE 2111", "Electronic Devices and Circuits", "EEE", "electronics", "EEE 1101", "Diodes, transistors and amplifiers: the building blocks of electronics.", "Semiconductor basics;Diodes and rectifiers;BJT operation;Biasing;MOSFETs;Amplifier design;Operational amplifiers", "circuits-electricity", "transistors,analog"),
  c("EEE 3101", "Signals and Systems", "EEE", "electronics", "MAT 1201", "Describe signals and the systems that process them in time and frequency.", "Signals and classifications;Linear time invariant systems;Convolution;Fourier series;Fourier transform;Laplace transform;Sampling", "linear-algebra", "signals,fourier"),
  c("EEE 3111", "Microprocessors and Interfacing", "EEE", "systems", "EEE 2101", "Program a microprocessor and connect it to the physical world.", "Processor architecture;Assembly language;Memory interfacing;Interrupts;Timers;Serial communication;Sensors and actuators", "computer-architecture", "embedded,assembly"),

  c("BUS 1101", "Introduction to Business", "BBA", "business", "", "How organisations create value: marketing, operations, finance and people.", "What a business does;Forms of ownership;Management functions;Marketing basics;Operations;Finance basics;Ethics and responsibility", "entrepreneurship", "business,basics"),
  c("ACT 1101", "Financial Accounting", "BBA", "business", "", "Read, record and explain a company's financial story.", "The accounting equation;Journal and ledger;Adjusting entries;Financial statements;Inventory;Receivables and payables;Ratio analysis", "accounting-basics", "accounting,statements"),
  c("MAT 1103", "Business Mathematics", "MAT", "math", "", "The maths managers use: interest, annuities, break even and optimisation.", "Percentages and ratios;Simple and compound interest;Annuities;Break even analysis;Linear programming;Matrices in business;Basic statistics", "calculus", "business,maths"),
  c("MKT 2101", "Marketing Management", "BBA", "business", "BUS 1101", "Understand customers, shape offers and reach people where they are.", "Marketing concepts;Consumer behaviour;Segmentation and targeting;Product and brand;Pricing;Promotion and digital marketing;Marketing plans", "entrepreneurship", "marketing,brands"),
  c("MGT 2101", "Organizational Behavior", "BBA", "business", "BUS 1101", "Why people act the way they do at work, and how to lead them well.", "Individual differences;Motivation;Teams and groups;Communication;Leadership;Conflict and negotiation;Organisational culture", "entrepreneurship", "people,leadership"),
  c("FIN 2101", "Corporate Finance", "BBA", "economics", "ACT 1101", "Value projects, manage risk and decide how a firm raises money.", "Time value of money;Risk and return;Capital budgeting;Cost of capital;Capital structure;Working capital;Valuation", "accounting-basics,microeconomics", "finance,valuation"),
];

/** Curriculum per track: completed semesters in order, then the semester in progress. */
export const TRACKS: Record<string, { done: string[][]; current: string[] }> = {
  CSE: {
    done: [
      ["CSE 1101", "CSE 1111", "MAT 1101", "PHY 1101", "ENG 1101"],
      ["CSE 1121", "MAT 1201", "PHY 1201", "EEE 1101", "ENG 1201"],
      ["CSE 2101", "CSE 2111", "MAT 2101", "EEE 2101", "STA 2101"],
      ["CSE 2201", "CSE 2211", "CSE 2221", "ECO 2101", "BDS 1101"],
      ["CSE 3101", "CSE 3111", "CSE 3121", "CSE 3131"],
    ],
    current: ["CSE 3201", "CSE 3211", "CSE 3221", "BUS 3101"],
  },
  EEE: {
    done: [
      ["EEE 1101", "MAT 1101", "PHY 1101", "ENG 1101"],
      ["MAT 1201", "PHY 1201", "EEE 2101", "ENG 1201"],
    ],
    current: ["EEE 2111", "EEE 3101", "STA 2101"],
  },
  BBA: {
    done: [
      ["BUS 1101", "ACT 1101", "MAT 1103", "ENG 1101", "BDS 1101"],
      ["ECO 2101", "MKT 2101", "ENG 1201", "STA 2101"],
    ],
    current: ["MGT 2101", "FIN 2101", "BUS 3101"],
  },
};

/** Sections open for registration next semester: code, section, days, time, capacity, already enrolled. */
export const NEXT_SECTIONS: [string, string, string, string, number, number][] = [
  ["CSE 4101", "A", "Sat,Mon", "08:30-10:00", 40, 28],
  ["CSE 4101", "B", "Sun,Tue", "08:30-10:00", 40, 40],
  ["CSE 4111", "A", "Sun,Tue", "10:00-11:30", 40, 22],
  ["CSE 4121", "A", "Mon,Wed", "10:00-11:30", 35, 19],
  ["CSE 4131", "A", "Sat,Mon", "11:30-13:00", 40, 38],
  ["CSE 4131", "B", "Tue,Thu", "11:30-13:00", 40, 12],
  ["EEE 3101", "A", "Sun,Tue", "11:30-13:00", 45, 30],
  ["EEE 3111", "A", "Mon,Wed", "14:00-15:30", 40, 20],
  ["MKT 2101", "A", "Sat,Mon", "14:00-15:30", 45, 37],
  ["MGT 2101", "A", "Tue,Thu", "08:30-10:00", 45, 25],
  ["FIN 2101", "A", "Mon,Wed", "08:30-10:00", 45, 33],
  ["STA 2101", "A", "Sun,Tue", "14:00-15:30", 50, 41],
];

export const FACULTY = [
  ["Dr. Farzana Rahman", "Professor"],
  ["Dr. Imran Hossain", "Associate Professor"],
  ["Nusrat Sultana", "Assistant Professor"],
  ["Md. Arif Billah", "Lecturer"],
  ["Dr. Tahmina Haque", "Associate Professor"],
  ["Sabbir Hasan", "Lecturer"],
  ["Dr. Mahbub Alam", "Professor"],
  ["Farhana Yesmin", "Assistant Professor"],
  ["Dr. Kamrul Islam", "Associate Professor"],
  ["Anika Tabassum", "Lecturer"],
  ["Dr. Zahid Chowdhury", "Professor"],
  ["Mehjabin Rahman", "Assistant Professor"],
] as const;

/** name, department track, cohort (0 = demo year, 1 = a semester behind, 2 = two behind) */
export const STUDENTS: [string, "CSE" | "EEE" | "BBA", number][] = [
  ["Nusrat Jahan", "CSE", 0],
  ["Mahin Chowdhury", "CSE", 0],
  ["Rakib Hossain", "CSE", 0],
  ["Tasnim Karim", "CSE", 0],
  ["Zubair Hasan", "CSE", 0],
  ["Sadia Afrin", "CSE", 0],
  ["Hridoy Mondol", "CSE", 0],
  ["Farhan Sadik", "CSE", 1],
  ["Ishrat Zaman", "CSE", 1],
  ["Arif Mahmud", "CSE", 1],
  ["Mim Sultana", "CSE", 1],
  ["Priya Barua", "CSE", 1],
  ["Sumaiya Akter", "CSE", 2],
  ["Shahriar Alam", "CSE", 2],
  ["Rubaiya Islam", "CSE", 2],
  ["Rony Debnath", "CSE", 2],
  ["Fahim Reza", "EEE", 0],
  ["Labiba Noor", "EEE", 0],
  ["Imran Kabir", "EEE", 0],
  ["Tahsin Ara", "EEE", 0],
  ["Maisha Rahman", "BBA", 0],
  ["Naimur Rashid", "BBA", 0],
  ["Jannatul Ferdous", "BBA", 0],
  ["Sourav Das", "BBA", 0],
];

export const RES: Record<string, { title: string; url: string; note: string }[]> = {
  programming: [
    { title: "CS50x: Introduction to Computer Science", url: "https://cs50.harvard.edu/x/", note: "Free Harvard course with lectures, notes and problem sets." },
    { title: "MDN Web Docs: Learn web development", url: "https://developer.mozilla.org/en-US/docs/Learn", note: "The reference every web developer keeps open." },
  ],
  dsa: [
    { title: "VisuAlgo", url: "https://visualgo.net/en", note: "Animated walkthroughs of data structures and algorithms." },
    { title: "CP-Algorithms", url: "https://cp-algorithms.com/", note: "Clear explanations with code for classic algorithms." },
  ],
  db: [{ title: "SQLBolt", url: "https://sqlbolt.com/", note: "Short interactive SQL lessons." }],
  web: [{ title: "Eloquent JavaScript", url: "https://eloquentjavascript.net/", note: "A free book on JavaScript and programming ideas." }],
  os: [{ title: "Operating Systems: Three Easy Pieces", url: "https://pages.cs.wisc.edu/~remzi/OSTEP/", note: "A free, readable operating systems textbook." }],
  net: [{ title: "Beej's Guide to Network Programming", url: "https://beej.us/guide/bgnet/", note: "Learn sockets with working C examples." }],
  ml: [{ title: "Dive into Deep Learning", url: "https://d2l.ai/", note: "Interactive deep learning book with code." }],
  sec: [{ title: "OWASP Top 10", url: "https://owasp.org/www-project-top-ten/", note: "The most common web application risks." }],
  "data-ai": [{ title: "Google Machine Learning Crash Course", url: "https://developers.google.com/machine-learning/crash-course", note: "Short lessons with exercises." }],
  math: [
    { title: "Paul's Online Math Notes", url: "https://tutorial.math.lamar.edu/", note: "Worked examples for calculus, algebra and differential equations." },
    { title: "Khan Academy: Math", url: "https://www.khanacademy.org/math", note: "Practice problems with instant feedback." },
  ],
  physics: [{ title: "OpenStax University Physics", url: "https://openstax.org/details/books/university-physics-volume-1", note: "A free, peer reviewed textbook." }],
  electronics: [{ title: "All About Circuits: Textbook", url: "https://www.allaboutcircuits.com/textbook/", note: "Free chapters on circuits and electronics." }],
  business: [{ title: "OpenStax: Principles of Management", url: "https://openstax.org/details/books/principles-management", note: "A free management textbook." }],
  english: [{ title: "Purdue OWL", url: "https://owl.purdue.edu/owl/purdue_owl.html", note: "Writing and citation guides." }],
  economics: [{ title: "OpenStax: Principles of Economics", url: "https://openstax.org/details/books/principles-economics-3e", note: "A free economics textbook." }],
  networks: [{ title: "Beej's Guide to Network Programming", url: "https://beej.us/guide/bgnet/", note: "Learn sockets with working C examples." }],
  systems: [{ title: "Nand2Tetris", url: "https://www.nand2tetris.org/", note: "Build a computer from logic gates up." }],
  security: [{ title: "PortSwigger Web Security Academy", url: "https://portswigger.net/web-security", note: "Free labs on web vulnerabilities." }],
  history: [{ title: "Banglapedia", url: "https://en.banglapedia.org/index.php/Main_Page", note: "The national encyclopaedia of Bangladesh." }],
};

export const CLUBS = [
  { name: "Robotics and Automation Club", slot: "club-robotics", category: "Technology", tagline: "We build machines that sense, decide and move.", founded: 2016, meets: "Thursdays, 4:00 pm, Lab 204", advisor: "Dr. Mahbub Alam", president: "Fahim Reza", tags: ["robotics", "arduino", "automation"], achievements: ["Runner up, national line follower contest", "Built the campus water level monitor", "Weekly open build nights"], description: "From line followers to a robotic arm, members design, wire and program real machines. Beginners start with Arduino kits and pair with seniors on a project of their own. We also run short workshops for first year students every semester." },
  { name: "Debate and Public Speaking Society", slot: "club-debate", category: "Arts", tagline: "Argue well. Listen better.", founded: 2012, meets: "Sundays, 5:00 pm, Seminar Room 2", advisor: "Nusrat Sultana", president: "Maisha Rahman", tags: ["debate", "speaking", "english"], achievements: ["Champion, inter university parliamentary debate", "Hosted the annual campus open debate", "Weekly practice rounds"], description: "Learn to build an argument, test it and deliver it. Sessions cover parliamentary and policy formats, impromptu speaking and judging. Everyone speaks at every meeting, whatever their experience." },
  { name: "Photography Club", slot: "club-photography", category: "Arts", tagline: "Stories in a single frame.", founded: 2014, meets: "Saturdays, 3:30 pm, Studio Room", advisor: "Anika Tabassum", president: "Sadia Afrin", tags: ["photography", "editing", "exhibition"], achievements: ["Annual campus photo exhibition", "Old Dhaka photo walk series", "Free portrait days for students"], description: "We shoot, edit and exhibit. Members borrow club cameras, join monthly photo walks and learn lighting and editing basics. The best frames from each term go on the corridor gallery." },
  { name: "Music and Band Society", slot: "club-music", category: "Culture", tagline: "Practice rooms are open. Bring a song.", founded: 2011, meets: "Wednesdays, 5:30 pm, Music Room", advisor: "Sabbir Hasan", president: "Hridoy Mondol", tags: ["music", "bands", "live"], achievements: ["Opening act at the winter cultural night", "Three student bands formed in 2026", "Open mic every month"], description: "Vocalists, guitarists, drummers and producers meet here to jam and form bands. We run monthly open mics and perform at campus events." },
  { name: "Cultural Dance Troupe", slot: "club-dance", category: "Culture", tagline: "Folk, classical and everything between.", founded: 2013, meets: "Mondays, 5:00 pm, Auditorium Hall", advisor: "Farhana Yesmin", president: "Labiba Noor", tags: ["dance", "folk", "performance"], achievements: ["Lead performance at Pohela Boishakh", "Winners, inter university cultural fest", "Open classes for beginners"], description: "We rehearse folk, classical and contemporary pieces for campus festivals. No experience is needed. Weekly classes start with the basics and build toward a full performance each term." },
  { name: "Football Club", slot: "club-football", category: "Sports", tagline: "Training, fixtures and the intra university cup.", founded: 2010, meets: "Tuesdays and Fridays, 4:30 pm, Main Field", advisor: "Md. Arif Billah", president: "Rakib Hossain", tags: ["football", "fitness", "tournament"], achievements: ["Intra university cup champions", "Women's team started in 2025", "Weekly open training"], description: "Two teams, regular training and a full fixture list. We welcome all levels and run separate sessions for newcomers." },
  { name: "Entrepreneurship and Startup Cell", slot: "club-entrepreneurship", category: "Business", tagline: "Turn a rough idea into something people pay for.", founded: 2017, meets: "Wednesdays, 4:00 pm, Innovation Lab", advisor: "Dr. Zahid Chowdhury", president: "Naimur Rashid", tags: ["startups", "pitching", "mentors"], achievements: ["Hosted the campus pitch night", "Six student ventures launched", "Mentor network of 20 founders"], description: "Form a team, test an idea with real customers and pitch it to mentors. We run idea sprints, founder talks and a pitch night every semester." },
  { name: "Volunteers and Blood Donors Forum", slot: "club-volunteer", category: "Service", tagline: "Small acts, organised well.", founded: 2015, meets: "Saturdays, 11:00 am, Student Lounge", advisor: "Dr. Tahmina Haque", president: "Jannatul Ferdous", tags: ["volunteering", "blood donation", "community"], achievements: ["Quarterly blood donation camps", "Flood relief drive", "Winter clothes collection"], description: "We organise blood donation camps, relief drives and neighbourhood clean ups, and keep a donor list of students who can help in emergencies." },
  { name: "Drama and Theatre Guild", slot: "club-drama", category: "Culture", tagline: "Stage, script and spotlight.", founded: 2012, meets: "Thursdays, 5:30 pm, Auditorium Stage", advisor: "Nusrat Sultana", president: "Priya Barua", tags: ["theatre", "acting", "scripts"], achievements: ["Two full length productions every year", "Street theatre for Ekushey", "Playwriting workshop"], description: "Act, direct, write or run the lights. We stage two productions a year and run street theatre at national days." },
  { name: "Programming and Hackers Society", slot: "club-coding", category: "Technology", tagline: "Contests, hackathons and code reviews.", founded: 2013, meets: "Fridays, 3:00 pm, Computer Lab 3", advisor: "Dr. Imran Hossain", president: "Mahin Chowdhury", tags: ["coding", "contests", "hackathon"], achievements: ["Top 10, national collegiate programming contest", "Hosts the yearly campus hackathon", "Weekly practice contests"], description: "Weekly practice contests, project nights and the yearly hackathon. Seniors mentor first years through their first algorithm problems." },
  { name: "Science and Innovation Forum", slot: "club-science", category: "Technology", tagline: "Experiments, demos and curious questions.", founded: 2018, meets: "Mondays, 3:30 pm, Physics Lab", advisor: "Dr. Kamrul Islam", president: "Tahsin Ara", tags: ["science", "demos", "research"], achievements: ["Annual campus science fair", "Student research poster day", "School outreach demos"], description: "Run experiments, build demos and present small research projects. We organise the annual science fair and visit schools with hands on demonstrations." },
];

const day = 86_400_000;
const at = (offsetDays: number, hour: number, minutes = 0) => (now: Date) => {
  const d = new Date(+now + offsetDays * day);
  d.setUTCHours(hour - 6, minutes, 0, 0); // Dhaka is UTC+6
  return d;
};

export const EVENTS = [
  { title: "Guest Lecture: Careers in Machine Learning", slot: "event-seminar", category: "Seminar", club: "Programming and Hackers Society", venue: "Auditorium Hall", start: at(3, 15), hours: 2, capacity: 220, reg: 148, summary: "Two engineers explain how they moved from student projects to production ML work.", agenda: [["3:00 pm", "Welcome and introductions"], ["3:15 pm", "From class project to production"], ["4:00 pm", "Panel and open questions"], ["4:40 pm", "Networking"]], speakers: [["Rafiq Ahsan", "Machine learning engineer"], ["Dr. Zahid Chowdhury", "Professor, CSE"]], tags: ["ai", "careers"] },
  { title: "Research and Writing Workshop", slot: "event-workshop", category: "Workshop", club: "Debate and Public Speaking Society", venue: "Seminar Room 2", start: at(5, 14), hours: 3, capacity: 60, reg: 41, summary: "Learn to find sources, structure a paper and write a clear abstract.", agenda: [["2:00 pm", "Finding and reading papers"], ["3:00 pm", "Structure of a paper"], ["4:00 pm", "Write an abstract together"]], speakers: [["Nusrat Sultana", "Assistant Professor, English"]], tags: ["writing", "research"] },
  { title: "Inter-University Hackathon 36", slot: "event-hackathon", category: "Competition", club: "Programming and Hackers Society", venue: "Computer Lab 3 and 4", start: at(9, 9), hours: 30, capacity: 120, reg: 96, summary: "Thirty six hours to build something useful for a campus or a city. Teams of three or four.", agenda: [["Day 1, 9:00 am", "Kickoff and problem briefs"], ["Day 1, 12:00 pm", "Hacking begins"], ["Day 2, 6:00 pm", "Demos and judging"], ["Day 2, 8:00 pm", "Awards"]], speakers: [["Judges from three local tech companies", ""]], tags: ["coding", "teams"] },
  { title: "Intra-University Football Cup", slot: "event-sports-day", category: "Sports", club: "Football Club", venue: "Main Field", start: at(12, 15), hours: 4, capacity: 400, reg: 120, summary: "Departments play for the cup. Come and cheer.", agenda: [["3:00 pm", "Opening match"], ["4:30 pm", "Semi final"], ["6:00 pm", "Closing ceremony"]], speakers: [], tags: ["football", "tournament"] },
  { title: "Career Fair: Meet the Employers", slot: "event-career-fair", category: "Career", club: "Entrepreneurship and Startup Cell", venue: "Convention Hall", start: at(16, 10), hours: 7, capacity: 500, reg: 262, summary: "Talk to hiring teams, drop your CV and book interview slots. Bring printed copies.", agenda: [["10:00 am", "Doors open"], ["11:30 am", "CV clinic"], ["2:00 pm", "Employer talks"], ["4:30 pm", "Interview slots"]], speakers: [["Twenty one employers", "From software, banking and manufacturing"]], tags: ["jobs", "networking"] },
  { title: "Blood Donation Camp", slot: "club-volunteer", category: "Service", club: "Volunteers and Blood Donors Forum", venue: "Student Lounge", start: at(20, 10), hours: 6, capacity: 150, reg: 63, summary: "Donate with a certified team on site. Eat well and drink water before you come.", agenda: [["10:00 am", "Registration and health check"], ["10:30 am", "Donations begin"], ["4:00 pm", "Camp closes"]], speakers: [], tags: ["community", "health"] },
  { title: "Winter Cultural Night", slot: "event-cultural-festival", category: "Cultural", club: "Cultural Dance Troupe", venue: "Open Air Stage", start: at(26, 17), hours: 4, capacity: 600, reg: 310, summary: "Music, dance and drama from every club under one winter sky.", agenda: [["5:00 pm", "Opening and folk songs"], ["6:00 pm", "Dance performances"], ["7:00 pm", "One act play"], ["8:00 pm", "Bands"]], speakers: [], tags: ["music", "dance", "drama"] },
  { title: "Victory Day Programme", slot: "event-orientation", category: "Cultural", club: "", venue: "Central Field", start: at(42, 9), hours: 4, capacity: 800, reg: 180, summary: "A flag raising, student recitations and a march past on 16 December.", agenda: [["9:00 am", "Flag raising"], ["9:30 am", "Recitations and songs"], ["11:00 am", "March past"]], speakers: [], tags: ["national day"] },
  { title: "Spring 2027 New Student Orientation", slot: "event-orientation", category: "Orientation", club: "", venue: "Auditorium Hall", start: at(58, 10), hours: 4, capacity: 450, reg: 70, summary: "Meet advisors, tour the campus and learn how registration, fees and transport work.", agenda: [["10:00 am", "Welcome from the Vice Chancellor"], ["11:00 am", "Registration and fees walkthrough"], ["12:00 pm", "Campus tour"]], speakers: [], tags: ["new students"] },
  { title: "Orientation Day: Fall 2026", slot: "event-orientation", category: "Orientation", club: "", venue: "Auditorium Hall", start: at(-62, 10), hours: 4, capacity: 450, reg: 438, summary: "A warm welcome for the new batch.", agenda: [], speakers: [], tags: ["new students"] },
  { title: "Science Fair 2026", slot: "event-workshop", category: "Workshop", club: "Science and Innovation Forum", venue: "Physics Lab and Corridor", start: at(-44, 10), hours: 7, capacity: 300, reg: 266, summary: "Forty student demos from circuits to chemistry.", agenda: [], speakers: [], tags: ["science"] },
  { title: "Photography Walk: Old Dhaka", slot: "club-photography", category: "Cultural", club: "Photography Club", venue: "Meet at Campus Gate 2", start: at(-18, 7), hours: 6, capacity: 40, reg: 40, summary: "A morning of street photography through Old Dhaka lanes.", agenda: [], speakers: [], tags: ["photography"] },
  { title: "Inter-University Debate Final", slot: "club-debate", category: "Competition", club: "Debate and Public Speaking Society", venue: "Auditorium Hall", start: at(-30, 14), hours: 3, capacity: 250, reg: 214, summary: "Eight teams, one motion and a packed hall.", agenda: [], speakers: [], tags: ["debate"] },
] as const;

export const ROUTES = [
  { name: "Uttara to Campus", code: "UT-1", bus: "Bus 01", slot: "transport-bus", fee: 7000, cap: 50, used: 41, stops: [["Uttara Sector 7", "6:40 am"], ["Uttara Sector 3", "6:50 am"], ["Abdullahpur", "7:00 am"], ["Airport", "7:10 am"], ["Kuril Flyover", "7:25 am"], ["Campus", "8:00 am"]] },
  { name: "Mirpur to Campus", code: "MP-2", bus: "Bus 02", slot: "transport-bus", fee: 6500, cap: 50, used: 36, stops: [["Mirpur 14", "6:50 am"], ["Mirpur 10", "7:00 am"], ["Mirpur 2", "7:10 am"], ["Kazipara", "7:20 am"], ["Agargaon", "7:35 am"], ["Campus", "8:00 am"]] },
  { name: "Mohammadpur to Campus", code: "MH-3", bus: "Bus 03", slot: "transport-bus", fee: 6000, cap: 45, used: 45, stops: [["Mohammadpur Bus Stand", "7:00 am"], ["Asad Gate", "7:08 am"], ["Shyamoli", "7:15 am"], ["Technical", "7:25 am"], ["Campus", "8:00 am"]] },
  { name: "Dhanmondi to Campus", code: "DH-4", bus: "Bus 04", slot: "transport-bus", fee: 6000, cap: 50, used: 28, stops: [["Dhanmondi 27", "7:05 am"], ["Dhanmondi 15", "7:12 am"], ["Science Lab", "7:20 am"], ["Kalabagan", "7:28 am"], ["Campus", "8:00 am"]] },
  { name: "Badda to Campus", code: "BD-5", bus: "Bus 05", slot: "transport-bus", fee: 6800, cap: 50, used: 33, stops: [["Uttar Badda", "6:45 am"], ["Badda", "6:55 am"], ["Gulshan Link Road", "7:10 am"], ["Mohakhali", "7:25 am"], ["Campus", "8:00 am"]] },
  { name: "Gulshan and Banani to Campus", code: "GB-6", bus: "Bus 06", slot: "transport-bus", fee: 7000, cap: 45, used: 22, stops: [["Gulshan 2", "7:00 am"], ["Gulshan 1", "7:08 am"], ["Banani", "7:18 am"], ["Mohakhali", "7:28 am"], ["Campus", "8:00 am"]] },
  { name: "Old Dhaka to Campus", code: "OD-7", bus: "Bus 07", slot: "transport-bus", fee: 5500, cap: 50, used: 30, stops: [["Gulistan", "6:50 am"], ["Motijheel", "7:00 am"], ["Malibagh", "7:15 am"], ["Moghbazar", "7:25 am"], ["Campus", "8:00 am"]] },
  { name: "Jatrabari and Narayanganj to Campus", code: "JN-8", bus: "Bus 08", slot: "transport-bus", fee: 6200, cap: 50, used: 19, stops: [["Chashara", "6:20 am"], ["Signboard", "6:35 am"], ["Jatrabari", "6:55 am"], ["Kamalapur", "7:10 am"], ["Campus", "8:00 am"]] },
] as const;

export const NOTICES = [
  { title: "Spring 2027 course registration is open", category: "Academic", priority: "important", pinned: true, ago: 2, body: "Registration for Spring 2027 is now open on AcademiaConnect. Choose your sections under Registration, check for schedule clashes and submit before the deadline shown on the page.\n\nYour tuition invoice is created as soon as you submit. You can change your selection until the first installment is paid.", author: "Office of the Registrar" },
  { title: "Second tuition installment due soon", category: "Finance", priority: "urgent", pinned: true, ago: 1, body: "The second installment of Fall 2026 tuition and fees is due in the coming days. Pay from the Fees page and download your receipt right away.\n\nLate payments may delay exam admit cards. If you have a waiver, it is already applied to your invoice.", author: "Accounts Office" },
  { title: "Course evaluation is open for the previous semester", category: "Academic", priority: "important", pinned: false, ago: 3, body: "Please evaluate your Summer 2026 courses. Your answers are anonymous and help us improve teaching. Results for the semester unlock once every evaluation is submitted.", author: "Quality Assurance Cell" },
  { title: "Midterm examination routine, Fall 2026", category: "Exam", priority: "important", pinned: false, ago: 6, body: "The midterm routine has been published. Exams run for two weeks starting on the first Saturday of next month. Arrive 20 minutes early and carry your student ID.\n\nClashes must be reported to the Controller of Examinations within three working days.", author: "Controller of Examinations" },
  { title: "Bus schedule change on the Uttara and Mirpur routes", category: "Transport", priority: "normal", pinned: false, ago: 4, body: "From next week, Bus 01 and Bus 02 leave ten minutes earlier because of road works near Kuril. Updated pickup times are on the Transport page.", author: "Transport Office" },
  { title: "Merit and need based scholarship applications", category: "Scholarship", priority: "normal", pinned: false, ago: 9, body: "Applications for Spring 2027 waivers are open until the end of this month. Apply from your department office with your latest grade report and a short statement.", author: "Scholarship Committee" },
  { title: "Library hours extended during exams", category: "General", priority: "normal", pinned: false, ago: 7, body: "The central library will stay open until 11:00 pm on weekdays during the examination period. Bring your student ID after 8:00 pm.", author: "Central Library" },
  { title: "Winter break and Victory Day holiday", category: "General", priority: "normal", pinned: false, ago: 12, body: "Classes pause for Victory Day on 16 December and resume after the winter break as per the academic calendar. Offices stay closed on public holidays.", author: "Office of the Registrar" },
  { title: "Admission test schedule for Spring 2027", category: "Admission", priority: "normal", pinned: false, ago: 14, body: "The admission test for Spring 2027 will be held in two sessions at the main campus. Candidates will find their seat plan on the admissions page one week before the test.", author: "Admissions Office" },
  { title: "Campus Wi-Fi maintenance on Friday", category: "General", priority: "normal", pinned: false, ago: 5, body: "Wi-Fi will be unavailable between 2:00 am and 5:00 am on Friday while we upgrade the access points. Wired lab connections are not affected.", author: "IT Services" },
  { title: "Convocation 2026: register if you are graduating", category: "Academic", priority: "important", pinned: false, ago: 16, body: "Students who will complete their degree this year must register for the convocation with the Registrar's office and clear all dues before collecting their gown.", author: "Office of the Registrar" },
  { title: "Last date to drop a course without penalty", category: "Academic", priority: "normal", pinned: false, ago: 20, body: "Courses can be dropped without a W grade until the end of the sixth week. After that, a drop needs your advisor's written approval.", author: "Office of the Registrar" },
  { title: "Student ID card renewal", category: "General", priority: "normal", pinned: false, ago: 25, body: "ID cards expire at the end of the year. Renew yours at the Student Affairs desk with a passport size photo. Replacement cards take three working days.", author: "Student Affairs" },
  { title: "Blood donation drive next month", category: "General", priority: "normal", pinned: false, ago: 8, body: "The Volunteers and Blood Donors Forum will run a donation camp in the Student Lounge. Register for the event on AcademiaConnect so we can plan supplies.", author: "Student Affairs" },
] as const;

export const CHAT = {
  club: [
    "Welcome everyone. Next meeting is on schedule, bring your ideas.",
    "Can someone share the slides from last session?",
    "Posted them in the notes folder. See you there.",
    "Count me in for the next event.",
  ],
  course: [
    "Does anyone have the notes from Tuesday's class?",
    "Yes, I will upload a scan tonight.",
    "Thanks. Also, quiz 2 is next week, right?",
    "Correct, the syllabus covers the first four units.",
  ],
  direct: [
    ["Hey, are you taking the same section for next semester?", "Planning to. I am waiting for the registration page to open fully."],
    ["Can I borrow your notes for the networks class?", "Sure, I will send them after lunch."],
    ["Are you coming to the hackathon?", "Yes! We need one more person for the team."],
    ["Did you pay the second installment yet?", "Not yet, doing it this weekend."],
    ["The club meeting moved to Thursday.", "Got it, thanks for telling me."],
  ],
};
