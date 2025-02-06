import * as Op from "@fp-ts/optic";
import { Boolean as B, flow, Schema as S, Struct } from "effect";
import { LazyArg } from "effect/Function";
import { ReactNode } from "react";
import { create, StateCreator } from "zustand";
import {
  Loaded,
  Loading,
  NewFillup,
  NewFillupSection,
  SectionOpenMap,
  SectionRefMap,
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

type NewFillupSlice = Readonly<{
  newFillup: NewFillup;
  sectionOpenMap: SectionOpenMap;
  sectionRefMap: SectionRefMap;
  toggleSectionOpen: (s: NewFillupSection) => void;
  resetNewFillup: LazyArg<void>;
}>;
const emptyRefObject = <A>(): React.RefObject<A | null> => ({ current: null });

type MainDrawerSlice = Readonly<{
  mainDrawerOpen: boolean;
  setMainDrawerOpen: (open: boolean) => void;
  toggleMainDrawerOpen: LazyArg<void>;
}>;

type PageActionSlice = Readonly<{
  pageAction: ReactNode;
  setPageAction: (action: ReactNode) => void;
}>;

const _sessionState = Op.id<SessionSlice>().at("sessionState");
const createSessionSlice: StateCreator<SessionSlice> = setState => ({
  sessionState: SessionLoading.make(),
  setSessionState: sessionState => setState({ sessionState }),
  modifySessionState: flow(Op.modify(_sessionState), setState),
});

const createUserDataSlice: StateCreator<UserDataSlice> = (
  setState,
  _,
  store,
) => ({
  userData: Loading.make(),
  resetUserData: () => setState({ userData: store.getInitialState().userData }),
  setUserData: userData => setState({ userData }),
});

const _secOpenMap = Op.id<NewFillupSlice>().at("sectionOpenMap");
const _section = (s: NewFillupSection) => _secOpenMap.at(s);
const createNewFillupSlice: StateCreator<NewFillupSlice> = (
  setState,
  _,
  store,
) => ({
  newFillup: S.decodeSync(NewFillup)({ odometerReading: "0" }),
  sectionOpenMap: SectionOpenMap.make({
    fillup: true,
    fuel: false,
    location: true,
    other: false,
  }),
  sectionRefMap: NewFillupSection.literals.reduce(
    (acc, s) => ({ ...acc, [s]: emptyRefObject<HTMLDivElement>() }),
    {} as SectionRefMap,
  ),
  toggleSectionOpen: flow(_section, o => Op.modify(o)(B.not), setState),
  resetNewFillup: () =>
    setState(
      Struct.pick(
        store.getInitialState(),
        "newFillup",
        "sectionOpenMap",
        "toggleSectionOpen",
      ),
    ),
});

const _mainDrawerOpen = Op.id<MainDrawerSlice>().at("mainDrawerOpen");
const createMainDrawerSlice: StateCreator<MainDrawerSlice> = setState => ({
  mainDrawerOpen: false,
  setMainDrawerOpen: flow(Op.replace(_mainDrawerOpen), setState),
  toggleMainDrawerOpen: () => setState(Op.modify(_mainDrawerOpen)(B.not)),
});

const createPageActionSlice: StateCreator<PageActionSlice> = setState => ({
  pageAction: undefined,
  setPageAction: n => setState({ pageAction: n }),
});

export const useAppState = create<
  SessionSlice &
    UserDataSlice &
    NewFillupSlice &
    MainDrawerSlice &
    PageActionSlice
>()((...a) => ({
  ...createSessionSlice(...a),
  ...createUserDataSlice(...a),
  ...createNewFillupSlice(...a),
  ...createMainDrawerSlice(...a),
  ...createPageActionSlice(...a),
}));
