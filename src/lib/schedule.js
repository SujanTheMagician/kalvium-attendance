export const SCHEDULE = {
  Mon: [
    { time: "08:30–09:20", subject: "Object Oriented Programming" },
    { time: "09:20–10:10", subject: "Backend Web Development – SPC5" },
    { time: "10:25–11:15", subject: "Introduction to Artificial Intelligence" },
    { time: "11:15–12:05", subject: "NPTEL Open Elective" },
    { time: "13:05–13:55", subject: "Data Structures and Algorithms – 1" },
    { time: "13:55–14:45", subject: "Database Management Systems Theory" },
    { time: "14:45–15:30", subject: "Growth Hour" },
  ],
  Tue: [
    { time: "08:30–09:20", subject: "Career Planning & Resume Building" },
    { time: "09:20–10:10", subject: "Data Structures and Algorithms – 1" },
    { time: "10:25–11:15", subject: "Data Structures and Algorithms – 1" },
    { time: "11:15–12:05", subject: "Backend Web Development – SPC5" },
    { time: "13:05–13:55", subject: "Object Oriented Programming" },
    { time: "13:55–14:45", subject: "Introduction to Artificial Intelligence" },
    { time: "14:45–15:30", subject: "Growth Hour" },
  ],
  Wed: [
    { time: "08:30–09:20", subject: "Data Structures and Algorithms – 1" },
    { time: "09:20–10:10", subject: "Data Structures and Algorithms – 1" },
    { time: "10:25–11:15", subject: "Backend Web Development – SPC5" },
    { time: "11:15–12:05", subject: "Object Oriented Programming" },
    { time: "13:05–13:55", subject: "Introduction to Artificial Intelligence" },
    { time: "13:55–14:45", subject: "NPTEL Open Elective" },
    { time: "14:45–15:30", subject: "Growth Hour" },
  ],
  Thu: [
    { time: "08:30–09:20", subject: "Database Management Systems Theory" },
    { time: "09:20–10:10", subject: "Database Management Systems Theory" },
    { time: "10:25–11:15", subject: "Backend Web Development – SPC5" },
    { time: "11:15–12:05", subject: "Object Oriented Programming" },
    { time: "13:05–13:55", subject: "Introduction to Artificial Intelligence" },
    { time: "13:55–14:45", subject: "NPTEL Open Elective" },
    { time: "14:45–15:30", subject: "Growth Hour" },
  ],
};

export const DAYS = ["Mon", "Tue", "Wed", "Thu"];
export const TODAY = new Date();
export const TODAY_KEY = DAYS[TODAY.getDay() - 1] || "Mon";
export const TODAY_DATE = TODAY.toISOString().slice(0, 10);
export const COLORS = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#22c55e", "#f97316", "#38bdf8", "#a78bfa", "#84cc16", "#fb7185", "#34d399", "#fbbf24"];
