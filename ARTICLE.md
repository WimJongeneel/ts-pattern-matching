# Pattern Matching in TypeScript with Record and Type Patterns

Pattern matching allows programmers to compare data with defined structures to easily pick one of the available expressions. Many languages that are designed as 'functional programming languages' have built-in keywords for pattern matching. Well known examples are F# (`match ... with`) or Haskell (`case ... of`). One language that works very well with functional programming but lacks those features is TypeScript. In this article we will build a small libary to add support for pattern matching to TypeScript. We will implement a lot of advanced features like record, wildcard and array patterns. We will also make sure that the type inference of TypeScript understands out patterns and narrows the types when ever possible.

## The Basic Fundament

We start of with a builder API that mimics the syntacs of the match keyword in F#. This will serve as the fundament of the library on which we will build more sophisticated features. The starting point is the `match` function that we pass the input for the patterns. This returns a builder on which we can call `with` to add a pattern, can call `otherwise` to set the fallback value and can call `run` to find the matching pattern and execute its expression.

```ts
const match = <a, b>(value: a, otherwise: () => b = () => undefined, patterns: Array<[a, fun<a, b>]> = []) => ({
  with: (pattern: a, expr: fun<a, b>) =>
    match(value, otherwise, [...patterns, [pattern, expr]]),
  otherwise: (otherwise: () => b) => match(value, otherwise, patterns)
  run: (): b => {
    const p = patterns.find(p => match_pattern(value, p[0]))
    if (p == undefined) return otherwise()
    return p[1](value)
  }
})

const match_pattern = <a>(value: a, pattern: a) => a === a
```

This implementation is at the moment nothing more than a (complicated) lookup table, but we will be adding all the promised features futher down the line. Now we have drawn the first skectch down, we can continue with defining extra sophisticated requirements to expand the idea to a truly powerful tool. An example of how to use our library:

```ts
match(1)
  .with(1,    v => v * 2)
  .with(2,    v => v * v)
  .otherwise(() => -1)
  .run()
```

## Record Patterns

In modern applications data comes in a wild variety of complex data structures. A common application of pattern matching is checking if a given value matches a certain data structure. This is where pattern matching starts becoming more declarative then traditional if-statements for which the developer need to provide a list of conditions that implices the structure. For example, we could check how many dimension a vector has.

```ts
let vector = { x: 1, y: 1 }
if(vector.z != undefined) return 'vector3'
if(vector.y != undefined) return 'vector2'
return 'vector1'
```

The pattern matching way of doing this would be to define the structure we expect and execute the relevant expression based on those. An example of this is found below. Note that those pattens describe more that we did in our if statement. We don't assume anymore that we have an x and y when we know that z is present. This will lead to more predicable code and less cryptic errors when invalid data infiltrates our application.

```ts
match(vector)
  .with({ x: 1, y: 1, z: 1 }, () => 'vector3')
  .with({ x: 2, y:1 },        () => 'vector2')
  .with({ x: 1 },             () => 'vector1')
  .otherwise(                 () => 'no match')
  .run()
```

> For now we work with 1 for all number. Later on we will add wildcard patterns to be able to match on all numbers.

Those patterns are called record patterns and they are the first addition we will add to our pattern matching. Record patterns allow us to create patterns that describe the stucture of an object and will match when the input data matches the provided structure. A record pattern itself is an object where the values are the patterns for their respective keys. Nesting will be fully supported to allow the description of very complex objects.

To implement this feature we will introduce a new type `Pattern<a>` that will describe the valid patterns for a given type `a`. For now the implementation is the same as the `Partial` type of the standard library, but we will also expand this type later on. At last we update the `match_pattern` function to support objects.

```ts
type Pattern<a> = { [ k in keyof a ]?: Pattern<a[k]> }

const match_pattern = <a>(value: a, pattern: Pattern<a>) => typeof(value) != 'object' ? value === pattern :
  Object.keys(pattern).every(k => pattern[k] == undefined ? false : match_pattern(value[k], pattern[k]))
```

> Record patterns are very usefull for parsing untyped data from external sources, especially when combined with type patterns. I will show some examples of this later on.

## Type Inference

The next feature is about the flow based typesystem of TypeScript. One of the really good things about TypeScript is that it narrows types down whenever a condition rules out possible values. We would like this to also happen with our pattern matching as well. Let's define an Option monad to use as an example:

