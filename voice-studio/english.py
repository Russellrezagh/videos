"""English-fluency content for a native Persian (Farsi) speaker living in the US.
Target variety: neutral English (US spelling, everyday words that work in both
the US and the UK, no heavy slang), delivered with Cumberbatch's rhythm, melody
and sentence craft. All examples are original.

Domain:
  Chunk        a ready-made phrase tied to a situation (fn); optional Persian cue
               (fa/tr) that fades out as the card climbs its boxes
  Ladder       a base word and richer alternatives by intensity and register
  HypoForm     one hypothetical shape: when it applies, its form, the Persian trap
  HypoQuiz     situation -> pick the right hypothetical (instant feedback)
  HypoPrompt   open "what would you do" question with a model answer in his style
  Trap         a Persian-to-English interference pattern with two self-checks
  Sound        a pronunciation trap for Persian speakers, with a drill
  Growth       a kernel sentence grown step by step the way he builds sentences
"""

ZW = "‌"  # zero-width non-joiner used inside Persian words (e.g. می‌)

def C(fn, text, use, ex, meaning="", fa=None, tr=None, reg="neutral", mode="both", note=None, his=False):
    d = {"fn": fn, "text": text, "use": use, "example": ex, "meaning": meaning or use, "reg": reg, "mode": mode}
    if fa: d["fa"], d["tr"] = fa, tr
    if note: d["note"] = note
    if his: d["his"] = True
    return d

R, S, O, D, H, B, L, T, A, M, P, Q, Y = ("Reacting", "Telling a story", "Giving an opinion", "Disagreeing politely",
    "Softening (his habit)", "Buying time (instead of um)", "Linking ideas", "Thanks and kindness",
    "Sorry and no problem", "Small talk", "Complaining, his way", "Praising, his way", "Hypotheticals")

