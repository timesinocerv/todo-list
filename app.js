/**
 * Weekly Calendar To-Do
 * - Monday to Sunday rows
 * - 0:00 to 23:00 columns
 * - Weekly and daily modes
 * - localStorage persistence
 * - Drag & drop task movement
 */

const STORAGE_KEY = 'weeklyCalendarTodo.tasks.v1';
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const state = {
  currentView: 'weekly',
  anchorDate: new Date(),
  selectedDayIndex: getMondayBasedIndex(new Date()),
  tasks: loadTasks(),
  editingTaskId: null,
  dragTaskId: null,
};

const calendarGrid = document.getElementById('calendarGrid');
const rangeLabel = document.getElementById('rangeLabel');
const weeklyViewBtn = document.getElementById('weeklyViewBtn');
const dailyViewBtn = document.getElementById('dailyViewBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

const taskDialog = document.getElementById('taskDialog');
const taskForm = document.getElementById('taskForm');
const dialogTitle = document.getElementById('dialogTitle');
const taskTitle = document.getElementById('taskTitle');
const taskDay = document.getElementById('taskDay');
const taskTime = document.getElementById('taskTime');
const taskColor = document.getElementById('taskColor');
const taskPriority = document.getElementById('taskPriority');
const deleteTaskBtn = document.getElementById('deleteTaskBtn');
const cancelTaskBtn = document.getElementById('cancelTaskBtn');

initialize();

function initialize() {
  fillDaySelect();
  bindUIEvents();
  render();
}

function bindUIEvents() {
  weeklyViewBtn.addEventListener('click', () => setView('weekly'));
  dailyViewBtn.addEventListener('click', () => setView('daily'));

  prevBtn.addEventListener('click', () => shiftPeriod(-1));
  nextBtn.addEventListener('click', () => shiftPeriod(1));

  cancelTaskBtn.addEventListener('click', () => taskDialog.close());
  deleteTaskBtn.addEventListener('click', deleteCurrentTask);

  taskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    saveTaskFromForm();
  });
}

function setView(view) {
  state.currentView = view;
  weeklyViewBtn.classList.toggle('active', view === 'weekly');
  dailyViewBtn.classList.toggle('active', view === 'daily');
  render();
}

function shiftPeriod(direction) {
  if (state.currentView === 'weekly') {
    state.anchorDate = addDays(state.anchorDate, direction * 7);
  } else {
    state.selectedDayIndex = (state.selectedDayIndex + direction + 7) % 7;
  }
  render();
}

function render() {
  renderHeaderLabel();
  renderGrid();
}

function renderHeaderLabel() {
  if (state.currentView === 'weekly') {
    const monday = getWeekStart(state.anchorDate);
    const sunday = addDays(monday, 6);
    rangeLabel.textContent = `${formatDate(monday)} — ${formatDate(sunday)}`;
  } else {
    rangeLabel.textContent = DAY_NAMES[state.selectedDayIndex];
  }
}

function renderGrid() {
  calendarGrid.innerHTML = '';

  const visibleDays = state.currentView === 'weekly' ? DAY_NAMES.map((_, i) => i) : [state.selectedDayIndex];

  // Grid: first column is day labels, then 24 time columns.
  calendarGrid.style.gridTemplateColumns = `120px repeat(${HOURS.length}, minmax(46px, 1fr))`;

  // Top left corner placeholder.
  calendarGrid.appendChild(createCell('grid-header', 'Day / Time'));

  for (const hour of HOURS) {
    calendarGrid.appendChild(createCell('grid-header time-label', `${pad2(hour)}:00`));
  }

  for (const dayIndex of visibleDays) {
    const dayLabelCell = createCell('day-label', DAY_NAMES[dayIndex]);
    dayLabelCell.dataset.day = String(dayIndex);
    calendarGrid.appendChild(dayLabelCell);

    for (const hour of HOURS) {
      const slot = document.createElement('div');
      slot.className = 'slot-cell';
      slot.dataset.day = String(dayIndex);
      slot.dataset.hour = String(hour);
      slot.title = 'Click to add task';

      // Click on empty slot creates a task at that day/time.
      slot.addEventListener('click', (event) => {
        if (event.target.closest('.task')) return;
        openTaskDialog({ day: dayIndex, time: hour });
      });

      setupDropZone(slot);

      const task = getTaskAt(dayIndex, hour);
      if (task) {
        slot.appendChild(createTaskElement(task));
      }

      calendarGrid.appendChild(slot);
    }
  }
}

