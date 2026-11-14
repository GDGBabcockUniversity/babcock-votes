"use client";
import React, { useEffect } from "react";
import { NOOP } from "sia-reactor";
import { keyEventAllowed, KEYS_BLOCKS } from "sia-reactor/utils";
import { toggleSidebar, toggleTheme } from "@/context/app-store";

export const KEY_SHORTCUTS = {
  undo: ["Ctrl+z", "Cmd+z"],
  redo: ["Ctrl+y", "Ctrl+Shift+z", "Cmd+Shift+z"],
  toggleTheme: "Alt+t",
  toggleSidebar: ["Ctrl+b", "Cmd+b"],
};

export const KEY_HANDLERS = {
  undo: NOOP,
  redo: NOOP,
  toggleTheme,
  toggleSidebar,
};

export const KEY_SETTINGS = { blocks: KEYS_BLOCKS, shortcuts: KEY_SHORTCUTS };

export const KeyHandler: React.FC = () => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent, a = keyEventAllowed(e, KEY_SETTINGS)) => a && KEY_HANDLERS[a]();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
};

export default KeyHandler;