CHUNKS = [
  # Reacting
  C(R, "No way! / You're kidding.", "A friend tells you news you can hardly believe.", "She quit her job to become a pilot? No way!", "I can't believe it", "نه بابا!", "na baba!", "casual"),
  C(R, "Oh no, that's awful.", "Someone tells you something bad happened to them.", "Your car got towed on your birthday? Oh no, that's awful.", "sympathy", "چه بد!", "che bad!"),
  C(R, "That's fantastic!", "Someone shares good news, like a new job.", "You got the job? That's fantastic! Congratulations.", "big positive reaction", "چه عالی!", "che ali!"),
  C(R, "Huh, interesting.", "You hear something surprising that makes you think.", "Huh, interesting. I always assumed it was the other way around.", "thoughtful surprise", "عجب!", "ajab!"),
  C(R, "Really? / Seriously?", "You want to check that someone is being serious.", "Seriously? He drove all the way to Chicago for a sandwich?", "are you serious?", "واقعاً؟", "vaghean?", "casual"),
  C(R, "Lucky you!", "A friend is going somewhere great and you're staying home.", "Two weeks in Hawaii? Lucky you!", "friendly envy", "خوش به حالت!", "khosh be halet!", "casual"),
  C(R, "That's a shame.", "You hear about a missed chance or a small disappointment.", "The concert got canceled? That's a shame. I know you were excited.", "mild sympathy", "حیف شد.", "heyf shod."),
  C(R, "Nice! Good for you.", "A friend tells you about something they achieved.", "You ran five miles? Nice! Good for you.", "praise for effort", "ایول!", "eyval!", "casual"),
  C(R, "Fair enough.", "Someone gives a reasonable explanation and you accept it.", "You were sick? Fair enough. Let's do it next week.", "okay, that makes sense", "باشه، قبول.", "bashe, ghabool."),
  # Telling a story
  C(S, "So, one time…", "You're starting a funny story from your past.", "So, one time, I locked myself out of my apartment wearing only a towel.", "story opener", "یه بار…", "ye bar…", "casual"),
  C(S, "You won't believe this, but…", "You're about to tell something surprising.", "You won't believe this, but my landlord actually fixed the heater.", "surprise opener", "باورت نمیشه، ولی…", "bavaret nemishe, vali…"),
  C(S, "So there I was, …, when …", "You start a story in the middle of the action.", "So there I was, buying groceries, when my phone starts ringing nonstop.", "his scene-drop opener", mode="perf", his=True),
  C(S, "And out of nowhere, …", "Something happens suddenly in your story.", "And out of nowhere, a dog runs onto the field.", "suddenly", "یهو…", "yehoo…"),
  C(S, "To make a long story short, …", "You want to skip the details and get to the ending.", "To make a long story short, we missed the flight but had a great dinner.", "skip to the end", "سرت رو درد نیارم…", "saret ro dard nayaram…"),
  C(S, "As it turned out, …", "You reveal a twist.", "As it turned out, the 'shortcut' was a river.", "the twist was", "آخرش معلوم شد که…", "akharesh maloom shod ke…"),
  C(S, "Needless to say, …", "You announce the disaster everyone could see coming.", "Needless to say, the tent did not survive the night.", "obviously", reg="formal", his=True),
  C(S, "Imagine my horror when…", "Mock-dramatic: you describe a small disaster as if it were huge.", "Imagine my horror when the lid came off the blender.", "you can picture how shocked I was", reg="formal", mode="perf", his=True),
  C(S, "Undeterred, …", "You keep going after a setback.", "The door was locked. Undeterred, I tried the window.", "not discouraged", reg="formal", mode="perf", his=True),
  C(S, "And that's when…", "You reach the key moment of the story.", "And that's when I realized I was at the wrong wedding.", "the turning point"),
  C(S, "So basically, …", "You sum up the whole story in one sentence.", "So basically, I'm never camping again.", "in short", "خلاصه…", "kholase…", "casual"),
  # Giving an opinion
  C(O, "If you ask me, …", "You give your personal opinion, casually.", "If you ask me, the book was better than the movie.", "in my opinion", "به نظرم…", "be nazaram…", note="Not 'in my idea'."),
  C(O, "I'd say…", "You give an estimate or a soft opinion.", "I'd say it's about a twenty-minute walk.", "my estimate is"),
  C(O, "My sense is that…", "You share an impression carefully, at work.", "My sense is that they're not ready to decide yet.", "my impression is", reg="formal"),
  C(O, "The thing is, …", "You get to the real point or the real problem.", "I'd love to come. The thing is, I have an early meeting.", "the real issue is", "آخه…", "akhe…", his=True),
  C(O, "To be honest, …", "You're about to say something frank.", "To be honest, I didn't love the ending.", "frankly", "راستش…", "rastesh…"),
  C(O, "For what it's worth, …", "You offer an opinion modestly, not sure it will help.", "For what it's worth, I think you made the right call.", "if it helps"),
  C(O, "Honestly, I'm not sure.", "Someone asks you something you don't really know.", "Honestly, I'm not sure. Let me check and get back to you.", "I don't know", "نمی" + ZW + "دونم والا.", "nemidoonam vala."),
  # Disagreeing politely
  C(D, "I see your point, but…", "You disagree while respecting the other view.", "I see your point, but I think it's too expensive.", "polite disagreement"),
  C(D, "You've got a point.", "You admit the other person is partly right.", "You've got a point. We should have left earlier.", "you're right about that", "حق با توئه.", "hagh ba toe."),
  C(D, "I'm not sure I'd go that far.", "Someone exaggerates and you gently push back.", "The best pizza in America? I'm not sure I'd go that far.", "that's too strong"),
  C(D, "That's one way to look at it.", "A polite way to say you see it differently.", "That's one way to look at it. Another way is that we got lucky.", "I see it differently"),
  C(D, "With the greatest respect, …", "You're about to disagree firmly but politely.", "With the greatest respect, that is not a dog. That's a fox.", "I'm about to disagree", reg="formal", his=True),
  C(D, "Then again, …", "You argue with your own point.", "It's expensive. Then again, it'll last for years.", "on second thought", his=True),
  # Softening
  C(H, "sort of / kind of", "You soften a big word so it sounds modest and real.", "It's a sort of magical little place.", "a softener before a strong word", "یه جورایی", "ye jooraee", mode="nat", his=True),
  C(H, "I mean, …", "You rephrase what you just said, more clearly.", "It was cold. I mean, really cold, the kind that hurts your teeth.", "let me put it better", "یعنی…", "yani…", mode="nat", his=True, note="Your 'yani' habit already exists. Just switch it to English."),
  C(H, "a bit / a little", "You make a complaint sound gentler.", "The music was a bit loud.", "slightly"),
  C(H, "not ideal", "You describe a bad situation with calm understatement.", "The boat was sinking, which was not ideal.", "bad (understated)", his=True),
  C(H, "in a way", "Something is partly true.", "In a way, losing that job was the best thing that happened to me.", "partly", "از یه جهت", "az ye jahat"),
  C(H, "I could be wrong, but…", "You share an opinion humbly.", "I could be wrong, but I think the store closes at nine.", "humble opinion"),
  C(H, "more or less", "Something is approximately true.", "The project is more or less finished.", "approximately"),
  # Buying time
  C(B, "Let me think.", "Someone asks you a question and you need a second.", "My favorite movie? Let me think.", "give me a second"),
  C(B, "How can I put this?", "You're searching for a tactful way to say something.", "How can I put this? The cake was… ambitious.", "searching for tact", his=True),
  C(B, "That's a good question.", "You need a moment before answering something hard.", "That's a good question. I think it depends on the season.", "thinking time"),
  C(B, "What's the word…", "You've forgotten a word in the middle of a sentence.", "It's the… what's the word… the thing you use to open wine.", "I forgot the word", "اسمش چی بود…", "esmesh chi bood…"),
  C(B, "Well, …", "You start an answer that isn't simple.", "Well, it's complicated.", "a thoughtful start", "خب…", "khob…"),
  C(B, "Now, …", "You restart after a pause with a new idea.", "Now, you know me. I don't usually complain.", "his restart marker", his=True),
  C(B, "It's, it's…", "You repeat the start of a sentence to think.", "It's, it's hard to explain. I mean, it just felt like home.", "his thinking restart", mode="nat", his=True),
  # Linking
  C(L, "Anyway, …", "You return to the main topic or wrap up.", "Anyway, that's why I'm late.", "back to the point", "به هر حال…", "be har hal…"),
  C(L, "Actually, …", "You correct something or add a surprising fact.", "Actually, it was Tuesday, not Monday.", "in fact", "در واقع…", "dar vaghe…"),
  C(L, "And on top of that, …", "You add one more problem to a list.", "The hotel was far, and on top of that, the Wi-Fi didn't work.", "and also (worse)", "تازه…", "taze…"),
  C(L, "…, which is why…", "You explain the result of what you just said.", "I hate mornings, which is why I work late.", "so"),
  C(L, "On the other hand, …", "You show the opposite side.", "The city is expensive. On the other hand, salaries are higher.", "the other side"),
  C(L, "It's like…", "You compare something to explain a feeling.", "It's like the whole city decided to take a nap.", "a comparison", "انگار…", "engar…"),
  # Thanks and kindness
  C(T, "Thanks so much, I really appreciate it.", "Someone did something kind or made something for you.", "You fixed my bike? Thanks so much, I really appreciate it.", "warm thanks", "دستت درد نکنه.", "dastet dard nakone.", note="Never 'your hand doesn't hurt'."),
  C(T, "Thanks for all your hard work.", "A colleague has been working hard all day.", "Long day, huh? Thanks for all your hard work.", "acknowledging effort", "خسته نباشی.", "khaste nabashi.", note="English has no fixed phrase for this moment. Thank them or notice the effort."),
  C(T, "You shouldn't have!", "Someone gives you a gift or does something generous.", "Flowers? You shouldn't have! They're beautiful.", "that's too kind", "زحمت کشیدی.", "zahmat keshidi."),
  C(T, "Don't mention it. / It's nothing, really.", "Someone thanks you for a small favor.", "\"Thanks for the ride!\" \"Don't mention it.\"", "you're welcome", "قابلی نداشت.", "ghabeli nadasht."),
  C(T, "I owe you one.", "Someone did you a favor.", "You covered my shift? I owe you one.", "I'll return the favor", "دمت گرم.", "damet garm.", "casual"),
  C(T, "Please, help yourself. I mean it.", "You offer food and want your guest to really take some.", "There's plenty. Please, help yourself. I mean it.", "please take some", "تعارف نکن.", "taarof nakon.", note="Most Americans accept the first offer, so you rarely need to insist."),
  C(T, "After you.", "You're both at a door and you let the other person go first.", "Oh, after you.", "you go first", "بفرمایید.", "befarmaid."),
  C(T, "Enjoy!", "Someone is about to eat food you made or served.", "Here's your pasta. Enjoy!", "said before eating", "نوش جان!", "nooshe jan!"),
  C(T, "Take care.", "You're saying goodbye warmly.", "Great to see you. Take care!", "warm goodbye", "مواظب خودت باش.", "movazebe khodet bash."),
  C(T, "Cheers!", "You raise your glass with friends.", "To new beginnings. Cheers!", "a toast", "به سلامتی!", "be salamati!", "casual"),
  C(T, "Thank you, that's really kind.", "Someone compliments you.", "\"Your English is great!\" \"Thank you, that's really kind.\"", "accepting a compliment", "خواهش می" + ZW + "کنم، لطف داری.", "khahesh mikonam, lotf dari.", note="Accept the compliment. Don't deny it."),
  # Sorry and no problem
  C(A, "Sorry about that.", "You made a small mistake, like sending the wrong file.", "Oops, wrong file. Sorry about that.", "small apology", "ببخشید.", "bebakhshid."),
  C(A, "Excuse me, …", "You need someone's attention, or need to get past them.", "Excuse me, is this seat taken?", "getting attention", "ببخشید…", "bebakhshid…", note="Persian uses one word for both 'sorry' and 'excuse me'. English splits them."),
  C(A, "No worries.", "Someone apologizes for something small.", "\"Sorry I'm late!\" \"No worries, we just sat down.\"", "it's fine", "اشکال نداره.", "eshkal nadare.", "casual"),
  C(A, "Don't worry about it, it's nothing.", "A guest breaks a glass and feels terrible.", "Oh, don't worry about it, it's nothing. Are you okay?", "it really doesn't matter", "فدای سرت.", "fadaye saret."),
  C(A, "Never mind.", "You decide what you were saying doesn't matter.", "Never mind, I found it.", "forget what I said", "بی" + ZW + "خیال.", "bikhial."),
  C(A, "Let it go.", "A friend keeps worrying about something small.", "He didn't mean it. Let it go.", "stop worrying about it", "ولش کن.", "velesh kon.", "casual"),
  # Small talk
  C(M, "What's new?", "You meet a friend you know well.", "Hey! What's new?", "casual greeting", "چه خبر؟", "che khabar?", "casual"),
  C(M, "It's been ages!", "You see someone after a long time.", "Sara! It's been ages! How are you?", "long time no see", "خیلی وقته ندیدمت!", "kheyli vaghte nadidamet!", "casual"),
  C(M, "I miss you.", "You're far away from someone you love.", "I miss you. Call me this weekend?", "missing someone", "دلم برات تنگ شده.", "delam barat tang shode.", note="Never 'my heart is tight for you'."),
  C(M, "I'm so bored.", "Nothing is happening and you feel restless.", "It's raining again and I'm so bored.", "boredom", "حوصله" + ZW + "م سر رفته.", "hoselam sar rafte."),
  C(M, "Sure, will do.", "Someone asks you to do something and you agree.", "\"Can you send me the file?\" \"Sure, will do.\"", "yes, I'll do it", "چشم.", "cheshm."),
  C(M, "Hopefully. / Fingers crossed.", "You hope something good happens.", "We'll hear back on Friday, hopefully.", "I hope so", "ان" + ZW + "شاءالله.", "inshallah."),
  C(M, "Oh, come on.", "Something annoying happens again.", "Oh, come on. The printer's jammed again.", "frustration", "ای بابا.", "ey baba.", "casual"),
  C(M, "Are you kidding me?", "Something is so annoying or surprising you can't believe it.", "Twenty dollars for parking? Are you kidding me?", "disbelief", "شوخی می" + ZW + "کنی؟", "shookhi mikoni?", "casual"),
  C(M, "…, right?", "You want the other person to confirm something.", "You're coming on Saturday, right?", "confirming", "…، مگه نه؟", "…, mage na?", note="Safer than 'isn't it?' after every sentence."),
  # Complaining, his way (stage)
  C(P, "I'm not exactly known for…", "You confess something as if confiding in a friend.", "I'm not exactly known for sprinting, but the goose left me no choice.", "I don't usually", reg="formal", mode="perf", his=True),
  C(P, "…that I can only describe as…", "You delay a blunt, vivid word for comic effect.", "He sang in a voice that I can only describe as… damp.", "the only word for it is", mode="perf", his=True),
  C(P, "the … in question", "You point at something as if you were in court.", "The sandwich in question had been in my bag since Tuesday.", "the one we're talking about", reg="formal", mode="perf", his=True),
  C(P, "All I can presume is that…", "You offer a polite but damning explanation.", "All I can presume is that the map was drawn by an optimist.", "my only explanation", reg="formal", mode="perf", his=True),
  C(P, "I'll say this for you: …", "You set up a backhanded compliment.", "I'll say this for you, Gary: you commit.", "I'll give you credit for this", mode="perf", his=True),
  C(P, "on this occasion", "You admit an exception to your usual behavior.", "I don't normally cry at commercials, but on this occasion I made an exception.", "this time", reg="formal", his=True),
  C(P, "taken by surprise", "You excuse yourself with dignity.", "I'm usually very calm, but I was taken by surprise by the raccoon.", "caught off guard", his=True),
  C(P, "I decided to press on.", "You keep going heroically in a silly situation.", "My shoe had gone, but I decided to press on.", "I kept going anyway", mode="perf", his=True),
  C(P, "the sheer size of it", "You make something small sound overwhelming.", "I stood there, taking in the sheer size of the buffet.", "how huge it was", mode="perf", his=True),
  C(P, "a bit much", "Something is too much, said gently.", "Three alarms at 5 a.m. is a bit much.", "excessive"),
  C(P, "way out of line", "Someone's behavior is not acceptable.", "Reading my messages was way out of line.", "unacceptable", reg="casual"),
  C(P, "giving me a hard time", "Someone keeps criticizing or teasing you.", "My coworkers keep giving me a hard time about my tie.", "teasing or criticizing me", reg="casual"),
  # Praising, his way (conversation)
  C(Q, "extraordinary", "You praise a person or their work very highly.", "She's an extraordinary teacher. She makes math feel like gossip.", "remarkable", mode="nat", his=True),
  C(Q, "exceptional", "You praise a colleague generously.", "He was exceptional in that role. Really exceptional.", "unusually good", mode="nat", his=True),
  C(Q, "genuinely", "You want to show you really mean a compliment.", "I genuinely think it's the best soup in town.", "honestly, really", mode="nat", his=True),
  C(Q, "incredibly", "You need a stronger 'very'.", "It was incredibly bleak and somehow very funny.", "very (stronger)", mode="nat", his=True),
  C(Q, "quite something", "You sum something up with dry admiration.", "Watching my grandma play poker is quite something.", "remarkable (understated)", mode="nat", his=True),
  C(Q, "very, very", "You double an intensifier inside a contrast.", "It's a stressful but very, very happy day.", "doubled intensifier", mode="nat", his=True),
  C(Q, "It's nuts. / It's silly.", "You dismiss something affectionately.", "People argue about it online. It's nuts. It's a sandwich.", "it's absurd", reg="casual", mode="nat", his=True),
  C(Q, "Hats off to…", "You admire someone's courage or effort.", "He wore shorts in the snow. Hats off to him.", "credit where it's due"),
  C(Q, "thrilled", "You're very pleased about something.", "I parallel parked on the first try. Absolutely thrilled.", "very happy"),
  # Hypotheticals
  C(Y, "If I were you, I'd…", "A friend asks you for advice.", "If I were you, I'd take the job.", "advice", "اگه جای تو بودم…", "age jaye to boodam…"),
  C(Y, "Let's say… / Suppose…", "You introduce an imaginary situation to discuss.", "Let's say you won the lottery tomorrow. What's the first thing you'd buy?", "imagine that", "فرض کن…", "farz kon…"),
  C(Y, "I wish I could…", "You want something that isn't possible right now.", "I wish I could stay longer, but I have a flight.", "it's not possible, sadly", "کاش می" + ZW + "تونستم…", "kash mitoonestam…"),
  C(Y, "I wish you'd told me sooner.", "Someone tells you important news too late.", "You were in town last week? I wish you'd told me sooner.", "past regret", "کاش زودتر گفته بودی.", "kash zoodtar gofte boodi."),
  C(Y, "What if…?", "You imagine a possibility, maybe a worrying one.", "What if it rains on the day of the wedding?", "imagining a possibility", "اگه… چی؟", "age … chi?"),
  C(Y, "Had I known, …", "Formal or mock-formal regret, his stage register.", "Had I known the hotel had no elevator, I would never have booked the top floor.", "if I had known", reg="formal", mode="perf", his=True),
  C(Y, "Should you ever…, …", "A polite, formal offer about the future.", "Should you ever need a ride, just let me know.", "if you ever", reg="formal"),
  C(Y, "If it were up to me, …", "You say what you'd do if you had the power.", "If it were up to me, every Friday would be a holiday.", "if I decided"),
  C(Y, "In an ideal world, …", "You compare the perfect version with reality.", "In an ideal world, I'd work four days a week.", "ideally"),
  C(Y, "Knowing me, I'd probably…", "A self-deprecating prediction about yourself.", "Knowing me, I'd probably get lost on the way.", "honest self-prediction", mode="nat", his=True),
]

