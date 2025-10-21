export type Priority = 'High' | 'Medium' | 'Low';

export interface ActionItem {
  task: string;
  assignee: string;
  priority: Priority;
  dueDate: string; // YYYY-MM-DD format
}

export interface DiscussionPoint {
  speaker: string;
  points: string[];
}

export interface SummaryResult {
  title: string;
  shortSummary: string;
  detailedSummary: string[];
  actionItems: ActionItem[];
  discussionBreakdown: DiscussionPoint[];
}
