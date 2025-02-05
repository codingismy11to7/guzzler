import * as Op from "@fp-ts/optic";
import { Boolean, Schema as S } from "effect";
import { LazyArg } from "effect/Function";
import { create, StateCreator } from "zustand";
import {
  Loaded,
  Loading,
  NewFillup,
  SessionLoading,
  SessionState,
  UserData,
} from "./models/AppState.js";

type SessionSlice = Readonly<{
  sessionState: SessionState;
  setSessionState: (ss: SessionState) => void;
  modifySessionState: (modify: (ss: SessionState) => SessionState) => void;
}>;

type UserDataSlice = Readonly<{
  userData: UserData;
  setUserData: (userData: Loaded) => void;
  resetUserData: LazyArg<void>;
}>;

type NewFillupSlice = Readonly<{ newFillup: NewFillup }>;

type MainDrawerSlice = Readonly<{
  mainDrawerOpen: boolean;
  setMainDrawerOpen: (open: boolean) => void;
  toggleMainDrawerOpen: LazyArg<void>;
}>;

const _sessionState = Op.id<SessionSlice>().at("sessionState");
const createSessionSlice: StateCreator<SessionSlice> = set => ({
  sessionState: SessionLoading.make(),
  setSessionState: sessionState => set({ sessionState }),
  modifySessionState: modify => set(Op.modify(_sessionState)(modify)),
});

const createUserDataSlice: StateCreator<UserDataSlice> = set => ({
  userData: Loading.make(),
  resetUserData: () => set(() => ({ userData: Loading.make() })),
  setUserData: userData => set(() => ({ userData })),
});

const createNewFillupSlice: StateCreator<NewFillupSlice> = () => ({
  newFillup: S.decodeSync(NewFillup)({ odometerReading: "0" }),
});

const _mainDrawerOpen =
  Op.id<Pick<MainDrawerSlice, "mainDrawerOpen">>().at("mainDrawerOpen");

const createMainDrawerSlice: StateCreator<MainDrawerSlice> = set => ({
  mainDrawerOpen: false,
  setMainDrawerOpen: o => set(Op.replace(_mainDrawerOpen)(o)),
  toggleMainDrawerOpen: () => set(Op.modify(_mainDrawerOpen)(Boolean.not)),
});

export const useAppState = create<
  SessionSlice & UserDataSlice & NewFillupSlice & MainDrawerSlice
>()((...a) => ({
  ...createSessionSlice(...a),
  ...createUserDataSlice(...a),
  ...createNewFillupSlice(...a),
  ...createMainDrawerSlice(...a),
}));
