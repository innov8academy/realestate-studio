export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-[100dvh] w-full bg-neutral-950 overflow-hidden">
      {children}
    </div>
  );
}
