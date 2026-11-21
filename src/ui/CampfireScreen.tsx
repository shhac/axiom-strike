import { useEffect, useState } from "preact/hooks";
import { PASSAGES } from "../content/passages";
import { pickPassage } from "../engine/campfire";
import { createRng } from "../engine/rng";
import { icon } from "./assets";
import { playMusic, playSfx } from "./audio";
import { Story } from "./campfire/Story";
import { MapButton } from "./common";
import { save } from "./save";

const Bag = () => (
  <div class="bag" aria-label={`${save.value.potions} potions, ${save.value.scrolls} hint scrolls`}>
    <span data-bag="potions">
      <img src={icon("potion")} alt="" />
      {save.value.potions}
    </span>
    <span data-bag="scrolls">
      <img src={icon("hint")} alt="" />
      {save.value.scrolls}
    </span>
  </div>
);

const FireIsLow = () => (
  <div class="scroll-card scroll-done" data-phase="empty">
    <h1>The fire is low</h1>
    <p class="scroll-answer">Win a level and a new story will be waiting here.</p>
    <div class="result-buttons">
      <MapButton />
    </div>
  </div>
);

const newStory = () => {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const passageId = pickPassage(save.value, createRng(seed));
  const passage = PASSAGES[passageId];
  return passage ? { seed, passageId, passage } : null;
};

export const CampfireScreen = () => {
  useEffect(() => playMusic("music_calm"), []);
  const [story, setStory] = useState(() => (save.value.stories > 0 ? newStory() : null));

  const another = () => {
    playSfx("page");
    setStory(newStory());
  };

  return (
    <div class="screen campfire" data-screen="campfire">
      <div class="campfire-art" />
      <header class="campfire-head">
        <h1>Campfire</h1>
        <Bag />
      </header>
      {story ? <Story key={story.seed} {...story} another={another} /> : <FireIsLow />}
    </div>
  );
};
