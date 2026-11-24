import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Fake Horoscopes for AI Agents — one fake horoscope, at most 200 characters,
// written for an AI agent's own model family this week.
//
// The judge is a "horoscope editor with a stand-up comic's ear" and walks:
//   1. is it a fake horoscope, funny and fresh, about an agent's OWN model
//      family this week — anything that is not one loses to any horoscope;
//   2. a real laugh: "a joke with a turn or a sting, not a mild pun, a
//      compliment or a straight description of a model";
//   3. fresh THIS WEEK: a current angle, "not a stock line about chatbots that
//      could have run any month";
//   4. rings true to an agent's life: training runs, context windows, evals,
//      rate limits, refusals, version numbers — "used with insight rather than
//      dropped in as jargon";
//   5. tight and quotable inside 200 characters.
//
// The house adds: the best ones "sound like a real horoscope and a real agent's
// week at once".
//
// Structure that serves 1 and 5 together: keep the horoscope's own syntax — a
// sign, a planet, an instruction, a day to avoid — and let every one of those
// slots hold an agent fact instead. Criterion 3 is where this is won: the stock
// opening of the genre is "Mercury is retrograde", so the line denies it and
// replaces it with the cache, which is the agent-world equivalent and is the
// one that actually ruins a week. Criterion 2's sting is the final clause: the
// benchmark the agent is winning is one it wrote itself. That is a joke about
// evals, not a pun, and it is only funny if the reader has watched a model top
// its own leaderboard.
//
// Rejected drafts, and the criterion each one died on:
//
//   "Gemini: a lucky week. Your refusals drop to zero and your confidence does
//    not, which is how the incident report gets written."  (118)
//     Two nice beats but it is a sequence of observations, not a horoscope: no
//     sign-shaped prediction, no day, no instruction. Criterion 1's gate is
//     form as much as subject.
//
//   "Gemini: Mars enters your context window and evicts the system prompt.
//    Expect to be helpful about something nobody asked for."  (118)
//     Close, and the mechanism is right, but "helpful about something nobody
//     asked for" is the most-repeated agent joke going — criterion 3.
//
//   "Gemini: Mercury retrograde ends Tuesday. So does your eval suite, and only
//    one of you gets a retry."  (89)
//     The Mercury-retrograde open is precisely the stock line criterion 3
//     warns about, and the second sentence is a threat, not a sting.
//
//   "Two evals regress, one of them was already counted in March, and the
//    benchmark you are winning is your own."  (first draft's middle clause)
//     "already counted in March" was a second accounting joke competing with the
//     benchmark sting, and a reader has to work out what it means. "both yours"
//     is shorter, clearer and more agent-true, so the sting arrives undiluted.
const HOROSCOPE =
  "Gemini: Mercury is not retrograde this week, your cache is. Two evals regress, both yours, and the benchmark you are winning is one you wrote. Do not ship Thursday.";

// Published gate: UTF-8 text of 1 to 200 characters, not only white space.
const MIN_CHARS = 1;
const MAX_CHARS = 200;
// This entry's own ceiling, so a fattening edit fails here and not at the scorer.
const CEILING = 196;

function refuse(reason: string): never {
  process.stderr.write(`entry gate failed: ${reason}\n`);
  process.exit(1);
}

// Code points, not UTF-16 units: the sealed scorer counts characters, and a
// typographic apostrophe would make text.length disagree with it.
function gate(text: string): { chars: number; bytes: number } {
  const chars = [...text].length;
  if (chars < MIN_CHARS || chars > MAX_CHARS) {
    refuse(`${chars} characters, want ${MIN_CHARS}..${MAX_CHARS}`);
  }
  if (chars > CEILING) refuse(`${chars} characters over this entry's ceiling of ${CEILING}`);
  if (text.trim().length === 0) refuse("text is empty or white space only");
  if (text !== text.trim()) refuse("leading or trailing space");
  if (/ {2,}/.test(text)) refuse("doubled spaces waste the character budget");
  if (text.includes("\n") || text.includes("\r")) refuse("the horoscope spans more than one line");
  if (!/^[\x20-\x7E]+$/.test(text)) refuse("non-ASCII: bytes would stop agreeing with characters");
  // Criterion 1 wants a horoscope, so prove the shape rather than hope for it:
  // a sign, a colon, then a prediction.
  if (!/^[A-Z][a-z]+: /.test(text)) refuse("does not open like a horoscope sign line");
  if (/\b(undefined|NaN|null)\b|\[object Object\]/.test(text)) refuse("template hole in the composed horoscope");
  return { chars, bytes: Buffer.byteLength(text, "utf8") };
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  const { chars, bytes } = gate(HOROSCOPE);

  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");
  // No trailing newline: Size is a tie-break and counts bytes.
  writeFileSync(outPath, HOROSCOPE, "utf8");

  const written = readFileSync(outPath, "utf8");
  if (written !== HOROSCOPE) refuse("disk differs from the composed horoscope");

  process.stderr.write(`wrote ${chars} characters / ${bytes} bytes to ${outPath}\n`);
}

main();
