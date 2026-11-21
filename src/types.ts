export type EntityId = string;

export type ActivityDate = string;

export type Sphere = {
  id: EntityId;
  name: string;
  isSystem: boolean;
};

type ActionTemplateBase = {
  id: EntityId;
  sphereId: EntityId;
  name: string;
};

export type ActionTemplate =
  | (ActionTemplateBase & {
      kind: 'fact';
    })
  | (ActionTemplateBase & {
      kind: 'quantity';
      unit: string;
    })
  | (ActionTemplateBase & {
      kind: 'duration';
    });

export type ActivityResult =
  | {
      kind: 'fact';
    }
  | {
      kind: 'quantity';
      value: number;
    }
  | {
      kind: 'duration';
      minutes: number;
    };

export type Activity = {
  id: EntityId;
  templateId: EntityId;
  date: ActivityDate;
  result: ActivityResult;
  note: string;
};

export type Task = {
  id: EntityId;
  title: string;
  isCompleted: boolean;
  completedAt: ActivityDate | null;
};

export type Project = {
  id: EntityId;
  title: string;
};

export type ProjectTask = {
  id: EntityId;
  projectId: EntityId;
  title: string;
  isCompleted: boolean;
  completedAt: ActivityDate | null;
};

export type Song = {
  id: EntityId;
  title: string;
  songsterrUrl: string | null;
  isLearned: boolean;
};

export type SongsterrSong = {
  id: number;
  title: string;
  artist?: {
    name?: string;
  };
};

export type ActivitySpherePlan = {
  sphereId: EntityId;
  source: 'activities';
  templateIds: EntityId[];
  metric: 'count' | 'quantity' | 'minutes';
  frequency?: 'daily' | 'weekly';
  dailyTarget: number | null;
  weeklyTarget: number | null;
};

export type TaskSpherePlan = {
  sphereId: EntityId;
  source: 'tasks' | 'projectTasks';
  dailyTarget: number | null;
};

export type SpherePlan = ActivitySpherePlan | TaskSpherePlan;

declare global {
  interface Window {
    batyaOS?: {
      songsterr: {
        search: (query: string) => Promise<unknown>;
      };
    };
  }
}
