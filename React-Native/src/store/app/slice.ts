import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { AppState } from '../types';

const initialState: AppState = {
  isEmulator: false,
  jobsTimer: -1,
  fee: 0,
  feeNextUpdate: null,
  upgrade: false,
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setJobsTimer: (state, action: PayloadAction<number>) => {
      state.jobsTimer = action.payload;
    },
    setIsEmulator: (state, action: PayloadAction<boolean>) => {
      state.isEmulator = action.payload;
    },
    setFee: (state, action: PayloadAction<number>) => {
      state.fee = action.payload;
    },
    setFeeNextUpdate: (state, action: PayloadAction<string>) => {
      state.feeNextUpdate = action.payload;
    },
    setUpgrade: (state, action: PayloadAction<boolean>) => {
      state.upgrade = action.payload;
    },
  },
});

export const {
  setJobsTimer,
  setIsEmulator,
  setFee,
  setFeeNextUpdate,
  setUpgrade
} = appSlice.actions;

export default appSlice.reducer;

/* 

How to set:
  import { useDispatch } from 'react-redux';
  import { setLogged } from '../store/user/slice';
  const dispatch = useDispatch();
  dispatch(setLogged(true))

How to get:
  mport { RootState } from '../store/store';
  import { useSelector } from 'react-redux';
  const logged = useSelector((state: RootState) => state.user.logged);

-------- outside compoent -----

How to get:
  import { store } from '../store/store'
  store.getState().user.inheritances
  
How to set: 
  import { store } from '../store/store'
  import { setInheritances} from '../store/user/slice';
  store.dispatch(setInheritances( inheritances ));


*/
