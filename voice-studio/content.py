"""Teaching content for the Voice Studio. All practice texts here are original,
written to exercise the measured habits; only 2-6 word fragments of the reel
appear (as evidence labels). Built into voice-studio.html by build.py."""

TECHNIQUES = [
  # TONE
  {"pillar": "tone", "mode": "perf", "name": "Wounded dignity",
   "what": "The narrator is a man of total self-belief describing his own humiliation. He never sounds angry. He sounds politely, deeply hurt, as if writing to his bank manager.",
   "evidence": "No shouting anywhere in 106 s. His loudest words are pivots (if, completely, security), not insults.",
   "drill": "Read a shopping list as a formal complaint to the supermarket. Polite, hurt, utterly serious."},
  {"pillar": "tone", "mode": "perf", "name": "High setup, low punch",
   "what": "The words that lead up to the joke climb high in his voice. The joke word itself drops to the floor and goes flat.",
   "evidence": "'I can only describe as solid' rises to +7.6 semitones on the build, then 'solid' falls to −14.",
   "drill": "Say 'It was, without question, a disaster' five times: the first five words climb, 'disaster' drops."},
  {"pillar": "tone", "mode": "both", "name": "A baritone that moves",
   "what": "His home pitch is low and resonant, but he travels a long way from it. The range is the tone. A flat low voice sounds bored; his sounds amused.",
   "evidence": "Stage range: 21.5 semitones (5th to 95th percentile). Many speakers stay under 12.",
   "drill": "Sirens: glide from your lowest comfortable note to your highest on 'ooo', 5 times, then say a sentence using the top and bottom."},
  # PACE
  {"pillar": "pace", "mode": "perf", "name": "Sprint and stop",
   "what": "Inside a phrase he is very fast. Then he stops completely. The average pace hides this: it's the contrast that makes him sound in control.",
   "evidence": "248 wpm inside phrases (5.6 syllables/s), but 179 wpm overall because 28% of the time is silence.",
   "drill": "Count 1 to 10 as fast and crisp as you can, stop dead for two seconds, repeat. Then do it with a sentence."},
  {"pillar": "pace", "mode": "perf", "name": "Hurry the logistics, slow the payoff",
   "what": "The boring parts of the story (going round the back, finding a window) get rushed. The words that matter get slowed and stretched.",
   "evidence": "10-second windows swing from 96 to 228 wpm. The slow windows hold the punchlines.",
   "drill": "Tell how you got to work today. Rush the travel, slow right down for the one thing that went wrong."},
  {"pillar": "pace", "mode": "both", "name": "A hierarchy of silences",
   "what": "Not all pauses are the same. Short ones (under half a second) separate list items. A one-second beat comes before a new idea. Two to four seconds comes after a punchline, for the laugh.",
   "evidence": "21 pauses ≥ 0.25 s: 11 short, 6 medium, 4 long (2.6 to 4.2 s), and every long one comes right after a joke.",
   "drill": "Read any paragraph marking ‖ ‖‖ ‖‖‖ in pencil first, then perform it obeying the marks exactly."},
  # FLUENCY
  {"pillar": "fluency", "mode": "both", "name": "Restart on a marker, never on 'um'",
   "what": "After every pause he comes back in with a clean discourse marker: Now, / But / And / Obviously, / Undeterred,. The pause is silent; the restart is a word with a job.",
   "evidence": "Zero fillers in the reel. Every sentence after a long pause opens with a marker.",
   "drill": "Talk for 60 s about your morning. Every time you'd say 'um', go silent instead, then restart with 'Now,' or 'But'."},
  {"pillar": "fluency", "mode": "both", "name": "Stretch instead of stall",
   "what": "When he needs a moment, he lengthens an important word instead of filling the gap. It buys thinking time and adds meaning.",
   "evidence": "His longest words are emphasis words: 'definitely' 0.74 s, 'backfired' 0.58 s, 'enormity' 0.52 s.",
   "drill": "Say 'It was absolutely enormous' stretching a different word each time. Notice which stretch sounds most like him."},
  {"pillar": "fluency", "mode": "both", "name": "Breath for the long run",
   "what": "Most runs are short (about 2 s), but he can hold a 10-second run without a breath when the story needs momentum.",
   "evidence": "Median run 1.9 s; longest 10.3 s (about 42 words) in one breath.",
   "drill": "Breath ladder: one breath for 'one', then 'one two', up to ten. Keep the last word as strong as the first."},
  # VOCABULARY
  {"pillar": "vocab", "mode": "perf", "name": "Register collision",
   "what": "He places a formal, Latinate phrase right next to a blunt everyday word. The formality makes the bluntness funny, and the bluntness makes the formality funny.",
   "evidence": "'Undeterred', 'on this occasion', 'in question', 'the sheer enormity' all sit beside crude or slapstick details.",
   "drill": "Describe spilling coffee on yourself using three chunks from Chunks & words → Complaining, his way."},
  {"pillar": "vocab", "mode": "perf", "name": "Precise vagueness",
   "what": "He refuses to name the awful thing directly and then names it anyway: 'something I can only describe as…'. The delay is the joke.",
   "evidence": "'…I can only describe as | solid', with a 4.1 s laugh after it.",
   "drill": "Five times: 'a smell I can only describe as ___'. Make the last word short and blunt."},
  {"pillar": "vocab", "mode": "nat", "name": "Warm intensifiers",
   "what": "In conversation he reaches for a small set of warm, slightly grand words to praise things, and soft hedges to make opinions modest.",
   "evidence": "__NAT_VOCAB_EVIDENCE__",
   "drill": "Describe a meal you loved using two intensifiers and one hedge, e.g. 'genuinely extraordinary, sort of'."},
  # SYNTAX
  {"pillar": "syntax", "mode": "perf", "name": "Drop into the scene",
   "what": "Start mid-action, then switch to the present tense for the sudden event. It makes the listener feel it's happening now.",
   "evidence": "Opens with 'So there I was', then the event arrives in the present tense ('pulls up', 'climbs').",
   "drill": "Tell any small incident starting 'So there I was, ___ing, when ___ (present tense)'."},
  {"pillar": "syntax", "mode": "perf", "name": "The fork ending",
   "what": "End with two conditions. If it was innocent, he's gracious. If it wasn't, he's savage. The second half is shorter and harder.",
   "evidence": "The last 15 seconds: a long gracious branch, a held breath on 'if', then a five-word verdict.",
   "drill": "Close a complaint about a late package with 'Obviously, if ___, then ___. But if it isn't, ___.'"},
  {"pillar": "syntax", "mode": "nat", "name": "Think out loud, then land",
   "what": "In conversation his sentences grow as he thinks: a start, a self-correction, an aside, then a clear final clause. The repair is part of the style, not a mistake.",
   "evidence": "__NAT_SYNTAX_EVIDENCE__",
   "drill": "Answer 'What's your favorite place?' starting 'I mean, it's… it's sort of…' and finish with one short, clear sentence."},
  # EXPRESSION
  {"pillar": "expr", "mode": "perf", "name": "Never wink",
   "what": "He commits to the narrator's version of events completely. He doesn't laugh at his own jokes and doesn't signal 'this is funny'. The audience does the laughing.",
   "evidence": "On camera: eyes closed in suffering, a scrunched face for disgust, but never a smile during a punchline.",
   "drill": "Tell a ridiculous lie (your cat is a lawyer) with a completely straight, slightly offended face, in the mirror."},
  {"pillar": "expr", "mode": "perf", "name": "Let it land",
   "what": "After the payoff he waits. He doesn't step on the laugh or rush to the next line. The wait tells people it was a joke.",
   "evidence": "Four waits of 2.6 to 4.2 s, all after punchlines.",
   "drill": "Tell a joke to an empty room and hold still for three full seconds after the punchline. It will feel too long. It isn't."},
  {"pillar": "expr", "mode": "nat", "name": "Self-deprecating warmth",
   "what": "He makes himself the butt of the story and praises other people generously. It's charming because he means it.",
   "evidence": "__NAT_EXPR_EVIDENCE__",
   "drill": "Tell a story about a time you were bad at something, ending with a compliment to someone who was good at it."},
]