LADDERS = [
  {"base": "good", "kind": "adj", "example": "Her talk wasn't just good. It was genuinely extraordinary.", "steps": [
    ["okay", 1, "casual"], ["decent", 2, "neutral"], ["solid", 2, "casual"], ["really good", 3, "neutral"], ["great", 3, "neutral"],
    ["impressive", 4, "neutral"], ["excellent", 4, "neutral"], ["remarkable", 4, "formal"], ["outstanding", 5, "neutral"],
    ["extraordinary", 5, "neutral", "his"], ["phenomenal", 5, "neutral", "his"]]},
  {"base": "bad", "kind": "adj", "example": "The first night was rough. The second was a complete disaster.", "steps": [
    ["not great", 1, "casual"], ["not ideal", 1, "neutral", "his"], ["disappointing", 2, "neutral"], ["rough", 2, "casual"],
    ["poor", 3, "neutral"], ["awful", 4, "neutral"], ["terrible", 4, "neutral"], ["dreadful", 4, "formal"], ["disastrous", 5, "neutral"]]},
  {"base": "big", "kind": "adj", "example": "It wasn't a big dog. It was an enormous, frankly colossal dog.", "steps": [
    ["sizable", 2, "formal"], ["large", 2, "neutral"], ["huge", 3, "neutral"], ["massive", 4, "neutral"], ["enormous", 4, "neutral"],
    ["vast", 4, "formal"], ["gigantic", 5, "neutral"], ["colossal", 5, "neutral"]]},
  {"base": "small", "kind": "adj", "example": "The apartment was cozy, which is a polite word for tiny.", "steps": [
    ["modest", 1, "formal"], ["little", 2, "neutral"], ["compact", 2, "neutral"], ["cozy", 2, "casual"], ["tiny", 3, "neutral"],
    ["minuscule", 4, "formal"], ["microscopic", 5, "neutral"]]},
  {"base": "interesting", "kind": "adj", "example": "It started as a curious idea and turned into a fascinating project.", "steps": [
    ["curious", 2, "neutral"], ["interesting", 2, "neutral"], ["intriguing", 3, "neutral"], ["fascinating", 4, "neutral", "his"],
    ["gripping", 4, "neutral"], ["riveting", 5, "formal"]]},
  {"base": "funny", "kind": "adj", "example": "The meeting was absurd, and honestly, kind of hilarious.", "steps": [
    ["amusing", 2, "neutral"], ["entertaining", 2, "neutral"], ["funny", 3, "neutral"], ["absurd", 4, "neutral", "his"],
    ["ridiculous", 4, "neutral"], ["hilarious", 4, "neutral", "his"], ["hysterical", 5, "casual"]]},
  {"base": "tired", "kind": "adj", "example": "By Friday I'm not tired, I'm completely wiped out.", "steps": [
    ["a little tired", 1, "neutral"], ["worn out", 2, "neutral"], ["drained", 3, "neutral"], ["exhausted", 4, "neutral"],
    ["wiped out", 4, "casual"], ["running on empty", 5, "casual"]]},
  {"base": "happy", "kind": "adj", "example": "My mom wasn't just happy. She was over the moon.", "steps": [
    ["pleased", 2, "neutral"], ["glad", 2, "neutral"], ["happy", 2, "neutral"], ["delighted", 3, "neutral"], ["thrilled", 4, "neutral"],
    ["over the moon", 5, "casual"]]},
  {"base": "sad", "kind": "adj", "example": "He was a bit down at first, then honestly heartbroken.", "steps": [
    ["a bit down", 1, "casual"], ["disappointed", 2, "neutral"], ["upset", 3, "neutral"], ["heartbroken", 4, "neutral"], ["devastated", 5, "neutral"]]},
  {"base": "angry", "kind": "adj", "example": "I went from annoyed to furious in about four seconds.", "steps": [
    ["annoyed", 1, "neutral"], ["irritated", 2, "neutral"], ["frustrated", 3, "neutral"], ["furious", 4, "neutral"], ["livid", 5, "neutral"]]},
  {"base": "surprised", "kind": "adj", "example": "I was taken aback, then completely speechless.", "steps": [
    ["surprised", 2, "neutral"], ["taken aback", 3, "neutral", "his"], ["stunned", 4, "neutral"], ["astonished", 4, "formal"], ["speechless", 5, "neutral"]]},
  {"base": "difficult", "kind": "adj", "example": "The first week was tricky. The second was brutal.", "steps": [
    ["tricky", 2, "neutral"], ["challenging", 3, "neutral"], ["tough", 3, "neutral"], ["demanding", 3, "neutral"], ["brutal", 4, "casual"], ["grueling", 5, "neutral"]]},
  {"base": "beautiful", "kind": "adj", "example": "The view was lovely in the morning and breathtaking at sunset.", "steps": [
    ["nice", 1, "neutral"], ["pretty", 2, "neutral"], ["lovely", 3, "neutral"], ["beautiful", 3, "neutral"], ["stunning", 4, "neutral"], ["breathtaking", 5, "neutral"]]},
  {"base": "very", "kind": "adv", "example": "It was pretty good, then genuinely, ridiculously good.", "steps": [
    ["pretty", 1, "casual"], ["really", 2, "neutral"], ["genuinely", 3, "neutral", "his"], ["incredibly", 4, "neutral", "his"],
    ["remarkably", 4, "formal"], ["ridiculously", 4, "casual"], ["extraordinarily", 5, "formal"]]},
  {"base": "say", "kind": "verb", "example": "She didn't just say it. She insisted.", "steps": [
    ["mention", "say briefly, in passing"], ["point out", "draw attention to a fact"], ["suggest", "offer an idea"],
    ["admit", "say something you'd rather not"], ["insist", "say firmly, more than once"], ["claim", "say without proof"],
    ["announce", "say publicly"], ["confess", "admit something embarrassing"]]},
  {"base": "think", "kind": "verb", "example": "I don't just think it's broken. I suspect someone broke it.", "steps": [
    ["guess", "casual, unsure"], ["figure", "casual (US): conclude"], ["suppose", "mild, a bit formal"], ["suspect", "think something hidden or bad is true"],
    ["assume", "believe without checking"], ["believe", "firm view"], ["I'd say", "a soft estimate"], ["my sense is", "a careful impression"]]},
  {"base": "like", "kind": "verb", "example": "I don't just like this café. I can't get enough of it.", "steps": [
    ["don't mind", "it's acceptable"], ["like", "neutral"], ["enjoy", "take pleasure in an activity"], ["really like", "stronger"],
    ["love", "strong"], ["adore", "very strong, warm"], ["can't get enough of", "casual: want more and more"]]},
  {"base": "look", "kind": "verb", "example": "I glanced at it, then noticed the price, then stared.", "steps": [
    ["glance", "look quickly"], ["notice", "become aware of"], ["spot", "notice something hard to see"], ["check out", "casual: look at with interest"],
    ["stare", "look for a long time, fixed"], ["gaze", "look long and dreamily"], ["examine", "look at carefully"]]},
]

