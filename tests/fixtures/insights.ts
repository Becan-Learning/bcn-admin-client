// A response shaped like docs/backend-insights-contract.md (range 90d, so week buckets).
export function insightsFixture() {
  return {
    range: "90d",
    timeZone: "Asia/Riyadh",
    bucket: "week",
    from: "2026-07-27T21:00:00.000Z",
    to: "2026-10-25T15:40:00.000Z",
    generatedAt: "2026-10-25T15:40:00.000Z",
    totals: { students: 412, signups: 57, activeStudents: 133, heldSessions: 640, studySeconds: 712345 },
    series: [
      { date: "2026-07-26", signups: 3, activeStudents: 18, heldSessions: 22, studySeconds: 24410 },
      { date: "2026-08-02", signups: 0, activeStudents: 0, heldSessions: 0, studySeconds: 0 },
    ],
    institutions: [
      {
        id: "kau",
        name: { ar: "جامعة الملك عبدالعزيز", en: "King Abdulaziz University" },
        students: 120,
        signups: 14,
        majors: [{ id: "kau-cs", name: { ar: "علوم الحاسب", en: "Computer Science" }, students: 40, signups: 5 }],
      },
      {
        id: "ksu",
        name: { ar: "جامعة الملك سعود", en: "King Saud University" },
        students: 12,
        signups: 1,
        majors: [],
      },
    ],
    courses: [
      {
        id: "acct-101",
        code: "ACCT 101",
        name: { ar: "مبادئ المحاسبة", en: "Principles of Accounting" },
        heldSessions: 210,
        studySeconds: 250000,
        activeStudents: 61,
        chapters: [
          {
            number: 1,
            title: { ar: "المعادلة المحاسبية", en: "The accounting equation" },
            published: true,
            heldSessions: 90,
            studySeconds: 110000,
            activeStudents: 48,
          },
          {
            number: 2,
            title: { ar: "القيد المزدوج", en: "Double entry" },
            published: false,
            heldSessions: 0,
            studySeconds: 0,
            activeStudents: 0,
          },
        ],
      },
    ],
    allowance: {
      plans: [
        {
          id: "free",
          name: { ar: "مجاني", en: "Free" },
          students: 400,
          atLimit: 37,
          usage: [
            { band: "0", students: 210 },
            { band: "1-25", students: 80 },
            { band: "26-50", students: 40 },
            { band: "51-75", students: 20 },
            { band: "76-99", students: 13 },
            { band: "100", students: 37 },
          ],
        },
      ],
    },
  };
}
