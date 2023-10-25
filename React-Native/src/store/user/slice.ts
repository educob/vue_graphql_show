import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';
import { User, SliceStatus, UserState, Inheritance, Inheritances, Thirdparty } from '../types';

const initialState: UserState = {
  data: null,
  token: null,
  deceased: false,
  inheritances: {},
  thirdparty: {},
  logged: false,
  hasNotification: false,
  status: SliceStatus.IDLE,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserData: (state, action: PayloadAction<User>) => {
      state.data = action.payload;
    },
    updateUserData: (state, action: PayloadAction<User>) => {
      if (action.payload) {
        state.data = {...state.data, ...action.payload};
      }
    },
    setLogged: (state, action: PayloadAction<boolean>) => {
      state.logged = action.payload;
    },
    setDeceased: (state, action: PayloadAction<boolean>) => {
      state.deceased = action.payload;
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    setInheritance: (state, action: PayloadAction<Inheritance>) => {
      state.inheritances[action.payload._id] = action.payload;
    },
    setInheritances: (state, action: PayloadAction<Inheritances>) => {
      state.inheritances = action.payload;
    },
    setThirdparty: (state, action: PayloadAction<Thirdparty>) => {
      state.thirdparty = action.payload;
    },
    setHasNotification: (state, action: PayloadAction<boolean>) => {
      state.hasNotification = action.payload;
    },
    setUserStatus: (state, action: PayloadAction<SliceStatus>) => {
      state.status = action.payload;
    },
  },
});

export const {
  setUserData,
  setToken,
  setDeceased,
  updateUserData,
  setInheritance,
  setInheritances,
  setThirdparty,
  setLogged,
  setHasNotification,
  setUserStatus,
} = userSlice.actions;

export default userSlice.reducer;

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
