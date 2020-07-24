export type Fun<a, b> = (_: a) => b;

export type ListUpperBound<a, b> = b extends a ? b : a extends b ? a : never;

export type ListLowerBound<a, b> = any extends a ? never : a extends b ? never : a;

export type Pattern<a> = a extends number
    ? a | NumberConstructor
    : a extends string
    ? a | StringConstructor
    : a extends boolean
    ? a | BooleanConstructor
    : a extends Array<infer aa>
    ? [Pattern<aa>]
    : { [k in keyof a]?: Pattern<a[k]> };

export type InvertPattern<p> = p extends NumberConstructor
    ? number
    : p extends StringConstructor
    ? string
    : p extends BooleanConstructor
    ? boolean
    : p extends Array<infer pp>
    ? InvertPattern<pp>[]
    : { [k in keyof p]: InvertPattern<p[k]> };

/**
 * Constructs the builder API
 * @param value       the input value
 * @param otherwise   optional - a function that creates the fallback value
 * @param patterns    optional - an array with the patterns
 */
export const match = <a, b = any>(value: a) => builder<a, b>(value)();

const builder = <a, b, c = null>(value: a) => (
    otherwise: () => c = () => null,
    patterns: Array<[Pattern<a>, Fun<a, boolean>, Fun<a, any>, "default" | "negated"]> = []
) => ({
    /**
     * Adds a pattern
     * @param pattern   the pattern to test with
     * @param expr      the function to create the result with
     */
    with: <p extends Pattern<a>, R>(pattern: p, expr: Fun<ListUpperBound<a, InvertPattern<typeof pattern>>, R>) =>
        builder<a, R, c>(value)(otherwise, [...patterns, [pattern, () => true, expr, "default"]]),

    /**
     * Adds a pattern with an additional predicate
     * @param pattern   the pattern to test with
     * @param when      a predicate that has to be true, outside the mathing of the pattern
     * @param expr      the function to create the result with
     */
    withWhen: <p extends Pattern<a>>(
        pattern: p,
        when: Fun<ListUpperBound<a, InvertPattern<typeof pattern>>, boolean>,
        expr: Fun<ListUpperBound<a, InvertPattern<typeof pattern>>, b>
    ) => builder<a, b, c>(value)(otherwise, [...patterns, [pattern, when, expr, "default"]]),

    /**
     * Adds a negated pattern. Negated patterns don't work with `any` as input
     * @param pattern   the pattern to test with
     * @param expr      the function to create the result with
     */
    withNot: <p extends Pattern<a>>(pattern: p, expr: Fun<ListLowerBound<a, InvertPattern<typeof pattern>>, b>) =>
        builder<a, b, c>(value)(otherwise, [...patterns, [pattern, () => true, expr, "negated"]]),

    /**
     * Adds a negated pattern with an additional predicate. Negated patterns don't work with `any` as input
     * @param pattern   the pattern to test with
     * @param when      a predicate that has to be true, outside the mathing of the pattern
     * @param expr      the function to create the result with
     */
    withNotWhen: <p extends Pattern<a>>(
        pattern: p,
        when: Fun<ListLowerBound<a, InvertPattern<typeof pattern>>, boolean>,
        expr: Fun<ListLowerBound<a, InvertPattern<typeof pattern>>, b>
    ) => builder<a, b, c>(value)(otherwise, [...patterns, [pattern, when, expr, "negated"]]),

    /**
     * Sets the faalback value for when no pattern matches
     * @param otherwise   a function to create the result
     */
    otherwise: <R>(otherwise: () => R) => builder<a, b, R>(value)(otherwise, patterns),

    /**
     * Runs the match and return the result of the first matching pattern
     */
    run: (): b | c => {
        const p = patterns.find(p => {
            if (p[1](value) === false) return false;
            if (p[3] === "default") return match_pattern(value, p[0]);
            return !match_pattern(value, p[0]);
        });
        if (p === undefined) return otherwise();
        return p[2](value);
    },
});

const match_pattern = <a>(value: a, pattern: Pattern<a>): boolean => {
    if (pattern === String) {
        return typeof value === "string";
    }
    if (pattern === Boolean) {
        return typeof value === "boolean";
    }
    if (pattern === Number) {
        return typeof value === "number" && Number.isNaN(value) === false;
    }
    if (Array.isArray(pattern)) {
        if (!Array.isArray(value)) return false;
        return value.every(v => match_pattern(v, pattern[0]));
    }
    if (typeof value !== "object") {
        return value === pattern;
    }
    return Object.keys(pattern).every(k => {
        return pattern[k] === undefined ? false : match_pattern(value[k], pattern[k]);
    });
};
