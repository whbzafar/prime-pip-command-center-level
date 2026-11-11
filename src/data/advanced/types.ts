/** Advanced institutional library: 22 research divisions, every topic in English and Urdu. */
export type Bi = { en: string; ur: string };
/** [title (English), title (Urdu), explanation (English), explanation (Urdu)] */
export type TopicRow = [string, string, string, string];
export interface Division {
  id: string;
  no: number;
  title: Bi;
  intro: Bi;
  topics: TopicRow[];
  /** Hand-picked starting points (checked to open). Every topic also gets search links. */
  links?: { label: string; url: string; site: string }[];
}
export const wiki = (t: string) => `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(t.replace(/\s*\(.*?\)\s*/g, ' ').trim())}`;
export const invest = (t: string) => `https://www.investopedia.com/search?q=${encodeURIComponent(t.replace(/\s*\(.*?\)\s*/g, ' ').trim())}`;
