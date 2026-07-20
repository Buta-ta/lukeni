"use client";
import { useState, useEffect } from 'react';

export function useStoredState<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [val, setVal] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) setVal(JSON.parse(item));
    } catch {}
  }, [key]);

  const setValue = (value: T) => {
    setVal(value);
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };

  return [val, setValue];
}