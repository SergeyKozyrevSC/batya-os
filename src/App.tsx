import { useState } from 'react';
import ActivityForm from './components/ActivityForm';
import {
  initialActionTemplates,
  initialSpheres,
} from './initial-data';
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

      return minutes === 0
        ? `${hours} ч`
        : `${hours} ч ${minutes} мин`;
    }
  }
}

export default function App() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);

  const sortedActivities = [...activities].sort((first, second) =>
    second.date.localeCompare(first.date),
  );

  const activityDates = [
    ...new Set(sortedActivities.map((activity) => activity.date)),
  ];

  function handleSaveActivity(activity: Activity) {
    setActivities((current) => [activity, ...current]);
    setIsFormOpen(false);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="brand">BatyaOS</div>
          <p className="brand-caption">by digital_batya</p>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">
            РАБОЧЕЕ ПРОСТРАНСТВО
          </span>
          <div className="current-page">Обзор</div>
        </div>

        <p className="sidebar-footer">
          Маленькие шаги. Реальный прогресс.
        </p>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <p className="eyebrow">ТВОЁ ЛИЧНОЕ ПРОСТРАНСТВО</p>
            <h1>Привет, Сергей</h1>
            <p className="subtitle">
              Твои цели, действия и прогресс — в одном месте.
            </p>
          </div>
        </header>

        <section className="section-heading">
          <h2>Сферы жизни</h2>
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
              onClick={() => setIsFormOpen(true)}
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
                spheres={initialSpheres}
                templates={initialActionTemplates}
                onSave={handleSaveActivity}
                onCancel={() => setIsFormOpen(false)}
              />
            </div>
          )}

          {activities.length === 0 ? (
            <div className="empty-state">
              <h3>Пока нет активностей</h3>
              <p>
                Добавь первое действие — оно появится в журнале.
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
                        </tr>
                      </thead>

                      <tbody>
                        {sortedActivities
                          .filter((activity) => activity.date === date)
                          .map((activity) => {
                            const template =
                              initialActionTemplates.find(
                                (item) =>
                                  item.id === activity.templateId,
                              );

                            const sphere = initialSpheres.find(
                              (item) =>
                                item.id === template?.sphereId,
                            );

                            const unit =
                              template?.kind === 'quantity'
                                ? template.unit
                                : undefined;

                            return (
                              <tr key={activity.id}>
                                <td>
                                  {sphere?.name ?? 'Неизвестная сфера'}
                                </td>

                                <td>
                                  {template?.name ??
                                    'Неизвестное действие'}
                                </td>

                                <td>
                                  {formatActivityResult(
                                    activity.result,
                                    unit,
                                  )}
                                </td>

                                <td className="activity-note">
                                  {activity.note || '—'}
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