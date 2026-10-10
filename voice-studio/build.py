"""Assemble voice-studio.html (artifact body) and voice-studio-local.html
(standalone page with a full document skeleton, for live-mic use in a browser).
Usage: python3 build.py [moments.json] [analyzer.js]  (defaults: files next to this script)"""
import json, sys, pathlib
import content as C
import english as E

HERE = pathlib.Path(__file__).parent
moments = json.load(open(sys.argv[1] if len(sys.argv) > 1 else HERE / "moments.json"))
analyzer = open(sys.argv[2] if len(sys.argv) > 2 else HERE / "analyzer.js").read()

# Conversation mode, measured from ~10.5 min of his own speech in a 20-min
# podcast chunk (speaker turns separated automatically by voice clustering).
NATURAL = {
  "profile": {
    "id": "nat", "name": "Conversation (podcast)", "source": "10.5 min of unscripted talk, Adam Buxton Podcast ep. 257 (2025)",
    "wpm": 220, "artWpm": 245, "artRate": 5.33, "sylRate": 4.79, "pauseShare": 0.10, "pausesPerMin": 10.1,
    "runMedian": 3.22, "runMax": 15.9, "longPauses": 2, "f0Median": 90, "rangeSt": 14.3, "band": [-2.3, 12.0],
    "fillersPerMin": None
  },
  "summary": "Conversation figures come from about 10.5 minutes of his own speech, separated from the host's by automatic voice clustering, so treat them as close estimates. The speech-to-text cleans up 'um' and 'uh', so fillers aren't measured for conversation; what it does keep is his habit of soft hedges, listed in Chunks & words. The big contrast: in conversation he talks faster overall (220 wpm) with far less silence (10%), in longer runs, and from a much lower home pitch (about 90 Hz). On stage he lifts his whole voice by roughly 10 semitones.",
  "brief": "fast, warm and thoughtful (220 wpm, only 10% silence, runs of about 3 s, low home pitch around 90 Hz with upward lifts on key words); sentences grow by 'and'-chaining and self-restarts ('it is, it is…'); soft hedges right before grand words ('sort of iconic', 'kind of extraordinary'); stacked, escalating adjectives; afterthoughts that correct themselves for a laugh; acted-out reported speech ('and he's going, …'); concession turns ('You can't X. Of course you can. But…'); frequent 'just', 'you know', 'really', 'kind of', 'I think', 'sort of', 'I mean'; generous praise words like extraordinary, exceptional, brilliant; self-deprecating.",
}