HYPO_FORMS = [
  {"id": "real", "name": "Real possibility", "open": "yes", "when": "It might really happen.",
   "form": "If + present, … will / can / might + verb",
   "examples": ["If it rains tomorrow, we'll stay in.", "If you're free later, I'll call you."],
   "fa": "اگه فردا بارون بیاد، خونه می" + ZW + "مونیم.", "tr": "age farda baroon biad, khoone mimoonim.",
   "note": "Persian uses the subjunctive after اگه (biad). English uses the simple present after 'if', never 'will'.",
   "trap": "✗ If it will rain… ✓ If it rains…"},
  {"id": "now", "name": "Imaginary now", "open": "no, now", "when": "It isn't true now, or it probably won't happen.",
   "form": "If + past, … would / could + verb",
   "examples": ["If I had more time, I'd learn the piano.", "If I were you, I'd take the job."],
   "fa": "اگه وقت داشتم، پیانو یاد می" + ZW + "گرفتم.", "tr": "age vaght dashtam, piano yad migereftam.",
   "note": "Here the past tense means 'not real', not 'in the past'. Persian uses the same shape for the past too (next card).",
   "trap": "✗ If I would have time… ✓ If I had time… · careful speech uses 'were' for everyone: If I were you."},
  {"id": "past", "name": "Imaginary past", "open": "no, past", "when": "It didn't happen. You imagine a different past.",
   "form": "If + had + past participle, … would have + past participle",
   "examples": ["If I'd known, I would have called you.", "If we'd left earlier, we wouldn't have missed the train."],
   "fa": "اگه می" + ZW + "دونستم، بهت زنگ می" + ZW + "زدم.", "tr": "age midoonestam, behet zang mizadam.",
   "note": "In everyday Persian this exact sentence can mean 'If I knew, I'd call you' or 'If I had known, I would have called you.' English forces you to choose. Ask: is the chance still open?",
   "trap": "✗ If I would have known… ✓ If I had known… · spoken: I'd've called /aɪdəv/"},
  {"id": "mixed", "name": "Past cause, present result", "open": "no, mixed", "when": "A different past would change the present.",
   "form": "If + had + past participle, … would + verb (now)",
   "examples": ["If I'd eaten breakfast, I wouldn't be this hungry.", "If I hadn't taken that job, I'd be living somewhere else now."],
   "fa": "اگه صبحونه خورده بودم، الان این" + ZW + "قدر گرسنه نبودم.", "tr": "age sobhoone khorde boodam, alan inghadr gorosne naboodam.",
   "note": "Persian marks the present result with الان (now). English does the same: would + verb, often with 'now'.",
   "trap": "The two halves can point to different times. Check each half separately."},
  {"id": "wish", "name": "Wishes and regrets", "open": "no, now or past", "when": "You want the present or the past to be different.",
   "form": "I wish + past (now) · I wish + had + past participle (past) · If only…",
   "examples": ["I wish I were taller.", "I wish I'd studied music as a kid."],
   "fa": "کاش اونجا بودم.", "tr": "kash oonja boodam.",
   "note": "کاش + past covers both 'I wish I were there' and 'I wish I'd been there.' Decide: now or then?",
   "trap": "✗ I wish I will pass. ✓ I hope I pass. 'Wish' is for what isn't real; 'hope' is for what's possible."},
  {"id": "soft", "name": "Soft openers", "open": "either", "when": "You invite someone into an imaginary situation.",
   "form": "Suppose… · Let's say… · Imagine (if)… · What if…? · Say you…",
   "examples": ["Let's say you had a free year. What would you do?", "What if we just stayed home?"],
   "fa": "فرض کن…", "tr": "farz kon…",
   "note": "After these openers the same rules apply: past tense for imaginary, present for real possibilities.",
   "trap": "Answer in the same world: a 'would' question gets a 'would' answer (I'd probably…)."},
  {"id": "elegant", "name": "Elegant inversion (his stage register)", "open": "no", "when": "Formal, witty or mock-serious speech and writing.",
   "form": "Had I known… · Were I to… · Should you ever… · Were it not for…",
   "examples": ["Had I known the hotel had no elevator, I would never have booked the top floor.", "Should you ever find yourself in Ohio, do look me up."],
   "fa": "", "tr": "",
   "note": "Drop 'if' and move the verb to the front. It's rare in casual talk, which is exactly why it sounds witty in a complaint.",
   "trap": "Only had / were / should invert. ✗ Did I know… ✗ Would I have known…"},
  {"id": "fork", "name": "The fork (his signature ending)", "open": "yes", "when": "You end a complaint with two possible explanations.",
   "form": "Obviously, if [innocent], then [gracious]. But if not, [short verdict].",
   "examples": ["Obviously, if this is a surprise party, I'm delighted. But if not, you're all dreadful.", "Obviously, if the package is just on vacation, I wish it well. But if not, I want a refund."],
   "fa": "", "tr": "",
   "note": "Both are real possibilities, so simple present: 'if this is a joke'. The humor comes from the second branch being short and hard.",
   "trap": "Pitch goes high on 'if', then the verdict drops low."},
]

