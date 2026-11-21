import { playSfx } from "./audio";

/** A tap handler for buttons outside the battle board: the button sound, then what the button does. */
export const press = (go: () => void) => () => {
  playSfx("button");
  go();
};
