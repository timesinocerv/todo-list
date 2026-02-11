# Weekly Calendar To-Do

A minimalist, responsive weekly calendar to-do app built with pure **HTML + CSS + JavaScript**.

## Main Features

- Weekly timetable view (Monday–Sunday as rows, 0:00–24:00 as columns)
- Daily view toggle for focused planning
- Click a time slot to add a task
- Drag & drop tasks to another day/time
- Task properties: title, color, and priority
- Mark tasks as completed (visual fade + strikethrough)
- Data persistence via `localStorage`

## Project Structure

- `index.html` – app layout, controls, and task dialog markup
- `styles.css` – responsive minimalist design and timetable grid styling
- `app.js` – rendering logic, view switching, drag/drop, and persistence

## How It Works (Brief)

1. The app renders a timetable grid with day labels on the left and hourly slots across the top.
2. Clicking a slot opens a modal form to create/edit a task.
3. Tasks are saved in `localStorage` and reloaded on startup.
4. Dragging a task to another slot updates its day/hour and persists immediately.
5. Completed tasks can be toggled and are displayed with a faded, strikethrough style.

## Run Locally

Open `index.html` directly in your browser, or serve the folder with any static file server.

Example:

```bash
python3 -m http.server 8080
```

Then visit: `http://localhost:8080`.
