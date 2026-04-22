export interface Command<TResult = void> {
  readonly _type: string
}

export interface CommandHandler<TCommand extends Command<TResult>, TResult> {
  handle(command: TCommand): Promise<TResult>
}

type HandlerMap = Map<string, CommandHandler<Command<unknown>, unknown>>

export class CommandBus {
  private handlers: HandlerMap = new Map()

  register<TCommand extends Command<TResult>, TResult>(
    commandType: string,
    handler: CommandHandler<TCommand, TResult>,
  ): void {
    this.handlers.set(commandType, handler as CommandHandler<Command<unknown>, unknown>)
  }

  async execute<TResult>(command: Command<TResult>): Promise<TResult> {
    const handler = this.handlers.get(command._type)
    if (!handler) throw new Error(`No handler registered for command: ${command._type}`)
    return handler.handle(command) as unknown as Promise<TResult>
  }
}
