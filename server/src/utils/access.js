function getDate(value) {
  return value ? new Date(value) : null;
}

function maxDate(a, b) {
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export function computeAccess(user) {
  if (!user) {
    return { active: false, daysLeft: 0, accessEndsAt: null };
  }

  const trialEnd = getDate(user.trialEndsAt ?? user.trial_ends_at);
  const subEnd = getDate(user.subscriptionEndsAt ?? user.subscription_ends_at);
  const base = maxDate(trialEnd, subEnd);
  if (!base) {
    return { active: false, daysLeft: 0, accessEndsAt: null };
  }

  const bonus = Number(user.bonusDays ?? user.bonus_days ?? 0);
  const accessEndsAt = new Date(base);
  accessEndsAt.setDate(accessEndsAt.getDate() + bonus);

  const now = new Date();
  const diff = Math.ceil((accessEndsAt - now) / (1000 * 60 * 60 * 24));
  return {
    active: diff > 0,
    daysLeft: diff > 0 ? diff : 0,
    accessEndsAt
  };
}
