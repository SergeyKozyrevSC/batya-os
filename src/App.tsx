import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import ActivityForm from './components/ActivityForm';
import { initialActionTemplates, initialSpheres } from './initial-data';
import type { Activity, Task } from './types';

const ACTIVITIES_STORAGE_KEY = 'batya-os.activities';
const TASKS_STORAGE_KEY = 'batya-os.tasks';
function getTodayDate(): string {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
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

  const todayDate = getTodayDate();

  const completedTodayCount = tasks.filter(
    (task) => task.isCompleted && task.completedAt === todayDate,
  ).length;

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

          <section className="task-section">
            <h2>Личный чеклист</h2>

            <p className="task-summary" role="status">
              Выполнено сегодня: {completedTodayCount}
            </p>

            <div className="task-actions">
              <button
                type="button"
                className="button-secondary"
                onClick={handleClearCompletedTasks}
                disabled={!tasks.some((task) => task.isCompleted)}
              >
                Очистить выполненные
              </button>

              <p className="form-hint">
                Удаляет все выполненные задачи без возможности восстановления.
              </p>
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
                    <label>
                      <input
                        type="checkbox"
                        checked={task.isCompleted}
                        onChange={() => handleToggleTask(task.id)}
                      />

                      <span>{task.title}</span>
                    </label>

                    <button
                      type="button"
                      className="button-danger"
                      onClick={() => handleDeleteTask(task.id)}
                      aria-label={`Удалить задачу: ${task.title}`}
                    >
                      Удалить
                    </button>
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

              <p> Запись будет удалена без возможности восстановить её </p>
              <div className="modal-actions">
                <button
                  ref={cancelButtonRef}
                  type="button"
                  className="button-secondary"
                  onClick={cancelDeleteActivity}
                >
                  Отмена
                </button>

                <button
                  type="button"
                  className="button-danger"
                  onClick={confirmDeleteActivity}
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
