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
