// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Query<TResult = unknown> {
  readonly _type: string
}

export interface QueryHandler<TQuery extends Query<TResult>, TResult> {
  handle(query: TQuery): Promise<TResult>
}

type HandlerMap = Map<string, QueryHandler<Query<unknown>, unknown>>

export class QueryBus {
  private handlers: HandlerMap = new Map()

  register<TQuery extends Query<TResult>, TResult>(
    queryType: string,
    handler: QueryHandler<TQuery, TResult>,
  ): void {
    this.handlers.set(queryType, handler as QueryHandler<Query<unknown>, unknown>)
  }

  async execute<TResult>(query: Query<TResult>): Promise<TResult> {
    const handler = this.handlers.get(query._type)
    if (!handler) throw new Error(`No handler registered for query: ${query._type}`)
    return handler.handle(query) as unknown as Promise<TResult>
  }
}
