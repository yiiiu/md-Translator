const RAW_MERMAID_PREFIXES = [
  "graph",
  "flowchart",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "stateDiagram-v2",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
  "gitGraph",
  "requirementDiagram",
  "quadrantChart",
  "xychart-beta",
  "block-beta",
  "packet-beta",
  "sankey-beta",
  "C4Context",
  "C4Container",
  "C4Component",
  "C4Dynamic",
  "C4Deployment",
];

export function looksLikeRawMermaid(source: string): boolean {
  const trimmed = source.trim();
  if (!trimmed) {
    return false;
  }

  const firstLine = trimmed.split("\n", 1)[0]?.trim() ?? "";
  return RAW_MERMAID_PREFIXES.some((prefix) => firstLine.startsWith(prefix));
}
