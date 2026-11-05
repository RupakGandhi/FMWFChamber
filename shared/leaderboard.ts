// Top-five lists. Entries are ordered by score with shared ranks (1, 2, 2, 4), and every
// entry tied at the cut-off is kept, so no fifth/sixth place is decided arbitrarily.

export const TOP_LIST_SIZE = 5;

export interface RankedEntry<T> {
  rank: number;
  score: number;
  entry: T;
}

export function topEntries<T>(items: T[], getScore: (item: T) => number, size = TOP_LIST_SIZE) {
  const sorted = [...items].sort((a, b) => getScore(b) - getScore(a));
  const ranked: RankedEntry<T>[] = [];
  sorted.forEach((entry, index) => {
    const score = getScore(entry);
    const previous = ranked[index - 1];
    ranked.push({ entry, score, rank: previous && previous.score === score ? previous.rank : index + 1 });
  });
  const shown = ranked.filter(item => item.rank <= size);
  return { entries: shown, tiedAtCutoff: shown.length > size };
}

export interface LeaderboardScore {
  applicationId: number;
  reviewerId: number;
  reviewerName: string;
  totalScore: number;
}

export interface LeaderboardApplication {
  id: number;
  applicationNumber: string;
  displayName: string;
  categories: string[];
  ineligible: boolean;
  ineligibleReason?: string | null;
}

export interface LeaderboardAssignment {
  applicationId: number;
  reviewerId: number;
  reviewerName: string;
}

export interface LeaderboardOptions {
  category?: string;
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Each reviewer's own top scores, plus the overall list. The overall list applies the
 * platform's current calculation (simple average of the reviews submitted so far) and
 * is provisional until the Chamber approves a ranking rule. Confirmed-ineligible entries
 * never appear in a list; they are returned separately so staff can see why.
 */
export function buildLeaderboards(
  applications: LeaderboardApplication[],
  scores: LeaderboardScore[],
  assignments: LeaderboardAssignment[],
  options: LeaderboardOptions = {},
) {
  const inCategory = applications.filter(application =>
    !options.category || application.categories.includes(options.category)
  );
  const included = inCategory.filter(application => !application.ineligible);
  const byId = new Map(included.map(application => [application.id, application]));
  const scoped = scores.filter(score => byId.has(score.applicationId));
  const scopedAssignments = assignments.filter(assignment => byId.has(assignment.applicationId));

  const reviewerNames = new Map<number, string>();
  [...scopedAssignments, ...scoped].forEach(item => reviewerNames.set(item.reviewerId, item.reviewerName));

  const reviewers = Array.from(reviewerNames, ([reviewerId, reviewerName]) => {
    const own = scoped.filter(score => score.reviewerId === reviewerId);
    const list = topEntries(own, score => score.totalScore);
    return {
      reviewerId,
      reviewerName,
      submitted: own.length,
      assigned: scopedAssignments.filter(assignment => assignment.reviewerId === reviewerId).length,
      tiedAtCutoff: list.tiedAtCutoff,
      entries: list.entries.map(({ rank, score, entry }) => ({
        rank,
        score,
        application: byId.get(entry.applicationId)!,
      })),
    };
  }).sort((a, b) => a.reviewerName.localeCompare(b.reviewerName));

  const totals = included.flatMap(application => {
    const own = scoped.filter(score => score.applicationId === application.id);
    if (own.length === 0) return [];
    return [{
      application,
      average: round(own.reduce((sum, score) => sum + score.totalScore, 0) / own.length),
      reviewCount: own.length,
      assignedCount: scopedAssignments.filter(assignment => assignment.applicationId === application.id).length,
      reviews: own.map(({ reviewerName, totalScore }) => ({ reviewerName, totalScore })),
    }];
  });
  const overall = topEntries(totals, total => total.average);

  return {
    reviewers,
    excluded: inCategory.filter(application => application.ineligible),
    overall: {
      tiedAtCutoff: overall.tiedAtCutoff,
      entries: overall.entries.map(({ rank, entry }) => ({ rank, ...entry })),
    },
  };
}