def Qz(s, opts, a, why, fa=None):
    d = {"s": s, "opts": opts, "a": a, "why": why}
    if fa: d["fa"] = fa
    return d

PERSIAN_TOLD = "اگه زودتر می" + ZW + "گفتی، کمکت می" + ZW + "کردم."
HYPO_QUIZ = [
  Qz("You don't own a car. You'd love to drive to the coast this weekend.",
     ["If I have a car, I'll drive to the coast.", "If I had a car, I'd drive to the coast.", "If I would have a car, I'd drive to the coast."], 1,
     "Not true now, so it's an imaginary now: if + past, would + verb. Never 'would' in the if-half."),
  Qz("Last week you didn't know about the party, so you didn't go.",
     ["If I knew about the party, I'd go.", "If I'd known about the party, I would have gone.", "If I would know about the party, I'd have gone."], 1,
     "It's over, so it's an imaginary past: had + past participle, then would have + past participle."),
  Qz("You missed your flight yesterday. Now you're stuck at the airport in Denver.",
     ["If I hadn't missed my flight, I wouldn't be stuck here now.", "If I didn't miss my flight, I won't be stuck here.", "If I hadn't missed my flight, I wouldn't have been stuck here now."], 0,
     "Past cause, present result: had + past participle, then would + verb for now."),
  Qz("The forecast says it might rain tomorrow.",
     ["If it will rain tomorrow, we'll stay home.", "If it rains tomorrow, we'll stay home.", "If it rained tomorrow, we stay home."], 1,
     "A real possibility: simple present after 'if', 'will' in the result."),
  Qz("Your friend is nervous about a job interview and asks for advice.",
     ["If I am you, I prepare three stories.", "If I were you, I'd prepare three stories.", "If I was you, I'll prepare three stories."], 1,
     "Advice is an imaginary now. 'If I were you, I'd…' is the fixed chunk. ('If I was you, I'd…' is common in casual speech, but never with 'I'll'.)"),
  Qz("You regret not learning an instrument as a child.",
     ["I wish I learned the piano as a kid.", "I wish I'd learned the piano as a kid.", "I hope I had learned the piano as a kid."], 1,
     "A regret about the past: wish + had + past participle. 'I wish I learned' is heard casually, but 'I'd learned' is correct and clearer."),
  Qz("You're stuck at your desk on a sunny Friday afternoon.",
     ["I wish I am at the beach right now.", "I wish I were at the beach right now.", "I wish I will be at the beach right now."], 1,
     "A wish about now: wish + past ('were')."),
  Qz("Your friend told you about a problem, but only after it was already over. In Persian you'd say:",
     ["If you told me earlier, I'd help you.", "If you'd told me earlier, I would have helped you.", "If you tell me earlier, I'll help you."], 1,
     "The problem is over, so it's an imaginary past. The Persian sentence doesn't show that; you have to choose.", PERSIAN_TOLD),
  Qz("Your friend always tells you about problems too late. You're talking about how things are in general. In Persian you'd say the same sentence:",
     ["If you told me things earlier, I could help you.", "If you'd told me things earlier, I could have helped you.", "If you will tell me earlier, I help you."], 0,
     "Same Persian sentence, but now it's about the present and the future: past + would/could. One Persian sentence, two English ones.", PERSIAN_TOLD),
  Qz("You're writing a funny, formal complaint. You booked the top floor without knowing there was no elevator.",
     ["If I knew the hotel had no elevator, I never booked the top floor.", "Had I known the hotel had no elevator, I would never have booked the top floor.", "Would I have known the hotel had no elevator, I never would book the top floor."], 1,
     "An elegant imaginary past: drop 'if' and start with 'Had I known…'. Very him."),
  Qz("You want to offer help politely at the end of an email.",
     ["Should you need anything, just let me know.", "If you will need anything, just let me know.", "Would you need anything, just let me know."], 0,
     "'Should you…' is a polite, slightly formal way to say 'if you happen to'."),
  Qz("Someone asks: 'Suppose you won a million dollars. What would you do first?'",
     ["I will buy a house for my parents.", "I'd probably buy a house for my parents.", "I would have bought a house for my parents."], 1,
     "The question is an imaginary now, so answer with 'would' (I'd). 'Probably' makes it sound natural."),
  Qz("Your boss asks what you'll do if the client says no at tomorrow's meeting.",
     ["If they say no, we'll offer a smaller package.", "If they said no, we'd have offered a smaller package.", "If they will say no, we offer a smaller package."], 0,
     "A real possibility tomorrow: present + will."),
  Qz("You're bad at saying no, and last month that's how you ended up with three extra projects.",
     ["If I weren't so bad at saying no, I wouldn't have agreed to three projects.", "If I'm not bad at saying no, I won't agree to three projects.", "If I hadn't been so bad at saying no, I won't have agreed."], 0,
     "Present cause (still true about you), past result: past + would have + past participle."),
  Qz("Years ago you and a friend took the highway instead of the scenic route. You wonder about the other choice.",
     ["What if we take the other road?", "What if we'd taken the other road?", "What if we will take the other road?"], 1,
     "Imagining a different past: what if + had + past participle."),
  Qz("You think your cousin will probably visit next month.",
     ["I wish she visits next month.", "I hope she visits next month.", "I wish she would have visited next month."], 1,
     "A possible future takes 'hope', not 'wish'. 'Wish' is for things that aren't real."),
]

