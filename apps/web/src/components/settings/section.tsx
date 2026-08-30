interface SectionProps {
  title: string;
  children: React.ReactNode;
}

export const Section = ({ title, children }: SectionProps) => {
  return (
    <section className="rounded-(--radius-lg) border border-(--border) bg-(--surface-1) p-6">
      <h2 className="label-micro mb-4">{title}</h2>
      {children}
    </section>
  );
};
