export default function AccountAiUsage({ account }) {
  const usage = account?.ai_usage;
  const used = Number(usage?.budget_used_eur || 0);
  const limit = Number(usage?.budget_limit_eur ?? account?.family_group?.ai_budget_limit_eur ?? 0);
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <section className="account-section">
      <div className="account-section-head">
        <div>
          <p className="eyebrow">IA</p>
          <h2>Mode Automatique</h2>
        </div>
        <span className="status-pill">{used.toFixed(2)}€ / {limit.toFixed(2)}€</span>
      </div>
      <div className="budget-bar"><span style={{ width: `${percent}%` }} /></div>
      <p>Le proxy Fiip choisit le modèle selon la tâche, le volume de texte et le budget restant.</p>
    </section>
  );
}