```ts
type Option<a> = { kind: 'none' } | { kind: 'some', value: a }

let val: Option<string> = { kind: 'some', value: 'hello' }

// Conditinal way of geting the value
if(val.kind == 'some') return val.value

// Pattern matching way of geting the value
match(val)
  .with({ kind: 'some' }, o => o.value) // TypeError!
  .run()
```

We what to make sure that the variant with the pattern matching is not giving a type error, just like the is statement. This is happing because the compiler has no way of figuring out that the pattern implices that the option is a Some and does contains a value. This will require a new definition of the `with` function to incorporate the type inference. Luckily TypeScript comes with a powerfull typesystem that provides the tools we need to solve challenges like this. We will be using the `typeof` operator to get the exact type of the pattern that the user provided and use `Extract` to narrow down the type of `a`. The code looks as follows:

```ts
with: <p extends Pattern<a>>(
  pattern: p,
  expr: (a: Extract<a, typeof pattern>) => b
) => match(value, otherwise, [...patterns, [pattern, expr]])
```

We introduced a new generic type `p` that has to be a subset of `Pattern<a>`. Now we can use this stricter subset of `p` to narrow down `a`. The `typeof` operator is used to force TypeScript to inference the type of the provided pattern, as we want the smallest possible subset and not the full `Pattern<a>` type. The entire quality of our type inference depends on how good we are in narrowing down `p`! With those changes our example with option will have the correct types infered as proven by this screenshot:

[Screenshot to proof it]

While this solution adds a lot of power and safety to our library when dealing with typed (discrimated) unions, there is one major problem with using the `Extract` type. If the input type of our pattern is `any` (such as values form an API call) there will not be any type inference and the input type will be mapped to `any` (or `never` in some cases). This means that in its current state the library is not usable for parsing untyped data. The following screenshot highligths the problem:

[screenhot where any goes to any]

This behaviour can be explained when we look to the definition of `Extract`. It is defined as `a extends b ? a : never`. Because the type returns `a` (in our case `any`), we will always get `any` back when `any` goes in. The solution to this problem is to make a custom `extract` type that first checks if `b` extends `a` before it goes through the same logic as `Extract`. This means that when `a` is `any`, `b` (the pattern) will be returned. The formal name of this is Least Upper Bound:

```ts
type LeastUpperBound<a, b> = b extends a ? b : a extends b ? a : never
```

With this new `LeastUpperBound` type we have type inference that works on both typed and untyped data. Now we can match on exact values, branches of unions and on the structure of untyped data.

## Wildcard Patterns

A common task when building applications in TypeScript is loading and parsing data from external sources like a REST API. Every somewhat experienced developer will know the pain of debugging parsing logic that doesn't fully check all cases and is riddled with assumptions. Let's define an code to make this a more practical argument:

```ts
interface Blog { id: number, title: string }

// Will be { id: number, title: string } | { errorMessage: string }
let httpResult: any = /* API logic. */

let result = httpResult.errorMesage
  ? new Error(httpResult.errorMessage)
  : ({ id: httpResult.Id, title: httpResult.Title })
```

The very observant readers will have noticed that there is one typo that will cause this code to always return an Error with `undefined` inside. But for most developer this can lead to a few grey hairs before they find the reason that the application always shows an error while their looks to be noting wrong. If we could define record patterns that support wildcards for the primitive types we should be able to avoid those issues by writing code like this and get a meaningful error when the parsing fails:

```ts
match<any, Blog | Error>(httpResult)
  .with({Id: Number, Title: String }, r => ({id: r.Id, title: r.Title}))
  .with({errorMessage: String}, r => new Error(r.errorMessage))
  .otherwise(() => new Error('Client parse error'))
  .run()
```

Wildcard patterns are patterns that try to match the input value with a specific type. This is useful when we want to process data that is of an union type (like `string | number`) or is not typed at all (like a response from an API call). We will introduce a handfull of new patterns for this feature: `String`, `Number` and `Boolean` that will match their corresponding primitive types. We will also make sure that this feature properly intergrates with the type inference.

The first step is to update the type `Pattern<a>` to allow the patterns to be used. For example, if the input type is `number` we want to allow a match on both a `number` and `Number`. For this we use conditional types to map `a` to `Pattern<a>`:

```ts
type Pattern<a> =
  a extends number ? a | NumberConstructor :
  a extends string ? a | StringConstructor :
  a extends boolean ? a | BooleanConstructor :
  { [k in keyof a]?: Pattern<a[k]> }
```

This allows us to write a pattern like `{ Id: Number }` to match the id with any number. The next step is to implement the actual matching in the `match_pattern` function:

```ts
const match_pattern = <a>(value: a, pattern: Pattern<a>) => {
  if (pattern === String) return typeof(value) == 'string'
  if (pattern === Boolean) return typeof(value) == 'boolean'
  if (pattern === Number) return typeof(value) == 'number' && Number.isNaN(value) == false
  if(typeof (value) != 'object') return value === pattern
  return Object.keys(pattern).every(k => pattern[k] == undefined ? false : match_pattern(value[k], pattern[k]))
}
```

One last thing to do is undoing the modifications we made to `a` before we use the patterns to narrow down the input type. For this we need to map the contructor types to their instance types. In this way a match on `String` will give you a `string` in the result, like you would expect. We also have add this type to the with function:

```ts
type InvertPattern<p> =
  p extends NumberConstructor ? number :
  p extends StringConstructor ? string :
  p extends BooleanConstructor ? boolean :
  { [k in keyof p]: InvertPattern<p[k]> }

with: <p extends Pattern<a>>(
  pattern: p,
  expr: (a: extract<a, InvertPattern<typeof pattern>>) => b
) => match(value, otherwise, [...patterns, [pattern, expr]]),
```

With record and wilcard patterns in place our library has grown to a powerfull tool for dealing with parsing of data.

## Array Patterns

The last feature we will be adding are array patterns. Array patterns allow us to check if all items in an array match a pattern. The pattern for an array will be defined as an array with 1 item: the pattern that will be used for all items.

We will again start by updating our types and update the implementation later on. To create the type for the array pattern we will use the `infer` keyword to get the inner type of the array. With this type we will define a singleton array with a pattern for the inner type. The `InvertPattern` type will use the same features to revert this process and make sure we still infer the correct types in the expression.

```ts
type Pattern<a> =
  a extends number ? a | NumberConstructor :
  a extends string ? a | StringConstructor :
  a extends boolean ? a | BooleanConstructor :
  a extends Array<infer aa> ? [Pattern<aa>] :
  { [k in keyof a]?: Pattern<a[k]> }

type InvertPattern<p> =
  p extends NumberConstructor ? number :
  p extends StringConstructor ? string :
  p extends BooleanConstructor ? boolean :
  p extends Array<infer pp> ? InvertPattern<pp>[] :
  { [k in keyof p]: InvertPattern<p[k]> }
```

> Note: this uses circular type definitions that are only supported in the latetst releases of TypeScript.

Finally we update the `match_pattern` function to check if the pattern is an array and execute the matching:

```ts
const match_pattern = <a>(value: a, pattern: Pattern<a>) => {
  /* String, Number, Boolean patterns */
  if (Array.isArray(pattern)) {
    if (!Array.isArray(value)) return false
    return value.every(v => match_pattern(v, pattern[0]))
  }
  if (typeof (value) != 'object') return value === pattern
  return Object.keys(pattern).every(k => pattern[k] == undefined ? false : match_pattern(value[k], pattern[k]))
}
```

A very practical usecase for this feature is parsing the data for an overview:

```ts
let blogOverviewResponse: any = /* ... */

match<any, Blog[] | Error>(blogOverviewResponse)
  .with([{Id: Number, Title: String}], r => r.map(b => ({id: b.Id, title: b.Title})))
  .with({ errorMessage: String },      r => new Error(r.errorMessage))
  .otherwise(                         () => new Error('client parse error'))
  .run()
```

## Conclusion

In this article we have seen how we can use TypeScript's extensive typesystem to add complety new features to the language. We have also seen that pattern matching allows us to write code that is more declarative than writing a lot of conditions. This more abstract way of thinking allows us to describe complex parsing logic with simple, short and typesafe patterns. The complete source code can be found [here](https://github.com/WimJongeneel/ts-pattern-matching). This is somewhat more extensive version than is show here, but I couldn't include everything in this article without making it way to long.
