# Pattern Matching for TypeScript

Pattern matching allows programmers to compare data with defined structures to easily pick one of the available expressions. Many languages that are designed as ‘functional programming languages’ have built-in keywords for pattern matching. Well know examples are F# (match … with) or Haskell (case … of). One language that works very well with functional programming but lacks those features is TypeScript. This library adds support pattern matching to TypeScript. 

Read the [article](https://medium.com/@wim.jongeneel1/pattern-matching-in-typescript-with-record-and-wildcard-patterns-6097dd4e471d) about this library for more context.

## Install

**yarn**
```sh
yarn add typescript-pattern-matching
```

**npm**
```sh
npm -i --save typescript-pattern-matching
```

This library need `TypeScript 3.7.3` or higher to fully function.

## Features

The features of this library include:

* Value patterns
* Record patterns
* Wildcard patterns
* Good type inference based on the patterns
* Negated patterns (including negated type inference)
* Additional predicates (like `when`)

## Quick Examples

```ts
type Option<a> = { kind: 'none' } | { kind: 'some', value: a }

let val: Option<string> = { kind: 'some', value: 'hello' }

match(val)
  .with({ kind: 'some' }, o => o.value)
  .run()
```

```ts
let blogOverviewResponse: any = /* ... */

match<any, Blog[] | Error>(blogOverviewResponse)
  .with([{Id: Number, Title: String}], r => r.map(b => ({id: b.Id, title: b.Title})))
  .with({ errorMessage: String },      r => new Error(r.errorMessage))
  .otherwise(                         () => new Error('client parse error'))
  .run()
```

## About

This library is written by [Wim Jongeneel](https://www.linkedin.com/in/wimjongeneel/)
