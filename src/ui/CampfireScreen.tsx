import { useEffect, useState } from "preact/hooks";
import { PASSAGES } from "../content/passages";
import { pickPassage } from "../engine/campfire";
import { createRng } from "../engine/rng";
import { icon } from "./assets";
import { playMusic, playSfx } from "./audio";
import { Book } from "./campfire/Book";
import { Gear } from "./campfire/Gear";
import { Hub } from "./campfire/Hub";
import { PracticeGame } from "./campfire/Practice";
import { Story } from "./campfire/Story";
import { Words } from "./campfire/Words";
import { campActivity, type Activity } from "./nav";
import { press } from "./press";
import { save } from "./save";

export const Streak = () => {
  const { days } = save.value.streak;
  if (days === 0) return null;
  const size = days >= 7 ? "is-roaring" : days >= 3 ? "is-bright" : "";
  return (
    <span class={`streak ${size}`} data-streak={days} aria-label={`${days} days played in a row`}>
      <img src={icon("flame")} alt="" />
      {days}
      <small>{days === 1 ? "day" : "days"}</small>
    </span>
  );
};

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
    <Streak />
  </div>
);

const FireIsLow = ({ back }: { back: () => void }) => (
  <div class="scroll-card scroll-done" data-phase="empty">
    <h1>The fire is low</h1>
    <p class="scroll-answer">Win a level and a new story will be waiting here.</p>
    <div class="result-buttons">
      <button class="btn btn-wide" data-action="camp" onClick={press(back)}>
        Camp
      </button>
    </div>
  </div>
);

const newStory = () => {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const passageId = pickPassage(save.value, createRng(seed));
  const passage = PASSAGES[passageId];
  return passage ? { seed, passageId, passage } : null;
};

const StoryTime = ({ back }: { back: () => void }) => {
  const [story, setStory] = useState(() => (save.value.stories > 0 ? newStory() : null));
  const another = () => {
    playSfx("page");
    setStory(newStory());
  };
  return story ? <Story key={story.seed} {...story} another={another} /> : <FireIsLow back={back} />;
};

export const CampfireScreen = () => {
  useEffect(() => playMusic("music_calm"), []);
  const activity = campActivity.value;
  const open = (next: Activity | null) => (campActivity.value = next);
  const back = () => open(null);
  // Target practice needs the whole screen for its tiles, like a battle.
  if (activity === "practice") return <PracticeGame back={back} />;
  return (
    <div class="screen campfire" data-screen="campfire">
      <div class="campfire-art" />
      <header class="campfire-head">
        <h1>Camp</h1>
        <Bag />
      </header>
      {activity === null && <Hub save={save.value} open={open} />}
      {activity === "story" && <StoryTime back={back} />}
      {activity === "book" && <Book save={save.value} back={back} />}
      {activity === "gear" && <Gear save={save.value} back={back} />}
      {activity === "words" && <Words back={back} />}
    </div>
  );
};