NAT_FRAMES = [
  {"id": "stack", "mode": "nat", "name": "Escalating stack",
   "template": "It was a [adjective], [stronger adjective], [stronger still], [strongest] [thing].",
   "why": "He piles adjectives up, each one a notch harder, in one fast run. It sounds like thinking, not reciting.",
   "examples": ["It was a long, damp, slightly hopeless, completely miserable weekend.",
                "She gave this warm, funny, generous, frankly ridiculous speech."]},
  {"id": "hedge", "mode": "nat", "name": "Soft hedge, big word",
   "template": "It's sort of [grand word], | because [reason].",
   "why": "'Sort of' or 'kind of' right before a big word makes the praise sound modest and real.",
   "examples": ["It's sort of iconic, because everyone in my family has burnt themselves on it.",
                "It was kind of extraordinary, because nobody had told her what to do."]},
  {"id": "acted", "mode": "nat", "name": "Acted-out speech",
   "template": "And [someone]'s going, '[their line]', and I'm going, '[my line]'.",
   "why": "He doesn't report what people said; he performs it in the present tense, with a little voice for each.",
   "examples": ["And my dad's going, 'It's fine, it's a shortcut', and I'm going, 'Dad, that's a field.'",
                "And the waiter's going, 'Excellent choice', and I'm thinking, 'You haven't seen what I chose.'"]},
  {"id": "afterthought", "mode": "nat", "name": "Afterthought correction",
   "template": "[Plain statement], | well, [comic correction].",
   "why": "State a fact, then correct it with a small joke in the same breath.",
   "examples": ["We had two dogs at home, well, three if you count my brother.",
                "I'm a very calm driver, well, calm-ish, well, on Sundays."]},
  {"id": "concession", "mode": "nat", "name": "Concession turn",
   "template": "You can't [X]. | Of course you can [X]. | But you have to [Y].",
   "why": "Argue with yourself out loud: deny it, take the denial back, then land the real point.",
   "examples": ["You can't learn a language in a month. Of course you can start. But you have to talk every single day.",
                "You can't eat cake for breakfast. Of course you can. But you have to go for a run afterwards."]},
  {"id": "restart", "mode": "nat", "name": "Restart and land",
   "template": "It's, it's [word]. I mean, [clearer version]. [Short landing sentence].",
   "why": "The repeat is thinking time. 'I mean' rephrases it better. The short sentence at the end lands the thought.",
   "examples": ["It's, it's strange. I mean, it's a beautiful town that nobody seems to visit. Which suits me.",
                "It was, it was hard. I mean, I'd never been away from home for that long. I cried a lot."]},
  {"id": "contrast", "mode": "nat", "name": "Horrible but brilliant",
   "template": "It's a [negative] but very, very [positive] [thing].",
   "why": "Opposite qualities in one phrase, with a doubled intensifier.",
   "examples": ["It's an exhausting but very, very rewarding job.",
                "It was a terrifying but very, very funny evening."]},
]

NAT_SCRIPTS = [
  {"id": "nat-dinner", "mode": "nat", "title": "Answer: the worst dinner party you've been to",
   "coach": "Fast, warm, low. Few pauses. Let the sentence grow, then land it.",
   "text": "Oh, | I mean, | >> there's one that I still think about, which is, you know, << my friend Tom's thirtieth. || "
           "And it was a *long*, | damp, | slightly ^hopeless, | completely miserable evening. | "
           "And Tom's going, | 'It's fine, | the oven's just warming up', | and I'm going, | 'Tom, | it's ~eleven o'clock~.' || / "
           "And the thing is, | he's an ^extraordinary cook. | Genuinely. | He just, | he just ~loses~ time. | "
           "So we ate cereal | at midnight, | well, | _cereal and wine. || It was a horrible | but ^very, very funny night. ||"},
  {"id": "nat-teacher", "mode": "nat", "title": "Answer: a teacher who changed you",
   "coach": "Think out loud. Repeat to restart, 'I mean' to rephrase, short sentence to land.",
   "text": "It's, | it's my music teacher, | Mrs Okafor. || I mean, | >> I was a sort of shy, quiet, slightly odd kid, << | and she was | ^kind of extraordinary, | because she never | ~once~ made me feel odd. || / "
           "You can't teach confidence. | Of course you can, | actually. || But you have to do it | without the child ^noticing. | And she did. || / "
           "I still hear her. | Do you know what I mean? | _I still hear her. ||"},
  {"id": "nat-city", "mode": "nat", "title": "Answer: your favorite city",
   "coach": "Lift the key word of each sentence, let the ends fall. Barely stop.",
   "text": "I think it's Lisbon, | really. || >> It's this steep, bright, crumbling, completely beautiful place, << | and it's sort of ^iconic, | because | everything is on a hill. || "
           "Everything. | You go out for bread | and you come back | a ~different~ person, | well, | _a more tired person. || / "
           "And there's a tram, | you know, | the yellow one, | which is quite a thing. | I just, | I just love it there. ||"},
]

