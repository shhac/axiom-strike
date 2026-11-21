import type { Action } from "../../engine/battle";
import { playSfx, type SfxName } from "../audio";
import { dispatch } from "../store";

/** A tap handler: the sound plays even when the action is ignored, so every touch gets an answer. */
export const act = (sfx: SfxName, action: Action) => () => {
  playSfx(sfx);
  dispatch(action);
};