HYPO_PROMPTS = [
  {"q": "What would you do if you could speak every language in the world, starting tomorrow?", "form": "Imaginary now: If I could…, I'd…",
   "model": "Oh, I mean, honestly? I think I'd go straight to the nearest café and just… listen. If I could understand every conversation in the room, I'd probably become unbearable at dinner parties. I'd be correcting everyone's Italian. Which, to be fair, nobody wants."},
  {"q": "If you could have dinner with anyone, living or dead, who would it be?", "form": "Imaginary now: It would be… · If they were here, I'd…",
   "model": "It's, it's a hard one. I'd say my great-grandmother, actually, because nobody in my family really knows what she was like. If she were sitting here, I'd ask her a thousand questions. And then, knowing me, I'd probably forget to eat."},
  {"q": "Looking back at your first year in a new country, what would you have done differently?", "form": "Imaginary past: If I'd known…, I would have…",
   "model": "If I'd known then what I know now, I would have talked to more strangers. Genuinely. I was so worried about making mistakes that I sort of hid. I wish I'd just jumped in, because, as it turned out, nobody cares about your mistakes nearly as much as you do."},
  {"q": "Suppose you woke up and your phone had disappeared forever. How would your day go?", "form": "Soft opener + imaginary now: Let's say… I'd…",
   "model": "Let's say it's gone. Completely. I think the first hour would be pure panic. I'd keep reaching for my pocket. And then, I mean, it might be kind of wonderful, wouldn't it? I'd probably read an actual book. On paper. Like it's 1995."},
  {"q": "If you were mayor of your city for one day, what would you change?", "form": "Imaginary now: If it were up to me…",
   "model": "If it were up to me, every bus would come on time, which, I realize, would make me the most powerful person in history. Then again, I'd probably just add more benches. People underestimate a good bench."},
  {"q": "What if you'd been born a hundred years earlier? What would your life look like?", "form": "Mixed: If I'd been born…, I'd be… / I'd have…",
   "model": "If I'd been born a hundred years earlier, I wouldn't be talking to a computer right now, for a start. I'd probably be writing very long, very polite letters. Complaint letters, mostly. So, in a way, not much would have changed."},
  {"q": "Imagine you had to give a toast at a stranger's wedding in ten minutes. What would you say?", "form": "Imaginary now: I'd stand up and I'd say…",
   "model": "Okay. Let's say I had ten minutes. I'd stand up, I'd say, 'I don't know either of you,' and I'd let that land. Then I'd say something genuinely kind, because if you don't know people, the one thing you can really praise is how happy they look. And they would look happy. Hopefully."},
  {"q": "If you hadn't chosen your current job or field, what do you think you'd be doing now?", "form": "Mixed: If I hadn't…, I'd be…",
   "model": "Honestly? If I hadn't gone down this road, I think I'd be a chef. I'd be terrible at the business side, I mean, I'd give everything away for free, but I'd be very, very happy. Briefly. And then broke."},
]

def Tr(area, title, fa, tr, wrong, right, why, checks):
    return {"area": area, "title": title, "fa": fa, "tr": tr, "wrong": wrong, "right": right, "why": why, "checks": checks}

TRAPS = [
  Tr("Grammar", "a, an, the", "یه ماشین جدید خریدم. ماشینه قرمزه.", "ye mashine jadid kharidam. mashine ghermeze.",
     "I bought new car. Car is red.", "I bought a new car. The car is red.",
     "Persian has no real word for 'the' and uses یه / ـی for 'a'. English needs an article almost every time: a/an when you first mention something, 'the' when you both know which one, and nothing for things in general ('Dogs are loyal').",
     [["She is teacher at school near my house.", "She's a teacher at a school near my house."], ["I love the coffee. (coffee in general)", "I love coffee."]]),
  Tr("Grammar", "he or she", "خواهرم گفت که اون میاد.", "khaharam goft ke oon miad.",
     "My sister said he's coming.", "My sister said she's coming.",
     "اون / او covers both genders. English always chooses. For the first month, slow down on every pronoun; it becomes automatic surprisingly fast.",
     [["My mom called. He wants us over for dinner.", "My mom called. She wants us over for dinner."], ["I met your brother. She was very nice.", "I met your brother. He was very nice."]]),
  Tr("Grammar", "How long: the present perfect", "سه ساله اینجا زندگی می" + ZW + "کنم.", "se sale inja zendegi mikonam.",
     "I live here since three years.", "I've lived here for three years. / I've been living here since 2022.",
     "Persian uses the present for something that started in the past and is still going. English uses the present perfect. 'For' + a length of time; 'since' + a starting point.",
     [["I know him since we were kids.", "I've known him since we were kids."], ["I work here for two years.", "I've worked here for two years."]]),
  Tr("Grammar", "Question word order", "کجا داری میری؟", "koja dari miri?",
     "Where you are going?", "Where are you going?",
     "Persian makes a question with tone alone. English moves the helper verb to the front. Inside 'Do you know…?' it moves back: 'Do you know where it is?'",
     [["What time the store opens?", "What time does the store open?"], ["Can you tell me where is the station?", "Can you tell me where the station is?"]]),
  Tr("Grammar", "The missing 'it' and 'there'", "داره بارون میاد. خیلی خوبه.", "dare baroon miad. kheyli khoobe.",
     "Is raining. Is very good.", "It's raining. It's really good.",
     "Persian drops the subject because the verb ending shows it. Every English sentence needs a subject, even an empty one: it, there.",
     [["Is a new café on my street.", "There's a new café on my street."], ["Is too late to call him.", "It's too late to call him."]]),
  Tr("Grammar", "'Very' with a verb", "خیلی دوستش دارم.", "kheyli doostesh daram.",
     "I very like this song.", "I really like this song. / I like this song a lot.",
     "خیلی works with verbs; 'very' doesn't. Use 'really' before the verb or 'a lot' after it. For more variety, open Word ladders.",
     [["I very enjoyed the trip.", "I really enjoyed the trip."], ["She very wants to come.", "She really wants to come."]]),
  Tr("Grammar", "make or do", "اشتباه کردم · تکلیفمو انجام دادم", "eshtebah kardam · taklifamo anjam dadam",
     "I did a mistake. I made my homework.", "I made a mistake. I did my homework.",
     "کردن covers both. Rough rule: make = create or produce (a mistake, a plan, dinner, a decision); do = an activity or a task (homework, the dishes, a favor, your best).",
     [["Can you make me a favor?", "Can you do me a favor?"], ["We need to do a decision today.", "We need to make a decision today."]]),
  Tr("Grammar", "'…, right?' instead of 'isn't it?'", "میای، مگه نه؟", "miai, mage na?",
     "You're coming, isn't it?", "You're coming, right? / You're coming, aren't you?",
     "مگه نه fits every sentence in Persian. In English, '…, right?' fits every sentence too and sounds natural in the US and the UK. Full tags must match the verb: aren't you, didn't she, won't they.",
     [["She called you, isn't it?", "She called you, right? / didn't she?"], ["They'll be late, isn't it?", "They'll be late, right? / won't they?"]]),
  Tr("Words", "Verb partners", "دارو خوردن · امتحان دادن · چراغ رو روشن کردن", "daroo khordan · emtehan dadan · cheragh ro roshan kardan",
     "I eat my medicine. I gave an exam. Open the light.", "I take my medicine. I took an exam. Turn on the light.",
     "Translating the verb word by word picks the wrong partner. Learn the verb and the noun together, as one chunk.",
     [["I saw a strange dream last night.", "I had a strange dream last night."], ["He pulls two packs of cigarettes a day.", "He smokes two packs a day."]]),
  Tr("Words", "Prepositions that don't translate", "با او ازدواج کرد · از سگ می" + ZW + "ترسم · بستگی داره به…", "ba oo ezdevaj kard · az sag mitarsam · bastegi dare be…",
     "She married with him. I'm afraid from dogs. It depends to the weather.", "She married him. / She's married to him. I'm afraid of dogs. It depends on the weather.",
     "با / از / به push you toward with / from / to. Memorize the English chunk whole: married to, afraid of, depends on, angry at (a person), good at, interested in.",
     [["Can you explain me this?", "Can you explain this to me?"], ["Let's discuss about the plan.", "Let's discuss the plan. / Let's talk about the plan."]]),
  Tr("Words", "Nouns you can't count", "اطلاعات · توصیه" + ZW + "ها · وسایل", "etelaat · tosie-ha · vasayel",
     "Thanks for the informations and advices.", "Thanks for the information and advice. / Thanks for the tips.",
     "اطلاعات is plural in Persian, but 'information' can't be counted in English. Same for advice, furniture, luggage, homework, news. Use 'some', 'a piece of', or a countable word (a tip, a suitcase).",
     [["I have many homeworks.", "I have a lot of homework."], ["She gave me a good advice.", "She gave me some good advice. / a good tip."]]),
  Tr("Words", "'In my idea' and 'I am agree'", "به نظر من · موافقم", "be nazare man · movafegham",
     "In my idea, it's too expensive. I am agree.", "I think it's too expensive. / If you ask me, it's too expensive. I agree.",
     "نظر becomes 'idea' in the dictionary, but the chunk is 'in my opinion' or, more naturally, 'I think' or 'If you ask me'. 'Agree' is a verb: I agree, I don't agree.",
     [["I am not agree with you.", "I don't agree with you."], ["According to me, he's right.", "I think he's right. / In my opinion, he's right."]]),
  Tr("Culture", "Ta'arof: Americans believe your first 'no'", "نه ممنون، میل ندارم.", "na mamnoon, meyl nadaram.",
     "(You'd like some food, but say) No thank you, I'm fine.", "Oh, I'd love some, thank you!",
     "In ta'arof the first 'no' is politeness and the host insists. In the US the host takes 'no' at face value and won't ask again. If you want it, say yes the first time. If you don't, 'No thanks, I'm good' is completely polite.",
     [["(The host offers coffee and you'd like some) No, no, please, don't trouble yourself.", "Oh, I'd love one, thanks!"], ["(You don't want more food) No, no, I couldn't possibly…", "I'm good, thanks. It was delicious."]]),
  Tr("Culture", "Accepting compliments", "خواهش می" + ZW + "کنم، چشماتون قشنگ می" + ZW + "بینه.", "khahesh mikonam, cheshmatoon ghashang mibine.",
     "No, no, my English is very bad.", "Thank you! I've been working on it.",
     "Persian politeness deflects praise. In English, denying a compliment can sound like you're disagreeing with the person. Accept it, then add a small detail.",
     [["(Someone likes your jacket) Oh, this? It's nothing, it's very old.", "Thank you! I got it on a trip to Chicago."], ["(Your boss praises your report) No, no, it's not good.", "Thanks, I'm glad it was useful."]]),
  Tr("Culture", "Blessings that don't translate", "دستت درد نکنه · خسته نباشی", "dastet dard nakone · khaste nabashi",
     "May your hand not hurt! Don't be tired!", "Thank you so much! · Thanks for all your hard work.",
     "They're beautiful in Persian, but translated word for word they confuse English speakers. Each one has a natural English chunk for the same moment. See Chunks & words → Thanks and kindness.",
     [["(After a friend cooks for you) May your hand not hurt!", "This is delicious. Thank you so much."], ["(To a colleague at 6 p.m.) Don't be tired!", "Long day, huh? Thanks for everything today."]]),
]

