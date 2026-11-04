// Generated from the research manifests in /assets. Photos come from Pexels (free licence) and are hotlinked from its CDN.
export const px = (id: number, w = 900) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export const PHOTO_IDS: Record<string, number> = {
  "campus-building": 17893014,
  "campus-lab": 8471886,
  "campus-lawn": 32213217,
  "campus-lecture-hall": 31367502,
  "campus-library": 8199759,
  "club-coding": 37880001,
  "club-dance": 28465001,
  "club-debate": 8199135,
  "club-drama": 20898292,
  "club-entrepreneurship": 8197543,
  "club-football": 1369500,
  "club-music": 1588075,
  "club-photography": 17731256,
  "club-robotics": 9242204,
  "club-science": 8471886,
  "club-volunteer": 6647007,
  "course-business": 36733322,
  "course-data-ai": 3861957,
  "course-economics": 36733322,
  "course-electronics": 12078533,
  "course-english": 8926887,
  "course-history": 17893014,
  "course-math": 6238048,
  "course-networks": 1597776,
  "course-physics": 8471835,
  "course-programming-1": 3862142,
  "course-programming-2": 37880001,
  "course-programming-3": 6424590,
  "course-security": 3861957,
  "course-systems": 6424590,
  "dhaka-city": 21049574,
  "event-career-fair": 8197543,
  "event-convocation": 15490406,
  "event-cultural-festival": 31846587,
  "event-hackathon": 3862142,
  "event-orientation": 32213217,
  "event-seminar": 8199135,
  "event-sports-day": 8926648,
  "event-workshop": 7256568,
  "hero-graduation": 29229903,
  "hero-students-campus": 17893014,
  "hero-study-group": 6684506,
  "transport-bus": 5388050
};

export const photo = (slot: string, w = 900) => px(PHOTO_IDS[slot] ?? PHOTO_IDS["campus-building"], w);

