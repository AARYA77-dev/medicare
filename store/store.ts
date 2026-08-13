import { configureStore } from '@reduxjs/toolkit';
import medicineReducer from './medicineSlice';

export const store = configureStore({
  reducer: {
    medicine: medicineReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
