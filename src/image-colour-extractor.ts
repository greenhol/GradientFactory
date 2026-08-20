import { RGB, OkLab } from '../shared/colour/colour';
import { converter } from '../shared/colour/colour-converter';

export enum ColourOrder {
    LIGHTNESS = 'Lightness',
    NEAREST_NEIGHBOUR = 'Nearest Neighbour',
    DOMINANCE = 'Dominance',
    RANDOM = 'Random',
}

export interface ColourCluster {
    colour: RGB;
    okLab: OkLab;
    weight: number; // fraction of sampled pixels assigned to this cluster
}

/**
 * Extracts the n most predominant colours from a set of pixels via
 * k-means clustering in OkLab space — Euclidean distance there
 * approximates human colour perception far better than raw RGB, so the
 * resulting cluster centroids genuinely look "predominant" rather than
 * just numerically common.
 *
 * Clustering and ordering are exposed as two separate public methods so
 * that changing only the sort order never re-runs the randomly-seeded
 * clustering step, which could otherwise silently return a different
 * palette than what's currently on screen.
 */
class ImageColourExtractor {

    public clusterColours(pixels: RGB[], k: number): ColourCluster[] {
        const points = pixels.map((p) => converter.rgbToOkLab(p));
        const count = points.length;
        const clusterCount = Math.max(1, Math.min(k, count));

        let centroids = this.kMeansPlusPlusInit(points, clusterCount);
        const assignments = new Array<number>(count).fill(0);
        const maxIterations = 20;

        for (let iter = 0; iter < maxIterations; iter++) {
            let changed = false;

            for (let i = 0; i < count; i++) {
                const nearest = this.nearestCentroidIndex(points[i], centroids);
                if (assignments[i] !== nearest) {
                    assignments[i] = nearest;
                    changed = true;
                }
            }

            const sums = centroids.map(() => ({ L: 0, a: 0, b: 0, count: 0 }));
            for (let i = 0; i < count; i++) {
                const sum = sums[assignments[i]];
                sum.L += points[i].L;
                sum.a += points[i].a;
                sum.b += points[i].b;
                sum.count++;
            }

            centroids = sums.map((sum, index) =>
                sum.count > 0
                    ? { L: sum.L / sum.count, a: sum.a / sum.count, b: sum.b / sum.count }
                    : centroids[index] // empty cluster: keep its previous position rather than NaN-ing out
            );

            if (!changed && iter > 0) break;
        }

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

    /**
     * Orders an already-clustered palette. Pure re-sort — no clustering here.
     */
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

    private kMeansPlusPlusInit(points: OkLab[], k: number): OkLab[] {
        const centroids: OkLab[] = [points[Math.floor(Math.random() * points.length)]];

        while (centroids.length < k) {
            const distances = points.map((p) => Math.min(...centroids.map((c) => this.okLabDistanceSq(p, c))));
            const total = distances.reduce((sum, d) => sum + d, 0);

            if (total === 0) {
                centroids.push(points[Math.floor(Math.random() * points.length)]);
                continue;
            }

            let threshold = Math.random() * total;
            let chosenIndex = distances.length - 1;
            for (let i = 0; i < distances.length; i++) {
                threshold -= distances[i];
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
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
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
