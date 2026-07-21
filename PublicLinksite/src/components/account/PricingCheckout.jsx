import { useState } from 'react';

import { BILLING_TIERS, getCheckoutUrl } from '../../config/billing';
import { openCheckout } from '../../services/sellauth';
import IconCheckCircle from '~icons/mingcute/check-circle-fill';
import IconShoppingBag from '~icons/mingcute/shopping-bag-3-fill';

export default function PricingCheckout({ user }) {
  const [interval, setInterval] = useState('monthly');
  const [error, setError] = useState('');

  const handleCheckout = async (tier) => {
    setError('');
    try {
      await openCheckout(getCheckoutUrl(tier, interval, user?.email));
    } catch (checkoutError) {
      setError(checkoutError.message);
    }
  };

  const handleIntervalChange = (nextInterval) => {
    if (nextInterval !== interval) {
      setInterval(nextInterval);
    }
  };

  return (
    <section className="account-section pricing-section">
      <div className="account-section-head">
        <div>
          <p className="eyebrow">Boutique Fiip</p>
          <h2>Des offres claires pour écrire, synchroniser et partager.</h2>
          <p className="section-lead">Commencez gratuitement, puis augmentez vos quotas quand votre usage le justifie. Aucun dépassement n’est facturé.</p>
        </div>
        <div className="segmented-control pricing-toggle" data-interval={interval}>
          <span className="pricing-toggle-indicator" />
          <button className={interval === 'monthly' ? 'active' : ''} onClick={() => handleIntervalChange('monthly')}>Mensuel</button>
          <button className={interval === 'yearly' ? 'active' : ''} onClick={() => handleIntervalChange('yearly')}>Annuel -25%</button>
        </div>
      </div>
      {error ? <p className="account-error">{error}</p> : null}
      <div className="pricing-grid" data-interval={interval}>
        {BILLING_TIERS.map((tier) => (
          <article key={tier.id} className={`account-card pricing-card ${tier.id === 'pro' ? 'featured' : ''}`}>
            <div className="pricing-card-top">
              <span className="status-pill">{tier.badge}</span>
              <span>{tier.accent}</span>
            </div>
            <h3>{tier.name}</h3>
            <div className="price-switcher" aria-live="polite">
              <p key={`${tier.id}-${interval}`} className="price">{interval === 'yearly' ? tier.yearly : tier.monthly}</p>
              <span>{tier.id === 'free' ? 'pour toujours' : interval === 'yearly' ? 'par an' : 'par mois'}</span>
            </div>
            <p className="pricing-description">{tier.description}</p>
            <ul className="pricing-features">
              {tier.features.map((feature) => (
                <li key={feature}>
                  <IconCheckCircle />
                  {feature}
                </li>
              ))}
            </ul>
            <button className="account-primary" onClick={() => handleCheckout(tier)}>
              <IconShoppingBag />
              {tier.id === 'free' ? 'Commencer gratuitement' : `Choisir ${tier.name}`}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
