type fun<a, b> = (_: a) => b

type extract<a, b> = b extends a ? b : Extract<a, b>

const match = <a, b>(value: a, otherwise: () => b = () => null, patterns: Array<[Pattern<a>, fun<a, boolean>, fun<a, b>, 'default' | 'negated']> = []) => ({
  with: <p extends Pattern<a>>(
    pattern: p,
    expr: fun<extract<a, InvertPattern<typeof pattern>>, b>
  ) => match(value, otherwise, [...patterns, [pattern, () => true, expr as any, 'default']]),
  withWhen: <p extends Pattern<a>>(
    pattern: p,
    when: fun<extract<a, InvertPattern<typeof pattern>>, boolean>,
    expr: fun<extract<a, InvertPattern<typeof pattern>>, b>
  ) => match(value, otherwise, [...patterns, [pattern, when as any, expr as any, 'default']]),
  withNot: <p extends Pattern<a>>(
    pattern: p,
    expr: fun<Exclude<a, InvertPattern<typeof pattern>>, b>
  ) => match(value, otherwise, [...patterns, [pattern, () => true, expr, 'negated']]),
  withNotWhen: <p extends Pattern<a>>(
    pattern: p,
    when: fun<Exclude<a, InvertPattern<typeof pattern>>, boolean>,
    expr: fun<Exclude<a, InvertPattern<typeof pattern>>, b>
  ) => match(value, otherwise, [...patterns, [pattern, when, expr, 'negated']]),
  otherwise: (otherwise: () => b) => match(value, otherwise, patterns),
  run: (): b => {
    const p = patterns.find(p => {
      if (p[1](value) == false) return false
      if (p[3] == 'default') return match_pattern(value, p[0])
      return !match_pattern(value, p[0])
    })
    if (p == undefined) return otherwise()
    return p[2](value)
  }
})

type Pattern<a> = a extends number ? a | NumberConstructor :
  a extends string ? a | StringConstructor :
  a extends boolean ? a | BooleanConstructor :
  a extends Array<infer aa> ? [Pattern<aa>] :
  { [k in keyof a]?: Pattern<a[k]> }

type InvertPattern<p> = p extends NumberConstructor ? number :
  p extends StringConstructor ? string :
  p extends BooleanConstructor ? boolean :
  p extends Array<infer pp> ? InvertPattern<pp>[] :
  { [k in keyof p]: InvertPattern<p[k]> }

const match_pattern = <a>(value: a, pattern: Pattern<a>) => {
  if (pattern === String) return typeof (value) == 'string'
  if (pattern === Boolean) return typeof (value) == 'boolean'
  if (pattern === Number) return typeof (value) == 'number' && Number.isNaN(value) == false
  if (Array.isArray(pattern)) {
    if (!Array.isArray(value)) return false
    return value.every(v => match_pattern(v, pattern[0]))
  }
  if (typeof (value) != 'object') return value === pattern
  return Object.keys(pattern).every(k => pattern[k] == undefined ? false : match_pattern(value[k], pattern[k]))
}

type Option<a> = { k: 'none' } | { k: 'some', v: a }
const o: () => Option<string> = () => ({ k: 'some', v: 'hi' })


console.log(
  match(o())
    .with({ k: 'none' }, () => 'none')
    .withWhen({ k: 'some' }, x => x.v == 'hi', () => "HI")
    .with({ k: 'some' }, o => o.v)
    .otherwise(() => 'nope')
    .run()
)

let httpResult: any // { errorMessage: string } | { Id: number, Title: string } // = ...

match(httpResult)
  .with({ errorMessage: String }, r => ({ kind: 'error', message: r.errorMessage }))
  .with({ Id: Number, Title: String }, r => ({ kind: 'result', value: { id: r.Id, title: r.Title } }))
  .otherwise(() => ({ kind: "invalid data" }))
  .run()

interface Blog { id: number, title: string }

let blogOverviewResponse: any = [
  { Id: 1, Title: 'hello' },
  { Id: 2, Title: 'world' }
]

console.log(
  match<any, Blog[] | Error>(blogOverviewResponse)
    .with([{ Id: Number, Title: String }], x => x.map(b => ({ id: b.Id, title: b.Title })))
    .with({ errorMessage: String }, r => new Error(r.errorMessage))
    .otherwise(() => new Error('client parse error'))
    .run()
)