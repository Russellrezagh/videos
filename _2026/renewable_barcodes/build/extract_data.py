#!/usr/bin/env python3
"""Extract the measurements the film draws from the authors' public repository.

Nguyen Ba, Cvijović, Rojas Echenique et al., Nature 575, 494-499 (2019);
data and code: https://github.com/icvijovic/lineage-tracking

Usage:  python3 build/extract_data.py <path to lineage-tracking clone> [src dir]

Writes src/data.json (clones, Muller layout, noise model, WGS calls, fitness assays, replay
experiments) and src/raw_<POP>.webp (every barcoded sublineage above 0.1%, as in Fig. 1d).
The Muller layout is a Python 3 port of `assign_muller_lower` in the authors' tree_utils.py, so the
film's diagrams stack lineages exactly as the published Figure 2 does.
"""
import base64, colorsys, csv, glob, io, json, math, os, random, re, sys, bz2
import numpy as np
from PIL import Image

REPO = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'src')
DATA = os.path.join(REPO, 'data')

POPS = {'YPD': {'code': 'C1', 'epochs': 9}, 'YPA': {'code': 'D1', 'epochs': 10}}
PER_EPOCH = 11                 # ten 10-generation intervals plus one barcoding interval
BC_WIDTH = 50                  # drawn width of a barcoding interval, in generations
RAW_W, RAW_H = 1500, 600       # pixel size of the raw-barcode image


def q(a, s=1e4):
    """compact integer encoding for frequency arrays"""
    return [int(round(v * s)) for v in a]


def read_rows(path):
    with open(path) as f:
        return list(csv.reader(f, delimiter='\t'))


# ───────────────────────── clones and the Muller layout (port of tree_utils.py) ─────────────────────────
def build_tree(ids):
    parent = {}
    for cid in ids:
        parts = cid.split('_')
        anc = ['_'.join(parts[:l]) for l in range(len(parts) - 1, 0, -1)]
        parent[cid] = next((a for a in anc if a in ids), '')
    children = {cid: [c for c in ids if parent[c] == cid] for cid in [''] + ids}
    return parent, children


def assign_muller_lower(ids, F, children, lower, baseline, avail):
    mid, below, above = ids[0], ids[1::2], ids[2::2]
    fb = sum((F[i] for i in below), np.zeros_like(baseline))
    fa = sum((F[i] for i in above), np.zeros_like(baseline))
    midline = 0.5 * avail
    sb = midline - F[mid] / 2 - fb
    midline[sb < 0] -= sb[sb < 0]
    sa = (avail - midline) - F[mid] / 2 - fa
    midline[sa < 0] += sa[sa < 0]
    lower[mid] = baseline + midline - F[mid] / 2
    kids = children[mid]
    if kids:
        ordered = [x for _, x in sorted(((F[k].max(), k) for k in kids), reverse=True)]
        assign_muller_lower(ordered, F, children, lower, lower[mid], F[mid].copy())
    if below:
        assign_muller_lower(below, F, children, lower, baseline, midline - F[mid] / 2)
    if above:
        assign_muller_lower(above, F, children, lower, baseline + midline + F[mid] / 2, avail - midline - F[mid] / 2)


def muller(own, ids):
    """own clone frequencies → (lineage frequency incl. descendants, lower edge) for every clone"""
    parent, children = build_tree(ids)
    F = {}
    for cid in ids:
        F[cid] = own[cid] + sum((own[c] for c in ids if c != cid and c.startswith(cid + '_')), np.zeros_like(own[cid]))
    basal = children['']
    ordered = [x for _, x in sorted(((F[b].max(), b) for b in basal), reverse=True)]
    n = len(next(iter(own.values())))
    lower = {}
    assign_muller_lower(ordered, F, children, lower, np.zeros(n), np.ones(n))
    return F, lower, parent


def read_fitness(path, scale):
    out = {}
    rows = read_rows(path)
    for r in rows[1:]:
        out[r[0]] = [float(r[1]) / scale, float(r[2]) / scale, float(r[3]) / scale]
    return out


