import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppRouter from './navigation/AppRouter';

export default function App() {
  return (
    <>
      <AppRouter />
      <StatusBar style="auto" />
    </>
  );
}
