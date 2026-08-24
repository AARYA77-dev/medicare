import { configureStore } from '@reduxjs/toolkit';
import medicineReducer from './medicineSlice';
import sharingReducer from './sharingSlice';

export const store = configureStore({
  reducer: {
    medicine: medicineReducer,
    sharing: sharingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
