import { useState } from "preact/hooks";
import { recordWords } from "../../engine/progress";
import { wordQuiz, WORD_ROUNDS } from "../../engine/words";
import { icon } from "../assets";
import { CampButton, Pips } from "../common";
import { playSfx } from "../audio";
import { press } from "../press";
import { localDay, save, updateSave } from "../save";
import { randomSeed } from "../seed";

const NEXT_AFTER_MS = 1100;

/** A word with its shared part in capitals, drawn with that part picked out. */
const Example = ({ word }: { word: string }) => (
  <span class="word">
    {word.split(/([A-Z]{2,})/).map((piece) => (/^[A-Z]{2,}$/.test(piece) ? <b>{piece.toLowerCase()}</b> : piece))}
  </span>
);

const Finished = ({
  right,
  prize,
  again,
  back,
}: {
  right: number;
  prize: boolean;
  again: () => void;
  back: () => void;
}) => (
  <div class="camp-sheet camp-sheet-small" data-phase="words-done">
    <h1>{right === WORD_ROUNDS ? "Word wizard!" : "Nice reading!"}</h1>
    <p>
      You got {right} of {WORD_ROUNDS} right
    </p>
    {prize && (
      <span class="prizes" data-prizes>
        Today's prize: +1
        <img src={icon("hint")} alt="hint scroll" />
      </span>
    )}
    <div class="result-buttons">
      <CampButton back={back} />
      <button class="btn btn-wide btn-go" data-action="retry" onClick={press(again)}>
        Again
      </button>
    </div>
  </div>
);

/** Once an answer is picked the right one lights up, and the picked one too if it was wrong. */
const answerMark = (picked: string | null, option: string, meaning: string) => {
  if (!picked) return "";
  if (option === meaning) return "is-right";
  return picked === option ? "is-wrong" : "";
};

/** Spot the part three words share, and say what it means. */
export const Words = ({ back }: { back: () => void }) => {
  const [quiz, setQuiz] = useState(() => wordQuiz(randomSeed()));
  const [round, setRound] = useState(0);
  const [right, setRight] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [prize, setPrize] = useState(false);
  const question = quiz[round];

  const finish = (total: number) => {
    const before = save.value.scrolls;
    updateSave((current) => recordWords(current, total, localDay()));
    setPrize(save.value.scrolls > before);
    playSfx("jingle_victory");
  };

  const answer = (option: string) => {
    if (!question || picked) return;
    const correct = option === question.part.meaning;
    const total = right + (correct ? 1 : 0);
    playSfx(correct ? "reward" : "miss");
    setPicked(option);
    setRight(total);
    setTimeout(() => {
      setPicked(null);
      setRound(round + 1);
      if (round + 1 >= quiz.length) finish(total);
    }, NEXT_AFTER_MS);
  };

  const again = () => {
    setQuiz(wordQuiz(randomSeed()));
    setRound(0);
    setRight(0);
  };

  if (!question) return <Finished right={right} prize={prize} again={again} back={back} />;
  return (
    <div class="camp-sheet" data-phase="words" data-round={round}>
      <div class="words-top">
        <h1>Word lab</h1>
        <Pips count={quiz.length} now={round} />
      </div>
      <p class="words-examples">
        {question.part.examples.map((word) => (
          <Example word={word} />
        ))}
      </p>
      <p class="words-ask">
        What does <b>{question.part.part}</b> mean?
      </p>
      <div class="answers words-answers">
        {question.options.map((option) => (
          <button
            class={`btn answer ${answerMark(picked, option, question.part.meaning)}`}
            data-answer={option === question.part.meaning ? "correct" : "other"}
            onClick={() => answer(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <button class="btn answer-back words-back" data-action="camp" onClick={press(back)}>
        Camp
      </button>
    </div>
  );
};
