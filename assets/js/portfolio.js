// Chapter metadata comes from crawlable HTML so content is never duplicated in JS.
export const chapters = [...document.querySelectorAll(".chapter")].map(
  (element) => ({
    id: element.id,
    label: element.dataset.label,
    number: element.dataset.number,
    element,
  }),
);
export const chapterById = new Map(
  chapters.map((chapter) => [chapter.id, chapter]),
);
export const legacyRoutes = {
  hero: "world",
  experience: "education",
  languages: "about",
};
