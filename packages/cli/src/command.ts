export function resolveArguments(args: readonly string[]): string[] {
  return args[0] === "--" ? args.slice(1) : [...args];
}

export function resolveCommand(args: readonly string[]): string {
  return resolveArguments(args)[0] ?? "status";
}
