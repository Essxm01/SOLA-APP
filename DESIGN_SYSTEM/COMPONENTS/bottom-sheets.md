# BottomSheet

BottomSheet is the Customer/Owner mobile alternative for contextual actions and short confirmation steps. It uses the viewport bottom, `radius.bottomSheet`, `bottomSheetPadding`, safe-bottom padding, a visible close action and keyboard/focus handling. It must not become a full multi-screen navigation substitute.

## Layer discipline

Prefer one temporary layer at a time. A BottomSheet should not contain an entire long entity/decision experience merely because the app is mobile.

If a contextual sheet interrupts a journey, closing it should restore the underlying context. Authentication and review sheets must not silently discard selected dates, guests or other valid user intent.
