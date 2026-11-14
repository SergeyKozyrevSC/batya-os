import { useState } from 'react';
import ActivityForm from './components/ActivityForm';
import { initialActionTemplates, initialSpheres } from './initial-data';
import type { Activity } from './types';

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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sphereFilter, setSphereFilter] = useState('all');

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

    const template = initialActionTemplates.find(
      (item) => item.id === activity.templateId,
    );

    const sphereName =
      initialSpheres.find((item) => item.id === template?.sphereId)?.name ??
      'эту активность';

    const confirmed = window.confirm(
      `Удалить активность «${
        template?.name ?? 'Без названия'
      }» из сферы «${sphereName}»?`,
    );

    if (!confirmed) {
      return;
    }

    setActivities((current) =>
      current.filter((item) => item.id !== activityId),
    );
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

          <p className="footnote">
            Пока записи хранятся только до перезапуска приложения.
          </p>
        </section>
      </main>
    </div>
  );
}