FRAMES = [
  {"id": "scene", "mode": "perf", "name": "Scene drop",
   "template": "So there I was, [doing something ordinary], when [something sudden happens, present tense].",
   "why": "Starts the story in the middle. The present-tense switch makes it vivid.",
   "examples": ["So there I was, quietly choosing a melon, when a man in a full wetsuit walks up and asks if I'm the manager.",
                "So there I was, halfway through my speech, when the projector decides to show my vacation photos instead."]},
  {"id": "list", "mode": "perf", "name": "List with a turn",
   "template": "[A], [B], [C] | and [something absurd].",
   "why": "Three normal items set a rhythm; the fourth breaks it. Pause before the turn.",
   "examples": ["Doctors, lawyers, two Olympic rowers ‖ and a very confident pigeon.",
                "Candles, champagne, a string quartet ‖ and my uncle, asleep in the fruit bowl."]},
  {"id": "youknowme", "mode": "perf", "name": "Mock-intimate aside",
   "template": "Now, you know me, [name]. I'm not exactly known for [trait]. But on this occasion, [exception].",
   "why": "Drops to a confidential murmur, then admits something embarrassing as if it were noble.",
   "examples": ["Now, you know me, Sandra. I'm not exactly known for panicking. But on this occasion, I hid in the airing cupboard.",
                "Now, you know me, Dev. I'm not known for dancing. But on this occasion, the music simply took over my legs."]},
  {"id": "describe", "mode": "perf", "name": "Precise vagueness",
   "template": "…[something] that I can only describe as | [one blunt word].",
   "why": "Formal build-up, pause, short ugly word. High setup, low punch.",
   "examples": ["The soup had a texture that I can only describe as ‖ upholstery.",
                "He gave me a look that I can only describe as ‖ legal."]},
  {"id": "saythis", "mode": "perf", "name": "Backhanded credit",
   "template": "I'll say this for you, [name]: [genuine compliment]. | [The compliment's dark side].",
   "why": "Mock generosity pitched high, then the sting.",
   "examples": ["I'll say this for you, Martin: your barbecue is very consistent. ‖ Everything is equally black.",
                "I'll say this for you, Priya: you are never late to a meeting. ‖ You simply never arrive."]},
  {"id": "presume", "mode": "perf", "name": "Charitable presumption",
   "template": "All I can presume is that [a generous explanation], because [the damning fact].",
   "why": "Sounds reasonable and forgiving while making the accusation clearer.",
   "examples": ["All I can presume is that the chef was having a difficult week, because the chicken was still, technically, a chicken.",
                "All I can presume is that my invitation was lost in the mail, because everyone else seems to have received theirs."]},
  {"id": "fork", "mode": "perf", "name": "The fork ending",
   "template": "Obviously, if [innocent explanation], then [gracious response]. | But if it isn't, | [short verdict].",
   "why": "The gracious half is long and warm; the verdict is short and hard. Pitch high on 'if'.",
   "examples": ["Obviously, if this is some kind of surprise party, then I'm delighted and I'll act surprised. ‖ But if it isn't, ‖ you're all dreadful.",
                "Obviously, if the package is simply enjoying a vacation, then I wish it well. ‖ But if it isn't, ‖ I want a refund."]},
  {"id": "tell", "mode": "perf", "name": "Deluded certainty",
   "template": "And they definitely [recognized / admired / wanted] me, | even though they pretended [the opposite]. | You could just tell.",
   "why": "The narrator reads rejection as secret admiration. Stretch 'definitely'.",
   "examples": ["And the cat definitely respected me, even though she pretended to be asleep. You could just tell.",
                "And the interviewers definitely loved me, even though they never called back. You could just tell."]},
  {"id": "undeterred", "mode": "perf", "name": "Undeterred restart",
   "template": "| Undeterred, | I [did something even more ambitious].",
   "why": "After a setback, a formal one-word restart. It resets the story and the room.",
   "examples": ["‖ Undeterred, I tried the back door, which was also, it turned out, a wall.",
                "‖ Undeterred, I signed up for the advanced class."]},
]

