import { Fragment, type ReactNode } from "react";

// Staff-written instruction text. Supports "- " bullets and **bold**, rendered as plain
// React elements so the text can never inject markup into the public form.
function withBold(text: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, index) =>
    index % 2 === 1 ? <strong key={index}>{part}</strong> : <Fragment key={index}>{part}</Fragment>
  );
}

export default function RichInstructions({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={blocks.length} className="list-disc pl-5 space-y-1">
        {bullets.map((item, index) => <li key={index}>{withBold(item)}</li>)}
      </ul>
    );
    bullets = [];
  };
  for (const line of text.split("\n")) {
    if (line.trim().startsWith("- ")) {
      bullets.push(line.trim().slice(2));
      continue;
    }
    flushBullets();
    if (line.trim()) blocks.push(<p key={blocks.length}>{withBold(line)}</p>);
  }
  flushBullets();
  return <div className="space-y-2 text-sm">{blocks}</div>;
}
