const STORAGE_KEY = 'workout-planner-v1';

const form = document.getElementById('activity-form');
const exerciseNameInput = document.getElementById('exercise-name');
const currentSetsInput = document.getElementById('current-sets');
const currentRepsInput = document.getElementById('current-reps');
const targetDateInput = document.getElementById('target-date');
const targetSetsInput = document.getElementById('target-sets');
const targetRepsInput = document.getElementById('target-reps');
const activitiesList = document.getElementById('activities-list');
const calendarGrid = document.getElementById('calendar-grid');
const monthLabel = document.getElementById('month-label');
const selectedDateLabel = document.getElementById('selected-date-label');
const todayPlan = document.getElementById('today-plan');
const prevMonthButton = document.getElementById('prev-month');
const nextMonthButton = document.getElementById('next-month');

const today = new Date();
const defaultTargetDate = addDays(today, 45);
const appState = {
  selectedDate: formatDateKey(today),
  monthDate: new Date(today.getFullYear(), today.getMonth(), 1),
  activities: loadActivities(),
};

function saveActivities() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.activities));
}

function loadActivities() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Unable to load saved workout data.', error);
    return [];
  }
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, amount) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + amount);
  return clone;
}

function diffInDays(startDate, endDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((endDate - startDate) / msPerDay);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function linearInterpolate(start, end, progress) {
  return start + (end - start) * progress;
}

function getSetProgressionEvents(activity) {
  const startDate = new Date();
  const targetDate = parseDateKey(activity.targetDate);
  const totalDays = Math.max(1, diffInDays(startDate, targetDate));
  const setDelta = activity.targetSets - activity.currentSets;
  const stepCount = Math.max(1, Math.abs(setDelta));
  const direction = Math.sign(setDelta) || 1;
  const events = [];

  for (let step = 1; step <= stepCount; step += 1) {
    const progressRatio = step / (stepCount + 1);
    const eventDate = addDays(startDate, Math.round(totalDays * progressRatio));
    events.push({
      date: eventDate,
      direction,
      type: direction >= 0 ? 'increase' : 'decrease',
    });
  }

  return events;
}

function getTemporaryRepModifier(activity, dateKey) {
  const currentDate = parseDateKey(dateKey);
  const startDate = new Date();
  const targetDate = parseDateKey(activity.targetDate);
  const events = getSetProgressionEvents(activity);
  const dateList = events
    .filter((event) => event.date <= currentDate)
    .sort((a, b) => a.date - b.date);

  if (!dateList.length) {
    return 0;
  }

  const latestEvent = dateList[dateList.length - 1];
  const nextEvent = events.find((event) => event.date > latestEvent.date) || { date: targetDate };
  const windowDays = Math.max(1, diffInDays(latestEvent.date, nextEvent.date));
  const elapsed = Math.max(0, diffInDays(latestEvent.date, currentDate));
  const decay = clamp(elapsed / windowDays, 0, 1);
  const effect = 0.15 * (1 - decay);

  return latestEvent.direction >= 0 ? -effect : effect;
}

function getPlanForDate(activity, dateKey) {
  const startDate = new Date();
  const targetDate = parseDateKey(activity.targetDate);
  const currentDate = parseDateKey(dateKey);

  const totalDays = Math.max(1, diffInDays(startDate, targetDate));
  const elapsedDays = diffInDays(startDate, currentDate);
  const normalized = clamp(elapsedDays / totalDays, 0, 1);

  const baseSets = linearInterpolate(activity.currentSets, activity.targetSets, normalized);
  const baseReps = linearInterpolate(activity.currentReps, activity.targetReps, normalized);
  const repModifier = getTemporaryRepModifier(activity, dateKey);
  const adjustedReps = baseReps * (1 + repModifier);

  return {
    sets: Math.max(1, Math.round(baseSets)),
    reps: Math.max(1, Math.round(adjustedReps)),
    progress: normalized,
    baseReps,
    repModifier,
  };
}

function getCurrentStreak(activity) {
  const uniqueDates = [...new Set((activity.completedDates || []).map((d) => d))].sort();
  if (!uniqueDates.length) {
    return 0;
  }

  let streak = 0;
  let current = new Date();

  while (uniqueDates.includes(formatDateKey(current))) {
    streak += 1;
    current = addDays(current, -1);
  }

  return streak;
}

function createActivity(data) {
  return {
    id: `activity-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: data.name.trim(),
    currentSets: Number(data.currentSets),
    currentReps: Number(data.currentReps),
    targetDate: data.targetDate,
    targetSets: Number(data.targetSets),
    targetReps: Number(data.targetReps),
    completedDates: [],
  };
}

function setTargetDateDefault() {
  targetDateInput.min = formatDateKey(addDays(new Date(), 1));
  targetDateInput.value = formatDateKey(defaultTargetDate);
}

function renderPlanForSelectedDate() {
  const selectedDateText = new Date(`${appState.selectedDate}T12:00:00`);
  selectedDateLabel.textContent = selectedDateText.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const entries = appState.activities.map((activity) => {
    const plan = getPlanForDate(activity, appState.selectedDate);
    const isDone = (activity.completedDates || []).includes(appState.selectedDate);
    return {
      ...activity,
      plan,
      isDone,
    };
  });

  if (!entries.length) {
    todayPlan.innerHTML = '<div class="empty-state">No workouts yet. Add your first exercise to start planning.</div>';
    return;
  }

  todayPlan.innerHTML = entries
    .map((activity) => {
      const doneButtonLabel = activity.isDone ? 'Completed ✅' : 'Confirm workout';
      const doneClass = activity.isDone ? 'is-done' : '';

      return `
        <div class="plan-item">
          <div>
            <strong>${escapeHtml(activity.name)}</strong>
            <small>${activity.plan.sets} sets × ${activity.plan.reps} reps</small>
          </div>
          <button class="tiny-btn ${doneClass}" type="button" data-action="toggle-complete" data-id="${activity.id}">${doneButtonLabel}</button>
        </div>
      `;
    })
    .join('');
}

function renderActivities() {
  if (!appState.activities.length) {
    activitiesList.innerHTML = '<div class="empty-state">Your exercises will show up here as you add them.</div>';
    return;
  }

  activitiesList.innerHTML = appState.activities
    .map((activity) => {
      const streak = getCurrentStreak(activity);
      const targetSummary = `${activity.targetSets} sets × ${activity.targetReps} reps by ${formatDisplayDate(activity.targetDate)}`;
      const doneCount = (activity.completedDates || []).length;
      const selectedDateDone = (activity.completedDates || []).includes(appState.selectedDate);

      return `
        <div class="activity-card">
          <div class="activity-card-header">
            <div class="activity-name">${escapeHtml(activity.name)}</div>
            <div class="streak-badge">🔥 ${streak}-day streak</div>
          </div>
          <div class="activity-metrics">
            <span class="metric-chip">Now: ${activity.currentSets} × ${activity.currentReps}</span>
            <span class="metric-chip">Goal: ${activity.targetSets} × ${activity.targetReps}</span>
          </div>
          <div class="activity-card-footer">
            <div class="activity-target">${targetSummary}</div>
            <button class="secondary-btn ${selectedDateDone ? 'is-done' : ''}" type="button" data-action="toggle-complete" data-id="${activity.id}">
              ${selectedDateDone ? 'Done ✅' : 'Check off today'}
            </button>
          </div>
          <div class="activity-target">Workouts logged: ${doneCount}</div>
        </div>
      `;
    })
    .join('');
}

function renderCalendar() {
  const firstDayOfMonth = new Date(appState.monthDate.getFullYear(), appState.monthDate.getMonth(), 1);
  const calendarStart = new Date(firstDayOfMonth);
  calendarStart.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());

  monthLabel.textContent = firstDayOfMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const daysToRender = [];
  for (let i = 0; i < 42; i += 1) {
    daysToRender.push(addDays(calendarStart, i));
  }

  calendarGrid.innerHTML = daysToRender
    .map((date) => {
      const dateKey = formatDateKey(date);
      const isCurrentMonth = date.getMonth() === appState.monthDate.getMonth();
      const isSelected = dateKey === appState.selectedDate;
      const isToday = dateKey === formatDateKey(today);

      const dayActivities = appState.activities
        .map((activity) => {
          const plan = getPlanForDate(activity, dateKey);
          const done = (activity.completedDates || []).includes(dateKey);
          const title = `${activity.name}: ${plan.sets}×${plan.reps}`;
          const className = done ? 'done' : plan.progress > 0.5 ? 'goal' : '';
          return { name: title, done, className };
        })
        .filter((entry) => entry.name);

      const summary = dayActivities
        .slice(0, 2)
        .map((entry) => `<div class="event-pill ${entry.className}">${escapeHtml(entry.name)}</div>`)
        .join('');
      const extra = dayActivities.length > 2 ? `<div class="day-meta">+${dayActivities.length - 2} more</div>` : '';

      return `
        <button class="day-cell ${isCurrentMonth ? '' : 'is-other-month'} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}" type="button" data-date="${dateKey}">
          <div class="day-header">
            <span>${date.getDate()}</span>
            ${dayActivities.some((item) => item.done) ? '✅' : ''}
          </div>
          <div class="day-events">${summary || '<span class="day-meta">No plan</span>'}</div>
          ${extra}
        </button>
      `;
    })
    .join('');

  document.querySelectorAll('.day-cell').forEach((button) => {
    button.addEventListener('click', () => {
      appState.selectedDate = button.dataset.date;
      renderAll();
    });
  });
}

function formatDisplayDate(dateKey) {
  const date = parseDateKey(dateKey);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toggleCompleteForActivity(activityId) {
  const activity = appState.activities.find((item) => item.id === activityId);
  if (!activity) {
    return;
  }

  const dateKey = appState.selectedDate;
  const existingEntries = activity.completedDates || [];

  if (existingEntries.includes(dateKey)) {
    activity.completedDates = existingEntries.filter((date) => date !== dateKey);
  } else {
    activity.completedDates = [...existingEntries, dateKey].sort();
  }

  saveActivities();
  renderAll();
}

function renderAll() {
  renderPlanForSelectedDate();
  renderActivities();
  renderCalendar();
}

function setupCollapsibleSections() {
  document.querySelectorAll('.section-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const section = button.closest('.collapsible-section');
      const isCollapsed = section.classList.toggle('collapsed');
      button.setAttribute('aria-expanded', String(!isCollapsed));
      button.querySelector('.toggle-indicator').textContent = isCollapsed ? '+' : '−';
    });
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const payload = {
    name: exerciseNameInput.value,
    currentSets: currentSetsInput.value,
    currentReps: currentRepsInput.value,
    targetDate: targetDateInput.value,
    targetSets: targetSetsInput.value,
    targetReps: targetRepsInput.value,
  };

  if (!payload.name || !payload.targetDate) {
    return;
  }

  appState.activities.push(createActivity(payload));
  saveActivities();
  form.reset();
  setTargetDateDefault();
  renderAll();
});

document.addEventListener('click', (event) => {
  const element = event.target.closest('[data-action="toggle-complete"]');
  if (!element) {
    return;
  }

  toggleCompleteForActivity(element.dataset.id);
});

prevMonthButton.addEventListener('click', () => {
  appState.monthDate = new Date(appState.monthDate.getFullYear(), appState.monthDate.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthButton.addEventListener('click', () => {
  appState.monthDate = new Date(appState.monthDate.getFullYear(), appState.monthDate.getMonth() + 1, 1);
  renderCalendar();
});

setTargetDateDefault();
setupCollapsibleSections();
renderAll();

window.addEventListener('storage', () => {
  appState.activities = loadActivities();
  renderAll();
});