function createTaskElement(task) {
  const taskEl = document.createElement('article');
  taskEl.className = `task ${task.completed ? 'completed' : ''}`;
  taskEl.draggable = true;
  taskEl.dataset.id = task.id;
  taskEl.style.background = task.color;

  taskEl.innerHTML = `
    <div class="task-title">${escapeHtml(task.title)}</div>
    <div class="task-meta">
      <span class="task-priority" data-priority="${task.priority}">${task.priority.toUpperCase()}</span>
      <span>${pad2(task.hour)}:00</span>
    </div>
    <label class="task-check">
      <input type="checkbox" ${task.completed ? 'checked' : ''} />
      Done
    </label>
  `;

  const checkbox = taskEl.querySelector('input[type="checkbox"]');
  checkbox.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleTaskComplete(task.id, checkbox.checked);
  });

  taskEl.addEventListener('click', (event) => {
    event.stopPropagation();
    openTaskDialog(task);
  });

  taskEl.addEventListener('dragstart', (event) => {
    state.dragTaskId = task.id;
    taskEl.style.opacity = '0.6';
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', task.id);
  });

  taskEl.addEventListener('dragend', () => {
    state.dragTaskId = null;
    taskEl.style.opacity = '1';
    clearDropTargets();
  });

  return taskEl;
}

function setupDropZone(slot) {
  slot.addEventListener('dragover', (event) => {
    event.preventDefault();
    slot.classList.add('drop-target');
  });

  slot.addEventListener('dragleave', () => {
    slot.classList.remove('drop-target');
  });

  slot.addEventListener('drop', (event) => {
    event.preventDefault();
    slot.classList.remove('drop-target');

    const taskId = event.dataTransfer.getData('text/plain') || state.dragTaskId;
    if (!taskId) return;

    const targetDay = Number(slot.dataset.day);
    const targetHour = Number(slot.dataset.hour);
    moveTask(taskId, targetDay, targetHour);
  });
}

function clearDropTargets() {
  document.querySelectorAll('.slot-cell.drop-target').forEach((cell) => cell.classList.remove('drop-target'));
}

function openTaskDialog(taskData) {
  const isEdit = Boolean(taskData.id);
  state.editingTaskId = isEdit ? taskData.id : null;

  dialogTitle.textContent = isEdit ? 'Edit Task' : 'Add Task';
  deleteTaskBtn.style.display = isEdit ? 'inline-flex' : 'none';

  taskTitle.value = taskData.title || '';
  taskDay.value = String(taskData.day ?? state.selectedDayIndex);
  taskTime.value = String(taskData.hour ?? 8);
  taskColor.value = taskData.color || '#4f46e5';
  taskPriority.value = taskData.priority || 'medium';

  taskDialog.showModal();
  taskTitle.focus();
}

function saveTaskFromForm() {
  const payload = {
    title: taskTitle.value.trim(),
    day: Number(taskDay.value),
    hour: Number(taskTime.value),
    color: taskColor.value,
    priority: taskPriority.value,
  };

  if (!payload.title) return;

  if (state.editingTaskId) {
    const task = state.tasks.find((item) => item.id === state.editingTaskId);
    if (task) Object.assign(task, payload);
  } else {
    state.tasks.push({
      id: crypto.randomUUID(),
      completed: false,
      ...payload,
    });
  }

  persistTasks();
  taskDialog.close();
  render();
}

function deleteCurrentTask() {
  if (!state.editingTaskId) return;
  state.tasks = state.tasks.filter((task) => task.id !== state.editingTaskId);
  state.editingTaskId = null;
  persistTasks();
  taskDialog.close();
  render();
}

function moveTask(taskId, day, hour) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;

  task.day = day;
  task.hour = hour;
  persistTasks();
  render();
}

function toggleTaskComplete(taskId, completed) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;

  task.completed = completed;
  persistTasks();
  render();
}

function getTaskAt(day, hour) {
  return state.tasks.find((task) => task.day === day && task.hour === hour) || null;
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function fillDaySelect() {
  taskDay.innerHTML = DAY_NAMES.map((day, index) => `<option value="${index}">${day}</option>`).join('');
}

function createCell(className, text) {
  const cell = document.createElement('div');
  cell.className = className;
  cell.textContent = text;
  return cell;
}

function getWeekStart(date) {
  const clone = new Date(date);
  const dayIndex = getMondayBasedIndex(clone);
  clone.setDate(clone.getDate() - dayIndex);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function getMondayBasedIndex(date) {
  return (date.getDay() + 6) % 7;
}

function addDays(date, days) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
