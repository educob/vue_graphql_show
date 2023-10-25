import { configureStore } from '@reduxjs/toolkit';

import userSlice from './user/slice';
import appSlice from './app/slice';

export const store = configureStore({
  reducer: {
    user: userSlice,
    app: appSlice
  },
});

export type RootState = ReturnType<typeof store.getState>
