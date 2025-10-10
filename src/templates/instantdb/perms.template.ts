export default {
  todos: {
    allow: {
      create: "auth.id != null",
      update: "auth.id != null",
      delete: "auth.id != null",
    },
  },
};
