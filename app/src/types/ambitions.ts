export interface AmbitionData {
  id: string;
  title: string;
  description: string;
  timeHorizon: string;
  location: string;
  createdAt: string;
  role: string;
  activity: string;
  topics: string[];
}

export interface AmbitionActivity {
  trackedStories: number;
  linkedItems: number;
}

export type AmbitionEdit = Pick<AmbitionData, "title" | "description" | "timeHorizon" | "location">;
