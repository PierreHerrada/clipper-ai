interface PRBadgeProps {
  url: string;
  number: number | null;
}

export default function PRBadge({ url, number }: PRBadgeProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 mt-2 text-xs bg-teal/20 text-teal px-2 py-0.5 rounded hover:bg-teal/30"
    >
      PR {number ? `#${number}` : ""}
    </a>
  );
}
