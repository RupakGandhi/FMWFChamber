import { describe, it, expect } from "vitest";
import { buildLeaderboards, topEntries, type LeaderboardApplication, type LeaderboardScore } from "../shared/leaderboard";

const app = (id: number, categories = ["Cat A"], ineligible = false): LeaderboardApplication => ({
  id,
  applicationNumber: `APP-${id}`,
  displayName: `Entry ${id}`,
  categories,
  ineligible,
});
const score = (applicationId: number, reviewerId: number, totalScore: number): LeaderboardScore => ({
  applicationId,
  reviewerId,
  reviewerName: `Reviewer ${reviewerId}`,
  totalScore,
});

describe("topEntries", () => {
  it("shares ranks for ties and skips the next rank", () => {
    const list = topEntries([10, 9, 9, 8], value => value);
    expect(list.entries.map(item => item.rank)).toEqual([1, 2, 2, 4]);
  });

  it("keeps everyone tied at the cut-off rather than picking one", () => {
    const list = topEntries([10, 9, 8, 7, 6, 6, 6, 5], value => value);
    expect(list.entries.map(item => item.score)).toEqual([10, 9, 8, 7, 6, 6, 6]);
    expect(list.tiedAtCutoff).toBe(true);
  });

  it("stops at five when there is no tie", () => {
    const list = topEntries([7, 6, 5, 4, 3, 2], value => value);
    expect(list.entries).toHaveLength(5);
    expect(list.tiedAtCutoff).toBe(false);
  });
});

describe("buildLeaderboards", () => {
  const applications = [1, 2, 3, 4, 5, 6, 7].map(id => app(id));
  const scores = [
    ...[1, 2, 3, 4, 5, 6, 7].map(id => score(id, 1, 40 - id)),
    score(7, 2, 50),
    score(1, 2, 10),
  ];
  const assignments = applications.flatMap(({ id }) => [1, 2].map(reviewerId => ({
    applicationId: id,
    reviewerId,
    reviewerName: `Reviewer ${reviewerId}`,
  })));

  it("gives each reviewer a list from only their own scores", () => {
    const { reviewers } = buildLeaderboards(applications, scores, assignments);
    expect(reviewers[0].entries.map(item => item.application.id)).toEqual([1, 2, 3, 4, 5]);
    expect(reviewers[1].entries.map(item => item.application.id)).toEqual([7, 1]);
  });

  it("reports incomplete reviewing instead of hiding it", () => {
    const { reviewers } = buildLeaderboards(applications, scores, assignments);
    expect(reviewers[1]).toMatchObject({ submitted: 2, assigned: 7 });
  });

  it("averages submitted reviews overall and shows the review count", () => {
    const { overall } = buildLeaderboards(applications, scores, assignments);
    expect(overall.entries[0]).toMatchObject({ average: 41.5, reviewCount: 2, assignedCount: 2 });
    expect(overall.entries[0].application.id).toBe(7);
    expect(overall.entries[0].reviews).toHaveLength(2);
  });

  it("leaves out entries with no submitted review", () => {
    const { overall } = buildLeaderboards([app(1), app(2)], [score(1, 1, 5)], []);
    expect(overall.entries.map(item => item.application.id)).toEqual([1]);
  });

  it("includes a reviewer with assignments but no scores yet", () => {
    const { reviewers } = buildLeaderboards([app(1)], [], [{ applicationId: 1, reviewerId: 9, reviewerName: "Reviewer 9" }]);
    expect(reviewers[0]).toMatchObject({ reviewerName: "Reviewer 9", submitted: 0, assigned: 1, entries: [] });
  });

  it("keeps confirmed-ineligible entries out of every list and reports them separately", () => {
    const list = [app(1, ["Cat A"], true), app(2)];
    const data = [score(1, 1, 9), score(2, 1, 5)];
    const result = buildLeaderboards(list, data, []);
    expect(result.overall.entries.map(item => item.application.id)).toEqual([2]);
    expect(result.reviewers[0].entries.map(item => item.application.id)).toEqual([2]);
    expect(result.excluded.map(item => item.id)).toEqual([1]);
  });

  it("limits both lists to a category", () => {
    const list = [app(1, ["Cat A"]), app(2, ["Cat B"])];
    const result = buildLeaderboards(list, [score(1, 1, 9), score(2, 1, 5)], [], { category: "Cat B" });
    expect(result.overall.entries.map(item => item.application.id)).toEqual([2]);
    expect(result.reviewers[0].entries.map(item => item.application.id)).toEqual([2]);
  });

  it("updates the order when a permitted score edit changes it", () => {
    const before = buildLeaderboards([app(1), app(2)], [score(1, 1, 9), score(2, 1, 5)], []);
    const after = buildLeaderboards([app(1), app(2)], [score(1, 1, 4), score(2, 1, 5)], []);
    expect(before.overall.entries[0].application.id).toBe(1);
    expect(after.overall.entries[0].application.id).toBe(2);
  });
});