SOUNDS = [
  {"title": "No 'e' before s + consonant", "issue": "Persian words don't start with two consonants, so 'school' can come out as 'eschool'.",
   "words": "school · street · speak · Spain · study · sleep", "drill": "Hiss first: 'ssss-chool', 'ssss-treet'. Then shorten the hiss until the e is gone."},
  {"title": "W is not V", "issue": "Standard Persian has no separate w consonant, so 'wine' and 'vine', 'west' and 'vest' can merge.",
   "words": "wine / vine · west / vest · we · world · always", "drill": "Start from 'oo': 'oo-ine' becomes wine. Lips round and never touch the teeth. For v, top teeth touch the lower lip."},
  {"title": "TH", "issue": "The two TH sounds (think, this) turn into t/s or d/z.",
   "words": "think · three · thanks · this · they · weather", "drill": "Tongue tip lightly between the teeth, then blow. Say 'thanks' ten times slowly, then fast."},
  {"title": "Squash the small words", "issue": "Persian gives every syllable a full vowel. English shrinks unstressed words to a quick 'uh' (schwa). This is how he reaches 5.6 syllables a second.",
   "words": "to → tə · and → ən · for → fər · can → kən · of → əv", "drill": "Read the weak-forms table below with the Studio conductor at 85%. Stress only the big words."},
  {"title": "Stress moves around", "issue": "Persian nouns usually stress the last syllable. English stress varies and can change the word.",
   "words": "PHO-to-graph · pho-TO-gra-phy · pho-to-GRA-phic · RE-cord (noun) · re-CORD (verb)", "drill": "Tap the table on the stressed syllable. For every new word, check the stress mark ˈ in the dictionary."},
  {"title": "Sing, not sing-g", "issue": "The 'ng' sound often gets an extra g on the end: 'sing-ging'.",
   "words": "singing · long · thing · ringing · going", "drill": "Hum 'ng' with your mouth open and the back of your tongue raised. Don't release it into a g."},
  {"title": "More vowels than Persian", "issue": "Persian has six vowels; English has around twelve. Pairs like ship/sheep and hat/hut can merge.",
   "words": "ship / sheep · full / fool · bad / bed · hat / hot / hut", "drill": "Minimal-pair ping-pong: say one word of a pair, record it, and ask a friend which one they heard."},
  {"title": "Link the words", "issue": "Pausing between every word sounds careful but slow.",
   "words": "pick it up → pi-ki-tup · an apple → a-napple · turn it off → tur-ni-toff", "drill": "Move the last consonant onto the next vowel. Read one Studio line linking every word, then put his pauses back."},
]

WEAK_FORMS = [
  ["to", "tuː", "tə", "I need to go → I need tə go"],
  ["and", "ænd", "ən", "salt and pepper → salt ən pepper"],
  ["for", "fɔr", "fər", "a gift for you → a gift fər you"],
  ["can", "kæn", "kən", "I can swim → I kən SWIM"],
  ["of", "ʌv", "əv", "a cup of coffee → a cup əv coffee"],
  ["was", "wʌz", "wəz", "it was late → it wəz late"],
  ["at", "æt", "ət", "at home → ət home"],
  ["from", "frʌm", "frəm", "back from work → back frəm work"],
  ["them", "ðɛm", "ðəm", "call them → call ðəm"],
  ["you", "juː", "jə", "see you later → see yə later"],
  ["have", "hæv", "əv", "should have → should've (ʃʊdəv)"],
  ["the", "ðiː", "ðə", "the car → ðə car (but ðiː before a vowel: the apple)"],
]

