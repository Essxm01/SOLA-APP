-- BOOKING-01.1: one authenticated Customer ↔ Owner conversation per approved booking.
-- Conversation creation is deliberately impossible to infer from a client-supplied participant.

BEGIN;

CREATE TABLE IF NOT EXISTS booking_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_conversations_owner_created
    ON booking_conversations(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_conversations_customer_created
    ON booking_conversations(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS booking_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES booking_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('CUSTOMER', 'OWNER')),
    text TEXT NOT NULL CHECK (char_length(trim(text)) BETWEEN 1 AND 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_messages_conversation_created
    ON booking_messages(conversation_id, created_at ASC);

COMMIT;
