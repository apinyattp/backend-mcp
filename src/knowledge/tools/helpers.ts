export function formatKbEntry(entry: {
  id: string;
  title: string;
  content: string;
  group?: { id: string; name: string; emoji: string | null };
  owner?: { id: string; name: string };
}): string {
  const lines = [`**${entry.title}**`];
  if (entry.group) {
    lines.push(
      `Group: ${entry.group.emoji ? entry.group.emoji + " " : ""}${entry.group.name}`,
    );
  }
  if (entry.owner) {
    lines.push(`Owner: ${entry.owner.name}`);
  }
  lines.push("", entry.content);
  return lines.join("\n");
}
