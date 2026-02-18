e/evolve",
        "method": "POST",
        "description": "Triggers autonomous code evolution based on the context.json file.",
        "authRequired": true
      }
    ],
    "databaseSchema": {
      "tables": [
        {
          "name": "contexts",
          "columns": [
            {
              "name": "id",
              "type": "UUID",
              "constraints": [
                "PRIMARY KEY"
              ]
            },
            {
              "name": "name",
              "type": "VARCHAR(255)",
              "constraints": [
                "NOT NULL"
              ]
            },
            {
              "name": "data",
              "type": "JSON",
              "constraints": [
                "NOT NULL"
              ]
            },
            {
              "name": "created_at",
              "type": "TIMESTAMP",
              "constraints": [
                "NOT NULL"
              ]
            },
            {
              "name": "updated_at",
              "type": "TIMESTAMP",
              "constraints": [
                "NOT NULL"
              ]
            }
          ]
        },
        {
          "name": "users",
          "columns": [
            {
              "name": "id",
              "type": "UUID",
              "constraints": [
                "PRIMARY KEY"
              ]
            },
            {
              "name": "username",
              "type": "VARCHAR(255)",
              "constraints": [
                "NOT NULL"
              ]
            },
            {
              "name": "password_hash",
              "type": "VARCHAR(255)",
              "constraints": [
                "NOT NULL"
              ]
            },
            {
              "name": "email",
              "type": "VARCHAR(255)",
              "constraints": [
                "NOT NULL"
              ]
            },
            {
              "name": "created_at",
              "type": "TIMESTAMP",
              "constraints": [
                "NOT NULL"
              ]
            }
          ]
        }
      ]
    }
  },
  "metadata": {
    "version": "1.0.0",
    "generatedAt": "2026-02-18T11:50:21.101Z",
    "lastUpdatedAt": "2026-02-18T11:50:21.102Z",
    "projectConfig": {
      "id": "958b8e40-5067-4a4c-9fa1-a1c2454fb87a",
      "name": "MyContext Monorepo",
      "description": "Development teams face challenges in maintaining alignment between their design intent and the actual implementation, leading to code drift, inefficiencies, and inconsistencies. Existing AI agents lack a deterministic context, often producing outputs that are misaligned with user requirements.",
      "createdAt": "2026-02-18T11:50:21.102Z",
      "updatedAt": "2026-02-18T11:50:21.102Z",
      "contextPath": ".mycontext",
      "version": "0.1.0",
      "status": "context-generated"
    }
  },
  "components": [],
  "actions": [],
  "routes": []
}