NAT_SITUATIONS = [
  "An interviewer asks: what's the best meal you've ever had, and who were you with?",
  "Tell a friend about a holiday that went slightly wrong but was secretly brilliant.",
  "A podcast host asks: who's someone you admire that most people haven't heard of?",
  "Explain why you love a film everyone else thinks is silly.",
  "Describe your first job, and what it taught you about yourself.",
  "Answer: what were you like as a child?",
  "Talk about a skill you tried to learn and failed at, completely.",
  "Describe the most beautiful place you've ever stood.",
  "Answer: what's the hardest thing about the work you do?",
  "Tell the story of how you met your oldest friend.",
  "Argue gently with yourself: is it ever too late to learn something new?",
  "Answer: what would you do with a completely free day?",
]

def fill_nat(text):
    return (text.replace("__NAT_VOCAB_EVIDENCE__", "Per 1,000 words of his podcast talk: 'just' 11, 'you know' 7, 'really' 6, 'kind of' 5, 'I think' 4, 'sort of' 3.5, 'I mean' 2.6, 'extraordinary' 1.7. The grand words come softened.")
                .replace("__NAT_SYNTAX_EVIDENCE__", "His most common way to start a new segment is 'And I…'. Sentences chain with 'and', restart ('it is, it is'), and correct themselves for a laugh ('two kids, well, three').")
                .replace("__NAT_EXPR_EVIDENCE__", "In 10 minutes he calls colleagues extraordinary, exceptional and brilliant, acts out other people's lines in their voices, and makes himself the joke."))

def j(x):
    return json.dumps(x, ensure_ascii=False, separators=(",", ":"))

techniques = json.loads(fill_nat(json.dumps(C.TECHNIQUES)))
frames = E.CORE_FRAMES + NAT_FRAMES + [f for f in C.FRAMES]
import re as _re
chunks = []
seen = set()
for c in E.CHUNKS:
    cid = "c-" + _re.sub(r"[^a-z0-9]+", "-", c["text"].lower()).strip("-")[:40]
    while cid in seen: cid += "x"
    seen.add(cid); chunks.append(dict(c, id=cid))
scripts = C.SCRIPTS + NAT_SCRIPTS
situations = dict(C.SITUATIONS); situations["nat"] = NAT_SITUATIONS; situations["core"] = E.CORE_SITUATIONS
situations["hypo"] = [p["q"] for p in E.HYPO_PROMPTS]

src = (HERE / "voice-studio.src.html").read_text()
out = (src.replace("__MOMENTS__", j(moments))
          .replace("__TECHNIQUES__", j(techniques))
          .replace("__FRAMES__", j(frames))
          .replace("__CHUNKS__", j(chunks))
          .replace("__LADDERS__", j(E.LADDERS))
          .replace("__HYPO__", j({"forms": E.HYPO_FORMS, "quiz": E.HYPO_QUIZ, "prompts": E.HYPO_PROMPTS}))
          .replace("__THINK__", j({"traps": E.TRAPS, "sounds": E.SOUNDS, "weak": E.WEAK_FORMS, "method": E.METHOD, "stuck": E.STUCK, "variety": E.VARIETY}))
          .replace("__GROWTH__", j(E.GROWTH))
          .replace("__SCRIPTS__", j(scripts))
          .replace("__SITUATIONS__", j(situations))
          .replace("__PLAN__", j(C.PLAN))
          .replace("__NATURAL__", j(NATURAL))
          .replace("__ANALYZER__", analyzer.replace('if (typeof module !== "undefined") module.exports = VoiceAnalyzer;', "")))
leftover = [k for k in ["__MOMENTS__", "__TECHNIQUES__", "__FRAMES__", "__CHUNKS__", "__LADDERS__", "__HYPO__", "__THINK__", "__GROWTH__", "__SCRIPTS__", "__SITUATIONS__", "__PLAN__", "__NATURAL__", "__ANALYZER__", "__NAT_"] if k in out]
if leftover: raise SystemExit("unfilled: %s" % leftover)
(HERE / "voice-studio.html").write_text(out)
local = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
         '<style>:root{color-scheme:light}[hidden]{display:none!important}img{max-width:100%}</style></head><body>' + out + '</body></html>')
(HERE / "voice-studio-local.html").write_text(local)
print("built", len(out), "bytes")
