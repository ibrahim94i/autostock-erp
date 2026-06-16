interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">قريباً — هذه الشاشة قيد التطوير</p>
      </div>
    </div>
  );
}
