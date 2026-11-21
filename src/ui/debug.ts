import { solve } from "../engine/solver";
import { battle, busy } from "./store";

/** Lets automated playthroughs read the board and ask the solver; not used by the game itself. */
export const exposeDebug = () => {
  Object.assign(window, { __axiom: { state: () => battle.value, busy: () => busy.value, solve } });
};
