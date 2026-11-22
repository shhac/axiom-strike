import { STRIKE_DAMAGE, type BattleState } from "../engine/battle";
import { solve } from "../engine/solver";
import { screen } from "./nav";
import { save } from "./save";
import { battle, busy } from "./store";

/** Lets automated playthroughs read the board and ask the solver; not used by the game itself. */
export const exposeDebug = () => {
  Object.assign(window, {
    __axiom: {
      state: () => battle.value,
      // For looking at a board that is hard to reach by playing, such as a boss in its second phase.
      show: (state: BattleState) => (battle.value = state),
      busy: () => busy.value,
      screen: () => screen.value,
      save: () => save.value,
      solve,
      strikeDamage: STRIKE_DAMAGE,
    },
  });
};
