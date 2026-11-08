interface CountBadgeProps {
  value: number;
}

export const CountBadge = ({ value }: CountBadgeProps) => {
  return (
    <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-footer-text tabular-nums">
      {value}
    </span>
  );
};