export const VIDEOS: Record<string, { id: string; title: string; minutes: number | null }[]> = {
  "python": [
    {
      "id": "rfscVS0vtbw",
      "title": "Learn Python - Full Course for Beginners [Tutorial]",
      "minutes": null
    },
    {
      "id": "Rq5gJVxz55Q",
      "title": "Python Full Course for Beginners (13 Hours)",
      "minutes": 780
    }
  ],
  "c-programming": [
    {
      "id": "jG3AFXG4bWc",
      "title": "C-Programming Full Course",
      "minutes": null
    }
  ],
  "data-structures": [
    {
      "id": "RBSGKlAvoiM",
      "title": "Data Structures Easy to Advanced Course - Full Tutorial from a Google Engineer",
      "minutes": null
    },
    {
      "id": "CBYHwZcbD-s",
      "title": "Data Structures and Algorithms Full Course 📈",
      "minutes": null
    }
  ],
  "algorithms": [
    {
      "id": "jQqQpPMYPXs",
      "title": "Algorithms & Data Structures Full Crash Course",
      "minutes": null
    },
    {
      "id": "09_LlHjoEiY",
      "title": "Algorithms Course - Graph Theory Tutorial from a Google Engineer",
      "minutes": null
    }
  ],
  "sql-databases": [
    {
      "id": "SSKVgrwhzus",
      "title": "SQL Full Course for Beginners (30 Hours)",
      "minutes": 1800
    },
    {
      "id": "pD0lNTK2nbc",
      "title": "SQL & Databases FULL COURSE in 2.5 Hours",
      "minutes": 150
    }
  ],
  "web-html-css-js": [
    {
      "id": "HGTJBPNC-Gw",
      "title": "HTML & CSS Full Course for free 🌎",
      "minutes": null
    },
    {
      "id": "lfmg-EJ8gm4",
      "title": "JavaScript Full Course for free 🌐",
      "minutes": null
    }
  ],
  "react": [
    {
      "id": "CgkZ7MvWUAA",
      "title": "React Full Course for free ⚛️ (2024)",
      "minutes": null
    }
  ],
  "machine-learning": [
    {
      "id": "LvC68w9JS4Y",
      "title": "Machine Learning FULL Course with Practical (10 HOURS)",
      "minutes": 600
    },
    {
      "id": "hR-tMLTMw0s",
      "title": "Machine Learning Full Course",
      "minutes": null
    }
  ],
  "linear-algebra": [
    {
      "id": "fNk_zzaMoSs",
      "title": "Vectors, what even are they?",
      "minutes": null
    },
    {
      "id": "PFDu9oVAE-g",
      "title": "Eigenvectors and eigenvalues",
      "minutes": null
    }
  ],
  "calculus": [
    {
      "id": "54_XRjHhZzI",
      "title": "Calculus 1 Lecture 1.1: An Introduction to Limits",
      "minutes": null
    },
    {
      "id": "aiBD9aI69C8",
      "title": "Calculus 1 Lecture 4.2: Integration by Substitution",
      "minutes": null
    }
  ],
  "operating-systems": [
    {
      "id": "EWkQl0n0w5M",
      "title": "Introduction to CPU Scheduling",
      "minutes": null
    },
    {
      "id": "KrbjE6IRrM4",
      "title": "Deadlocks",
      "minutes": null
    }
  ],
  "computer-networks": [
    {
      "id": "3rfLhqRrBn0",
      "title": "Animated Computer Networks Full Course For Beginners (4.5 Hours)",
      "minutes": 270
    }
  ],
  "git-github": [
    {
      "id": "mAFoROnOfHs",
      "title": "Git & GitHub Crash Course for Beginners [2026]",
      "minutes": null
    },
    {
      "id": "B053lEkF7Ro",
      "title": "Git & GitHub Full Course 2026: Beginner to Pro",
      "minutes": null
    }
  ],
  "oop": [
    {
      "id": "Ej_02ICOIgs",
      "title": "Object Oriented Programming with Python - Full Course for Beginners",
      "minutes": null
    },
    {
      "id": "wN0x9eZLix4",
      "title": "Object Oriented Programming (OOP) in C++ Course",
      "minutes": null
    }
  ],
  "software-engineering": [
    {
      "id": "IHx9ImEMuzQ",
      "title": "SE 1 : Learn Software Engineering from Scratch",
      "minutes": null
    },
    {
      "id": "36YhAfCZrB4",
      "title": "Software Engineering Tutorial - Full Course, Lecture 1: Build Software People Can Trust",
      "minutes": null
    }
  ],
  "discrete-math": [
    {
      "id": "QJ2U-RKfAuc",
      "title": "DISCRETE MATHEMATICS FULL COURSE",
      "minutes": null
    },
    {
      "id": "G9JxuWk7BDA",
      "title": "Discrete Mathematics Course for Beginners",
      "minutes": null
    }
  ],
  "probability-statistics": [
    {
      "id": "xqO9yuYeAMQ",
      "title": "Learn Statistics and probability - Full Course for Beginners [Khan Academy Tutorial]",
      "minutes": null
    },
    {
      "id": "FbGgAZSQp7M",
      "title": "Learn Statistics and Probability - Full Course",
      "minutes": null
    }
  ],
  "physics-mechanics": [
    {
      "id": "uFPRZZhMoYI",
      "title": "PHY101 Mechanics",
      "minutes": null
    },
    {
      "id": "ZNVvYg1FOPk",
      "title": "2. Newton's Laws & Describing the Kinematics of Particles",
      "minutes": null
    }
  ],
  "circuits-electricity": [
    {
      "id": "8pJcXfl8oq0",
      "title": "Ohm's Law and Kirchhoff's Laws",
      "minutes": null
    },
    {
      "id": "ezvZuaVzoys",
      "title": "Ohm's Law, Kirchhoff's Laws, and Power Equations",
      "minutes": null
    }
  ],
  "digital-logic": [
    {
      "id": "AjtzABNaJyM",
      "title": "Digital Logic Complete Lecture",
      "minutes": null
    },
    {
      "id": "F5weLyYFj9w",
      "title": "Complete Digital Logic Design in One Class - Marathon",
      "minutes": null
    }
  ],
  "computer-architecture": [
    {
      "id": "9nuAjYRbITQ",
      "title": "Computer Architecture Complete course Part 1",
      "minutes": null
    },
    {
      "id": "jBcFKHG1hBU",
      "title": "Digital Design & Comp Arch - Lecture 12: Pipelining (Spring 2023)",
      "minutes": null
    }
  ],
  "microeconomics": [
    {
      "id": "8ssjKR7nNck",
      "title": "Lec 1: Introduction to Principles of Microeconomics and Supply & Demand",
      "minutes": null
    },
    {
      "id": "IUS81cliqKY",
      "title": "Demand and Supply: Shifts, Equilibrium, Shortages and Surpluses",
      "minutes": null
    }
  ],
  "accounting-basics": [
    {
      "id": "vO09q2V8TGQ",
      "title": "Accounting Full Course for Beginners",
      "minutes": null
    },
    {
      "id": "Fm9BECuNbkw",
      "title": "Free Bookkeeping Course - Part 1 - Introduction to Double Entry Bookkeeping - #bookkeepingcourse",
      "minutes": null
    }
  ],
  "cybersecurity": [
    {
      "id": "MvrgFOwEgdA",
      "title": "Cybersecurity Full Course 2026",
      "minutes": null
    },
    {
      "id": "UdTM8NW9nBI",
      "title": "Cyber Security Full Course Free 2026",
      "minutes": null
    }
  ],
  "entrepreneurship": [
    {
      "id": "CBYhVcO4WgI",
      "title": "Lecture 1 - How to Start a Startup (Sam Altman, Dustin Moskovitz)",
      "minutes": null
    },
    {
      "id": "UEngvxZ11sw",
      "title": "The Foundations of Entrepreneurship - Full Course",
      "minutes": null
    }
  ],
  "neural-networks": [
    {
      "id": "kPXmGbDhBGs",
      "title": "Learn Neural Networks By Deriving And Coding One From Scratch In Python - Full Course (~2 hrs)",
      "minutes": null
    },
    {
      "id": "losbBdEjyN4",
      "title": "Deep Learning Complete Course",
      "minutes": null
    }
  ],
  "essay-writing": [
    {
      "id": "6PnsKg7hkIo",
      "title": "How To Write An Essay: Structure",
      "minutes": null
    },
    {
      "id": "bhjPiB2PpaU",
      "title": "How to Write a Thesis Statement for a College Essay",
      "minutes": null
    },
    {
      "id": "k4TO4qJajMs",
      "title": "Writing an Argumentative Essay in College Composition Courses",
      "minutes": null
    }
  ],
  "technical-presentation": [
    {
      "id": "wexYJHkDXiA",
      "title": "Giving Effective Technical Presentations, Part I: General Strategies",
      "minutes": null
    },
    {
      "id": "QLbZrn5RCIQ",
      "title": "Developing and Giving Technical Presentations",
      "minutes": null
    },
    {
      "id": "EFZxvFDimHg",
      "title": "How to Give a Great Technical Presentation",
      "minutes": null
    }
  ],
  "bangladesh-history": [
    {
      "id": "JCb5JXf3xgI",
      "title": "1971: Bangladeshi Liberation War Documentary",
      "minutes": null
    },
    {
      "id": "Gdb0fqofddg",
      "title": "Bangladesh Liberation War: Untold Stories",
      "minutes": null
    },
    {
      "id": "HIQ2PnOfEFY",
      "title": "Bangladesh Liberation War 1971",
      "minutes": null
    }
  ]
};

export const video = (topic: string, n = 2) => (VIDEOS[topic] ?? []).slice(0, n);
