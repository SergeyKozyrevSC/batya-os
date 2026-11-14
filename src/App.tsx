import { useState } from 'react';
import { initialSpheres } from './initial-data';

const sphereDescriptions: Record<string, string> = {
  'sphere-career': 'Резюме и подготовка к собеседованиям',
  'sphere-fitness': 'Тренировки и движение',
  'sphere-music': 'Гитара и музыкальная практика',
  'sphere-learning': 'Новые знания и обучение',
  'sphere-projects': 'Личные проекты и подзадачи',
  'sphere-personal': 'Личные дела и повседневные задачи',
};

export default function App() {
  const [testActivities, setTestActivities] = useState(0);

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="brand">BatyaOS</div>
          <p className="brand-caption">by digital_batya</p>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">РАБОЧЕЕ ПРОСТРАНСТВО</span>
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

        <section className="status-panel">
          <div>
            <span className="badge">Техническая проверка</span>
            <h2>Первый экран работает</h2>
            <p>
              Нажми кнопку, чтобы проверить взаимодействие с интерфейсом.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setTestActivities((count) => count + 1)}
          >
            + Тестовое действие
          </button>
        </section>

        <section className="section-heading">
          <h2>Сферы жизни</h2>
          <span>Всего сфер: {initialSpheres.length}</span>
        </section>

        <div className="area-grid">
          {initialSpheres.map((sphere) => (
            <article className="area-card" key={sphere.id}>
              <span className="area-mark" aria-hidden="true">
                {sphere.name.slice(0, 1)}
              </span>

              <h3>{sphere.name}</h3>

              <p>
                {sphereDescriptions[sphere.id] ??
                  'Твои действия в этом направлении'}
              </p>

              <span className="area-status">Пока нет записей</span>
            </article>
          ))}
        </div>

        <section className="test-summary" aria-live="polite">
          Тестовых действий: {testActivities}
        </section>

        <p className="footnote">
          Это проверочный экран. Тестовый счётчик пока не сохраняется
          и сбрасывается после перезапуска.
        </p>
      </main>
    </div>
  );
}