def clones_for(pop):
    code, nE = POPS[pop]['code'], POPS[pop]['epochs']
    nT = nE * PER_EPOCH
    rows = read_rows(f'{DATA}/accepted_clones/{code}-clone_frequencies.tsv')
    own = {r[1]: np.array([float(v) for v in r[2:2 + nT]]) for r in rows[1:]}
    ids = [r[0] for r in read_rows(f'{DATA}/accepted_clones/{code}_clone_list.tsv')]
    ids = [i for i in ids if i in own]
    F, lower, parent = muller(own, ids)
    evo = read_fitness(f'{DATA}/accepted_clones/{code}-evolution_fitnesses.tsv', 10.0)   # per generation
    bc = read_fitness(f'{DATA}/accepted_clones/{code}-barcoding_fitnesses.tsv', 1.0)     # per barcoding interval
    order = sorted(ids, key=lambda c: (len(c.split('_')), ids.index(c)))
    index = {c: i for i, c in enumerate(order)}
    out = []
    for cid in order:
        depth = len(cid.split('_'))
        s = (depth - 1) * PER_EPOCH
        xe, xb = evo[cid][0], bc[cid][0]
        out.append({
            'id': cid, 'depth': depth, 'parent': index.get(parent[cid], -1), 's': s,
            'xe': round(xe * 100, 3), 'xeCI': [round(v * 100, 3) for v in evo[cid][1:]],
            'xb': round(xb * 100, 2), 'xbCI': [round(v * 100, 2) for v in bc[cid][1:]],
            # SI eq. 25: average of the two conditions, per generation, in percent
            'xa': round((100 * xe + xb) / 200 * 100, 3),
            'own': q(own[cid][s:]), 'F': q(F[cid][s:]), 'lo': q(lower[cid][s:]),
        })
    anc = 1 - sum(F[c] for c in ids if parent[c] == '')
    return out, q(anc)


# ───────────────────────── noise model: κ and the drift of lineages near 40 reads ─────────────────────────
def read_kappas(code):
    rows = read_rows(f'{DATA}/error_model/{code}-kappas.tsv')
    t = [int(float(v)) for v in rows[0]]
    k = [float(v) for v in rows[1]]
    lo = [float(v) for v in rows[2]]
    hi = [float(v) for v in rows[3]]
    return {'t': t, 'k': k, 'lo': lo, 'hi': hi}


def coverage(code):
    return {int(r[0]): int(r[1]) for r in (l.split() for l in open(f'{DATA}/barcode_frequencies/{code}/{code}_read_coverage.txt'))}


def predicted_hist(r_before, ratio, kappa, edges):
    """SI eq. 7, integrated over each bin: p(r'|r) for every lineage, summed"""
    xs = np.linspace(edges[0], edges[-1], 4000)
    dx = xs[1] - xs[0]
    m = np.sqrt(np.outer(r_before * ratio, np.ones_like(xs)))
    u = np.sqrt(xs)
    dens = np.sqrt(np.sqrt(r_before * ratio)[:, None] / (4 * math.pi * kappa * xs[None, :] ** 1.5)) * np.exp(-(u[None, :] - m) ** 2 / kappa)
    dens = dens.sum(axis=0)
    out = np.zeros(len(edges) - 1)
    idx = np.clip(np.searchsorted(edges, xs, side='right') - 1, 0, len(out) - 1)
    np.add.at(out, idx, dens * dx)
    return out


