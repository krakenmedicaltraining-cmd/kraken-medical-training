# Kraken V13.5 Simulation Deck and Achievement System

## Run Supabase first

Copy and run:

`database/v13-5-simulations-achievements.sql`

The complete SQL is also supplied separately in the package.

## Replace

- `games.html`
- `games.js`
- `dashboard.html`
- `dashboard.js`
- `instructor.html`
- `instructor.js`

## Add

- `achievement-system.css`
- `achievement-system.js`

## Simulation fix

The simulation deck now checks:

- course-level `simulation_url`
- simulations stored in a course's `lessons` JSON
- Unity, game, itch.io and simulation content blocks
- simulation URLs in `course_lessons`, when that table exists

Each card links to both the simulation and its parent course.

## Achievements

Instructor Hub now contains an Achievement Badge manager.

Available rules:

- complete a number of courses
- complete a specific course
- complete courses within a category
- achieve a quiz score
- reach an XP total
- launch a number of different simulations

The learner dashboard shows:

- earned badges in colour
- locked badges in grey
- progress towards each badge
- how to unlock each badge
- achievement detail panels
- one-time achievement pop-ups

## Important

Simulation achievements require the learner to be signed in when launching the simulation.
