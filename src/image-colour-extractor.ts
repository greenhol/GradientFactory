import { RGB, OkLab } from '../shared/colour/colour';
import { converter } from '../shared/colour/colour-converter';
import { XoRng } from '../shared/xo-rng';

export enum ColourOrder {
    LIGHTNESS = 'Lightness',
    NEAREST_NEIGHBOUR = 'Nearest Neighbour',
    DOMINANCE = 'Dominance',
    RANDOM = 'Random',
}

export interface ColourCluster {
    colour: RGB;
    okLab: OkLab;
    weight: number;
}

interface KMeansResult {
    centroids: OkLab[];
    assignments: number[];
    inertia: number;
}

/**
 * Extracts the n most predominant colours from a set of pixels via
 * k-means clustering in OkLab space — Euclidean distance there
 * approximates human colour perception far better than raw RGB, so the
 * resulting cluster centroids genuinely look "predominant" rather than
 * just numerically common.
 */
class ImageColourExtractor {

    /**
     * How many independent, differently-seeded k-means attempts to run per
     * call, keeping the best (lowest-inertia) one.
     * Higher = more stable/better results, at roughly linear extra cost.
     */
    private static readonly RESTART_COUNT = 8;

    /**
     * `vividness` (0–1) scales up to this exponent: weight = chroma^exponent. Tuning:
     * 0 = off (plain mean)
     * ~2-3 = noticeable but gentle.
     * ~4-6 = strong, clearly favours accent colours.
     */
    private static readonly SEED_VIVIDNESS_MAX_EXPONENT = 6;
    private static readonly CENTROID_VIVIDNESS_MAX_EXPONENT = 6;

    private static readonly CHROMA_EPSILON = 0.001;

    public clusterColours(pixels: RGB[], k: number, vividness: number = 0): ColourCluster[] {
        const points = pixels.map((p) => converter.rgbToOkLab(p));
        const chromas = points.map((p) => this.chroma(p));
        const count = points.length;
        const clusterCount = Math.max(1, Math.min(k, count));

        let best: KMeansResult | null = null;
        for (let restart = 0; restart < ImageColourExtractor.RESTART_COUNT; restart++) {
            const rng = new XoRng(restart); // seeded by restart index: same inputs -> same set of attempts, every time
            const result = this.runKMeansOnce(points, chromas, clusterCount, vividness, rng);
            if (!best || result.inertia < best.inertia) {
                best = result;
            }
        }

        const { centroids, assignments } = best!;

        const clusterSizes = centroids.map(() => 0);
        for (const clusterIndex of assignments) {
            clusterSizes[clusterIndex]++;
        }

        return centroids
            .map((okLab, index) => ({
                colour: converter.okLabToRgb(okLab),
                okLab,
                weight: clusterSizes[index] / count,
            }))
            .filter((cluster) => cluster.weight > 0); // drop clusters nothing ended up assigned to
    }

    public orderColours(clusters: ColourCluster[], order: ColourOrder): RGB[] {
        switch (order) {
            case ColourOrder.LIGHTNESS:
                return [...clusters].sort((a, b) => a.okLab.L - b.okLab.L).map((c) => c.colour);
            case ColourOrder.DOMINANCE:
                return [...clusters].sort((a, b) => b.weight - a.weight).map((c) => c.colour);
            case ColourOrder.RANDOM:
                return this.shuffle([...clusters]).map((c) => c.colour);
            case ColourOrder.NEAREST_NEIGHBOUR:
                return this.nearestNeighbourPath(clusters).map((c) => c.colour);
            default:
                return clusters.map((c) => c.colour);
        }
    }

