import { useState } from 'react';

const areas = [
  { name: 'Career', description: 'Отклики и подготовка к интервью' },
  { name: 'Fitness', description: 'Тренировки и движение' },
  { name: 'Music', description: 'Гитара и новые песни' },
  { name: 'Learning', description: 'Обучение и личные проекты' },
];

export default function App() {
  const [testActivities, setTestActivities] = useState(0);

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="brand">BATYA OS</div>
          <p className="brand-caption">by digital_batya</p>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">WORKSPACE</span>
          <div className="current-page">Dashboard</div>
        </div>

        <p className="sidebar-footer">Small steps. Real progress.</p>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <p className="eyebrow">YOUR PERSONAL WORKSPACE</p>
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
          <span>4 направления</span>
        </section>

        <div className="area-grid">
          {areas.map((area) => (
            <article className="area-card" key={area.name}>
              <span className="area-mark">{area.name.slice(0, 1)}</span>
              <h3>{area.name}</h3>
              <p>{area.description}</p>
              <span className="area-status">Цели пока не добавлены</span>
            </article>
          ))}
        </div>

        <section className="test-summary" aria-live="polite">
          Тестовых действий: {testActivities}
        </section>

        <p className="footnote">
          Это проверочный экран. Действия пока не сохраняются и сбросятся
          после перезапуска.
        </p>
      </main>
    </div>
  );
}