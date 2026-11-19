import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import ActivityForm from './components/ActivityForm';
import { initialActionTemplates, initialSpheres } from './initial-data';
import type {
  Activity,
  EntityId,
  Project,
  ProjectTask,
  SpherePlan,
  Task,
} from './types';

const ACTIVITIES_STORAGE_KEY = 'batya-os.activities';
const TASKS_STORAGE_KEY = 'batya-os.tasks';
const PROJECTS_STORAGE_KEY = 'batya-os.projects';
const PROJECT_TASKS_STORAGE_KEY = 'batya-os.project-tasks';
const SPHERE_PLANS_STORAGE_KEY = 'batya-os.sphere-plans';
function isPlanTarget(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
  );
}

function isSpherePlan(value: unknown): value is SpherePlan {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('sphereId' in value) ||
    typeof value.sphereId !== 'string' ||
    value.sphereId.trim() === '' ||
    !('dailyTarget' in value) ||
    !isPlanTarget(value.dailyTarget) ||
    !('source' in value)
  ) {
    return false;
  }

  if (value.source === 'tasks' || value.source === 'projectTasks') {
    return true;
  }

  if (value.source !== 'activities') {
    return false;
  }

  return (
    'weeklyTarget' in value &&
    isPlanTarget(value.weeklyTarget) &&
    'metric' in value &&
    (value.metric === 'count' ||
      value.metric === 'quantity' ||
      value.metric === 'minutes') &&
    'templateIds' in value &&
    Array.isArray(value.templateIds) &&
    value.templateIds.every(
      (id: unknown) => typeof id === 'string' && id.trim() !== '',
    )
  );
}
function getTodayDate(): string {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getWeekRange(date: string): { start: string; end: string } {
  const referenceDate = new Date(`${date}T12:00:00`);
  const daysSinceMonday = (referenceDate.getDay() + 6) % 7;

  const monday = new Date(referenceDate);
  monday.setDate(monday.getDate() - daysSinceMonday);

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  function formatDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  return {
    start: formatDate(monday),
    end: formatDate(sunday),
  };
}

const SPHERE_FILTER_STORAGE_KEY = 'batya-os.sphereFilter';

const sphereDescriptions: Record<string, string> = {
  'sphere-career': 'Резюме и подготовка к собеседованиям',
  'sphere-fitness': 'Тренировки и движение',
  'sphere-music': 'Гитара и музыкальная практика',
  'sphere-learning': 'Новые знания и обучение',
  'sphere-projects': 'Личные проекты и подзадачи',
  'sphere-personal': 'Личные дела и повседневные задачи',
};

function formatActivityDate(date: string): string {
  const [year, month, day] = date.split('-');

  return `${day}-${month}-${year}`;
}

function formatActivityResult(
  result: Activity['result'],
  unit?: string,
): string {
  switch (result.kind) {
    case 'fact':
      return 'Выполнено';

    case 'quantity':
      return unit ? `${result.value} ${unit}` : String(result.value);

    case 'duration': {
      const hours = Math.floor(result.minutes / 60);
      const minutes = result.minutes % 60;

      if (hours === 0) {
        return `${minutes} мин`;
      }

      return minutes === 0 ? `${hours} ч` : `${hours} ч ${minutes} мин`;
    }
  }
}

export default function App() {
  const [spherePlans, setSpherePlans] = useState<SpherePlan[]>(() => {
    try {
      const storedPlans = window.localStorage.getItem(SPHERE_PLANS_STORAGE_KEY);

      if (!storedPlans) {
        return [];
      }

      const parsedPlans: unknown = JSON.parse(storedPlans);

      if (!Array.isArray(parsedPlans) || !parsedPlans.every(isSpherePlan)) {
        return [];
      }

      const sphereIds = new Set(parsedPlans.map((plan) => plan.sphereId));

      if (sphereIds.size !== parsedPlans.length) {
        return [];
      }

      return parsedPlans;
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SPHERE_PLANS_STORAGE_KEY,
        JSON.stringify(spherePlans),
      );
    } catch (error: unknown) {
      console.error('Не удалось сохранить планы сфер:', error);
    }
  }, [spherePlans]);
  const personalPlan = spherePlans.find((plan) => plan.source === 'tasks');

  const [personalDailyTarget, setPersonalDailyTarget] = useState(
    () => personalPlan?.dailyTarget?.toString() ?? '',
  );
  const [personalPlanMessage, setPersonalPlanMessage] = useState('');
  const projectPlan = spherePlans.find(
    (plan) => plan.source === 'projectTasks',
  );

  const [projectDailyTarget, setProjectDailyTarget] = useState(
    () => projectPlan?.dailyTarget?.toString() ?? '',
  );
  const [projectPlanMessage, setProjectPlanMessage] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>(
    undefined,
  );
  const [activities, setActivities] = useState<Activity[]>(() => {
    try {
      const storedActivities = window.localStorage.getItem(
        ACTIVITIES_STORAGE_KEY,
      );

      if (!storedActivities) {
        return [];
      }

      const parsedActivities = JSON.parse(storedActivities) as Activity[];

      if (!Array.isArray(parsedActivities)) {
        return [];
      }

      return parsedActivities;
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(
      ACTIVITIES_STORAGE_KEY,
      JSON.stringify(activities),
    );
  }, [activities]);

  const [sphereFilter, setSphereFilter] = useState(() => {
    const storedFilter = window.localStorage.getItem(SPHERE_FILTER_STORAGE_KEY);

    if (!storedFilter) {
      return 'all';
    }

    const isValidFilter =
      storedFilter === 'all' ||
      initialSpheres.some((sphere) => sphere.id === storedFilter);

    return isValidFilter ? storedFilter : 'all';
  });

  useEffect(() => {
    window.localStorage.setItem(SPHERE_FILTER_STORAGE_KEY, sphereFilter);
  }, [sphereFilter]);

  const [activityToDelete, setActivityToDelete] = useState<
    Activity | undefined
  >(undefined);

  const [importError, setImportError] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const storedTasks = window.localStorage.getItem(TASKS_STORAGE_KEY);

      if (!storedTasks) {
        return [];
      }

      const parsedTasks = JSON.parse(storedTasks) as Task[];

      if (!Array.isArray(parsedTasks)) {
        return [];
      }

      return parsedTasks;
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [projectImportMessage, setProjectImportMessage] = useState('');
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<EntityId | null>(
    null,
  );

  const [editingProjectTitle, setEditingProjectTitle] = useState('');
  const [projectPendingDeletion, setProjectPendingDeletion] =
    useState<Project | null>(null);

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const storedProjects = window.localStorage.getItem(PROJECTS_STORAGE_KEY);

      if (!storedProjects) {
        return [];
      }

      const parsedProjects: unknown = JSON.parse(storedProjects);

      if (!Array.isArray(parsedProjects)) {
        return [];
      }

      return parsedProjects.filter((item: unknown): item is Project => {
        if (typeof item !== 'object' || item === null) {
          return false;
        }

        const candidate = item as Partial<Project>;

        return (
          typeof candidate.id === 'string' &&
          candidate.id.trim() !== '' &&
          typeof candidate.title === 'string' &&
          candidate.title.trim() !== ''
        );
      });
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const [newProjectTaskTitle, setNewProjectTaskTitle] = useState('');
  const [editingProjectTaskId, setEditingProjectTaskId] =
    useState<EntityId | null>(null);

  const [editingProjectTaskTitle, setEditingProjectTaskTitle] = useState('');
  const [projectTaskFilters, setProjectTaskFilters] = useState<
    Record<EntityId, 'all' | 'active' | 'completed'>
  >({});

  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>(() => {
    try {
      const storedTasks = window.localStorage.getItem(
        PROJECT_TASKS_STORAGE_KEY,
      );

      if (!storedTasks) {
        return [];
      }

      const parsedTasks: unknown = JSON.parse(storedTasks);

      if (!Array.isArray(parsedTasks)) {
        return [];
      }

      return parsedTasks.filter((item: unknown): item is ProjectTask => {
        if (typeof item !== 'object' || item === null) {
          return false;
        }

        const candidate = item as Partial<ProjectTask>;

        return (
          typeof candidate.id === 'string' &&
          candidate.id.trim() !== '' &&
          typeof candidate.projectId === 'string' &&
          candidate.projectId.trim() !== '' &&
          typeof candidate.title === 'string' &&
          candidate.title.trim() !== '' &&
          typeof candidate.isCompleted === 'boolean' &&
          (candidate.completedAt === null ||
            typeof candidate.completedAt === 'string')
        );
      });
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(
      PROJECT_TASKS_STORAGE_KEY,
      JSON.stringify(projectTasks),
    );
  }, [projectTasks]);

  const todayDate = getTodayDate();

  const completedTodayCount = tasks.filter(
    (task) => task.isCompleted && task.completedAt === todayDate,
  ).length;

  const currentWeek = getWeekRange(todayDate);

  const completedThisWeekCount = tasks.filter(
    (task) =>
      task.isCompleted &&
      task.completedAt !== null &&
      task.completedAt >= currentWeek.start &&
      task.completedAt <= currentWeek.end,
  ).length;

  const completedProjectTasksTodayCount = projectTasks.filter(
    (task) => task.isCompleted && task.completedAt === todayDate,
  ).length;

  const completedProjectTasksThisWeekCount = projectTasks.filter(
    (task) =>
      task.isCompleted &&
      task.completedAt !== null &&
      task.completedAt >= currentWeek.start &&
      task.completedAt <= currentWeek.end,
  ).length;

  const completedTasksCount = tasks.filter((task) => task.isCompleted).length;

  const taskCompletionPercent =
    tasks.length === 0
      ? 0
      : Math.round((completedTasksCount / tasks.length) * 100);

  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!activityToDelete) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        cancelDeleteActivity();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activityToDelete]);

  useEffect(() => {
    if (!activityToDelete) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activityToDelete]);

  useEffect(() => {
    if (activityToDelete) {
      cancelButtonRef.current?.focus();
    }
  }, [activityToDelete]);

  const filteredActivities = activities.filter((activity) => {
    if (sphereFilter === 'all') {
      return true;
    }

    const template = initialActionTemplates.find(
      (item) => item.id === activity.templateId,
    );

    return template?.sphereId === sphereFilter;
  });

  const sortedActivities = [...filteredActivities].sort((first, second) =>
    second.date.localeCompare(first.date),
  );

  const activityDates = [
    ...new Set(sortedActivities.map((activity) => activity.date)),
  ];

  function handleOpenCreateForm() {
    setEditingActivity(undefined);
    setIsFormOpen(true);
  }

  function handleOpenEditForm(activity: Activity) {
    setEditingActivity(activity);
    setIsFormOpen(true);
  }

  function handleCloseForm() {
    setIsFormOpen(false);
    setEditingActivity(undefined);
  }

  function handleSaveActivity(activity: Activity) {
    setActivities((current) => {
      const alreadyExists = current.some((item) => item.id === activity.id);

      if (alreadyExists) {
        return current.map((item) =>
          item.id === activity.id ? activity : item,
        );
      }

      return [activity, ...current];
    });

    handleCloseForm();
  }

  function handleDeleteActivity(activityId: string) {
    const activity = activities.find((item) => item.id === activityId);

    if (!activity) {
      return;
    }

    setActivityToDelete(activity);
  }

  function confirmDeleteActivity() {
    if (!activityToDelete) {
      return;
    }

    setActivities((current) =>
      current.filter((item) => item.id !== activityToDelete.id),
    );

    setActivityToDelete(undefined);
  }

  function cancelDeleteActivity() {
    setActivityToDelete(undefined);
  }

  function exportActivities() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      activities,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `batya-os-activities-${getTodayDate()}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function handleAddProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = newProjectTitle.trim();

    if (!title) {
      return;
    }

    const newProject: Project = {
      id: crypto.randomUUID(),
      title,
    };

    setProjects((current) => [newProject, ...current]);
    setNewProjectTitle('');
  }

  function handleStartProjectEditing(
    projectId: EntityId,
    currentTitle: string,
  ) {
    setEditingProjectId(projectId);
    setEditingProjectTitle(currentTitle);
  }

  function handleSaveProjectTitle(projectId: EntityId) {
    const title = editingProjectTitle.trim();

    if (!title) {
      return;
    }

    setProjects((current) =>
      current.map((project) => {
        if (project.id !== projectId) {
          return project;
        }

        return {
          ...project,
          title,
        };
      }),
    );

    setEditingProjectId(null);
    setEditingProjectTitle('');
  }

  function handleCancelProjectEditing() {
    setEditingProjectId(null);
    setEditingProjectTitle('');
  }

  function handleClearCompletedProjectTasks(projectId: EntityId) {
    setProjectTasks((current) =>
      current.filter(
        (task) => task.projectId !== projectId || !task.isCompleted,
      ),
    );
  }

  function handleExportProjects() {
    const exportData = {
      projects,
      projectTasks,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'batya-os-projects.json';
    link.click();

    URL.revokeObjectURL(url);
  }

  function handleSelectImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setImportFile(file);
  }

  function handleRequestImport() {
    if (!importFile) {
      return;
    }

    setIsImportConfirmOpen(true);
  }

  async function handleImportProjects() {
    if (!importFile) {
      return;
    }

    setProjectImportMessage('');

    try {
      const fileContent = await importFile.text();
      const parsedData: unknown = JSON.parse(fileContent);

      if (
        typeof parsedData !== 'object' ||
        parsedData === null ||
        !('projects' in parsedData) ||
        !('projectTasks' in parsedData)
      ) {
        throw new Error('В файле должны быть массивы projects и projectTasks.');
      }

      const importedProjects: unknown = parsedData.projects;
      const importedProjectTasks: unknown = parsedData.projectTasks;

      if (
        !Array.isArray(importedProjects) ||
        !Array.isArray(importedProjectTasks)
      ) {
        throw new Error('Поля projects и projectTasks должны быть массивами.');
      }

      function isProject(item: unknown): item is Project {
        if (typeof item !== 'object' || item === null) {
          return false;
        }

        const candidate = item as Partial<Project>;

        return (
          typeof candidate.id === 'string' &&
          candidate.id.trim() !== '' &&
          typeof candidate.title === 'string' &&
          candidate.title.trim() !== ''
        );
      }

      function isProjectTask(item: unknown): item is ProjectTask {
        if (typeof item !== 'object' || item === null) {
          return false;
        }

        const candidate = item as Partial<ProjectTask>;

        return (
          typeof candidate.id === 'string' &&
          candidate.id.trim() !== '' &&
          typeof candidate.projectId === 'string' &&
          candidate.projectId.trim() !== '' &&
          typeof candidate.title === 'string' &&
          candidate.title.trim() !== '' &&
          typeof candidate.isCompleted === 'boolean' &&
          (candidate.completedAt === null ||
            (typeof candidate.completedAt === 'string' &&
              candidate.completedAt.trim() !== '' &&
              !Number.isNaN(Date.parse(candidate.completedAt)))) &&
          (candidate.isCompleted
            ? candidate.completedAt !== null
            : candidate.completedAt === null)
        );
      }

      if (!importedProjects.every(isProject)) {
        throw new Error('В файле есть проект с некорректными полями.');
      }

      if (!importedProjectTasks.every(isProjectTask)) {
        throw new Error(
          'В файле есть подзадача с некорректными полями или датой завершения.',
        );
      }

      const projectIds = new Set(importedProjects.map((project) => project.id));
      const taskIds = new Set(importedProjectTasks.map((task) => task.id));

      if (projectIds.size !== importedProjects.length) {
        throw new Error('В файле повторяются ID проектов.');
      }

      if (taskIds.size !== importedProjectTasks.length) {
        throw new Error('В файле повторяются ID подзадач.');
      }

      if (
        importedProjectTasks.some((task) => !projectIds.has(task.projectId))
      ) {
        throw new Error(
          'В файле есть подзадача, которая ссылается на отсутствующий проект.',
        );
      }

      setProjects(importedProjects);
      setProjectTasks(importedProjectTasks);
      setImportFile(null);
      setProjectImportMessage(
        `Импорт завершён. Проектов: ${importedProjects.length}, подзадач: ${importedProjectTasks.length}.`,
      );
    } catch (error: unknown) {
      if (error instanceof SyntaxError) {
        setProjectImportMessage(
          'Импорт отменён: некорректный JSON. Текущие данные не изменены.',
        );
      } else {
        const reason =
          error instanceof Error ? error.message : 'Не удалось прочитать файл.';

        setProjectImportMessage(
          `Импорт отменён: ${reason} Текущие данные не изменены.`,
        );
      }
    } finally {
      setIsImportConfirmOpen(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }

      if (projectPendingDeletion) {
        setProjectPendingDeletion(null);
      }

      if (isImportConfirmOpen) {
        setIsImportConfirmOpen(false);
      }

      if (isFormOpen) {
        handleCloseForm();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [projectPendingDeletion, isImportConfirmOpen, isFormOpen]);

  function handleSavePersonalPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const dailyTarget = Number(personalDailyTarget);

    if (
      personalDailyTarget.trim() === '' ||
      !Number.isSafeInteger(dailyTarget) ||
      dailyTarget <= 0 ||
      !Number.isSafeInteger(dailyTarget * 7)
    ) {
      setPersonalPlanMessage('Введите положительное целое число.');
      return;
    }

    const personalSphere = initialSpheres.find(
      (sphere) => sphere.name === 'Личное',
    );

    if (!personalSphere) {
      setPersonalPlanMessage('Не найдена сфера «Личное».');
      return;
    }

    const updatedPlan: SpherePlan = {
      sphereId: personalSphere.id,
      source: 'tasks',
      dailyTarget,
    };

    setSpherePlans((current) => [
      ...current.filter(
        (plan) =>
          plan.source !== 'tasks' && plan.sphereId !== personalSphere.id,
      ),
      updatedPlan,
    ]);

    setPersonalDailyTarget(String(dailyTarget));
    setPersonalPlanMessage('План применён.');
  }

  function handleClearPersonalPlan() {
    setSpherePlans((current) =>
      current.filter((plan) => plan.source !== 'tasks'),
    );
    setPersonalDailyTarget('');
    setPersonalPlanMessage('План убран. Задачи не изменены.');
  }

  function handleSaveProjectPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const dailyTarget = Number(projectDailyTarget);

    if (
      projectDailyTarget.trim() === '' ||
      !Number.isSafeInteger(dailyTarget) ||
      dailyTarget <= 0 ||
      !Number.isSafeInteger(dailyTarget * 7)
    ) {
      setProjectPlanMessage('Введите положительное целое число.');
      return;
    }

    const projectSphere = initialSpheres.find(
      (sphere) => sphere.id === 'sphere-projects',
    );

    if (!projectSphere) {
      setProjectPlanMessage('Не найдена сфера «Проекты».');
      return;
    }

    const updatedPlan: SpherePlan = {
      sphereId: projectSphere.id,
      source: 'projectTasks',
      dailyTarget,
    };

    setSpherePlans((current) => [
      ...current.filter(
        (plan) =>
          plan.source !== 'projectTasks' && plan.sphereId !== projectSphere.id,
      ),
      updatedPlan,
    ]);

    setProjectDailyTarget(String(dailyTarget));
    setProjectPlanMessage('План применён.');
  }

  function handleClearProjectPlan() {
    setSpherePlans((current) =>
      current.filter((plan) => plan.source !== 'projectTasks'),
    );
    setProjectDailyTarget('');
    setProjectPlanMessage('План убран. Проекты и подзадачи не изменены.');
  }

  function handleRequestProjectDeletion(project: Project) {
    setProjectPendingDeletion(project);
  }

  function handleConfirmProjectDeletion() {
    if (!projectPendingDeletion) {
      return;
    }

    const projectId = projectPendingDeletion.id;

    setProjects((current) =>
      current.filter((project) => project.id !== projectId),
    );

    setProjectTasks((current) =>
      current.filter((task) => task.projectId !== projectId),
    );

    setProjectPendingDeletion(null);
  }

  function handleStartProjectTaskEditing(
    taskId: EntityId,
    currentTitle: string,
  ) {
    setEditingProjectTaskId(taskId);
    setEditingProjectTaskTitle(currentTitle);
  }

  function handleSaveProjectTaskTitle(taskId: EntityId) {
    const title = editingProjectTaskTitle.trim();

    if (!title) {
      return;
    }

    setProjectTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        return {
          ...task,
          title,
        };
      }),
    );

    setEditingProjectTaskId(null);
    setEditingProjectTaskTitle('');
  }

  function handleCancelProjectTaskEditing() {
    setEditingProjectTaskId(null);
    setEditingProjectTaskTitle('');
  }

  function handleSetProjectTaskFilter(
    projectId: EntityId,
    filter: 'all' | 'active' | 'completed',
  ) {
    setProjectTaskFilters((current) => ({
      ...current,
      [projectId]: filter,
    }));
  }

  function getSortedProjectTasks(projectId: EntityId) {
    return projectTasks
      .filter((task) => task.projectId === projectId)
      .sort((firstTask, secondTask) => {
        if (firstTask.isCompleted !== secondTask.isCompleted) {
          return firstTask.isCompleted ? 1 : -1;
        }

        return 0;
      });
  }

  function getFilteredProjectTasks(projectId: EntityId) {
    const filter = projectTaskFilters[projectId] ?? 'all';
    const tasks = getSortedProjectTasks(projectId);

    if (filter === 'active') {
      return tasks.filter((task) => !task.isCompleted);
    }

    if (filter === 'completed') {
      return tasks.filter((task) => task.isCompleted);
    }

    return tasks;
  }

  function getVisibleProjects() {
    const query = projectSearchQuery.trim().toLowerCase();

    if (!query) {
      return projects;
    }

    return projects.filter((project) => {
      const projectMatches = project.title.toLowerCase().includes(query);

      const taskMatches = projectTasks.some(
        (task) =>
          task.projectId === project.id &&
          task.title.toLowerCase().includes(query),
      );

      return projectMatches || taskMatches;
    });
  }

  function getProjectProgress(projectId: EntityId) {
    const projectTasksForProject = projectTasks.filter(
      (task) => task.projectId === projectId,
    );

    const completedCount = projectTasksForProject.filter(
      (task) => task.isCompleted,
    ).length;

    const totalCount = projectTasksForProject.length;

    return {
      completedCount,
      totalCount,
      percent:
        totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
    };
  }

  function handleAddProjectTask(
    event: FormEvent<HTMLFormElement>,
    projectId: EntityId,
  ) {
    event.preventDefault();

    const title = newProjectTaskTitle.trim();

    if (!title) {
      return;
    }

    const newTask: ProjectTask = {
      id: crypto.randomUUID(),
      projectId,
      title,
      isCompleted: false,
      completedAt: null,
    };

    setProjectTasks((current) => [...current, newTask]);
    setNewProjectTaskTitle('');
  }

  function handleToggleProjectTask(taskId: EntityId) {
    setProjectTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        return {
          ...task,
          isCompleted: !task.isCompleted,
          completedAt: task.isCompleted ? null : getTodayDate(),
        };
      }),
    );
  }

  function handleDeleteProjectTask(taskId: EntityId) {
    setProjectTasks((current) => current.filter((task) => task.id !== taskId));
  }

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = newTaskTitle.trim();

    if (!title) {
      return;
    }

    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      isCompleted: false,
      completedAt: null,
    };

    setTasks((current) => [newTask, ...current]);
    setNewTaskTitle('');
  }

  function handleToggleTask(taskId: string) {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        if (task.isCompleted) {
          return {
            ...task,
            isCompleted: false,
            completedAt: null,
          };
        }

        return {
          ...task,
          isCompleted: true,
          completedAt: getTodayDate(),
        };
      }),
    );
  }

  function handleStartEditTask(task: Task) {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
  }

  function handleCancelEditTask() {
    setEditingTaskId(null);
    setEditingTaskTitle('');
  }

  function handleSaveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = editingTaskTitle.trim();

    if (!editingTaskId || !title) {
      return;
    }

    setTasks((current) =>
      current.map((task) =>
        task.id === editingTaskId ? { ...task, title } : task,
      ),
    );

    handleCancelEditTask();
  }

  function handleDeleteTask(taskId: string) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  }

  function handleClearCompletedTasks() {
    setTasks((current) => current.filter((task) => !task.isCompleted));
  }

  function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));

        if (!parsed || !Array.isArray(parsed.activities)) {
          setImportError('Файл не содержит список активностей.');
          return;
        }

        const importedActivities = parsed.activities.filter(
          (item: unknown): item is Activity => {
            if (typeof item !== 'object' || item === null) {
              return false;
            }

            const candidate = item as Partial<Activity>;

            if (
              typeof candidate.id !== 'string' ||
              candidate.id.trim() === '' ||
              typeof candidate.templateId !== 'string' ||
              candidate.templateId.trim() === '' ||
              typeof candidate.date !== 'string' ||
              !/^\d{4}-\d{2}-\d{2}$/.test(candidate.date) ||
              typeof candidate.note !== 'string'
            ) {
              return false;
            }

            const result = candidate.result;

            if (typeof result !== 'object' || result === null) {
              return false;
            }

            if (result.kind === 'fact') {
              return true;
            }

            if (
              result.kind === 'quantity' &&
              typeof result.value === 'number' &&
              Number.isInteger(result.value) &&
              result.value > 0
            ) {
              return true;
            }

            if (
              result.kind === 'duration' &&
              typeof result.minutes === 'number' &&
              Number.isInteger(result.minutes) &&
              result.minutes > 0
            ) {
              return true;
            }

            return false;
          },
        );

        setActivities((current) => {
          const currentIds = new Set(current.map((item) => item.id));

          const newActivities = importedActivities.filter(
            (item: Activity) => !currentIds.has(item.id),
          );

          setImportedCount(newActivities.length);

          return [...newActivities, ...current];
        });

        setImportError('');
      } catch {
        setImportError('Не удалось прочитать JSON-файл.');
      }
    };

    reader.readAsText(file);

    event.target.value = '';
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <p className="hero-eyebrow">ПРОСТРАНСТВО</p>
          <div className="brand">BatyaOS</div>
          <p className="brand-caption">by digital_batya</p>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">РАБОЧЕЕ ПРОСТРАНСТВО</span>
          <div className="current-page">Обзор</div>
        </div>

        <p className="sidebar-footer">Маленькие шаги. Реальный прогресс.</p>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <h1>Привет, Сергей</h1>
          </div>
        </header>

        <section className="section-heading">
          <h2>Фокус</h2>
          <span>Всего сфер: {initialSpheres.length}</span>
        </section>

        <div className="area-grid">
          {initialSpheres.map((sphere) => {
            const activityCount = activities.filter((activity) => {
              const template = initialActionTemplates.find(
                (item) => item.id === activity.templateId,
              );

              return template?.sphereId === sphere.id;
            }).length;

            return (
              <article className="area-card" key={sphere.id}>
                <span className="area-mark" aria-hidden="true">
                  {sphere.name.slice(0, 1)}
                </span>

                <h3>{sphere.name}</h3>

                <p>
                  {sphereDescriptions[sphere.id] ??
                    'Твои действия в этом направлении'}
                </p>

                <span className="area-status">
                  {activityCount === 0
                    ? 'Пока нет записей'
                    : `Записей всего: ${activityCount}`}
                </span>
              </article>
            );
          })}
        </div>

        <section
          className="activity-section"
          aria-labelledby="activity-log-heading"
        >
          <div className="section-heading">
            <h2 id="activity-log-heading">Журнал активностей</h2>

            <button
              type="button"
              onClick={handleOpenCreateForm}
              disabled={isFormOpen}
              aria-expanded={isFormOpen}
              aria-controls="activity-form-container"
            >
              + Добавить активность
            </button>

            <button
              type="button"
              className="button-secondary"
              onClick={exportActivities}
            >
              Экспорт JSON
            </button>

            <label className="button-secondary import-button">
              Импорт JSON
              <input
                type="file"
                accept="application/json"
                onChange={handleImportFile}
              />
            </label>

            {importError && (
              <p className="form-error" role="alert">
                {importError}
              </p>
            )}

            {importedCount > 0 && !importError && (
              <p className="form-success" role="status">
                Импортировано новых записей: {importedCount}
              </p>
            )}
          </div>

          {isFormOpen && (
            <div id="activity-form-container">
              <button
                type="button"
                className="modal-close"
                aria-label="Закрыть"
                onClick={handleCloseForm}
              >
                ×
              </button>
              <ActivityForm
                key={editingActivity?.id ?? 'new'}
                spheres={initialSpheres}
                templates={initialActionTemplates}
                activity={editingActivity}
                onSave={handleSaveActivity}
                onCancel={handleCloseForm}
              />{' '}
            </div>
          )}

          <div className="form-field activity-filter">
            <label htmlFor="activity-sphere-filter">Показать записи</label>

            <select
              id="activity-sphere-filter"
              value={sphereFilter}
              onChange={(event) => setSphereFilter(event.target.value)}
            >
              <option value="all">Все сферы</option>

              {initialSpheres.map((sphere) => (
                <option key={sphere.id} value={sphere.id}>
                  {sphere.name}
                </option>
              ))}
            </select>
          </div>

          {sortedActivities.length === 0 ? (
            <div className="empty-state">
              <h3>
                {activities.length === 0
                  ? 'Пока нет активностей'
                  : 'В этой сфере пока нет активностей'}
              </h3>

              <p>
                {activities.length === 0
                  ? 'Добавь первое действие — оно появится в журнале.'
                  : 'Выбери другую сферу или добавь новую запись.'}
              </p>
            </div>
          ) : (
            <div className="activity-groups">
              {activityDates.map((date) => (
                <section className="activity-date-group" key={date}>
                  <h3>{formatActivityDate(date)}</h3>

                  <div className="table-scroll">
                    <table className="activity-table">
                      <caption className="visually-hidden">
                        Активности за {formatActivityDate(date)}
                      </caption>

                      <thead>
                        <tr>
                          <th scope="col">Сфера</th>
                          <th scope="col">Действие</th>
                          <th scope="col">Результат</th>
                          <th scope="col">Заметка</th>
                          <th scope="col">Действия</th>{' '}
                        </tr>
                      </thead>

                      <tbody>
                        {sortedActivities
                          .filter((activity) => activity.date === date)
                          .map((activity) => {
                            const template = initialActionTemplates.find(
                              (item) => item.id === activity.templateId,
                            );

                            const sphere = initialSpheres.find(
                              (item) => item.id === template?.sphereId,
                            );

                            const unit =
                              template?.kind === 'quantity'
                                ? template.unit
                                : undefined;

                            return (
                              <tr key={activity.id}>
                                <td>{sphere?.name ?? 'Неизвестная сфера'}</td>

                                <td>
                                  {template?.name ?? 'Неизвестное действие'}
                                </td>

                                <td>
                                  {formatActivityResult(activity.result, unit)}
                                </td>

                                <td className="activity-note">
                                  {activity.note || '—'}
                                </td>

                                <td>
                                  <button
                                    type="button"
                                    className="button-secondary"
                                    onClick={() => handleOpenEditForm(activity)}
                                    disabled={isFormOpen}
                                    aria-label={`Изменить: ${
                                      template?.name ?? 'активность'
                                    } за ${formatActivityDate(activity.date)}`}
                                  >
                                    Изменить
                                  </button>
                                  <button
                                    type="button"
                                    className="button-danger"
                                    onClick={() =>
                                      handleDeleteActivity(activity.id)
                                    }
                                    disabled={isFormOpen}
                                    aria-label={`Удалить: ${
                                      template?.name ?? 'активность'
                                    } за ${formatActivityDate(activity.date)}`}
                                  >
                                    Удалить
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          )}

          <section
            className="project-section"
            aria-labelledby="projects-heading"
          >
            <h2 id="projects-heading">Проекты</h2>
            <form className="task-form" onSubmit={handleSaveProjectPlan}>
              <div className="form-field">
                <label htmlFor="project-daily-target">
                  Дневной план, подзадач
                </label>

                <input
                  id="project-daily-target"
                  type="number"
                  min="1"
                  step="1"
                  value={projectDailyTarget}
                  onChange={(event) => {
                    setProjectDailyTarget(event.target.value);
                    setProjectPlanMessage('');
                  }}
                  placeholder="Например: 2"
                  required
                />
              </div>

              <button type="submit" className="button-primary">
                Сохранить план
              </button>

              <button
                type="button"
                className="button-secondary"
                onClick={handleClearProjectPlan}
                disabled={!projectPlan}
              >
                Убрать план
              </button>
            </form>

            <p className="task-summary">
              {projectPlan?.dailyTarget != null
                ? `План: ${projectPlan.dailyTarget} подзадач в день · ${projectPlan.dailyTarget * 7} подзадач в неделю`
                : 'План подзадач не задан'}
            </p>

            <p className="form-hint">
              Один общий план на подзадачи всех проектов.
            </p>

            {projectPlanMessage && (
              <p className="form-hint" role="status">
                {projectPlanMessage}
              </p>
            )}
            <div className="personal-plan-progress">
              <p className="task-summary" role="status">
                {projectPlan?.dailyTarget != null
                  ? `Подзадачи сегодня: ${completedProjectTasksTodayCount} / ${projectPlan.dailyTarget} · ${Math.round(
                      (completedProjectTasksTodayCount /
                        projectPlan.dailyTarget) *
                        100,
                    )}%`
                  : `Подзадач выполнено сегодня: ${completedProjectTasksTodayCount} · План не задан`}
              </p>

              {projectPlan?.dailyTarget != null && (
                <progress
                  className="personal-plan-progress-bar"
                  aria-label="Выполнение дневного плана подзадач проектов"
                  max={projectPlan.dailyTarget}
                  value={Math.min(
                    completedProjectTasksTodayCount,
                    projectPlan.dailyTarget,
                  )}
                />
              )}
            </div>

            <div className="personal-plan-progress">
              <p className="form-hint">
                Неделя: {currentWeek.start} — {currentWeek.end}
              </p>

              <p className="task-summary" role="status">
                {projectPlan?.dailyTarget != null
                  ? `Подзадачи за неделю: ${completedProjectTasksThisWeekCount} / ${projectPlan.dailyTarget * 7} · ${Math.round(
                      (completedProjectTasksThisWeekCount /
                        (projectPlan.dailyTarget * 7)) *
                        100,
                    )}%`
                  : `Подзадач выполнено за неделю: ${completedProjectTasksThisWeekCount} · План не задан`}
              </p>

              {projectPlan?.dailyTarget != null && (
                <progress
                  className="personal-plan-progress-bar"
                  aria-label="Выполнение недельного плана подзадач проектов"
                  max={projectPlan.dailyTarget * 7}
                  value={Math.min(
                    completedProjectTasksThisWeekCount,
                    projectPlan.dailyTarget * 7,
                  )}
                />
              )}
            </div>
            <div className="form-field project-search">
              <label htmlFor="project-search">Поиск</label>

              <input
                id="project-search"
                type="text"
                value={projectSearchQuery}
                onChange={(event) => setProjectSearchQuery(event.target.value)}
                placeholder="Поиск по проектам и подзадачам"
              />
            </div>
            <div className="project-export">
              <button type="button" onClick={handleExportProjects}>
                Экспортировать JSON
              </button>
            </div>
            <div className="project-import">
              <div className="form-field">
                <label htmlFor="project-import-file">Импорт JSON</label>

                <input
                  id="project-import-file"
                  type="file"
                  accept="application/json"
                  onChange={handleSelectImportFile}
                />
              </div>

              <button
                type="button"
                disabled={!importFile}
                onClick={handleRequestImport}
              >
                Импортировать
              </button>
            </div>
            {projectImportMessage && (
              <p role="status" aria-live="polite">
                {projectImportMessage}
              </p>
            )}
            <p className="section-stats">
              Проектов: {projects.length} · Подзадач: {projectTasks.length} ·
              Выполнено:{' '}
              {projectTasks.filter((task) => task.isCompleted).length}
            </p>

            <form className="task-form" onSubmit={handleAddProject}>
              <div className="form-field">
                <label htmlFor="new-project-title">Новый проект</label>

                <input
                  id="new-project-title"
                  type="text"
                  value={newProjectTitle}
                  onChange={(event) => setNewProjectTitle(event.target.value)}
                  placeholder="Например: BatyaOS"
                  required
                />
              </div>

              <button type="submit" disabled={!newProjectTitle.trim()}>
                Создать проект
              </button>
            </form>

            {getVisibleProjects().length === 0 ? (
              <p className="empty-state">Проектов пока нет. Создай первый.</p>
            ) : (
              <ul className="project-list">
                {getVisibleProjects().map((project) => (
                  <li className="project-card" key={project.id}>
                    {editingProjectId === project.id ? (
                      <div className="project-editing">
                        <div className="form-field">
                          <label htmlFor={`project-title-${project.id}`}>
                            Название проекта
                          </label>

                          <input
                            id={`project-title-${project.id}`}
                            type="text"
                            value={editingProjectTitle}
                            onChange={(event) =>
                              setEditingProjectTitle(event.target.value)
                            }
                            required
                          />
                        </div>

                        <div className="project-editing-actions">
                          <button
                            type="button"
                            onClick={() => handleSaveProjectTitle(project.id)}
                          >
                            Сохранить
                          </button>

                          <button
                            type="button"
                            onClick={handleCancelProjectEditing}
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="project-header">
                        <h3>{project.title}</h3>
                        <div className="project-task-filters">
                          {(
                            [
                              ['all', 'Все'],
                              ['active', 'Активные'],
                              ['completed', 'Выполненные'],
                            ] as const
                          ).map(([filter, label]) => (
                            <button
                              key={filter}
                              type="button"
                              className={
                                (projectTaskFilters[project.id] ?? 'all') ===
                                filter
                                  ? 'filter-button active'
                                  : 'filter-button'
                              }
                              onClick={() =>
                                handleSetProjectTaskFilter(project.id, filter)
                              }
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        {projectTasks.some(
                          (task) =>
                            task.projectId === project.id && task.isCompleted,
                        ) && (
                          <button
                            type="button"
                            className="clear-completed-button"
                            onClick={() =>
                              handleClearCompletedProjectTasks(project.id)
                            }
                          >
                            Удалить выполненные
                          </button>
                        )}
                        <div className="project-progress">
                          <p className="project-progress-label">
                            Выполнено{' '}
                            {getProjectProgress(project.id).completedCount} из{' '}
                            {getProjectProgress(project.id).totalCount} —{' '}
                            {getProjectProgress(project.id).percent}%
                          </p>

                          <div
                            className="project-progress-bar"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={
                              getProjectProgress(project.id).percent
                            }
                            aria-label={`Прогресс проекта: ${project.title}`}
                          >
                            <div
                              className="project-progress-fill"
                              style={{
                                width: `${
                                  getProjectProgress(project.id).percent
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="project-actions">
                          <button
                            type="button"
                            onClick={() =>
                              handleStartProjectEditing(
                                project.id,
                                project.title,
                              )
                            }
                          >
                            Изменить
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleRequestProjectDeletion(project)
                            }
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    )}

                    <form
                      className="task-form"
                      onSubmit={(event) =>
                        handleAddProjectTask(event, project.id)
                      }
                    >
                      <div className="form-field">
                        <label htmlFor={`project-task-${project.id}`}>
                          Новая подзадача
                        </label>

                        <input
                          id={`project-task-${project.id}`}
                          type="text"
                          value={newProjectTaskTitle}
                          onChange={(event) =>
                            setNewProjectTaskTitle(event.target.value)
                          }
                          placeholder="Например: Добавить типы"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={!newProjectTaskTitle.trim()}
                      >
                        Добавить
                      </button>
                    </form>

                    {getFilteredProjectTasks(project.id).length === 0 ? (
                      <p className="empty-state">Подзадач пока нет.</p>
                    ) : (
                      <ul className="task-list">
                        {getFilteredProjectTasks(project.id).map((task) => (
                          <li
                            className={
                              task.isCompleted
                                ? 'task-item completed'
                                : 'task-item'
                            }
                            key={task.id}
                          >
                            {editingProjectTaskId === task.id ? (
                              <div className="task-editing">
                                <div className="form-field">
                                  <label
                                    htmlFor={`project-task-title-${task.id}`}
                                  >
                                    Название подзадачи
                                  </label>

                                  <input
                                    id={`project-task-title-${task.id}`}
                                    type="text"
                                    value={editingProjectTaskTitle}
                                    onChange={(event) =>
                                      setEditingProjectTaskTitle(
                                        event.target.value,
                                      )
                                    }
                                    required
                                  />
                                </div>

                                <div className="task-editing-actions">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSaveProjectTaskTitle(task.id)
                                    }
                                  >
                                    Сохранить
                                  </button>

                                  <button
                                    type="button"
                                    onClick={handleCancelProjectTaskEditing}
                                  >
                                    Отмена
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <label className="task-label">
                                  <input
                                    type="checkbox"
                                    checked={task.isCompleted}
                                    onChange={() =>
                                      handleToggleProjectTask(task.id)
                                    }
                                  />

                                  <span className="task-title">
                                    {task.title}
                                  </span>
                                </label>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStartProjectTaskEditing(
                                      task.id,
                                      task.title,
                                    )
                                  }
                                >
                                  Изменить
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              className="task-delete"
                              onClick={() => handleDeleteProjectTask(task.id)}
                            >
                              Удалить
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="task-section">
            <h2>Личный чеклист</h2>

            <form className="task-form" onSubmit={handleSavePersonalPlan}>
              <div className="form-field">
                <label htmlFor="personal-daily-target">
                  Дневной план, задач
                </label>

                <input
                  id="personal-daily-target"
                  type="number"
                  min="1"
                  step="1"
                  value={personalDailyTarget}
                  onChange={(event) => {
                    setPersonalDailyTarget(event.target.value);
                    setPersonalPlanMessage('');
                  }}
                  placeholder="Например: 3"
                  required
                />
              </div>

              <button type="submit" className="button-primary">
                Сохранить план
              </button>

              <button
                type="button"
                className="button-secondary"
                onClick={handleClearPersonalPlan}
                disabled={!personalPlan}
              >
                Убрать план
              </button>
            </form>

            <p className="task-summary">
              {personalPlan?.dailyTarget != null
                ? `План: ${personalPlan.dailyTarget} задач в день · ${personalPlan.dailyTarget * 7} задач в неделю`
                : 'План не задан'}
            </p>

            {personalPlanMessage && (
              <p className="form-hint" role="status">
                {personalPlanMessage}
              </p>
            )}

            <p className="task-summary" role="status">
              {tasks.length === 0
                ? 'Общий прогресс: пока нет задач'
                : `Всего выполнено: ${completedTasksCount} из ${tasks.length} · ${taskCompletionPercent}%`}
            </p>

            <div className="personal-plan-progress">
              <p className="task-summary" role="status">
                {personalPlan?.dailyTarget != null
                  ? `План на сегодня: ${completedTodayCount} / ${personalPlan.dailyTarget} · ${Math.round(
                      (completedTodayCount / personalPlan.dailyTarget) * 100,
                    )}%`
                  : `Выполнено сегодня: ${completedTodayCount} · План не задан`}
              </p>

              {personalPlan?.dailyTarget != null && (
                <progress
                  className="personal-plan-progress-bar"
                  aria-label="Выполнение дневного плана личного чеклиста"
                  max={personalPlan.dailyTarget}
                  value={Math.min(
                    completedTodayCount,
                    personalPlan.dailyTarget,
                  )}
                />
              )}
            </div>

            <div className="task-actions">
              <button
                type="button"
                className="button-secondary"
                onClick={handleClearCompletedTasks}
                disabled={
                  editingTaskId !== null ||
                  !tasks.some((task) => task.isCompleted)
                }
              >
                Очистить выполненные
              </button>

              <p className="form-hint">
                Удаляет все выполненные задачи без возможности восстановления.
              </p>
            </div>

            <div className="personal-plan-progress">
              <p className="form-hint">
                Неделя: {currentWeek.start} — {currentWeek.end}
              </p>

              <p className="task-summary" role="status">
                {personalPlan?.dailyTarget != null
                  ? `План на неделю: ${completedThisWeekCount} / ${personalPlan.dailyTarget * 7} · ${Math.round(
                      (completedThisWeekCount /
                        (personalPlan.dailyTarget * 7)) *
                        100,
                    )}%`
                  : `Выполнено за неделю: ${completedThisWeekCount} · План не задан`}
              </p>

              {personalPlan?.dailyTarget != null && (
                <progress
                  className="personal-plan-progress-bar"
                  aria-label="Выполнение недельного плана личного чеклиста"
                  max={personalPlan.dailyTarget * 7}
                  value={Math.min(
                    completedThisWeekCount,
                    personalPlan.dailyTarget * 7,
                  )}
                />
              )}
            </div>

            <form className="task-form" onSubmit={handleAddTask}>
              <div className="form-field">
                <label htmlFor="new-task-title">Новая задача</label>

                <input
                  id="new-task-title"
                  type="text"
                  value={newTaskTitle}
                  onChange={(event) => setNewTaskTitle(event.target.value)}
                  placeholder="Например: разобрать почту"
                  required
                />
              </div>

              <button type="submit" className="button-primary">
                Добавить
              </button>
            </form>

            {tasks.length === 0 ? (
              <p className="empty-state">Задач пока нет. Добавь первую.</p>
            ) : (
              <ul className="task-list">
                {tasks.map((task) => (
                  <li
                    className={
                      task.isCompleted ? 'task-item completed' : 'task-item'
                    }
                    key={task.id}
                  >
                    {editingTaskId === task.id ? (
                      <form
                        className="task-edit-form"
                        onSubmit={handleSaveTask}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            handleCancelEditTask();
                          }
                        }}
                      >
                        <div className="form-field">
                          <label htmlFor={`edit-task-${task.id}`}>
                            Название задачи
                          </label>

                          <input
                            id={`edit-task-${task.id}`}
                            type="text"
                            value={editingTaskTitle}
                            onChange={(event) =>
                              setEditingTaskTitle(event.target.value)
                            }
                            required
                          />
                        </div>

                        <div className="task-item-actions">
                          <button
                            type="submit"
                            disabled={!editingTaskTitle.trim()}
                          >
                            Сохранить
                          </button>

                          <button
                            type="button"
                            className="button-secondary"
                            onClick={handleCancelEditTask}
                          >
                            Отмена
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <label>
                          <input
                            type="checkbox"
                            checked={task.isCompleted}
                            onChange={() => handleToggleTask(task.id)}
                          />

                          <span>{task.title}</span>
                        </label>

                        <div className="task-item-actions">
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() => handleStartEditTask(task)}
                            disabled={editingTaskId !== null}
                            aria-label={`Изменить задачу: ${task.title}`}
                          >
                            Изменить
                          </button>

                          <button
                            type="button"
                            className="button-danger"
                            onClick={() => handleDeleteTask(task.id)}
                            aria-label={`Удалить задачу: ${task.title}`}
                          >
                            Удалить
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="footnote">
            Активности и задачи сохраняются локально на этом устройстве.
          </p>
        </section>
        {activityToDelete && (
          <div className="modal-backdrop" role="presentation">
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-activity-title"
            >
              <h2 id="delete-activity-title">Удалить активность?</h2>

              <button
                type="button"
                className="modal-close"
                aria-label="Закрыть"
                onClick={cancelDeleteActivity}
              >
                ×
              </button>

              <p> Запись будет удалена без возможности восстановить её </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-button-cancel"
                  onClick={cancelDeleteActivity}
                >
                  Отмена
                </button>

                <button
                  type="button"
                  className="modal-button-action"
                  onClick={confirmDeleteActivity}
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}

        {projectPendingDeletion && (
          <div className="modal-backdrop" role="presentation">
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-project-title"
            >
              <h2 id="delete-project-title">Удалить проект?</h2>
              <button
                type="button"
                className="modal-close"
                aria-label="Закрыть"
                onClick={() => setProjectPendingDeletion(null)}
              >
                ×
              </button>
              <p>
                Проект «{projectPendingDeletion.title}» и все его подзадачи
                будут удалены. Действие нельзя отменить.
              </p>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-button-cancel"
                  onClick={() => setProjectPendingDeletion(null)}
                >
                  Отмена
                </button>

                <button
                  type="button"
                  className="modal-button-action"
                  onClick={handleConfirmProjectDeletion}
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}
        {isImportConfirmOpen && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>Подтвердите импорт</h2>
              <button
                type="button"
                className="modal-close"
                aria-label="Закрыть"
                onClick={() => {
                  setIsImportConfirmOpen(false);
                }}
              >
                ×
              </button>

              <p>
                Текущие проекты и подзадачи будут заменены данными из выбранного
                файла.
              </p>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-button-cancel"
                  onClick={() => setIsImportConfirmOpen(false)}
                >
                  Отмена
                </button>

                <button
                  type="button"
                  className="modal-button-action"
                  onClick={handleImportProjects}
                >
                  Заменить данные
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
