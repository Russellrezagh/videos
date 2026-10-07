// The three 3D landscapes, as scene builders called from chapters 4, 6 and 8.
window.FILM = window.FILM || { parts: [], papers: {} };
FILM.landscapes = FILM.landscapes || {};
(function () {
  'use strict';
  const { Space3, Surface3, Path3, Dot3, Arrow3, Label3, ramp, grid } = MV3;

  FILM.landscapes.logits = function (ctx) {
    const { C, A, BAND, video, par, wait } = ctx;
    const J = (u, v) => RL.expectedReward(RL.softmax([u, v, 0]), BAND.r);
    const HEIGHT = ramp(['#1E2433', '#3B3346', '#7A5634', '#F0AC5F', '#FFE2B3'], 0, 1);
    video.scene('land-logits', 'The reward landscape', (S) => {
      const sp = S.add(new Space3({ unit: 44, phi: 62, theta: -68, zoom: 1, cz: 1.5 }).at(-200, 40).hidden());
      const surf = new Surface3((u, v, p) => [u, v, 4 * p.h * J(u, v)], { u: [-7, 7], v: [-7, 7], res: [36, 36], color: (u, v) => HEIGHT(J(u, v)), props: { h: 0 } });
      sp.add(...grid({ x: [-7, 7], y: [-7, 7], step: 1 }), surf);
      const dt = new Dot3([0.9, 0.5, 4 * J(0.9, 0.5) + 0.05], { r: 10, color: C.WHITE });
      const lab = new Label3('sure of 51', [6, -5, 4.2], { size: 34, color: C.GREEN });
      const ar = new Arrow3([0.9, 0.5, 0], [0.9 + 3, 0.5 - 1.3, 0], { color: C.YELLOW, width: 6 });
      sp.add(dt, lab, ar);
      S.beat('Test beat one, the floor.', A.FadeIn(sp), A.Set(sp, { phi: 0, theta: -90 }, 0.01));
      S.beat('Test beat two, raise it.', A.Set(surf, { h: 1 }, 3), A.Set(sp, { phi: 62, theta: -68 }, 3));
      S.beat('Test beat three, rotate.', A.Set(sp, { theta: -20 }, 4));
    });
  };
})();