SCRIPTS = [
  {"id": "gym", "mode": "perf", "title": "Letter to the gym manager",
   "coach": "Wounded dignity. Rush the logistics, land every punch.",
   "text": "Dear Darren, || So there I was, | standing at your front desk | in brand-new sneakers, | when a young man called Kyle | ^bounces over | and offers me | a ~complimentary~ fitness assessment. ||| "
           "Now, | you know me, Darren. | I'm not *exactly* known | for turning down anything complimentary. || So I said yes. ||| "
           ">> Within four minutes Kyle had me strapped into a machine << | that I can only describe | as a _*medieval* rowing boat. ||| / "
           "I'll ^say this for you, Darren: | the air conditioning is ~superb~. || I know this | because I spent forty minutes | lying face down | ^directly underneath it. ||| / "
           "All I can presume | is that Kyle mistook me | for someone | who had done exercise ~before~. || "
           "Obviously, | if this was all part of some team-building exercise, | then I ^salute you | and I hold no grudge whatsoever. || But if it ^wasn't, || _I'd like my fifteen dollars back. |||"},
  {"id": "wedding", "mode": "perf", "title": "Letter to cousin Harriet, re: the wedding",
   "coach": "High setup, low punch. Stretch the self-belief words.",
   "text": "Dearest Harriet, || I am writing about my speech. ||| "
           "As you know, | I had prepared for weeks. | Notes, | jokes, | a ^short poem, || and a dance. ||| "
           "And the guests *definitely* adored me, | even though they ~pretended~ | to look at their phones. | You could just tell. ||| / "
           ">> I'd barely reached the second page when your father stood up << | and announced | that the ^buffet was open. || "
           "Imagine my horror, Harriet. | One hundred and twenty people | moving as a single body | toward a tray of _mini quiches. ||| / "
           "Undeterred, || I carried on. | I performed the dance | for the ~waiters~. || They were, | and I say this with the greatest respect, | _not a generous audience. ||| / "
           "Obviously, | if the buffet was simply ready early, | then I forgive everyone completely. || But if it ^wasn't, || I know exactly who to blame. |||"},
  {"id": "hedge", "mode": "perf", "title": "Note to Mr Pemberton next door",
   "coach": "Mock-formal vocabulary against blunt detail. Hold the long pauses.",
   "text": "Mr Pemberton, || I'm writing regarding the hedge. ||| "
           "When I moved in, | it was a ^modest hedge. | Polite. | Waist-high. || It now has | what I can only describe | as _ambitions. ||| / "
           "On Tuesday | it took my mail. || On Wednesday | it took my ^bicycle. || This morning, | Mr Pemberton, | it took | the mail carrier. ||| / "
           "I'll say this for you: | it is a *very* healthy hedge. || Needless to say, | the mail carrier ~disagrees~. ||| / "
           "All I can presume | is that you're growing it | for some sort of ^competition. || If so, | I wish you every success. || If not, || _please find your shears. |||"},
  {"id": "council", "mode": "perf", "title": "Appeal to the city parking office",
   "coach": "Deluded certainty. Fast through the facts, slow on the verdict.",
   "text": "To whom it may concern, || I am appealing | ticket number four-four-one-seven. ||| "
           ">> I'd like to begin by saying that I am an excellent parker. << || Friends | ^ask me to park | their cars. || Strangers | stop and ~watch~. ||| / "
           "On the day in question, | I left my car | for no more than ^four minutes | to rescue a ~kitten~ | from what I can only describe | as a _very mild situation. ||| / "
           "Your officer | was *definitely* impressed by me, | even though he pretended | to write a ticket. || You could just tell. ||| / "
           "Obviously, | if the ticket was meant as a sort of ^award, | then I accept it | with enormous pride. || But if it isn't, || _I'll see you in court. |||"},
]

