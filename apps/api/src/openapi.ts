const openapi = {
  openapi: "3.0.3",
  info: {
    title: "LifeOS API",
    version: "1.5.2",
    description:
      "LifeOS — track habits, goals and projects, log your daily state, and understand how your days actually go.\n\nAll protected endpoints require the `token` cookie set by `POST /auth/login`, `/auth/register` or `/auth/demo`. Errors follow the contract `{ error: { code, message, details? } }` (see `docs/api/ERROR_CONTRACT.md`).",
  },
  servers: [{ url: "/v1", description: "LifeOS API" }],
  tags: [
    { name: "Auth", description: "Register, login, session and onboarding" },
    { name: "Pillars", description: "Life areas" },
    { name: "Habits", description: "Recurring behaviours with frequencies" },
    { name: "Completions", description: "Daily habit completion marks" },
    { name: "Goals", description: "Outcomes linked to supporting habits" },
    { name: "Projects", description: "Structured work with tasks" },
    { name: "Daily Logs", description: "Mood, energy, sleep and notes per day" },
    { name: "Statistics", description: "Aggregated metrics and analytics" },
    { name: "Progression", description: "XP/levels/ranks (opt-in)" },
    { name: "System", description: "Health checks" },
  ],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Create an account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterBody" },
            },
          },
        },
        responses: {
          "201": { $ref: "#/components/responses/AuthCreated" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "409": { $ref: "#/components/responses/Conflict" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/auth/demo": {
      post: {
        tags: ["Auth"],
        summary: "Log in with the public demo account",
        responses: {
          "200": { $ref: "#/components/responses/AuthOk" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/LoginBody" } },
          },
        },
        responses: {
          "200": { $ref: "#/components/responses/AuthOk" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Log out (clears the session cookie)",
        responses: { "200": { $ref: "#/components/responses/Ok" } },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": { $ref: "#/components/responses/Me" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      patch: {
        tags: ["Auth"],
        summary: "Update profile and preferences",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UpdateMeBody" } },
          },
        },
        responses: {
          "200": { $ref: "#/components/responses/Me" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/auth/onboarding": {
      post: {
        tags: ["Auth"],
        summary: "Complete onboarding (creates pillars/habits)",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/OnboardingBody" } },
          },
        },
        responses: {
          "201": { description: "Onboarding completed", content: { "application/json": { schema: { type: "object", properties: { user: { $ref: "#/components/schemas/User" }, pillarsCreated: { type: "integer" }, habitsCreated: { type: "integer" } } } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "409": { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/pillars": {
      get: {
        tags: ["Pillars"],
        summary: "List the user's pillars",
        security: [{ cookieAuth: [] }],
        responses: { "200": { $ref: "#/components/responses/Pillars" }, "401": { $ref: "#/components/responses/Unauthorized" } },
      },
      post: {
        tags: ["Pillars"],
        summary: "Create a pillar",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreatePillarBody" } } } },
        responses: { "201": { $ref: "#/components/responses/PillarCreated" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    "/pillars/reorder": {
      post: {
        tags: ["Pillars"],
        summary: "Reorder pillars",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ReorderBody" } } } },
        responses: { "200": { $ref: "#/components/responses/Ok" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/pillars/{id}": {
      parameters: [{ $ref: "#/components/parameters/Id" }],
      patch: {
        tags: ["Pillars"],
        summary: "Update a pillar",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdatePillarBody" } } } },
        responses: { "200": { $ref: "#/components/responses/PillarOk" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
      delete: {
        tags: ["Pillars"],
        summary: "Delete a pillar (fails if it has habits)",
        security: [{ cookieAuth: [] }],
        responses: { "204": { $ref: "#/components/responses/NoContent" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" }, "409": { $ref: "#/components/responses/Conflict" } },
      },
    },
    "/habits": {
      get: {
        tags: ["Habits"],
        summary: "List habits",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "includeArchived", in: "query", required: false, schema: { type: "string", enum: ["true", "false"] } }],
        responses: { "200": { $ref: "#/components/responses/Habits" }, "401": { $ref: "#/components/responses/Unauthorized" } },
      },
      post: {
        tags: ["Habits"],
        summary: "Create a habit",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateHabitBody" } } } },
        responses: { "201": { $ref: "#/components/responses/HabitCreated" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/habits/{id}": {
      parameters: [{ $ref: "#/components/parameters/Id" }],
      get: {
        tags: ["Habits"],
        summary: "Get a habit",
        security: [{ cookieAuth: [] }],
        responses: { "200": { $ref: "#/components/responses/HabitOk" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
      patch: {
        tags: ["Habits"],
        summary: "Update a habit",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateHabitBody" } } } },
        responses: { "200": { $ref: "#/components/responses/HabitOk" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
      delete: {
        tags: ["Habits"],
        summary: "Delete a habit",
        security: [{ cookieAuth: [] }],
        responses: { "204": { $ref: "#/components/responses/NoContent" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/habits/{id}/archive": {
      parameters: [{ $ref: "#/components/parameters/Id" }],
      post: {
        tags: ["Habits"],
        summary: "Archive a habit",
        security: [{ cookieAuth: [] }],
        responses: { "200": { $ref: "#/components/responses/HabitOk" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/habits/{id}/history": {
      parameters: [
        { $ref: "#/components/parameters/Id" },
        { name: "from", in: "query", required: true, schema: { type: "string", format: "date" } },
        { name: "to", in: "query", required: true, schema: { type: "string", format: "date" } },
      ],
      get: {
        tags: ["Habits"],
        summary: "Per-day history and aggregates for a habit",
        security: [{ cookieAuth: [] }],
        responses: { "200": { $ref: "#/components/responses/HabitHistory" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/habits/{id}/completions/{date}": {
      parameters: [
        { $ref: "#/components/parameters/Id" },
        { name: "date", in: "path", required: true, schema: { type: "string", format: "date" } },
      ],
      put: {
        tags: ["Completions"],
        summary: "Mark a habit complete for a date",
        security: [{ cookieAuth: [] }],
        responses: { "200": { $ref: "#/components/responses/CompletionOk" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
      delete: {
        tags: ["Completions"],
        summary: "Unmark a habit for a date",
        security: [{ cookieAuth: [] }],
        responses: { "204": { $ref: "#/components/responses/NoContent" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/completions": {
      get: {
        tags: ["Completions"],
        summary: "List completions in a range",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "from", in: "query", required: false, schema: { type: "string", format: "date" } },
          { name: "to", in: "query", required: false, schema: { type: "string", format: "date" } },
        ],
        responses: { "200": { $ref: "#/components/responses/Completions" }, "401": { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    "/goals": {
      get: {
        tags: ["Goals"],
        summary: "List goals",
        security: [{ cookieAuth: [] }],
        responses: { "200": { $ref: "#/components/responses/Goals" }, "401": { $ref: "#/components/responses/Unauthorized" } },
      },
      post: {
        tags: ["Goals"],
        summary: "Create a goal",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateGoalBody" } } } },
        responses: { "201": { $ref: "#/components/responses/GoalCreated" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/goals/{id}": {
      parameters: [{ $ref: "#/components/parameters/Id" }],
      get: {
        tags: ["Goals"],
        summary: "Goal detail with derived progress",
        security: [{ cookieAuth: [] }],
        responses: { "200": { $ref: "#/components/responses/GoalDetail" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
      patch: {
        tags: ["Goals"],
        summary: "Update a goal",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateGoalBody" } } } },
        responses: { "200": { $ref: "#/components/responses/GoalOk" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
      delete: {
        tags: ["Goals"],
        summary: "Delete a goal",
        security: [{ cookieAuth: [] }],
        responses: { "204": { $ref: "#/components/responses/NoContent" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/goals/{id}/habits/{habitId}": {
      parameters: [
        { $ref: "#/components/parameters/Id" },
        { name: "habitId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      put: {
        tags: ["Goals"],
        summary: "Associate a habit with a goal",
        security: [{ cookieAuth: [] }],
        responses: { "200": { $ref: "#/components/responses/HabitCount" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
      delete: {
        tags: ["Goals"],
        summary: "Remove a habit from a goal",
        security: [{ cookieAuth: [] }],
        responses: { "200": { $ref: "#/components/responses/HabitCount" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/projects": {
      get: {
        tags: ["Projects"],
        summary: "List projects",
        security: [{ cookieAuth: [] }],
        responses: { "200": { $ref: "#/components/responses/Projects" }, "401": { $ref: "#/components/responses/Unauthorized" } },
      },
      post: {
        tags: ["Projects"],
        summary: "Create a project",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateProjectBody" } } } },
        responses: { "201": { $ref: "#/components/responses/ProjectCreated" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/projects/{id}": {
      parameters: [{ $ref: "#/components/parameters/Id" }],
      get: {
        tags: ["Projects"],
        summary: "Project detail with tasks",
        security: [{ cookieAuth: [] }],
        responses: { "200": { $ref: "#/components/responses/ProjectDetail" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
      patch: {
        tags: ["Projects"],
        summary: "Update a project",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateProjectBody" } } } },
        responses: { "200": { $ref: "#/components/responses/ProjectOk" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
      delete: {
        tags: ["Projects"],
        summary: "Delete a project and its tasks",
        security: [{ cookieAuth: [] }],
        responses: { "204": { $ref: "#/components/responses/NoContent" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/projects/{id}/tasks": {
      parameters: [{ $ref: "#/components/parameters/Id" }],
      post: {
        tags: ["Projects"],
        summary: "Add a task",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateTaskBody" } } } },
        responses: { "201": { $ref: "#/components/responses/TaskCreated" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/projects/{id}/tasks/reorder": {
      parameters: [{ $ref: "#/components/parameters/Id" }],
      post: {
        tags: ["Projects"],
        summary: "Reorder tasks",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ReorderBody" } } } },
        responses: { "200": { $ref: "#/components/responses/Ok" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/projects/tasks/{taskId}": {
      parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      patch: {
        tags: ["Projects"],
        summary: "Update a task (title/done)",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateTaskBody" } } } },
        responses: { "200": { $ref: "#/components/responses/TaskOk" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
      delete: {
        tags: ["Projects"],
        summary: "Delete a task",
        security: [{ cookieAuth: [] }],
        responses: { "204": { $ref: "#/components/responses/NoContent" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/daily-logs": {
      get: {
        tags: ["Daily Logs"],
        summary: "List daily logs in a range",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "from", in: "query", required: false, schema: { type: "string", format: "date" } },
          { name: "to", in: "query", required: false, schema: { type: "string", format: "date" } },
        ],
        responses: { "200": { $ref: "#/components/responses/DailyLogs" }, "401": { $ref: "#/components/responses/Unauthorized" } },
      },
      post: {
        tags: ["Daily Logs"],
        summary: "Upsert a daily log for a date",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpsertDailyLogBody" } } } },
        responses: { "200": { $ref: "#/components/responses/DailyLogOk" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    "/daily-logs/correlations": {
      get: {
        tags: ["Daily Logs"],
        summary: "Correlate daily state with completion rate",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "from", in: "query", required: false, schema: { type: "string", format: "date" } },
          { name: "to", in: "query", required: false, schema: { type: "string", format: "date" } },
        ],
        responses: { "200": { $ref: "#/components/responses/Correlations" }, "401": { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    "/daily-logs/{date}": {
      parameters: [{ name: "date", in: "path", required: true, schema: { type: "string", format: "date" } }],
      get: {
        tags: ["Daily Logs"],
        summary: "Get a daily log by date",
        security: [{ cookieAuth: [] }],
        responses: { "200": { $ref: "#/components/responses/DailyLogOk" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/daily-logs/{id}": {
      parameters: [{ $ref: "#/components/parameters/Id" }],
      patch: {
        tags: ["Daily Logs"],
        summary: "Update a daily log",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpsertDailyLogBody" } } } },
        responses: { "200": { $ref: "#/components/responses/DailyLogOk" }, "400": { $ref: "#/components/responses/BadRequest" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
      delete: {
        tags: ["Daily Logs"],
        summary: "Delete a daily log",
        security: [{ cookieAuth: [] }],
        responses: { "204": { $ref: "#/components/responses/NoContent" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/stats/overview": {
      get: {
        tags: ["Statistics"],
        summary: "Monthly overview (habit + pillar stats)",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "year", in: "query", required: false, schema: { type: "integer", minimum: 1970, maximum: 2100 } },
          { name: "month", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 12 } },
        ],
        responses: { "200": { $ref: "#/components/responses/Overview" }, "401": { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    "/stats/monthly": {
      get: {
        tags: ["Statistics"],
        summary: "Monthly progress",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "year", in: "query", required: false, schema: { type: "integer" } },
          { name: "month", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 12 } },
        ],
        responses: { "200": { $ref: "#/components/responses/Ok" }, "401": { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    "/stats/analytics": {
      get: {
        tags: ["Statistics"],
        summary: "Weekly/monthly analytics with trends",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "weeks", in: "query", required: false, schema: { type: "integer", minimum: 4, maximum: 52 } }],
        responses: { "200": { $ref: "#/components/responses/Analytics" }, "401": { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    "/stats/heatmap": {
      get: {
        tags: ["Statistics"],
        summary: "Activity heatmap",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "year", in: "query", required: false, schema: { type: "integer" } },
          { name: "month", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 12 } },
        ],
        responses: { "200": { $ref: "#/components/responses/Ok" }, "401": { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    "/stats/habits/{id}": {
      parameters: [
        { $ref: "#/components/parameters/Id" },
        { name: "year", in: "query", required: false, schema: { type: "integer" } },
        { name: "month", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 12 } },
      ],
      get: {
        tags: ["Statistics"],
        summary: "Per-habit monthly stats",
        security: [{ cookieAuth: [] }],
        responses: { "200": { $ref: "#/components/responses/Ok" }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" } },
      },
    },
    "/progression": {
      get: {
        tags: ["Progression"],
        summary: "XP/level/rank per pillar and overall (empty when disabled)",
        security: [{ cookieAuth: [] }],
        responses: { "200": { $ref: "#/components/responses/Progression" }, "401": { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    "/health": {
      get: {
        tags: ["System"],
        summary: "Liveness check",
        responses: { "200": { $ref: "#/components/responses/Ok" } },
      },
    },
    "/health/ready": {
      get: {
        tags: ["System"],
        summary: "Readiness check (database)",
        responses: {
          "200": { description: "Database reachable", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" }, db: { type: "string" } } } } } },
          "503": { description: "Database unavailable" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "token" },
    },
    parameters: {
      Id: { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
    },
    responses: {
      Ok: { description: "Success", content: { "application/json": { schema: { type: "object" } } } },
      NoContent: { description: "No content" },
      AuthCreated: { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
      AuthOk: { description: "Success", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
      Me: { description: "Current user", content: { "application/json": { schema: { type: "object", properties: { user: { $ref: "#/components/schemas/User" } } } } } },
      Pillars: { description: "Pillars", content: { "application/json": { schema: { type: "object", properties: { pillars: { type: "array", items: { $ref: "#/components/schemas/Pillar" } } } } } } },
      PillarCreated: { description: "Created", content: { "application/json": { schema: { type: "object", properties: { pillar: { $ref: "#/components/schemas/Pillar" } } } } } },
      PillarOk: { description: "Success", content: { "application/json": { schema: { type: "object", properties: { pillar: { $ref: "#/components/schemas/Pillar" } } } } } },
      Habits: { description: "Habits", content: { "application/json": { schema: { type: "object", properties: { habits: { type: "array", items: { $ref: "#/components/schemas/Habit" } } } } } } },
      HabitCreated: { description: "Created", content: { "application/json": { schema: { type: "object", properties: { habit: { $ref: "#/components/schemas/Habit" } } } } } },
      HabitOk: { description: "Success", content: { "application/json": { schema: { type: "object", properties: { habit: { $ref: "#/components/schemas/Habit" } } } } } },
      HabitHistory: { description: "History", content: { "application/json": { schema: { type: "object", properties: { history: { $ref: "#/components/schemas/HabitHistory" } } } } } },
      CompletionOk: { description: "Success", content: { "application/json": { schema: { type: "object", properties: { completion: { $ref: "#/components/schemas/Completion" } } } } } },
      Completions: { description: "Completions", content: { "application/json": { schema: { type: "object", properties: { completions: { type: "array", items: { $ref: "#/components/schemas/Completion" } } } } } } },
      Goals: { description: "Goals", content: { "application/json": { schema: { type: "object", properties: { goals: { type: "array", items: { $ref: "#/components/schemas/Goal" } } } } } } },
      GoalCreated: { description: "Created", content: { "application/json": { schema: { type: "object", properties: { goal: { $ref: "#/components/schemas/Goal" } } } } } },
      GoalOk: { description: "Success", content: { "application/json": { schema: { type: "object", properties: { goal: { $ref: "#/components/schemas/Goal" } } } } } },
      GoalDetail: { description: "Detail", content: { "application/json": { schema: { type: "object", properties: { goal: { $ref: "#/components/schemas/GoalDetail" } } } } } },
      HabitCount: { description: "Association updated", content: { "application/json": { schema: { type: "object", properties: { habitCount: { type: "integer" } } } } } },
      Projects: { description: "Projects", content: { "application/json": { schema: { type: "object", properties: { projects: { type: "array", items: { $ref: "#/components/schemas/Project" } } } } } } },
      ProjectCreated: { description: "Created", content: { "application/json": { schema: { type: "object", properties: { project: { $ref: "#/components/schemas/Project" } } } } } },
      ProjectOk: { description: "Success", content: { "application/json": { schema: { type: "object", properties: { project: { $ref: "#/components/schemas/Project" } } } } } },
      ProjectDetail: { description: "Detail", content: { "application/json": { schema: { type: "object", properties: { project: { $ref: "#/components/schemas/ProjectDetail" } } } } } },
      TaskCreated: { description: "Created", content: { "application/json": { schema: { type: "object", properties: { task: { $ref: "#/components/schemas/ProjectTask" } } } } } },
      TaskOk: { description: "Success", content: { "application/json": { schema: { type: "object", properties: { task: { $ref: "#/components/schemas/ProjectTask" } } } } } },
      DailyLogs: { description: "Daily logs", content: { "application/json": { schema: { type: "object", properties: { logs: { type: "array", items: { $ref: "#/components/schemas/DailyLog" } } } } } } },
      DailyLogOk: { description: "Success", content: { "application/json": { schema: { type: "object", properties: { log: { $ref: "#/components/schemas/DailyLog" } } } } } },
      Correlations: { description: "Correlations", content: { "application/json": { schema: { type: "object", properties: { correlations: { type: "object" } } } } } },
      Overview: { description: "Overview", content: { "application/json": { schema: { $ref: "#/components/schemas/StatsOverview" } } } },
      Analytics: { description: "Analytics", content: { "application/json": { schema: { $ref: "#/components/schemas/Analytics" } } } },
      Progression: { description: "Progression", content: { "application/json": { schema: { $ref: "#/components/schemas/Progression" } } } },
      BadRequest: { $ref: "#/components/responses/Error400" },
      Unauthorized: { $ref: "#/components/responses/Error401" },
      NotFound: { $ref: "#/components/responses/Error404" },
      Conflict: { $ref: "#/components/responses/Error409" },
      RateLimited: { $ref: "#/components/responses/Error429" },
      Error400: { description: "Validation or domain error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      Error401: { description: "Unauthenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      Error404: { description: "Not found (including cross-user access)", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      Error409: { description: "Conflict", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      Error429: { description: "Rate limited", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: { $ref: "#/components/schemas/ErrorBody" },
        },
      },
      ErrorBody: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: { type: "string", description: "Machine-readable error code, e.g. HABIT_NOT_FOUND" },
          message: { type: "string" },
          details: {},
        },
      },
      User: {
        type: "object",
        required: ["id", "email", "weekStart", "theme", "onboarded", "gamification", "createdAt"],
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          name: { type: "string", nullable: true },
          timezone: { type: "string", nullable: true },
          weekStart: { type: "integer", minimum: 0, maximum: 6 },
          theme: { type: "string", enum: ["light", "dark", "system"] },
          onboarded: { type: "boolean" },
          gamification: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AuthResponse: {
        type: "object",
        required: ["user", "token"],
        properties: { user: { $ref: "#/components/schemas/User" }, token: { type: "string" } },
      },
      RegisterBody: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8, maxLength: 72 },
          name: { type: "string", maxLength: 100 },
        },
      },
      LoginBody: {
        type: "object",
        required: ["email", "password"],
        properties: { email: { type: "string", format: "email" }, password: { type: "string", minLength: 1 } },
      },
      UpdateMeBody: {
        type: "object",
        properties: {
          name: { type: "string", nullable: true, maxLength: 100 },
          timezone: { type: "string", nullable: true },
          weekStart: { type: "integer", minimum: 0, maximum: 6 },
          theme: { type: "string", enum: ["light", "dark", "system"] },
          onboarded: { type: "boolean" },
          gamification: { type: "boolean" },
        },
      },
      OnboardingBody: {
        type: "object",
        required: ["pillars", "habits"],
        properties: {
          pillars: { type: "array", items: { $ref: "#/components/schemas/CreatePillarBody" } },
          habits: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "pillarIndex"],
              properties: {
                name: { type: "string" },
                pillarIndex: { type: "integer", minimum: 0 },
                icon: { type: "string" },
                color: { type: "string" },
              },
            },
          },
        },
      },
      Pillar: {
        type: "object",
        required: ["id", "name", "sortOrder", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          color: { type: "string", nullable: true },
          icon: { type: "string", nullable: true },
          description: { type: "string", nullable: true },
          sortOrder: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreatePillarBody: {
        type: "object",
        required: ["name"],
        properties: { name: { type: "string", maxLength: 100 }, color: { type: "string" }, icon: { type: "string" }, description: { type: "string" } },
      },
      UpdatePillarBody: {
        type: "object",
        properties: { name: { type: "string", maxLength: 100 }, color: { type: "string", nullable: true }, icon: { type: "string", nullable: true }, description: { type: "string", nullable: true }, sortOrder: { type: "integer" } },
      },
      ReorderBody: { type: "object", required: ["ids"], properties: { ids: { type: "array", items: { type: "string", format: "uuid" } } } },
      Habit: {
        type: "object",
        required: ["id", "name", "pillarId", "pillarName", "frequency", "isActive", "sortOrder", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          pillarId: { type: "string", format: "uuid" },
          pillarName: { type: "string" },
          frequency: { $ref: "#/components/schemas/HabitFrequency" },
          daysOfWeek: { type: "array", items: { type: "integer", minimum: 0, maximum: 6 } },
          timesPerWeek: { type: "integer", nullable: true },
          timesPerMonth: { type: "integer", nullable: true },
          icon: { type: "string", nullable: true },
          color: { type: "string", nullable: true },
          sortOrder: { type: "integer" },
          isActive: { type: "boolean" },
          archivedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      HabitFrequency: { type: "string", enum: ["DAILY", "WEEKLY_DAYS", "TIMES_PER_WEEK", "TIMES_PER_MONTH"] },
      CreateHabitBody: {
        type: "object",
        required: ["name", "pillarId"],
        properties: {
          name: { type: "string", maxLength: 200 },
          description: { type: "string" },
          pillarId: { type: "string", format: "uuid" },
          frequency: { $ref: "#/components/schemas/HabitFrequency" },
          daysOfWeek: { type: "array", items: { type: "integer", minimum: 0, maximum: 6 } },
          timesPerWeek: { type: "integer", minimum: 1, maximum: 7 },
          timesPerMonth: { type: "integer", minimum: 1, maximum: 31 },
          icon: { type: "string" },
          color: { type: "string" },
        },
      },
      UpdateHabitBody: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string", nullable: true },
          pillarId: { type: "string", format: "uuid" },
          frequency: { $ref: "#/components/schemas/HabitFrequency" },
          daysOfWeek: { type: "array", items: { type: "integer" } },
          timesPerWeek: { type: "integer", nullable: true },
          timesPerMonth: { type: "integer", nullable: true },
          icon: { type: "string", nullable: true },
          color: { type: "string", nullable: true },
        },
      },
      HabitHistory: {
        type: "object",
        properties: {
          habitId: { type: "string" },
          from: { type: "string", format: "date" },
          to: { type: "string", format: "date" },
          days: { type: "array", items: { type: "object" } },
          expected: { type: "integer" },
          actual: { type: "integer" },
          completionRate: { type: "integer" },
          currentStreak: { type: "integer" },
          bestStreak: { type: "integer" },
          comparison: { type: "object" },
        },
      },
      Completion: {
        type: "object",
        required: ["id", "habitId", "date"],
        properties: { id: { type: "string", format: "uuid" }, habitId: { type: "string", format: "uuid" }, date: { type: "string", format: "date-time" }, createdAt: { type: "string", format: "date-time" } },
      },
      Goal: {
        type: "object",
        required: ["id", "title", "pillarId", "status", "progress", "habitCount"],
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          pillarId: { type: "string" },
          pillarName: { type: "string" },
          pillarColor: { type: "string", nullable: true },
          status: { type: "string", enum: ["ACTIVE", "COMPLETED", "ABANDONED"] },
          deadline: { type: "string", format: "date", nullable: true },
          completedAt: { type: "string", format: "date-time", nullable: true },
          progress: { type: "integer", minimum: 0, maximum: 100 },
          habitCount: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      GoalDetail: {
        allOf: [{ $ref: "#/components/schemas/Goal" }],
        properties: { habits: { type: "array" }, progressHistory: { type: "array" } },
      },
      CreateGoalBody: {
        type: "object",
        required: ["title", "pillarId"],
        properties: { title: { type: "string", maxLength: 200 }, description: { type: "string" }, pillarId: { type: "string", format: "uuid" }, deadline: { type: "string", format: "date" } },
      },
      UpdateGoalBody: {
        type: "object",
        properties: { title: { type: "string" }, description: { type: "string", nullable: true }, pillarId: { type: "string", format: "uuid" }, deadline: { type: "string", format: "date", nullable: true }, status: { type: "string", enum: ["ACTIVE", "COMPLETED", "ABANDONED"] } },
      },
      Project: {
        type: "object",
        required: ["id", "title", "pillarId", "status", "progress", "taskCount"],
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          pillarId: { type: "string" },
          pillarName: { type: "string" },
          pillarColor: { type: "string", nullable: true },
          status: { type: "string", enum: ["PLANNING", "IN_PROGRESS", "COMPLETED", "PAUSED"] },
          deadline: { type: "string", format: "date", nullable: true },
          completedAt: { type: "string", format: "date-time", nullable: true },
          progress: { type: "integer", minimum: 0, maximum: 100 },
          taskCount: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ProjectDetail: {
        allOf: [{ $ref: "#/components/schemas/Project" }],
        properties: { tasks: { type: "array", items: { $ref: "#/components/schemas/ProjectTask" } } },
      },
      ProjectTask: {
        type: "object",
        required: ["id", "projectId", "title", "isDone", "position"],
        properties: { id: { type: "string", format: "uuid" }, projectId: { type: "string" }, title: { type: "string" }, isDone: { type: "boolean" }, position: { type: "integer" }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } },
      },
      CreateProjectBody: {
        type: "object",
        required: ["title", "pillarId"],
        properties: { title: { type: "string", maxLength: 200 }, description: { type: "string" }, pillarId: { type: "string", format: "uuid" }, deadline: { type: "string", format: "date" } },
      },
      UpdateProjectBody: {
        type: "object",
        properties: { title: { type: "string" }, description: { type: "string", nullable: true }, pillarId: { type: "string", format: "uuid" }, deadline: { type: "string", format: "date", nullable: true }, status: { type: "string", enum: ["PLANNING", "IN_PROGRESS", "COMPLETED", "PAUSED"] } },
      },
      CreateTaskBody: { type: "object", required: ["title"], properties: { title: { type: "string", maxLength: 500 } } },
      UpdateTaskBody: { type: "object", properties: { title: { type: "string", maxLength: 500 }, isDone: { type: "boolean" } } },
      DailyLog: {
        type: "object",
        required: ["id", "userId", "date"],
        properties: {
          id: { type: "string", format: "uuid" },
          date: { type: "string", format: "date" },
          mood: { type: "integer", minimum: 1, maximum: 10, nullable: true },
          energy: { type: "integer", minimum: 1, maximum: 10, nullable: true },
          sleepHours: { type: "number", nullable: true },
          notes: { type: "string", nullable: true },
        },
      },
      UpsertDailyLogBody: {
        type: "object",
        required: ["date"],
        properties: {
          date: { type: "string", format: "date" },
          mood: { type: "integer", minimum: 1, maximum: 10 },
          energy: { type: "integer", minimum: 1, maximum: 10 },
          sleepHours: { type: "number" },
          notes: { type: "string" },
        },
      },
      StatsOverview: {
        type: "object",
        properties: {
          year: { type: "integer" },
          month: { type: "integer" },
          totalCompletions: { type: "integer" },
          successRate: { type: "integer" },
          pillarStats: { type: "array", items: { type: "object" } },
          habitStats: { type: "array", items: { type: "object" } },
        },
      },
      Analytics: {
        type: "object",
        properties: {
          weeks: { type: "integer" },
          weeklyRates: { type: "array" },
          monthlyRates: { type: "array" },
          trend: { type: "object" },
          consistency: { type: "integer" },
          dailyAverage: { type: "number" },
          habitConsistency: { type: "array" },
          streakHistory: { type: "array" },
          pillarStats: { type: "array" },
        },
      },
      Progression: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
          overall: { type: "object", nullable: true },
          pillars: { type: "array" },
        },
      },
    },
  },
};

export { openapi };
