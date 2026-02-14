"use client";

import React, { useState, createContext } from 'react';

export const Context = createContext();

const ContextProvider = ({ children }) => {
  const [state, setState] = useState(null);

  const updateState = (value) => {
    setState(value);
  };

  return (
    <Context.Provider value={{ state, updateState }}>
      {children}
    </Context.Provider>
  );
};

export default ContextProvider;