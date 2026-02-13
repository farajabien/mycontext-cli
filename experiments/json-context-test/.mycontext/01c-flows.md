"authRequired": true
      },
      {
        "path": "/api/tasks",
        "method": "GET",
        "description": "Retrieve all tasks.",
        "authRequired": true
      },
      {
        "path": "/api/categories",
        "method": "POST",
        "description": "Create a new category.",
        "authRequired": true
      },
      {
        "path": "/api/categories",
        "method": "GET",
        "description": "Retrieve all categories.",
        "authRequired": true
      }
    ],
    "databaseSchema": {
      "tables": [
        {
          "name": "tasks",
          "columns": [
            {
              "name": "id",
              "type": "UUID",
              "constraints": [
                "primary key"
              ]
            },
            {
              "name": "title",
              "type": "VARCHAR",
              "constraints": [
                "not null"
              ]
            },
            {
              "name": "description",
              "type": "TEXT",
              "constraints": []
            },
            {
              "name": "due_date",
              "type": "DATE",
              "constraints": []
            },
            {
              "name": "priority",
              "type": "VARCHAR",
              "constraints": [
                "not null"
              ]
            },
            {
              "name": "category_id",
              "type": "UUID",
              "constraints": [
                "foreign key"
              ]
            },
            {
              "name": "created_at",
              "type": "TIMESTAMP",
              "constraints": [
                "not null"
              ]
            },
            {
              "name": "updated_at",
              "type": "TIMESTAMP",
              "constraints": [
                "not null"
              ]
            }
          ]
        },
        {
          "name": "categories",
          "columns": [
            {
              "name": "id",
              "type": "UUID",
              "constraints": [
                "primary key"
              ]
            },
            {
              "name": "name",
              "type": "VARCHAR",
              "constraints": [
                "not null",
                "unique"
              ]
            },
            {
              "name": "created_at",
              "type": "TIMESTAMP",
              "constraints": [
                "not null"
              ]
            },
            {
              "name": "updated_at",
              "type": "TIMESTAMP",
              "constraints": [
                "not null"
              ]
            }
          ]
        }
      ]
    }
  },
  "metadata": {
    "version": "1.0.0",
    "generatedAt": "2026-02-13T11:05:25.421Z",
    "lastUpdatedAt": "2026-02-13T11:05:25.436Z",
    "projectConfig": {
      "id": "363cc64c-c496-4eb4-a239-e479bfbb0eac",
      "name": "Simple Todo App with Priority Levels and Categories",
      "description": "Users need an intuitive and efficient way to manage their tasks, organize them into categories, and assign priority levels to ensure important tasks are completed on time.",
      "createdAt": "2026-02-13T11:05:25.436Z",
      "updatedAt": "2026-02-13T11:05:25.436Z",
      "contextPath": ".mycontext",
      "version": "0.1.0",
      "status": "context-generated"
    }
  },
  "components": [],
  "actions": [],
  "routes": []
}