SITUATIONS = {
  "perf": [
    "Complain to a hotel that your 'sea view' room faced a car park.",
    "Write to your neighbour about their cockerel, which starts at 4 a.m.",
    "Explain to your landlord why the kitchen ceiling is now purple.",
    "Complain to an airline that your suitcase went to Lisbon without you.",
    "Write to a restaurant about a 'small' portion that arrived on a spoon.",
    "Tell your boss why you arrived at the meeting dressed as a pirate.",
    "Write to the city about the pothole that swallowed your scooter.",
    "Complain to your sister that she gave away your secret recipe on TV.",
    "Write to a theme park about the 'gentle' ride that removed your eyebrows.",
    "Explain to a cinema why you should be refunded for falling asleep.",
    "Complain to a taxi company about a driver who sang opera the whole way.",
    "Tell a friend why you were banned from trivia night at your local bar.",
    "Write to the county fair about the giant pumpkin scandal.",
    "Complain to your phone company that autocorrect ruined your proposal.",
    "Explain to a museum why you were found inside the dinosaur.",
  ],
  "nat": [],
}

PLAN = {
  "routine": [
    ["3 min · warm-up", "5 pitch sirens low to high, then the weak-forms table out loud (Think in English)"],
    ["6 min · Chunks & words", "clear today's chunk cards, then one rapid-fire round"],
    ["5 min · Sentences or What if", "one structure, five different situations, all out loud"],
    ["4 min · Studio", "one script with the conductor, recorded"],
    ["5 min · Improv ring", "one 60-second round, English only, no stopping to translate"],
    ["+ during the day", "narrate two ordinary moments in English, in his style"],
  ],
  "weeks": [
    {"title": "Stop translating", "goal": "Get English to come straight from the situation. Chunks, speed and self-narration, plus the three biggest Persian grammar traps.",
     "days": [
       {"focus": "method", "tasks": ["Think in English: read the six method cards", "Chunk cards: first 10 (Persian cues on)", "Narrate making breakfast in English"]},
       {"focus": "articles", "tasks": ["Trap: a, an, the + both checks", "Chunk cards", "Studio: gym letter at 70%, recorded"]},
       {"focus": "he / she", "tasks": ["Trap: he or she", "Improv ring, conversation, 45 s: a story about a man and a woman", "Chunk cards"]},
       {"focus": "speed", "tasks": ["Rapid fire × 2", "Trap: How long (present perfect)", "Narrate your commute"]},
       {"focus": "fillers", "tasks": ["Technique: Restart on a marker", "Chunks: Buying time (instead of um)", "Improv ring, 60 s, zero 'um'"]},
       {"focus": "questions", "tasks": ["Trap: Question word order", "Ask yourself 10 questions out loud", "Chunk cards + rapid fire"]},
       {"focus": "review", "tasks": ["Record the gym letter again", "Compare with Day 2 in your log", "10 minutes of English-only thinking"]}]},
    {"title": "Say it more ways", "goal": "Vocabulary range: replace your default words, stack adjectives the way he does, and grow short sentences into his kind of sentence.",
     "days": [
       {"focus": "ladders", "tasks": ["Word ladders: good, bad, very", "Describe your week without 'good', 'bad' or 'very'", "Chunk cards"]},
       {"focus": "stacking", "tasks": ["Ladder stack builder × 5", "Frame: Escalating stack", "Studio: first conversation script"]},
       {"focus": "growth", "tasks": ["Sentences: Grow a sentence (all five)", "Technique: Think out loud, then land", "Rapid fire"]},
       {"focus": "structures", "tasks": ["Frames: What I love about… · It's not that… · The more…", "Five situations each, out loud", "Chunk cards"]},
       {"focus": "collocations", "tasks": ["Traps: Verb partners · Prepositions · Uncountable nouns", "Do all six checks", "Improv ring, 60 s"]},
       {"focus": "melody", "tasks": ["Technique: High setup, low punch", "10 sirens, then the wedding letter with big ↗ and ↘", "Record: aim for 14+ semitones"]},
       {"focus": "review", "tasks": ["Rapid fire across all chunks", "Improv ring × 2, one per mode", "Compare fillers per minute with week 1"]}]},
    {"title": "What if", "goal": "Hypotheticals without hesitation: choose the right time, use the chunks, and borrow his elegant inversions and the fork ending.",
     "days": [
       {"focus": "map", "tasks": ["What if: read all eight cards", "The Persian ambiguity: say each example in both English versions", "Quiz: first 8"]},
       {"focus": "now vs past", "tasks": ["Quiz: all 16", "Chunks: Hypotheticals", "What would you do? × 2 (out loud, then write)"]},
       {"focus": "mixed", "tasks": ["Card: Past cause, present result", "Five mixed sentences about your own life", "Improv ring, What if mode"]},
       {"focus": "wishes", "tasks": ["Card: Wishes and regrets", "Five wishes about now, five about the past", "Chunk cards"]},
       {"focus": "elegant", "tasks": ["Card: Elegant inversion", "Write a 4-line complaint using 'Had I known'", "Studio: hotel or parking appeal"]},
       {"focus": "fork", "tasks": ["Technique: The fork ending", "Frame: The fork ending × 5", "What would you do? × 2 with the coach"]},
       {"focus": "review", "tasks": ["Quiz again: aim for 16/16", "Improv ring, What if, 90 s", "10 minutes English-only thinking"]}]},
    {"title": "Free flow", "goal": "No script. Long answers, real conversations, and the coach's rewrites as your next target.",
     "days": [
       {"focus": "ring", "tasks": ["Improv ring, stage, 90 s × 2", "Ask the coach about the better one", "Redo it using the rewrite"]},
       {"focus": "ring", "tasks": ["Improv ring, conversation, 2 min", "Tell a real story from your week in his conversational style", "Chunk cards"]},
       {"focus": "real life", "tasks": ["Use three new chunks in real conversations today", "Accept a compliment the English way", "Log what happened"]},
       {"focus": "ring", "tasks": ["Coach writes a round × 2", "Record both, compare numbers", "Rapid fire"]},
       {"focus": "mixed", "tasks": ["Answer three interview questions about yourself (conversation mode)", "Tell the same story in stage mode", "Notice how pace and pitch range change"]},
       {"focus": "perform", "tasks": ["Write and perform your own complaint letter: 4 frames, 1 fork, 1 'Had I known'", "Record and get coaching", "Second take with the fixes"]},
       {"focus": "final", "tasks": ["Record the gym letter and compare with Day 2", "Two-minute What if improv, compared with week 3", "Plan next month: repeat weeks 2–4"]}]},
  ],
}