    private runKMeansOnce(
        points: OkLab[],
        chromas: number[],
        clusterCount: number,
        vividness: number,
        rng: XoRng,
    ): KMeansResult {
        let centroids = this.kMeansPlusPlusInit(points, chromas, clusterCount, vividness, rng);
        const count = points.length;
        const assignments = new Array<number>(count).fill(0);
        const maxIterations = 20;
        const centroidExponent = vividness * ImageColourExtractor.CENTROID_VIVIDNESS_MAX_EXPONENT;

        for (let iter = 0; iter < maxIterations; iter++) {
            let changed = false;

            for (let i = 0; i < count; i++) {
                const nearest = this.nearestCentroidIndex(points[i], centroids);
                if (assignments[i] !== nearest) {
                    assignments[i] = nearest;
                    changed = true;
                }
            }

            const sums = centroids.map(() => ({ L: 0, a: 0, b: 0, weight: 0 }));
            for (let i = 0; i < count; i++) {
                const weight = Math.pow(chromas[i] + ImageColourExtractor.CHROMA_EPSILON, centroidExponent);
                const sum = sums[assignments[i]];
                sum.L += points[i].L * weight;
                sum.a += points[i].a * weight;
                sum.b += points[i].b * weight;
                sum.weight += weight;
            }

            centroids = sums.map((sum, index) =>
                sum.weight > 0
                    ? { L: sum.L / sum.weight, a: sum.a / sum.weight, b: sum.b / sum.weight }
                    : centroids[index] // empty cluster: keep its previous position rather than NaN-ing out
            );

            if (!changed && iter > 0) break;
        }

        let inertia = 0;
        for (let i = 0; i < count; i++) {
            inertia += this.okLabDistanceSq(points[i], centroids[assignments[i]]);
        }

        return { centroids, assignments, inertia };
    }

    private chroma(p: OkLab): number {
        return Math.sqrt(p.a * p.a + p.b * p.b);
    }

    private kMeansPlusPlusInit(points: OkLab[], chromas: number[], k: number, vividness: number, rng: XoRng): OkLab[] {
        const centroids: OkLab[] = [points[Math.floor(rng.next() * points.length)]];
        const seedExponent = vividness * ImageColourExtractor.SEED_VIVIDNESS_MAX_EXPONENT;

        while (centroids.length < k) {
            const weights = points.map((p, i) => {
                const distance = Math.min(...centroids.map((c) => this.okLabDistanceSq(p, c)));
                const vividnessFactor = Math.pow(chromas[i] + ImageColourExtractor.CHROMA_EPSILON, seedExponent);
                return distance * vividnessFactor;
            });
            const total = weights.reduce((sum, w) => sum + w, 0);

            if (total === 0) {
                centroids.push(points[Math.floor(rng.next() * points.length)]);
                continue;
            }

            let threshold = rng.next() * total;
            let chosenIndex = weights.length - 1;
            for (let i = 0; i < weights.length; i++) {
                threshold -= weights[i];
                if (threshold <= 0) {
                    chosenIndex = i;
                    break;
                }
            }
            centroids.push(points[chosenIndex]);
        }

        return centroids;
    }

    private nearestCentroidIndex(point: OkLab, centroids: OkLab[]): number {
        let nearestIndex = 0;
        let nearestDistance = Infinity;
        for (let i = 0; i < centroids.length; i++) {
            const distance = this.okLabDistanceSq(point, centroids[i]);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = i;
            }
        }
        return nearestIndex;
    }

    private okLabDistanceSq(a: OkLab, b: OkLab): number {
        const dL = a.L - b.L;
        const da = a.a - b.a;
        const db = a.b - b.b;
        return dL * dL + da * da + db * db;
    }

    private shuffle<T>(array: T[]): T[] {
        const rng = new XoRng(null); // genuinely random each time — intentional, this is the "Random" order option
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(rng.next() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Greedy nearest-neighbour path: start from an arbitrary cluster, then
     * repeatedly append whichever remaining cluster is perceptually closest
     * to the last one added. Not guaranteed globally optimal (that's an
     * NP-hard travelling-salesman problem), but for a handful of stops the
     * greedy result is visually smooth and stays instant to compute.
     */
    private nearestNeighbourPath(clusters: ColourCluster[]): ColourCluster[] {
        const remaining = [...clusters];
        const path: ColourCluster[] = [remaining.shift()!];

        while (remaining.length > 0) {
            const last = path[path.length - 1];
            let nearestIndex = 0;
            let nearestDistance = Infinity;
            for (let i = 0; i < remaining.length; i++) {
                const distance = this.okLabDistanceSq(last.okLab, remaining[i].okLab);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = i;
                }
            }
            path.push(remaining.splice(nearestIndex, 1)[0]);
        }

        return path;
    }
}

export const extractor = new ImageColourExtractor();
