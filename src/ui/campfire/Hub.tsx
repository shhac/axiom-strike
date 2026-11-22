import { FAMILIES } from "../../engine/levels";
import type { Save } from "../../engine/progress";
import { icon } from "../assets";
import { MapButton, Prizes } from "../common";
import type { Activity } from "../nav";
import { press } from "../press";
import { localDay } from "../save";

/** Monsters with a page in the book: three ranks of every family, and the lucky one. */
export const BOOK_PAGES = FAMILIES.length * 3 + 1;

const pagesFound = (save: Save) => Object.keys(save.beaten).length;

/** Today's prize for a camp game, until it has been won. */
const wonToday = (save: Save, prize: "practice" | "words") => save.daily.day === localDay() && save.daily[prize];

type CardProps = {
  activity: Activity;
  art: string;
  title: string;
  open: (activity: Activity) => void;
  children?: preact.ComponentChildren;
  lit?: boolean;
};

const Card = ({ activity, art, title, open, children, lit }: CardProps) => (
  <button class={`camp-card ${lit ? "is-lit" : ""}`} data-camp={activity} onClick={press(() => open(activity))}>
    <img src={icon(art)} alt="" />
    <b>{title}</b>
    <small>{children}</small>
  </button>
);

/** The camp: everything there is to do between fights, each a big button. */
export const Hub = ({ save, open }: { save: Save; open: (activity: Activity) => void }) => (
  <div class="camp-hub" data-phase="hub">
    <div class="camp-cards">
      <Card activity="story" art="campfire" title="Story time" open={open} lit={save.stories > 0}>
        {save.stories > 0 ? <Prizes lead={`${save.stories} waiting. Win`} /> : "Win a level for a new story"}
      </Card>
      <Card activity="practice" art="target" title="Target practice" open={open} lit={!wonToday(save, "practice")}>
        {wonToday(save, "practice") ? (
          `Best ${save.practiceBest}`
        ) : (
          <span class="prizes">
            Today's prize
            <img src={icon("potion")} alt="a potion" />
          </span>
        )}
      </Card>
      <Card activity="words" art="quill" title="Word lab" open={open} lit={!wonToday(save, "words")}>
        {wonToday(save, "words") ? (
          "Come back tomorrow for a prize"
        ) : (
          <span class="prizes">
            Today's prize
            <img src={icon("hint")} alt="a hint scroll" />
          </span>
        )}
      </Card>
      <Card activity="book" art="grimoire" title="Monster book" open={open}>
        {pagesFound(save)} of {BOOK_PAGES} found
      </Card>
      <Card activity="gear" art="paw" title="Pets and tiles" open={open}>
        Choose your look
      </Card>
    </div>
    <div class="result-buttons">
      <MapButton />
    </div>
  </div>
);
