/**
 * Reads the reviewed budget registries. Supports maps, lists, strings, numbers,
 * booleans and null. It is not a general YAML parser.
 */
export function parseRegistryYaml(source: string): unknown {
  const root: Record<string, unknown> = {};
  const stack: Frame[] = [{ indent: -1, container: root }];

  for (const raw of source.split(/\r?\n/)) {
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim();
    while (stack.length > 1 && indent <= (stack.at(-1)?.indent ?? 0)) stack.pop();
    const frame = stack.at(-1);
    if (!frame) throw new Error("Budget registry YAML is empty");

    if (line.startsWith("- ")) {
      const list = listFor(stack, frame, indent);
      const itemText = line.slice(2).trim();
      if (!itemText) {
        const item: Record<string, unknown> = {};
        list.push(item);
        stack.push({ indent, container: item });
        continue;
      }
      if (itemText.includes(":")) {
        const item: Record<string, unknown> = {};
        const [key, value] = splitPair(itemText);
        if (value === "") {
          stack.push({ indent, container: item, pendingKey: key });
        } else {
          item[key] = value;
          stack.push({ indent, container: item });
        }
        list.push(item);
        continue;
      }
      list.push(parseScalar(itemText));
      continue;
    }

    const [key, value] = splitPair(line);
    if (value === "") {
      frame.pendingKey = key;
      frame.pendingIndent = indent;
      continue;
    }
    assign(frame.container, key, value);
  }
  return root;
}

type Frame = { indent: number; container: unknown; pendingKey?: string; pendingIndent?: number };

function listFor(stack: Frame[], frame: Frame, indent: number): unknown[] {
  if (frame.pendingKey && isRecord(frame.container)) {
    const list: unknown[] = [];
    frame.container[frame.pendingKey] = list;
    const keyIndent = frame.pendingIndent ?? indent;
    frame.pendingKey = undefined;
    frame.pendingIndent = undefined;
    stack.push({ indent: keyIndent, container: list });
    return list;
  }
  if (Array.isArray(frame.container)) return frame.container;
  throw new Error("Budget registry YAML has a list item outside a list");
}

function assign(container: unknown, key: string, value: unknown): void {
  if (!isRecord(container)) throw new Error(`Budget registry YAML cannot set ${key}`);
  container[key] = value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function splitPair(text: string): [string, unknown] {
  const index = text.indexOf(":");
  if (index === -1) throw new Error(`Budget registry YAML line has no key: ${text}`);
  const key = text.slice(0, index).trim();
  const rest = text.slice(index + 1).trim();
  return [key, rest === "" ? "" : parseScalar(rest)];
}

function parseScalar(text: string): unknown {
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  if (text === "true") return true;
  if (text === "false") return false;
  if (text === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return text;
}