def noise_for(pop, kap):
    """histogram of next-timepoint reads for lineages that had 40 ± 2√40 reads (Fig. 1d centre)"""
    code = POPS[pop]['code']
    cov = coverage(code)
    rows = read_rows(f'{DATA}/barcode_frequencies/{code}/{code}-BC1_frequencies.txt')
    head = rows[0]
    nb = next(i for i, h in enumerate(head) if h.isdigit())
    times = [int(h) for h in head[nb:]]
    fr = np.array([[float(v) for v in r[nb:]] for r in rows[1:]])
    lo, hi = 40 - 2 * math.sqrt(40), 40 + 2 * math.sqrt(40)
    edges = np.linspace(1, 160, 81)
    res = {}
    rnd = random.Random(7)
    for name, (ta, tb) in {'evolution': (20, 30), 'barcoding': (100, 110)}.items():
        ia, ib = times.index(ta), times.index(tb)
        ra, rb = fr[:, ia] * cov[ta], fr[:, ib] * cov[tb]
        sel = (ra >= lo) & (ra <= hi)
        kappa = kap['k'][kap['t'].index(tb)]
        obs, _ = np.histogram(rb[sel], bins=edges)
        pred = predicted_hist(ra[sel], cov[tb] / cov[ta], kappa, edges)
        # a sample of all (r_t, r_t+Δt) pairs for the drift cloud
        both = np.where((ra >= 1) | (rb >= 1))[0].tolist()
        pick = rnd.sample(both, min(2600, len(both)))
        res[name] = {'t': [ta, tb], 'kappa': kappa, 'n': int(sel.sum()), 'edges': [round(e, 2) for e in edges.tolist()],
                     'obs': obs.tolist(), 'pred': [round(v, 2) for v in pred.tolist()],
                     'pairs': [[round(float(ra[i]), 1), round(float(rb[i]), 1)] for i in pick],
                     'R': [cov[ta], cov[tb]]}
    return res


# ───────────────────────── raw barcode trajectories, as a picture (Fig. 1d left) ─────────────────────────
def display_x(E, k):
    """generation-like display coordinate of timepoint k (0..10) in epoch E (1-based)"""
    return (E - 1) * (100 + BC_WIDTH) + 10 * k


