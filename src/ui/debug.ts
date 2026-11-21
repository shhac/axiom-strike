import { STRIKE_DAMAGE } from "../engine/battle";
import { solve } from "../engine/solver";
import { screen } from "./nav";
import { save } from "./save";
import { battle, busy } from "./store";

/** Lets automated playthroughs read the board and ask the solver; not used by the game itself. */
export const exposeDebug = () => {
  Object.assign(window, {
    __axiom: {
      state: () => battle.value,
      busy: () => busy.value,
      screen: () => screen.value,
      save: () => save.value,
      solve,
      strikeDamage: STRIKE_DAMAGE,
    },
  });
};
