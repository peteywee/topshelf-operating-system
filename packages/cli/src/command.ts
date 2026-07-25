export function resolveCommand(args: readonly string[]): string {
  const normalizedArgs = args[0] === "--" ? args.slice(1) : args;
  return normalizedArgs[0] ?? "status";
}
