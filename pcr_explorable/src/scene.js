/*
 * The guided animation's script: one entry per step, the words the narrator
 * says and the caption shows. anim.js draws the steps; tools/narrate.py
 * speaks them. One source, two renderers.
 */
const SCENE = [
  { name: 'The template', say: 'Here is a piece of double-stranded DNA. Somewhere inside it is the stretch we care about, the target. The two strands run in opposite directions.' },
  { name: 'Denature · 95 °C', say: 'Step one: denature. At ninety-five degrees, the hydrogen bonds between the strands break, and the two strands come apart.' },
  { name: 'Anneal · 58 °C', say: 'Step two: anneal. Cool to about fifty-eight degrees. Two short primers find the two ends of the target, one on each strand.' },
  { name: 'Extend · 72 °C', say: 'Step three: extend. At seventy-two degrees, the polymerase adds bases to the three-prime end of each primer, copying the strand underneath.' },
  { name: 'End of cycle 1', say: 'That is one cycle: two double strands where there was one. But the new strands are too long. They run on past the end of the target.' },
  { name: 'Cycle 2', say: 'Cycle two copies every strand again. A copy made from a long strand starts at one primer and stops at the other. The first strands of exactly the target length appear.' },
  { name: 'Cycle 3', say: 'Cycle three. Now an exact strand is copied into an exact partner. Two of the eight double strands are perfect copies of the target.' },
  { name: 'The takeover', say: 'From here on, the exact copies double every cycle, while the long strands only grow by two. After thirty cycles there are about a billion exact copies, and just sixty long strands.' },
];
if (typeof window === 'object') window.SCENE = SCENE;
if (typeof module === 'object' && module.exports) module.exports = SCENE;
