import { describe, expect, it } from "vitest";
import { analyse, score, slotOf, slotLabel, type PostEntry } from "../../server/socialInsights";

const mk = (i: number, at: number, category: string, likes: number, comments = 0): PostEntry => ({ id: String(i), at, title: "t" + i, category, targets: ["instagram"], status: "done", results: { instagram: { ok: true, id: "x" } }, metrics: { instagram: { likes, comments, at: 0 } } });
describe("social insights", () => {
  it("scores comments above likes", () => { expect(score({ likes: 1, comments: 1, at: 0 })).toBe(4); expect(score(undefined)).toBe(0); });
  it("uses Karachi time for slots", () => { expect(slotOf(Date.UTC(2026, 10, 27, 17, 0))).toEqual({ day: 5, hour: 22 }); expect(slotLabel(5, 21)).toBe("Friday 9 PM–12 AM"); });
  it("is a starting guess with little data", () => { const a = analyse([mk(1, Date.UTC(2026, 10, 1, 15), "A", 5)]); expect(a.confidence).toBe("starting guess"); expect(a.tips[0]).toMatch(/starting guess/); });
  it("finds best slot and category once there is data", () => {
    const l = [0, 1, 2, 3].map((i) => mk(i, Date.UTC(2026, 10, 2 + i * 7, 16), i % 2 ? "Journal" : "Charts", i % 2 ? 2 : 20));
    const a = analyse(l); expect(a.confidence).toBe("early signal"); expect(a.bestSlots[0].posts).toBeGreaterThan(0); expect(a.categories[0].category).toBe("Charts"); expect(a.tips.join(" ")).toMatch(/strongest category/);
  });
  it("ignores failed posts", () => { const f = mk(1, 0, "A", 9); f.status = "failed"; expect(analyse([f]).posts).toBe(0); });
});
