//! Parity with fixtures/sort.ts: a port of @geastack/parallel's `sorted`, the
//! fixed-shape sample sort the TypeScript runs. The input is cut into 256
//! leaves, each a copy sorted with the standard stable sort. Eight samples
//! from every sorted leaf, sorted, choose 255 splitters; each leaf finds its
//! cut point for every splitter by binary search (forced non-decreasing).
//! Output piece p gathers its range from every leaf, in leaf order, and
//! stable-sorts it; the pieces are concatenated into a result sized once.
//! Every step that is a task there is a Rayon task here, and the comparator is
//! the TypeScript's `(a, b) => a - b`. src/idiomatic/sort.rs keeps
//! `par_sort_by`.
use rayon::prelude::*;

const SORT_LEAVES: usize = 256;
const SORT_SAMPLES: usize = 8;

fn boundary(leaf: usize, leaves: usize, length: usize) -> usize {
    leaf * length / leaves
}

fn upper_bound<T: Copy>(run: &[T], value: T, compare: &impl Fn(T, T) -> i64) -> usize {
    let (mut low, mut high) = (0, run.len());
    while low < high {
        let middle = (low + high) / 2;
        if compare(run[middle], value) > 0 {
            high = middle;
        } else {
            low = middle + 1;
        }
    }
    low
}

fn sorted<T: Copy + Send + Sync>(items: &[T], compare: impl Fn(T, T) -> i64 + Sync) -> Vec<T> {
    let length = items.len();
    if length == 0 {
        return Vec::new();
    }
    let order = |left: &T, right: &T| compare(*left, *right).cmp(&0);

    let leaves: Vec<Vec<T>> = (0..SORT_LEAVES)
        .into_par_iter()
        .map(|leaf| {
            let mut out =
                items[boundary(leaf, SORT_LEAVES, length)..boundary(leaf + 1, SORT_LEAVES, length)].to_vec();
            out.sort_by(order);
            out
        })
        .collect();

    let mut pool: Vec<T> = Vec::new();
    for run in &leaves {
        for sample in 1..=SORT_SAMPLES {
            let at = sample * run.len() / (SORT_SAMPLES + 1);
            if at < run.len() {
                pool.push(run[at]);
            }
        }
    }
    pool.sort_by(order);
    let splitters: Vec<T> = (1..SORT_LEAVES).map(|piece| pool[piece * pool.len() / SORT_LEAVES]).collect();

    let cuts: Vec<Vec<usize>> = (0..SORT_LEAVES)
        .into_par_iter()
        .map(|leaf| {
            let run = &leaves[leaf];
            let mut at = vec![0];
            let mut previous = 0;
            for &splitter in &splitters {
                let cut = upper_bound(run, splitter, &compare);
                previous = if cut > previous { cut } else { previous };
                at.push(previous);
            }
            at.push(run.len());
            at
        })
        .collect();

    let pieces: Vec<Vec<T>> = (0..SORT_LEAVES)
        .into_par_iter()
        .map(|piece| {
            let mut out = Vec::new();
            for leaf in 0..SORT_LEAVES {
                let run = &leaves[leaf];
                let bounds = &cuts[leaf];
                out.extend_from_slice(&run[bounds[piece]..bounds[piece + 1]]);
            }
            out.sort_by(order);
            out
        })
        .collect();

    let total = pieces.iter().map(|piece| piece.len()).sum();
    let mut result = Vec::with_capacity(total);
    for piece in &pieces {
        result.extend_from_slice(piece);
    }
    result
}

fn main() {
    parallel_bench::bench(|size| {
        let n = size as usize;
        let mut items = Vec::new();
        let mut seed: i64 = 42;
        for _ in 0..n {
            seed = seed * 16807 % 2147483647;
            items.push(seed);
        }
        let result = sorted(&items, |a, b| a - b);
        result.iter().fold(0i64, |checksum, value| (checksum * 31 + value) % 1000000007)
    });
}
