# 💻 SOLA Implementation Guide — Web Applications (Admin Portal)

---

## 1. CSS Variables Injection
Copy tokens from `TOKENS/colors.json` into the root CSS file (`index.css`):

```css
:root {
  --sola-primary-blue: #0059FF;
  --sola-primary-blue-hover: #0046CC;
  --sola-secondary-yellow: #FFD700;
  --sola-bg-main: #F5F7FA;
  --sola-bg-surface: #FFFFFF;
  --sola-text-primary: #0F172A;
  --sola-text-secondary: #475569;
  --sola-border-main: #E2E8F0;
}
```

---

## 2. Component Class Mapping
- **Cards**: `.sola-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }`
- **Primary Buttons**: `.sola-btn-primary { background: #0059FF; color: #fff; border-radius: 12px; font-weight: 700; }`
