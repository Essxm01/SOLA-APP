// Generated from DESIGN_SYSTEM/TOKENS. Do not edit manually.
export const konfrmTokens = {
  "version": "2.0.0",
  "colors": {
    "brand": {
      "primary": "#0059FF",
      "primaryHover": "#0047CC",
      "primarySoft": "#EAF1FF",
      "accent": "#FFD700",
      "accentSoft": "#FFF8CC"
    },
    "surface": {
      "canvas": "#F8FAFC",
      "primary": "#FFFFFF",
      "secondary": "#F1F5F9",
      "elevated": "#FFFFFF"
    },
    "text": {
      "primary": "#0F172A",
      "secondary": "#475569",
      "muted": "#64748B",
      "inverse": "#FFFFFF"
    },
    "border": {
      "default": "#E2E8F0",
      "subtle": "#F1F5F9",
      "strong": "#CBD5E1",
      "focus": "#0059FF"
    },
    "semantic": {
      "success": {
        "solid": "#15803D",
        "text": "#166534",
        "background": "#F0FDF4",
        "border": "#BBF7D0",
        "purpose": "Confirmed, completed and verified states; not a brand color."
      },
      "warning": {
        "solid": "#B45309",
        "text": "#92400E",
        "background": "#FFFBEB",
        "border": "#FDE68A",
        "purpose": "Pending, draft or attention-needed states; not a brand color."
      },
      "danger": {
        "solid": "#BE123C",
        "text": "#9F1239",
        "background": "#FFF1F2",
        "border": "#FECDD3",
        "purpose": "Errors, rejected and destructive states; not a brand color."
      },
      "info": {
        "solid": "#0059FF",
        "text": "#1D4ED8",
        "background": "#EFF6FF",
        "border": "#BFDBFE",
        "purpose": "Informative and in-progress states; not a second brand color."
      }
    },
    "interaction": {
      "hover": "#F1F5F9",
      "pressed": "#E2E8F0",
      "selected": "#EAF1FF",
      "disabled": "#E2E8F0",
      "focusRing": "rgba(0, 89, 255, 0.32)"
    }
  },
  "spacing": {
    "pageHorizontal": "16px",
    "pageVerticalRhythm": "24px",
    "sectionGap": "24px",
    "cardPadding": "16px",
    "controlGap": "12px",
    "inlineGap": "8px",
    "listGap": "12px",
    "modalPadding": "24px",
    "bottomSheetPadding": "24px",
    "safeBottom": "24px"
  },
  "radius": {
    "control": "12px",
    "card": "16px",
    "elevatedCard": "16px",
    "modal": "20px",
    "bottomSheet": "20px 20px 0 0",
    "pill": "9999px",
    "round": "50%"
  },
  "shadow": {
    "none": "none",
    "subtle": "0 1px 2px rgba(15, 23, 42, 0.06)",
    "raised": "0 4px 10px rgba(15, 23, 42, 0.08)",
    "overlay": "0 -8px 24px rgba(15, 23, 42, 0.12)"
  },
  "typography": {
    "display": {
      "fontSize": "28px",
      "fontWeight": "800",
      "lineHeight": "1.35",
      "usage": "Rare high-level page introduction."
    },
    "pageTitle": {
      "fontSize": "22px",
      "fontWeight": "800",
      "lineHeight": "1.45",
      "usage": "Primary page title."
    },
    "sectionTitle": {
      "fontSize": "18px",
      "fontWeight": "700",
      "lineHeight": "1.5",
      "usage": "Section heading."
    },
    "cardTitle": {
      "fontSize": "16px",
      "fontWeight": "700",
      "lineHeight": "1.5",
      "usage": "Card, list item and modal title."
    },
    "body": {
      "fontSize": "14px",
      "fontWeight": "500",
      "lineHeight": "1.65",
      "usage": "Default readable body copy."
    },
    "bodyStrong": {
      "fontSize": "14px",
      "fontWeight": "700",
      "lineHeight": "1.65",
      "usage": "Body emphasis without becoming a heading."
    },
    "label": {
      "fontSize": "13px",
      "fontWeight": "700",
      "lineHeight": "1.5",
      "usage": "Field labels, compact controls and status labels."
    },
    "caption": {
      "fontSize": "12px",
      "fontWeight": "600",
      "lineHeight": "1.5",
      "usage": "Supporting metadata and helper copy."
    },
    "button": {
      "fontSize": "14px",
      "fontWeight": "700",
      "lineHeight": "1.4",
      "usage": "Button and actionable-control label."
    },
    "numeric": {
      "fontSize": "16px",
      "fontWeight": "700",
      "lineHeight": "1.5",
      "fontVariantNumeric": "tabular-nums",
      "usage": "Financial values and operational numeric data; keep Cairo for surrounding UI."
    },
    "metadata": {
      "fontSize": "12px",
      "fontWeight": "600",
      "lineHeight": "1.5",
      "usage": "Non-critical timestamps, IDs and secondary facts."
    }
  },
  "breakpoints": {
    "mobile": "375px",
    "mobileWide": "430px",
    "tablet": "768px",
    "desktopAdmin": "1024px",
    "desktopWide": "1440px"
  },
  "icons": {
    "library": "lucide-react",
    "sizes": {
      "small": "16px",
      "default": "20px",
      "large": "24px"
    },
    "strokeWidth": 2
  }
} as const;

export type KonfrmTokens = typeof konfrmTokens;
