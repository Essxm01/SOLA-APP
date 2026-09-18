# Numeric and financial presentation

Customer-facing Arabic money uses one default: `1,600 ج.م`. Do not mix `EGP`, `ج.م.`, `LE` or other abbreviations arbitrarily. Use locale grouping and the numeric typography role.

Customer receives booking amounts relevant to their decision, not internal KONFRM commission, owner net or wallet balances. Admin-only/internal exceptions must be documented in their component contract.

## Server-authoritative quote presentation

When booking totals are server-authoritative, the Customer UI must not present a client-calculated estimate as if it were canonical.

Preferred Customer hierarchy after a successful quote:

1. total stay;
2. nights/context;
3. deposit when/if eligible under the lifecycle;
4. remaining amount;
5. nightly price as secondary breakdown.

During quote loading or failure, show loading/retry truth rather than 0, stale total or nightly × nights fallback.
