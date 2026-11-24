import { useState } from "preact/hooks";
import { recordWords } from "../../engine/progress";
import { wordQuiz, WORD_ROUNDS, type WordAnswer, type WordQuestion } from "../../engine/words";
import { icon } from "../assets";
import { CampButton, Pips } from "../common";
import { playSfx } from "../audio";
import { petFeels } from "../petMood";
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
const answerMark = (picked: string | null, option: string, answer: string) => {
  if (!picked) return "";
  if (option === answer) return "is-right";
  return picked === option ? "is-wrong" : "";
};

/** The question in words, for each way a part can be asked. */
const Ask = ({ question }: { question: WordQuestion }) => {
  if (question.kind === "part") {
    return (
      <p class="words-ask words-ask-big">
        Which word part means <b>{question.part.meaning}</b>?
      </p>
    );
  }
  return (
    <p class="words-ask">
      What does <b>{question.part.part}</b> mean{question.kind === "word" ? " in this word" : ""}?
    </p>
  );
};

/** Spot the part words share and say what it means, or pick the part for a meaning. */
export const Words = ({ back }: { back: () => void }) => {
  const [quiz, setQuiz] = useState(() => wordQuiz(randomSeed(), save.value.wordLab));
  const [answers, setAnswers] = useState<WordAnswer[]>([]);
  const [round, setRound] = useState(0);
  const [right, setRight] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [prize, setPrize] = useState(false);
  const question = quiz[round];

  const finish = (given: WordAnswer[]) => {
    const before = save.value.scrolls;
    updateSave((current) => recordWords(current, given, localDay()));
    setPrize(save.value.scrolls > before);
    playSfx("jingle_victory");
    petFeels("dance", 1900);
  };

  const answer = (option: string) => {
    if (!question || picked) return;
    const correct = option === question.answer;
    const given = [...answers, { part: question.part.part, right: correct }];
    if (correct) petFeels("cheer", 700);
    playSfx(correct ? "reward" : "miss");
    setPicked(option);
    setRight(right + (correct ? 1 : 0));
    setAnswers(given);
    setTimeout(() => {
      setPicked(null);
      setRound(round + 1);
      if (round + 1 >= quiz.length) finish(given);
    }, NEXT_AFTER_MS);
  };

  const again = () => {
    setQuiz(wordQuiz(randomSeed(), save.value.wordLab));
    setRound(0);
    setRight(0);
    setAnswers([]);
  };

  if (!question) return <Finished right={right} prize={prize} again={again} back={back} />;
  return (
    <div class="camp-sheet" data-phase="words" data-round={round} data-kind={question.kind}>
      <div class="words-top">
        <h1>Word lab</h1>
        <Pips count={quiz.length} now={round} />
      </div>
      {question.examples.length > 0 && (
        <p class="words-examples">
          {question.examples.map((word) => (
            <Example word={word} />
          ))}
        </p>
      )}
      <Ask question={question} />
      <div class="answers words-answers">
        {question.options.map((option) => (
          <button
            class={`btn answer ${answerMark(picked, option, question.answer)}`}
            data-answer={option === question.answer ? "correct" : "other"}
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