def raw_picture(pop):
    """Every sublineage above 0.1% gets its own colour. Smaller sublineages are drawn in the colour of
    their nearest ancestor that exceeds 0.1% in the same epoch (white if none does), as in Fig. 1d."""
    code, nE = POPS[pop]['code'], POPS[pop]['epochs']
    rnd = random.Random(11 + nE)
    color_of = {}

    def color(key):
        if key not in color_of:
            if len(key) == 1:
                h = rnd.random()
                s, l = 0.45 + 0.35 * rnd.random(), 0.45 + 0.2 * rnd.random()
            else:
                h0, l0, s0 = colorsys.rgb_to_hls(*[c / 255 for c in color(key[:-1])])
                h, s, l = (h0 + rnd.uniform(-0.06, 0.06)) % 1, min(1, s0 * rnd.uniform(0.85, 1.15)), min(0.74, max(0.32, l0 + rnd.uniform(-0.13, 0.13)))
            color_of[key] = tuple(int(255 * c) for c in colorsys.hls_to_rgb(h, l, s))
        return color_of[key]

    epochs, counts, shown = [], [], 0
    for E in range(1, nE + 1):
        rows = read_rows(f'{DATA}/barcode_frequencies/{code}/{code}-BC{E}_frequencies.txt')
        head = rows[0]
        nb = next(i for i, h in enumerate(head) if h.isdigit())
        t0 = (E - 1) * 110
        cols = [head.index(str(t0 + 10 * k)) for k in range(PER_EPOCH)]
        recs = sorted(((tuple(r[1:nb]), np.array([float(r[c]) for c in cols])) for r in rows[1:]), key=lambda kv: kv[0])
        counts.append(len(recs))
        big = set()
        for d in range(1, E):
            sums = {}
            for key, f in recs:
                sums[key[:d]] = sums.get(key[:d], 0) + f
            big |= {p for p, v in sums.items() if v.max() >= 1e-3}

        def family(par):
            for d in range(len(par), 0, -1):
                if par[:d] in big:
                    return color(par[:d])
            return None
        keys, fr, rgb, edge = [], [], [], []
        run, run_parent = None, None

        def flush():
            keys.append(('gap', run_parent)); fr.append(run); rgb.append(family(run_parent)); edge.append(False)
        for key, f in recs:
            par = key[:-1]
            if f.max() >= 1e-3:
                if run is not None:
                    flush(); run = None
                keys.append(key); fr.append(f); rgb.append(color(key)); edge.append(True)
                shown += 1
            else:
                if run is not None and par != run_parent:
                    flush(); run = None
                run = f.copy() if run is None else run + f
                run_parent = par
        if run is not None:
            flush()
        epochs.append((keys, np.array(fr), rgb, edge))

    total_w = display_x(nE, 10)
    img = np.full((RAW_H, RAW_W, 3), 255, np.uint8)
    yc = (np.arange(RAW_H)[::-1] + 0.5) / RAW_H     # frequency at each pixel row's centre, bottom = 0
    for px in range(RAW_W):
        u = (px + 0.5) / RAW_W * total_w
        E = int(u // (100 + BC_WIDTH)) + 1
        local = u - (E - 1) * (100 + BC_WIDTH)
        if E > nE or (local > 100 and E == nE):
            continue
        if local <= 100:
            keys, fr, rgb, edge = epochs[E - 1]
            k = local / 10
            k0 = min(int(k), PER_EPOCH - 2)
            a = k - k0
            f = fr[:, k0] * (1 - a) + fr[:, k0 + 1] * a
        else:
            # barcoding interval: the next epoch's sublineages fan out from their parents' bands
            a = (local - 100) / BC_WIDTH
            pkeys, pfr = epochs[E - 1][0], epochs[E - 1][1][:, -1]
            pk = {key: i for i, key in enumerate(pkeys) if key[0] != 'gap'}
            keys, fr, rgb, edge = epochs[E]
            f_end = fr[:, 0]
            parent = [key[1] if key[0] == 'gap' else key[:-1] for key in keys]
            share = {}
            for i, par in enumerate(parent):
                share[par] = share.get(par, 0) + f_end[i]
            f_start = np.array([pfr[pk[par]] * f_end[i] / share[par] if par in pk and share[par] > 0 else f_end[i]
                                for i, par in enumerate(parent)])
            f = f_start * (1 - a) + f_end * a
        top = np.cumsum(f)
        pal = np.array([c if c is not None else (255, 255, 255) for c in rgb] + [(255, 255, 255)], np.uint8)
        idx = np.searchsorted(top, yc, side='right')
        col = pal[np.minimum(idx, len(pal) - 1)]
        # a hairline under every lineage above 0.1%, like the 0.2 pt outlines of the published figure
        edge_rows = np.diff(idx, prepend=idx[0]) != 0
        is_edge = np.array(edge + [False])[np.minimum(idx, len(edge))]
        col[edge_rows & is_edge] = (col[edge_rows & is_edge] * 0.72).astype(np.uint8)
        img[:, px] = col
    for E in range(1, nE):       # grey barcoding bars, as in the paper
        x0 = int(display_x(E, 10) / total_w * RAW_W)
        x1 = int((display_x(E, 10) + BC_WIDTH) / total_w * RAW_W)
        img[:, x0:x1] = (img[:, x0:x1] * 0.72 + 0.28 * 77).astype(np.uint8)
    buf = io.BytesIO()
    Image.fromarray(img).save(buf, 'WEBP', quality=88, method=6)
    with open(os.path.join(OUT, f'raw_{pop}.webp'), 'wb') as fh:
        fh.write(buf.getvalue())
    print(f'  raw {pop}: {shown} sublineage-epochs above 0.1%, {len(buf.getvalue()) / 1e3:.0f} kB')
    return counts


# ───────────────────────── whole-genome sequencing, fitness assays, replay ─────────────────────────
def gene_index():
    genes = {}
    with bz2.open(f'{DATA}/wgs/genome_feature_files/reference.gff3.bz2', 'rt') as fh:
        for line in fh:
            if line.startswith('#'):
                continue
            p = line.rstrip('\n').split('\t')
            if len(p) < 9 or p[2] != 'gene':
                continue
            attrs = dict(kv.split('=', 1) for kv in p[8].split(';') if '=' in kv)
            genes.setdefault(p[0], []).append((int(p[3]), int(p[4]), attrs.get('gene') or attrs.get('Name')))
    return genes


def wgs_for(pop, genes):
    code = POPS[pop]['code']
    out = []
    with open(f'{DATA}/wgs/filtered/{code}_filtered_timecourse.txt') as fh:
        fh.readline()
        for line in fh:
            items = [s.strip() for s in line.strip().split(', ')]
            chrom, pos, allele = items[0], int(items[1]), items[2]
            ts = items[3].split()
            alt = [float(v) for v in items[4].split()]
            dep = [float(v) for v in items[5].split()]
            hit = [g for g in genes.get(chrom, []) if g[0] <= pos <= g[1]]
            out.append({'chr': chrom, 'pos': pos, 'allele': allele, 'gene': hit[0][2] if hit else None,
                        't': ts, 'f': [round(a / d, 3) if d > 0 else None for a, d in zip(alt, dep)], 'depth': dep})
    return out


def assays_for(pop):
    rows = read_rows(f'{DATA}/barcode_frequencies/Fitness_measurements/fitnesses_only_{POPS[pop]["code"]}.csv')
    return [[int(r[1]), round(float(r[2]) * 100, 3)] for r in rows[1:]]


def replay(clone_ids):
    """YPA replay from 8.90: two replicate populations evolved 150 generations without re-barcoding"""
    reps = {}
    for rep in ['D1R1', 'D1R2']:
        rows = read_rows(f'{DATA}/barcode_frequencies/{rep}/{rep}-BC8_frequencies.txt')
        head = rows[0]
        nb = next(i for i, h in enumerate(head) if h.isdigit())
        times = [int(h) for h in head[nb:]]
        own = {}
        for r in rows[1:]:
            lid = '_'.join(r[1:nb])
            parts = lid.split('_')
            anc = next((('_'.join(parts[:l])) for l in range(len(parts), 0, -1) if '_'.join(parts[:l]) in clone_ids), None)
            if anc is None:
                continue
            f = np.array([float(v) for v in r[nb:]])
            own[anc] = own.get(anc, 0) + f
        ids = [c for c in clone_ids if c in own]
        F, lower, parent = muller(own, ids)
        reps[rep] = {'t': times, 'clones': {c: {'F': q(F[c]), 'lo': q(lower[c])} for c in ids}}
    return reps


def main():
    os.makedirs(OUT, exist_ok=True)
    genes = gene_index()
    out = {'source': 'github.com/icvijovic/lineage-tracking', 'perEpoch': PER_EPOCH, 'bcWidth': BC_WIDTH, 'pops': {}}
    for pop, cfg in POPS.items():
        code = cfg['code']
        print(pop)
        clones, anc = clones_for(pop)
        kap = read_kappas(code)
        rows = read_rows(f'{DATA}/barcode_frequencies/{code}/{code}-BC1_frequencies.txt')
        counts = raw_picture(pop)
        cov = coverage(code)
        out['pops'][pop] = {
            'code': code, 'epochs': cfg['epochs'], 'popBarcode': rows[1][0],
            'clones': clones, 'ancestor': anc, 'kappa': kap,
            'coverage': [cov[k] for k in sorted(cov)][:cfg['epochs'] * PER_EPOCH],
            'lineagesPerEpoch': counts, 'noise': noise_for(pop, kap),
            'wgs': wgs_for(pop, genes), 'assays': assays_for(pop),
        }
        print(f'  {len(clones)} clones, {len(out["pops"][pop]["wgs"])} WGS mutations, lineages/epoch {counts}')
    out['replay'] = replay([c['id'] for c in out['pops']['YPA']['clones']])
    path = os.path.join(OUT, 'data.json')
    with open(path, 'w') as fh:
        json.dump(out, fh, separators=(',', ':'))
    print(f'wrote {path} ({os.path.getsize(path) / 1e3:.0f} kB)')


if __name__ == '__main__':
    main()
