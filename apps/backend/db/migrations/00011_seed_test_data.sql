-- +goose Up
-- Seed data for local development / UI testing.
-- Login: username=demo  password=Moniqo123!

-- +goose StatementBegin
DO $$
DECLARE
    v_user_id     BIGINT;
    v_budget_id   BIGINT;
    v_checking_id BIGINT;
    v_savings_id  BIGINT;
    v_visa_id     BIGINT;
    v_cash_id     BIGINT;
    v_env_rent    BIGINT;
    v_env_grocery BIGINT;
    v_env_util    BIGINT;
    v_env_dining  BIGINT;
    v_env_transport BIGINT;
    v_env_savings BIGINT;
    v_now         TIMESTAMPTZ := now();
BEGIN

-- ── User ──────────────────────────────────────────────────────────────────────
INSERT INTO users (username, email, hash, name, status, created_at, updated_at)
VALUES (
    'demo',
    'demo@moniqo.dev',
    '$2a$10$ut0WeTyj1JDdKprklGcF0ehLjspUDVSoL4Rr023R1ddn4NOUznJye',
    'Demo User',
    'active',
    v_now, v_now
)
ON CONFLICT DO NOTHING
RETURNING id INTO v_user_id;

-- If the user already existed, look it up.
IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM users WHERE lower(username) = 'demo';
END IF;

-- ── Budget ────────────────────────────────────────────────────────────────────
INSERT INTO budgets (title, notes, created_at, updated_at)
VALUES ('My Budget', 'Demo budget for UI testing', v_now, v_now)
RETURNING id INTO v_budget_id;

INSERT INTO budget_users (budget_id, user_id, role, joined_at)
VALUES (v_budget_id, v_user_id, 'OWNER', v_now);

-- ── Accounts ──────────────────────────────────────────────────────────────────
INSERT INTO accounts (budget_id, name, type, is_on_budget, notes, created_at, updated_at)
VALUES (v_budget_id, 'Main Checking', 'CHECKING', TRUE, 'Primary day-to-day account', v_now, v_now)
RETURNING id INTO v_checking_id;

INSERT INTO accounts (budget_id, name, type, is_on_budget, notes, created_at, updated_at)
VALUES (v_budget_id, 'Emergency Savings', 'SAVINGS', TRUE, '3-month emergency fund', v_now, v_now)
RETURNING id INTO v_savings_id;

INSERT INTO accounts (budget_id, name, type, is_on_budget, notes, created_at, updated_at)
VALUES (v_budget_id, 'Visa Platinum', 'CREDIT_CARD', TRUE, 'Rewards credit card', v_now, v_now)
RETURNING id INTO v_visa_id;

INSERT INTO accounts (budget_id, name, type, is_on_budget, notes, created_at, updated_at)
VALUES (v_budget_id, 'Wallet Cash', 'CASH', TRUE, NULL, v_now, v_now)
RETURNING id INTO v_cash_id;

-- ── Envelopes ─────────────────────────────────────────────────────────────────
INSERT INTO envelopes (budget_id, title, allocated_amt, description, created_at, updated_at)
VALUES (v_budget_id, 'Rent & Housing', 150000, 'Monthly rent + maintenance', v_now, v_now)
RETURNING id INTO v_env_rent;

INSERT INTO envelopes (budget_id, title, allocated_amt, description, created_at, updated_at)
VALUES (v_budget_id, 'Groceries', 60000, 'Supermarket and fresh produce', v_now, v_now)
RETURNING id INTO v_env_grocery;

INSERT INTO envelopes (budget_id, title, allocated_amt, description, created_at, updated_at)
VALUES (v_budget_id, 'Utilities', 20000, 'Electricity, water, internet', v_now, v_now)
RETURNING id INTO v_env_util;

INSERT INTO envelopes (budget_id, title, allocated_amt, description, created_at, updated_at)
VALUES (v_budget_id, 'Dining Out', 30000, 'Restaurants and coffee shops', v_now, v_now)
RETURNING id INTO v_env_dining;

INSERT INTO envelopes (budget_id, title, allocated_amt, description, created_at, updated_at)
VALUES (v_budget_id, 'Transport', 15000, 'Fuel, transit, ride-share', v_now, v_now)
RETURNING id INTO v_env_transport;

INSERT INTO envelopes (budget_id, title, allocated_amt, description, created_at, updated_at)
VALUES (v_budget_id, 'Savings Goal', 50000, 'Vacation fund', v_now, v_now)
RETURNING id INTO v_env_savings;

-- ── Transactions ──────────────────────────────────────────────────────────────
-- Opening balances (positive inflows, no envelope)
INSERT INTO transactions (budget_id, account_id, amount, memo, date, created_at, updated_at)
VALUES
    (v_budget_id, v_checking_id, 500000, 'Opening balance',              v_now - INTERVAL '60 days', v_now, v_now),
    (v_budget_id, v_savings_id,  200000, 'Opening balance',              v_now - INTERVAL '60 days', v_now, v_now),
    (v_budget_id, v_cash_id,       5000, 'Opening balance',              v_now - INTERVAL '60 days', v_now, v_now);

