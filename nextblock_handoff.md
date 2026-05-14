# NextBlock — Senior Engineer Handoff

## Project goal

NextBlock is an adaptive day planner designed for people with attention and time-management difficulties.

It is **not** a generic todo app or calendar clone.

The product goal is to help a user:
- know what to do now
- work in short task blocks
- recover when a plan breaks
- reduce planning overwhelm
- get lightweight guidance when it is hard to start

Core product themes:
- short blocks
- low-friction planning
- current-task guidance
- re-planning after failure
- practical, calming UX

---

## Current stack

### Frontend
- React
- Vite
- JavaScript
- plain CSS (`index.css`)

### Backend
- Java
- Spring Boot
- Maven
- Spring Web
- Spring Data JPA
- Validation

### Database
- H2 file database

Current backend storage mode:
- file-based H2, not in-memory
- persistence path currently configured in `application.properties`

---

## Architecture decisions already made

### 1. Backend architecture
We intentionally chose a **modular monolith**, not microservices.

Reason:
- simpler development
- easier learning path
- no future forced breakup/refactor
- clean domain boundaries inside one service

Important constraint:
- do **not** redesign the current backend into microservices later
- if a future microservice is added, it should be an **add-on capability**, not a decomposition of the core system

Most likely future microservice:
- AI planning/suggestions service

### 2. Product direction
The product should move toward:
- a polished daily planner
- strong UX
- action-oriented flow
- minimal cognitive load
- useful guidance, not dashboard clutter

### 3. Development style
The user wants:
- practical, clean code
- readable code, not clever code
- gradual progress
- real product feel, not just backend exercises
- important logic left understandable and editable

---

## Current repository structure

```text
nextblock/
  backend/
  frontend/
```

### Backend high-level structure
```text
backend/src/main/java/com/nextblock/
  common/
  taskblock/
    dto/
```

### Frontend high-level structure
Current UI was refactored into component-based structure.

Expected structure:
```text
frontend/src/
  api/
    taskBlocksApi.js
  components/
    Header.jsx
    WhatNowCard.jsx
    CreateTaskForm.jsx
    TaskCard.jsx
    TaskList.jsx
  App.jsx
  index.css
```

---

## Backend: implemented features

## Domain model

### `TaskBlockEntity`
Current fields:
- `id`
- `title`
- `description`
- `date`
- `startTime`
- `endTime`
- `status`
- `difficulty`
- `category`
- `estimatedMinutes`
- `actualMinutes`
- `createdAt`
- `updatedAt`

### Enums
#### `TaskStatus`
- `PLANNED`
- `ACTIVE`
- `DONE`
- `MISSED`

#### `TaskDifficulty`
- `EASY`
- `MEDIUM`
- `HARD`

---

## Backend endpoints already working

### Health
- `GET /api/health`

### Task block CRUD
- `POST /api/task-blocks`
- `GET /api/task-blocks?date=YYYY-MM-DD`
- `GET /api/task-blocks/{id}`
- `PUT /api/task-blocks/{id}`
- `DELETE /api/task-blocks/{id}`

### Task status actions
- `POST /api/task-blocks/{id}/start`
- `POST /api/task-blocks/{id}/complete`
- `POST /api/task-blocks/{id}/miss`

### Guidance endpoints
- `GET /api/task-blocks/actions/what-now?date=YYYY-MM-DD&time=HH:MM:SS`
- `POST /api/task-blocks/{id}/hard-to-start`

---

## Backend behavior already implemented

### Create task block
- validates time range
- persists task
- returns mapped response DTO

### Get tasks by date
- ordered by start time

### Get by id / update / delete
- supported
- not-found handling exists

### Status actions
- start → `ACTIVE`
- complete → `DONE`
- miss → `MISSED`

### What now
Current logic:
1. if there is an `ACTIVE` task for the day, return it as current
2. otherwise, search for a task covering the given time
3. filter current-by-time to valid statuses only (`PLANNED`, `ACTIVE`)
4. return next task if one exists
5. otherwise return message only

### Hard to start
Current rules are intentionally simple:
- if `estimatedMinutes > 45` → suggest splitting the task
- if difficulty is `HARD` → suggest starting for 5 minutes
- otherwise fallback suggestions

---

## Backend error handling already implemented

### `ResourceNotFoundException`
Used for missing task blocks.

### `GlobalExceptionHandler`
Currently handles:
- `ResourceNotFoundException` → 404
- `IllegalArgumentException` → 400

This is enough for now, but should later be improved with:
- validation error formatting
- consistent error response structure
- maybe error codes

---

## Backend issues already encountered and resolved

These are important so they are not reintroduced:

### 1. `404` on `/`
This was not an actual failure; there was simply no root route.

### 2. H2 in-memory DB caused data loss on restart
Was switched from memory mode to file mode.

### 3. Route conflict with `what-now`
`/api/task-blocks/what-now` conflicted with `/{id}`.
Resolved by moving to:
- `/api/task-blocks/actions/what-now`

### 4. `what-now` incorrectly returned `MISSED` task as current
Resolved by filtering current-by-time candidates to:
- `PLANNED`
- `ACTIVE`

### 5. H2 file lock
Happens if multiple backend processes are alive at once.
Only one backend process should run against the file DB.

### 6. DTO / classpath mismatches
There were temporary issues where DTO files existed but package/class declarations were wrong.
Avoid moving files casually without matching package names exactly.

---

## Frontend: implemented features

## Current UI state
The frontend now has:
- a cleaner layout than the initial raw `App.jsx`
- a header with date + reload
- a “What now” card
- a create-task form
- a task list rendered as cards

