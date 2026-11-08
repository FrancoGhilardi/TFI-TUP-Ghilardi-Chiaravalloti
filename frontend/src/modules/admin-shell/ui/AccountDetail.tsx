interface AccountDetailProps {
  label: string;
  value: string;
}

export const AccountDetail = ({ label, value }: AccountDetailProps) => {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line-soft py-3 text-sm">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
};
