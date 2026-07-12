export interface PollOption {
  id: string;
  label: string;
  sublabel?: string;
  /** Button color theme */
  variant: 'green' | 'red' | 'gold' | 'blue';
}

export interface Poll {
  id: string;
  question: string;
  /** Optional highlighted part shown after the question text */
  highlight?: string;
  options: PollOption[];
}

/** All questions shown on the home page (same page, separate votes). */
export const POLLS: Poll[] = [
  {
    id: 'edi-rama',
    question: 'Duhet të largohet',
    highlight: 'Kryeministri Edi Rama',
    options: [
      {
        id: 'PO',
        label: 'PO',
        sublabel: 'Po, duhet të largohet',
        variant: 'green',
      },
      {
        id: 'JO',
        label: 'JO',
        sublabel: 'Jo, le të qëndrojë',
        variant: 'red',
      },
    ],
  },
  {
    id: 'bizneset',
    question: 'A kanë faj bizneset shqiptare',
    highlight: 'të cilat nuk paguajnë punëtorët',
    options: [
      {
        id: 'PO',
        label: 'PO',
        sublabel: 'Po, kanë faj',
        variant: 'green',
      },
      {
        id: 'JO',
        label: 'JO',
        sublabel: 'Jo, nuk kanë faj',
        variant: 'red',
      },
    ],
  },
  {
    id: 'rroga',
    question: 'Sa duhet të jetë rroga në Shqipëri',
    options: [
      {
        id: '600',
        label: '600 €',
        sublabel: 'Rroga 600 euro',
        variant: 'blue',
      },
      {
        id: '800',
        label: '800 €',
        sublabel: 'Rroga 800 euro',
        variant: 'gold',
      },
    ],
  },
];

export const DEFAULT_POLL_ID = 'edi-rama';

const pollById = Object.fromEntries(POLLS.map((p) => [p.id, p]));

export function isValidPollId(id: string | null | undefined): id is string {
  return !!id && id in pollById;
}

export function getPoll(id: string): Poll | null {
  return pollById[id] ?? null;
}

export function getAllPolls(): Poll[] {
  return POLLS;
}

export function isValidChoice(pollId: string, choice: string): boolean {
  const poll = getPoll(pollId);
  if (!poll) return false;
  return poll.options.some((o) => o.id === choice);
}

/** Build empty counts object for a poll's options */
export function emptyCounts(pollId: string): Record<string, number> {
  const poll = getPoll(pollId);
  if (!poll) return {};
  return Object.fromEntries(poll.options.map((o) => [o.id, 0]));
}