-- Salary inflow
INSERT INTO transactions (budget_id, account_id, amount, memo, date, created_at, updated_at)
VALUES
    (v_budget_id, v_checking_id, 350000, 'Salary – June',               v_now - INTERVAL '30 days', v_now, v_now),
    (v_budget_id, v_checking_id, 350000, 'Salary – July',               v_now - INTERVAL '1 day',   v_now, v_now);

-- Rent
INSERT INTO transactions (budget_id, account_id, envelope_id, amount, memo, date, created_at, updated_at)
VALUES
    (v_budget_id, v_checking_id, v_env_rent, -150000, 'Monthly rent',   v_now - INTERVAL '28 days', v_now, v_now),
    (v_budget_id, v_checking_id, v_env_rent, -150000, 'Monthly rent',   v_now - INTERVAL '1 day',   v_now, v_now);

-- Groceries
INSERT INTO transactions (budget_id, account_id, envelope_id, amount, memo, date, created_at, updated_at)
VALUES
    (v_budget_id, v_checking_id, v_env_grocery, -8500,  'FreshMart weekly shop',   v_now - INTERVAL '25 days', v_now, v_now),
    (v_budget_id, v_checking_id, v_env_grocery, -12000, 'BigBazaar monthly stock', v_now - INTERVAL '18 days', v_now, v_now),
    (v_budget_id, v_checking_id, v_env_grocery, -7200,  'FreshMart weekly shop',   v_now - INTERVAL '11 days', v_now, v_now),
    (v_budget_id, v_checking_id, v_env_grocery, -9100,  'FreshMart weekly shop',   v_now - INTERVAL '4 days',  v_now, v_now);

-- Utilities (via credit card)
INSERT INTO transactions (budget_id, account_id, envelope_id, amount, memo, date, created_at, updated_at)
VALUES
    (v_budget_id, v_visa_id, v_env_util, -8200,  'Electricity bill',  v_now - INTERVAL '22 days', v_now, v_now),
    (v_budget_id, v_visa_id, v_env_util, -5500,  'Internet plan',     v_now - INTERVAL '22 days', v_now, v_now),
    (v_budget_id, v_visa_id, v_env_util, -3800,  'Water bill',        v_now - INTERVAL '22 days', v_now, v_now);

-- Dining
INSERT INTO transactions (budget_id, account_id, envelope_id, amount, memo, date, created_at, updated_at)
VALUES
    (v_budget_id, v_visa_id, v_env_dining, -2400, 'Café Nero',              v_now - INTERVAL '20 days', v_now, v_now),
    (v_budget_id, v_visa_id, v_env_dining, -5800, 'The Grill House',        v_now - INTERVAL '15 days', v_now, v_now),
    (v_budget_id, v_visa_id, v_env_dining, -1800, 'Starbucks',              v_now - INTERVAL '10 days', v_now, v_now),
    (v_budget_id, v_visa_id, v_env_dining, -4500, 'Pizza Palace',           v_now - INTERVAL '5 days',  v_now, v_now),
    (v_budget_id, v_cash_id, v_env_dining, -1200, 'Street food lunch',      v_now - INTERVAL '2 days',  v_now, v_now);

-- Transport
INSERT INTO transactions (budget_id, account_id, envelope_id, amount, memo, date, created_at, updated_at)
VALUES
    (v_budget_id, v_checking_id, v_env_transport, -4000, 'Fuel – Shell',       v_now - INTERVAL '14 days', v_now, v_now),
    (v_budget_id, v_checking_id, v_env_transport, -1500, 'Metro monthly pass', v_now - INTERVAL '30 days', v_now, v_now),
    (v_budget_id, v_visa_id,     v_env_transport, -900,  'Uber rides',         v_now - INTERVAL '6 days',  v_now, v_now);

-- Savings transfer (checking → savings, no envelope — it's a transfer)
INSERT INTO transactions (budget_id, account_id, transfer_account_id, transfer_group_id, amount, memo, date, created_at, updated_at)
VALUES
    (v_budget_id, v_checking_id, v_savings_id, gen_random_uuid(), -50000, 'Transfer to savings', v_now - INTERVAL '25 days', v_now, v_now),
    (v_budget_id, v_savings_id, v_checking_id, (SELECT transfer_group_id FROM transactions WHERE memo = 'Transfer to savings' AND budget_id = v_budget_id LIMIT 1),  50000, 'Transfer from checking', v_now - INTERVAL '25 days', v_now, v_now);

END $$;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DO $$
DECLARE
    v_user_id   BIGINT;
    v_budget_id BIGINT;
BEGIN
    SELECT id INTO v_user_id   FROM users   WHERE lower(username) = 'demo';
    SELECT bu.budget_id INTO v_budget_id
      FROM budget_users bu
      JOIN budgets b ON b.id = bu.budget_id
     WHERE bu.user_id = v_user_id AND b.title = 'My Budget'
     LIMIT 1;

    IF v_budget_id IS NOT NULL THEN
        DELETE FROM transactions  WHERE budget_id = v_budget_id;
        DELETE FROM envelopes     WHERE budget_id = v_budget_id;
        DELETE FROM accounts      WHERE budget_id = v_budget_id;
        DELETE FROM budget_users  WHERE budget_id = v_budget_id;
        DELETE FROM budgets       WHERE id        = v_budget_id;
    END IF;

    IF v_user_id IS NOT NULL THEN
        DELETE FROM users WHERE id = v_user_id;
    END IF;
END $$;
-- +goose StatementEnd
