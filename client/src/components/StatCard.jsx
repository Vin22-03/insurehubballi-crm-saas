function StatCard({ title, value, subtitle }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-xl p-5">
      <p className="text-sm text-white/60">{title}</p>
      <h3 className="mt-2 text-3xl font-bold tracking-tight">{value}</h3>
      {subtitle ? <p className="mt-2 text-xs text-white/50">{subtitle}</p> : null}
    </div>
  );
}

export default StatCard;