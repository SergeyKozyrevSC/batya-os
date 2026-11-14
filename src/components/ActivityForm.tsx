import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ActionTemplate, Activity, Sphere } from '../types';

type ActivityFormProps = {
  spheres: Sphere[];
  templates: ActionTemplate[];
  onSave: (activity: Activity) => void;
  onCancel: () => void;
};

function getTodayDate(): string {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function ActivityForm({
  spheres,
  templates,
  onSave,
  onCancel,
}: ActivityFormProps) {
  const firstFactTemplate = templates.find(
    (template) =>
      template.kind === 'fact' &&
      spheres.some((sphere) => sphere.id === template.sphereId),
  );

  const [sphereId, setSphereId] = useState(
    firstFactTemplate?.sphereId ?? spheres[0]?.id ?? '',
  );

  const [templateId, setTemplateId] = useState(
    firstFactTemplate?.id ?? '',
  );

  const [date, setDate] = useState(getTodayDate);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const availableTemplates = templates.filter(
    (template) =>
      template.sphereId === sphereId && template.kind === 'fact',
  );

  const selectedTemplate = availableTemplates.find(
    (template) => template.id === templateId,
  );

  function handleSphereChange(nextSphereId: string) {
    const nextTemplate = templates.find(
      (template) =>
        template.sphereId === nextSphereId &&
        template.kind === 'fact',
    );

    setSphereId(nextSphereId);
    setTemplateId(nextTemplate?.id ?? '');
    setError('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!selectedTemplate) {
      setError('Выбери действие.');
      return;
    }

    if (!date || date > getTodayDate()) {
      setError('Выбери сегодняшнюю или прошедшую дату.');
      return;
    }

    const activity: Activity = {
      id: crypto.randomUUID(),
      templateId: selectedTemplate.id,
      date,
      result: {
        kind: 'fact',
      },
      note: note.trim(),
    };

    onSave(activity);
  }

  return (
    <section className="activity-form-panel">
      <h2 id="activity-form-heading">Добавить активность</h2>

      <form
        className="activity-form"
        aria-labelledby="activity-form-heading"
        onSubmit={handleSubmit}
      >
        <div className="form-field">
          <label htmlFor="activity-sphere">Сфера</label>

          <select
            id="activity-sphere"
            value={sphereId}
            onChange={(event) =>
              handleSphereChange(event.target.value)
            }
            required
          >
            {spheres.map((sphere) => (
              <option key={sphere.id} value={sphere.id}>
                {sphere.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="activity-template">Действие</label>

          <select
            id="activity-template"
            value={templateId}
            onChange={(event) => {
              setTemplateId(event.target.value);
              setError('');
            }}
            disabled={availableTemplates.length === 0}
            required
          >
            {availableTemplates.length === 0 ? (
              <option value="">Нет доступных действий</option>
            ) : (
              availableTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))
            )}
          </select>

          {availableTemplates.length === 0 && (
            <p className="form-hint">
              В этой сфере пока нет шаблонов типа «факт».
              Создание шаблонов добавим следующим шагом.
            </p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="activity-date">Дата</label>

          <input
            id="activity-date"
            type="date"
            value={date}
            max={getTodayDate()}
            onChange={(event) => {
              setDate(event.target.value);
              setError('');
            }}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="activity-note">
            Заметка — необязательно
          </label>

          <textarea
            id="activity-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Мысль, к которой хочется вернуться"
            rows={3}
          />
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="form-actions">
          <button
            type="submit"
            disabled={!selectedTemplate}
          >
            Сохранить
          </button>

          <button
            type="button"
            className="button-secondary"
            onClick={onCancel}
          >
            Отмена
          </button>
        </div>
      </form>
    </section>
  );
}