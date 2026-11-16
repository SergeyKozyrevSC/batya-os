import type { ActionTemplate, Sphere } from './types';

export const initialSpheres: Sphere[] = [
  {
    id: 'sphere-career',
    name: 'Карьера',
    isSystem: true,
  },
  {
    id: 'sphere-fitness',
    name: 'Фитнес',
    isSystem: true,
  },
  {
    id: 'sphere-music',
    name: 'Музыка',
    isSystem: true,
  },
  {
    id: 'sphere-learning',
    name: 'Обучение',
    isSystem: true,
  },
  {
    id: 'sphere-projects',
    name: 'Проекты',
    isSystem: true,
  },
  {
    id: 'sphere-personal',
    name: 'Личное',
    isSystem: true,
  },
];

export const initialActionTemplates: ActionTemplate[] = [
  {
    id: 'template-gym-chest-biceps',
    sphereId: 'sphere-fitness',
    name: 'Грудь / бицепс',
    kind: 'fact',
  },
  {
    id: 'template-gym-back-triceps',
    sphereId: 'sphere-fitness',
    name: 'Спина / трицепс',
    kind: 'fact',
  },
  {
    id: 'template-gym-legs-shoulders',
    sphereId: 'sphere-fitness',
    name: 'Ноги / плечи',
    kind: 'fact',
  },
  {
    id: 'template-career-resumes',
    sphereId: 'sphere-career',
    name: 'Отправка резюме',
    kind: 'quantity',
    unit: 'шт.',
  },
  {
    id: 'template-music-practice',
    sphereId: 'sphere-music',
    name: 'Практика на гитаре',
    kind: 'duration',
  },
  {
    id: 'template-learning-session',
    sphereId: 'sphere-learning',
    name: 'Обучение',
    kind: 'duration',
  },
];
