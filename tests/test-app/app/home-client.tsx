"use client";

import { id } from "@instantdb/react";
import db from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

export default function HomeClient() {
  const [newTodo, setNewTodo] = useState("");
  const { isLoading, error, data } = db.useQuery({ todos: {} });

  const addTodo = () => {
    if (!newTodo.trim()) return;

    db.transact(
      db.tx.todos[id()].update({
        text: newTodo,
        done: false,
        createdAt: Date.now(),
      })
    );
    setNewTodo("");
  };

  const toggleTodo = (todo: any) => {
    db.transact(db.tx.todos[todo.id].update({ done: !todo.done }));
  };

  const deleteTodo = (todo: any) => {
    db.transact(db.tx.todos[todo.id].delete());
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <p className="text-xs text-muted-foreground mt-4">
              Make sure NEXT_PUBLIC_INSTANT_APP_ID is set in your .env file
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { todos } = data;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-4xl font-bold">My Todos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Real-time todos powered by InstantDB
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="What needs to be done?"
              onKeyPress={(e) => e.key === "Enter" && addTodo()}
              className="flex-1"
            />
            <Button onClick={addTodo}>Add</Button>
          </div>

          <div className="space-y-2">
            {todos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No todos yet. Add one above!
              </div>
            ) : (
              todos.map((todo: any) => (
                <Card key={todo.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={todo.done}
                      onCheckedChange={() => toggleTodo(todo)}
                    />
                    <span
                      className={`flex-1 ${
                        todo.done ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {todo.text}
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteTodo(todo)}
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="text-xs text-muted-foreground pt-4 border-t">
            <p>
              ✨ Try opening this in multiple tabs - changes sync in real-time!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
