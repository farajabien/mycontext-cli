{
  "prd": {
    "title": "Simple Todo App with Priority Levels and Categories",
    "problemStatement": "Users need an intuitive and efficient way to manage their tasks, organize them into categories, and assign priority levels to ensure important tasks are completed on time.",
    "goals": [
      "Allow users to create, update, and delete tasks.",
      "Enable users to assign priority levels to tasks.",
      "Allow users to organize tasks into custom categories.",
      "Provide a simple and intuitive user interface for task management."
    ],
    "targetAudience": "Individuals and professionals seeking a simple and effective tool to manage their personal or work tasks.",
    "successMetrics": [
      "User retention rate of at least 70% after one month of use.",
      "Positive user feedback and ratings above 4.5 stars in app stores.",
      "Task completion rate of at least 80% for active users."
    ]
  },
  "features": [
    {
      "id": "f1",
      "name": "Task Creation",
      "description": "Users can create new tasks with titles, descriptions, due dates, priority levels, and categories.",
      "priority": "high",
      "userValue": "Allows users to manage their tasks effectively by creating and organizing them.",
      "acceptanceCriteria": [
        "Users can create tasks with all required fields.",
        "Task creation form is intuitive and user-friendly."
      ],
      "dependencies": []
    },
    {
      "id": "f2",
      "name": "Task Editing and Deletion",
      "description": "Users can edit or delete tasks as needed.",
      "priority": "high",
      "userValue": "Allows users to update or remove tasks to reflect changes in their plans.",
      "acceptanceCriteria": [
        "Users can edit task details including title, description, due date, priority, and category.",
        "Users can delete tasks with a confirmation prompt."
      ],
      "dependencies": [
        "f1"
      ]
    },
    {
      "id": "f3",
      "name": "Priority Levels",
      "description": "Users can assign priority levels (e.g., High, Medium, Low) to tasks.",
      "priority": "high",
      "userValue": "Helps users focus on the most important tasks first.",
      "acceptanceCriteria": [
        "Users can select a priority level when creating or editing a task.",
        "Tasks can be sorted by priority."
      ],
      "dependencies": [
        "f1"
      ]
    },
    {
      "id": "f4",
      "name": "Task Categories",
      "description": "Users can organize tasks into custom categories.",
      "priority": "medium",
      "userValue": "Helps users group related tasks for better organization.",
      "acceptanceCriteria": [
        "Users can assign tasks to existing categories.",
        "Users can create, edit, and delete categories."
      ],
      "dependencies": [
        "f1"
      ]
    },
    {
      "id": "f5",
      "name": "Task Viewing and Sorting",
      "description": "Users can view tasks and sort them by priority, due date, or category.",
      "priority": "medium",
      "userValue": "Makes it easier for users to find and prioritize their tasks.",
      "acceptanceCriteria": [
        "Users can view tasks in a list format.",
        "Users can sort tasks using the available sorting options."
      ],
      "dependencies": [
        "f1",
        "f3",
        "f4"
      ]
    }
  ],
  "flows": [
    {
      "id": "uf1",
      "name": "Create a Ta