### Connected backend features
The frontend currently supports:
- loading task blocks by date
- showing what-now
- creating a task from the UI

### Confirmed working from UI
- viewing tasks
- creating tasks

---

## Frontend UX status

The frontend is **better than initial prototype**, but still far from the intended product quality.

Current state:
- functional
- reasonable visual hierarchy
- still basic
- still not smooth enough for real use
- still missing action-oriented flow

This is the main gap now.

---

## Product vision still remaining

The current product is still only an MVP shell.

The intended app should feel like:

### 1. A daily control panel
Not just a list of tasks.

It should help the user answer:
- what am I doing now?
- what should I do next?
- am I on track?
- what do I do if I’m stuck?
- what happens if I miss a block?

### 2. A low-stress planner
It should reduce cognitive load:
- obvious primary actions
- minimal clutter
- strong visual hierarchy
- clear states
- calm design
- forgiving flows

### 3. A recovery-oriented planner
A major value proposition is not planning alone, but recovering when planning fails.

Future UX must support:
- “hard to start”
- “missed block”
- move later
- shorten task
- split task
- postpone
- select easier alternative

### 4. An adaptive planner
Eventually the system should evolve from static planning to guided planning:
- suggestions
- replan logic
- actual vs estimated duration
- future AI assistance

---

## Immediate next priorities

## Priority 1 — make the UI truly usable
This is the current highest priority.

### Needed next on frontend
1. Add task action buttons directly in UI:
   - Start
   - Complete
   - Miss
   - Hard to Start

2. Refresh UI after actions

3. Show success/error feedback after actions

4. Highlight current task visually

5. Improve badge/status coloring

6. Improve spacing and density

### Why
The app must stop feeling like a “viewer + form” and start feeling interactive.

---

## Priority 2 — make What Now more central
The “What now” panel should become the anchor of the screen.

Potential improvements:
- stronger visual emphasis
- show current task as main card
- show next task under it
- actions directly from there
- maybe countdown / session state later

---

## Priority 3 — strengthen task card UX
Task cards should likely include:
- title
- time
- description
- status badge
- difficulty badge
- action buttons
- maybe category
- maybe “hard to start” button

---

## Priority 4 — introduce “Missed block recovery” flow
This is one of the core product differentiators and is still missing in UX.

### Needed behavior
When a task is marked missed, the app should help the user recover.

Possible first version:
- backend returns suggestions:
  - move later today
  - shorten this task
  - split into 2 blocks
  - postpone to tomorrow

Could begin with simple local frontend modal + backend rules.

---

## Priority 5 — timeline/day layout
Current task list is acceptable for MVP, but the product vision really wants a day view / block-based planner.

Future UI direction:
- chronological vertical timeline
- time block visualization
- current task highlighted in timeline
- ability to see structure of the day at a glance

This does not have to happen immediately, but it is definitely part of the intended product.

---

## Suggested near-term roadmap

## Phase A — interaction polish
Do this next.

### Backend
- add endpoints if needed for UI actions
- likely already enough for status actions
- maybe add `hard-to-start` richer payload later

### Frontend
- add action buttons to each task card
- wire:
  - start
  - complete
  - miss
  - hard to start
- refresh screen after each action
- display suggestions for hard-to-start

---

## Phase B — better product flow
After actions work:
- make what-now interactive
- add highlighted current task
- improve empty states
- improve styling consistency
- add feedback messages

---

## Phase C — missed / recovery flow
Implement a first real recovery workflow:
- click “miss”
- show options
- apply a basic replanning action

This is very important to the identity of the product.

---

## Phase D — timeline view
Transform the “Day Tasks” panel into a real day plan visualization.

---

## Phase E — backend cleanup
When the UI is more solid:
- refactor DTO mapping
- add validation response formatting
- maybe add mappers
- maybe add tests
- maybe split domain packages more cleanly

Important:
Do not over-engineer this too early.

---

## Phase F — future product expansions
Not now, but part of long-term direction:

### Product expansions
- auth
- real user profile
- PostgreSQL instead of H2
- cloud sync
- actual vs estimated tracking
- insights
- calendar integration
- accountability features

### AI expansion
Possible future separate service:
- task split suggestion generation
- replanning suggestions
- explanations
- estimate learning
- contextual day planning assistance

Important:
AI should support rules, not replace them.

Suggested future architecture:
1. business rules determine valid options
2. AI refines explanation or suggestion phrasing
3. user approves

---

## Important constraints for future development

1. Keep code readable and explicit  
2. Prefer practical UX progress over adding theoretical backend complexity  
3. Do not prematurely split into microservices  
4. Preserve modular monolith approach  
5. Keep the product grounded in the actual user problem:
   - starting
   - continuing
   - recovering
   - not feeling overwhelmed

---

## Definition of success for the next milestone

The next meaningful milestone should result in a screen where a user can:

- load their day
- create a block
- see what to do now
- mark a task started / completed / missed
- ask for “hard to start” help
- feel that the app is guiding them, not just listing data

That is the next real product checkpoint.

---

## Recommended next implementation task

### Best next task
Implement **task actions in the frontend UI**:
- start
- complete
- miss
- hard to start

This is the highest-leverage next step.

After that:
- improve what-now interactions
- then missed-block recovery flow
- then timeline/day visualization

---

## Final note for the engineer

The backend is already at a useful MVP stage.

The main gap now is **product experience**.

The correct next move is **not** “more backend breadth”.
The correct next move is:
- interactive frontend
- better UX
- core planner flow
- recovery flow

Build toward a product that feels calm, clear, and helpful.

That is what will make NextBlock actually compelling.
