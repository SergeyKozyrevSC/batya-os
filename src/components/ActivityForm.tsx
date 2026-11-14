import { useState } from 'react';
import type { FormEvent } from 'react';
import type {
  ActionTemplate,
  Activity,
  ActivityResult,
  Sphere,
} from '../types';

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

function formatMinutesPreview(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  const readable =
    hours === 0
      ? `${remainingMinutes} мин`
      : remainingMinutes === 0
        ? `${hours} ч`
        : `${hours} ч ${remainingMinutes} мин`;

  const decimalHours = (minutes / 60).toLocaleString('ru-RU', {
    maximumFractionDigits: 2,
  });

  return `${readable} · ${decimalHours} ч`;
}

export default function ActivityForm({
  spheres,
  templates,
  onSave,
  onCancel,
}: ActivityFormProps) {
  const firstTemplate = templates.find((template) =>
    spheres.some((sphere) => sphere.id === template.sphereId),
  );

  const [sphereId, setSphereId] = useState(
    firstTemplate?.sphereId ?? spheres[0]?.id ?? '',
  );

  const [templateId, setTemplateId] = useState(
    firstTemplate?.id ?? '',
  );

  const [date, setDate] = useState(getTodayDate);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const availableTemplates = templates.filter(
    (template) => template.sphereId === sphereId,
  );

  const selectedTemplate = availableTemplates.find(
    (template) => template.id === templateId,
  );

  const numericAmount = Number(amount);

  const isValidAmount =
    /^[0-9]+$/.test(amount) &&
    Number.isSafeInteger(numericAmount) &&
    numericAmount > 0;

  function handleSphereChange(nextSphereId: string) {
    const nextTemplate = templates.find(
      (template) => template.sphereId === nextSphereId,
    );

    setSphereId(nextSphereId);
    setTemplateId(nextTemplate?.id ?? '');
    setAmount('');
    setError('');
  }

  function handleTemplateChange(nextTemplateId: string) {
    setTemplateId(nextTemplateId);
    setAmount('');
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

    let result: ActivityResult;

    switch (selectedTemplate.kind) {
      case 'fact':
        result = {
          kind: 'fact',
        };
        break;

      case 'quantity':
        if (!isValidAmount) {
          setError('Количество должно быть целым числом больше нуля.');
          return;
        }

        result = {
          kind: 'quantity',
          value: numericAmount,
        };
        break;

      case 'duration':
        if (!isValidAmount) {
          setError('Введи целое количество минут больше нуля.');
          return;
        }

        result = {
          kind: 'duration',
          minutes: numericAmount,
        };
        break;
    }

    const activity: Activity = {
      id: crypto.randomUUID(),
      templateId: selectedTemplate.id,
      date,
      result,
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
            onChange={(event) =>
              handleTemplateChange(event.target.value)
            }
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
              В этой сфере пока нет шаблонов действий.
              Создание шаблонов добавим следующим шагом.
            </p>
          )}
        </div>

        {selectedTemplate?.kind === 'fact' && (
          <p className="form-hint">
            Сохраняем факт выполненного действия.
            Количество и время указывать не нужно.
          </p>
        )}

        {selectedTemplate?.kind === 'quantity' && (
          <div className="form-field">
            <label htmlFor="activity-amount">
              Количество — {selectedTemplate.unit}
            </label>

            <input
              id="activity-amount"
              type="text"
              inputMode="numeric"
              pattern="[0-9]+"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError('');
              }}
              placeholder="Например, 4"
              aria-describedby="activity-amount-hint"
              required
            />

            <p className="form-hint" id="activity-amount-hint">
              Целое число больше нуля.
            </p>
          </div>
        )}

        {selectedTemplate?.kind === 'duration' && (
          <div className="form-field">
            <label htmlFor="activity-minutes">
              Длительность в минутах
            </label>

            <input
              id="activity-minutes"
              type="text"
              inputMode="numeric"
              pattern="[0-9]+"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError('');
              }}
              placeholder="Например, 90"
              aria-describedby="activity-duration-hint"
              required
            />

            <p
              className="form-hint"
              id="activity-duration-hint"
              aria-live="polite"
            >
              {isValidAmount
                ? formatMinutesPreview(numericAmount)
                : 'Введи целое количество минут больше нуля.'}
            </p>
          </div>
        )}

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