METHOD = [
  {"t": "Chunks, not words", "d": "Translation goes word by word. Fluent speakers pull whole chunks: 'I'd love to, but…', 'It depends on…'. Every chunk you learn is a sentence you never have to build."},
  {"t": "Persian fades out", "d": "A chunk card starts with a Persian cue to anchor the moment. As the card climbs its boxes, the Persian disappears and only the English situation is left. In the end the situation alone brings up the chunk."},
  {"t": "Speed beats translation", "d": "Translating takes two steps, and you can't do both in three seconds. Rapid fire gives you three seconds per situation, which forces your brain to go straight to English."},
  {"t": "Narrate your day", "d": "Twice a day, describe what you're doing in English, in your head or under your breath, in his style: 'So there I am, standing at the coffee machine, when…'. Idle moments become English thinking."},
  {"t": "Stuck? Describe it", "d": "When a word is missing, don't go looking for the Persian. Use a describing frame (below) and keep moving. Native speakers do this all the time."},
  {"t": "Ten minutes, English only", "d": "Pick one daily window, like the commute or cooking, where your inner voice must be English. If a Persian thought comes, say it again in simple English, even badly."},
]
STUCK = ["It's a kind of…", "It's the thing you use to…", "It's like a…, but…", "It's the opposite of…", "You know when…? That.", "What's the word… the place where…"]

VARIETY = "Target: neutral English. US spelling and everyday words that work in both the US and the UK, without heavy slang from either side. Keep your own vowels; you're borrowing his rhythm, melody, clarity and sentence craft, not a British accent."

GROWTH = [
  {"kernel": "The trip was good.", "steps": [
    ["Add a real intensifier", "The trip was genuinely good."],
    ["Stack escalating adjectives", "It was a long, chaotic, genuinely good trip."],
    ["Soften the big word (his hedge)", "It was a long, chaotic, sort of wonderful trip."],
    ["Add a 'which' clause", "It was a long, chaotic, sort of wonderful trip, which I didn't expect, because it started with a flat tire."],
    ["Add an afterthought joke", "…because it started with a flat tire. Well, two flat tires."],
    ["Land it short", "I'd do it again tomorrow."]]},
  {"kernel": "My boss is nice.", "steps": [
    ["Replace the base word (ladder)", "My boss is genuinely kind."],
    ["Cleft sentence", "What I like about my boss is that she's genuinely kind."],
    ["Add a concrete example", "What I like about my boss is that she's genuinely kind. She remembers everyone's birthday."],
    ["Concession turn", "Is she perfect? Of course not. But she remembers everyone's birthday."],
    ["Self-deprecating twist", "Including mine, which, frankly, I usually forget."]]},
  {"kernel": "The movie was boring.", "steps": [
    ["Soften (his habit)", "The movie was a bit slow."],
    ["Precise vagueness", "The movie had a pace that I can only describe as… geological."],
    ["'It's not that…, it's that…'", "It's not that it was bad. It's that nothing happened for two hours."],
    ["Add 'on top of that'", "And on top of that, the seats were broken."],
    ["Land it", "I'd still recommend it. For sleeping."]]},
  {"kernel": "I was nervous at the interview.", "steps": [
    ["Ladder up", "I was incredibly nervous at the interview."],
    ["Scene drop", "So there I was, in the waiting room, when they call my name and my mind goes completely blank."],
    ["Restart and 'I mean'", "It was, it was awful. I mean, I forgot my own job title."],
    ["Turn it around", "As it turned out, they loved that I was honest about it."],
    ["Land it", "I start on Monday."]]},
  {"kernel": "Dinner last night was nice.", "steps": [
    ["Ladder up", "Dinner last night was lovely."],
    ["Stack", "It was a warm, noisy, completely lovely evening."],
    ["Acted-out speech", "And my friend's going, 'Try the soup,' and I'm going, 'I've had four bowls.'"],
    ["Hypothetical", "If I'd known there was dessert, I would have stopped at three."],
    ["Land it", "I regret nothing."]]},
]

CORE_FRAMES = [
  {"id": "cleft", "mode": "core", "name": "What I love about…", "template": "What I love about [X] is [Y].",
   "why": "A cleft sentence puts the important part last. Native speakers use it all the time; learners almost never do.",
   "examples": ["What I love about this city is that you can walk everywhere.", "What surprised me most was how friendly everyone was."]},
  {"id": "notthat", "mode": "core", "name": "It's not that…, it's that…", "template": "It's not that [X]. It's that [Y].",
   "why": "Corrects a wrong assumption gently. Great for explaining feelings.",
   "examples": ["It's not that I don't like parties. It's that I like leaving them.", "It's not that the job is hard. It's that it never stops."]},
  {"id": "themore", "mode": "core", "name": "The more…, the more…", "template": "The more [X], the more [Y].",
   "why": "Shows two things growing together. Sounds instantly fluent.",
   "examples": ["The more I practice, the less I translate.", "The more I learn about cooking, the more I respect my mom."]},
  {"id": "notonly", "mode": "core", "name": "Not only…, but…", "template": "Not only [X], but [also Y].",
   "why": "Adds a surprising second point with emphasis.",
   "examples": ["Not only did he fix my car, but he also washed it.", "It's not only cheaper, but it's also faster."]},
  {"id": "bythetime", "mode": "core", "name": "By the time…", "template": "By the time [X], [Y had already happened].",
   "why": "Puts two past events in order. Uses the past perfect naturally.",
   "examples": ["By the time we got there, the store had closed.", "By the time I found my keys, the bus had left."]},
  {"id": "whichiswhy", "mode": "core", "name": "…, which is why…", "template": "[X], which is why [Y].",
   "why": "Joins a cause and a result in one flowing sentence, like him.",
   "examples": ["I grew up near the ocean, which is why I can't live without the water.", "I'm terrible with names, which is why I say 'hey, you'."]},
  {"id": "themoment", "mode": "core", "name": "The moment…", "template": "The moment [X], [Y].",
   "why": "A vivid way to say 'as soon as'. Good for stories.",
   "examples": ["The moment I walked in, I knew I'd made a mistake.", "The moment she started singing, the room went quiet."]},
  {"id": "eventhough", "mode": "core", "name": "Even though…", "template": "Even though [X], [Y].",
   "why": "Contrast in one sentence. Note: no 'but' in the second half.",
   "examples": ["Even though it was raining, we went to the beach.", "Even though I was exhausted, I couldn't sleep."]},
  {"id": "usedto", "mode": "core", "name": "I used to…, but these days…", "template": "I used to [X], but these days [Y].",
   "why": "Contrasts past habits with now. Perfect for talking about change.",
   "examples": ["I used to hate coffee, but these days I can't start without it.", "I used to translate everything in my head, but these days I just talk."]},
  {"id": "notsaying", "mode": "core", "name": "I'm not saying…", "template": "I'm not saying [X]. I'm just saying [Y].",
   "why": "Makes a point without sounding aggressive. Very natural in the US.",
   "examples": ["I'm not saying the plan is bad. I'm just saying we need a backup.", "I'm not saying you're wrong. I'm just saying it's complicated."]},
  {"id": "turnsout", "mode": "core", "name": "It turns out…", "template": "It turns out (that) [X].",
   "why": "Reveals new information or a surprise.",
   "examples": ["It turns out the restaurant was closed on Mondays.", "It turns out I'm allergic to cats. Who knew?"]},
]

CORE_SITUATIONS = [
  "Talk about your favorite coffee place and why you keep going back.",
  "Describe moving to a new city and the first week there.",
  "Explain what you do for work to someone who's never heard of it.",
  "Talk about a show you're watching right now.",
  "Describe your hometown to someone who's never been there.",
  "Talk about cooking a Persian dish for friends who'd never tried it.",
  "Describe a friend you really admire.",
  "Talk about a habit you're trying to build.",
  "Describe your neighborhood on a Saturday morning.",
  "Talk about the weather this week, and how it changed your plans.",
  "Explain something that confused you when you first came to the US.",
  "Describe the best day you've had this year.",
]
