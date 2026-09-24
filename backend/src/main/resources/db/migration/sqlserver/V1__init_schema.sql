-- =====================================================================
--  INSURANCE CARD - SQL Server schema (tương đương bản MySQL)
--  Chuỗi có tiếng Việt dùng NVARCHAR.
-- =====================================================================

CREATE TABLE users (
    id                  BIGINT IDENTITY(1,1) NOT NULL,
    email               VARCHAR(100)  NOT NULL,
    password_hash       VARCHAR(100)  NOT NULL,
    full_name           NVARCHAR(100) NOT NULL,
    phone               VARCHAR(10)   NOT NULL,
    role                VARCHAR(20)   NOT NULL,
    status              VARCHAR(20)   NOT NULL,
    failed_login_count  INT           NOT NULL CONSTRAINT df_users_failed DEFAULT 0,
    lockout_until       DATETIME2(6)  NULL,
    password_changed_at DATETIME2(6)  NULL,
    created_at          DATETIME2(6)  NOT NULL,
    updated_at          DATETIME2(6)  NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_phone UNIQUE (phone),
    CONSTRAINT ck_users_role CHECK (role IN ('CUSTOMER', 'STAFF')),
    CONSTRAINT ck_users_status CHECK (status IN ('PENDING', 'ACTIVE', 'LOCKED')),
    CONSTRAINT ck_users_failed CHECK (failed_login_count >= 0)
);

CREATE TABLE customers (
    id            BIGINT IDENTITY(1,1) NOT NULL,
    user_id       BIGINT        NOT NULL,
    id_number     VARCHAR(12)   NOT NULL,
    date_of_birth DATE          NOT NULL,
    gender        VARCHAR(10)   NOT NULL,
    address       NVARCHAR(255) NOT NULL,
    created_at    DATETIME2(6)  NOT NULL,
    updated_at    DATETIME2(6)  NOT NULL,
    CONSTRAINT pk_customers PRIMARY KEY (id),
    CONSTRAINT uq_customers_user UNIQUE (user_id),
    CONSTRAINT uq_customers_id_number UNIQUE (id_number),
    CONSTRAINT fk_customers_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT ck_customers_gender CHECK (gender IN ('MALE', 'FEMALE', 'OTHER'))
);

CREATE TABLE vehicles (
    id               BIGINT IDENTITY(1,1) NOT NULL,
    customer_id      BIGINT       NOT NULL,
    license_plate    VARCHAR(15)  NOT NULL,
    brand            NVARCHAR(50) NOT NULL,
    model            NVARCHAR(50) NOT NULL,
    color            NVARCHAR(30) NOT NULL,
    engine_capacity  INT          NOT NULL,
    manufacture_year INT          NOT NULL,
    chassis_number   VARCHAR(20)  NOT NULL,
    engine_number    VARCHAR(20)  NOT NULL,
    created_at       DATETIME2(6) NOT NULL,
    updated_at       DATETIME2(6) NOT NULL,
    CONSTRAINT pk_vehicles PRIMARY KEY (id),
    CONSTRAINT uq_vehicles_plate UNIQUE (license_plate),
    CONSTRAINT uq_vehicles_chassis UNIQUE (chassis_number),
    CONSTRAINT uq_vehicles_engine UNIQUE (engine_number),
    CONSTRAINT fk_vehicles_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT ck_vehicles_capacity CHECK (engine_capacity BETWEEN 1 AND 3000),
    CONSTRAINT ck_vehicles_year CHECK (manufacture_year >= 1980)
);

CREATE TABLE insurance_products (
    id                  BIGINT IDENTITY(1,1) NOT NULL,
    code                VARCHAR(20)   NOT NULL,
    name                NVARCHAR(100) NOT NULL,
    description         NVARCHAR(500) NULL,
    min_engine_capacity INT           NOT NULL,
    max_engine_capacity INT           NOT NULL,
    annual_premium      DECIMAL(15,0) NOT NULL,
    max_compensation    DECIMAL(15,0) NOT NULL,
    status              VARCHAR(20)   NOT NULL,
    created_at          DATETIME2(6)  NOT NULL,
    updated_at          DATETIME2(6)  NOT NULL,
    CONSTRAINT pk_products PRIMARY KEY (id),
    CONSTRAINT uq_products_code UNIQUE (code),
    CONSTRAINT ck_products_capacity CHECK (min_engine_capacity >= 1 AND max_engine_capacity <= 3000
                                           AND min_engine_capacity <= max_engine_capacity),
    CONSTRAINT ck_products_premium CHECK (annual_premium > 0),
    CONSTRAINT ck_products_compensation CHECK (max_compensation > 0),
    CONSTRAINT ck_products_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE contracts (
    id               BIGINT IDENTITY(1,1) NOT NULL,
    contract_number  VARCHAR(20)   NOT NULL,
    customer_id      BIGINT        NOT NULL,
    vehicle_id       BIGINT        NOT NULL,
    product_id       BIGINT        NOT NULL,
    start_date       DATE          NOT NULL,
    end_date         DATE          NOT NULL,
    term_years       INT           NOT NULL,
    premium_amount   DECIMAL(15,0) NOT NULL,
    max_compensation DECIMAL(15,0) NOT NULL,
    status           VARCHAR(20)   NOT NULL,
    renewed_from_id  BIGINT        NULL,
    cancel_reason    NVARCHAR(500) NULL,
    cancelled_at     DATETIME2(6)  NULL,
    note             NVARCHAR(500) NULL,
    created_by       BIGINT        NULL,
    created_at       DATETIME2(6)  NOT NULL,
    updated_at       DATETIME2(6)  NOT NULL,
    CONSTRAINT pk_contracts PRIMARY KEY (id),
    CONSTRAINT uq_contracts_number UNIQUE (contract_number),
    CONSTRAINT fk_contracts_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fk_contracts_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
    CONSTRAINT fk_contracts_product FOREIGN KEY (product_id) REFERENCES insurance_products (id),
    CONSTRAINT fk_contracts_renewed_from FOREIGN KEY (renewed_from_id) REFERENCES contracts (id),
    CONSTRAINT fk_contracts_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT ck_contracts_term CHECK (term_years BETWEEN 1 AND 3),
    CONSTRAINT ck_contracts_dates CHECK (end_date > start_date),
    CONSTRAINT ck_contracts_premium CHECK (premium_amount > 0),
    CONSTRAINT ck_contracts_compensation CHECK (max_compensation > 0),
    CONSTRAINT ck_contracts_status CHECK (status IN ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED'))
);

CREATE INDEX ix_contracts_vehicle_status ON contracts (vehicle_id, status);
CREATE INDEX ix_contracts_status_end ON contracts (status, end_date);

CREATE TABLE accidents (
    id                   BIGINT IDENTITY(1,1) NOT NULL,
    accident_code        VARCHAR(20)    NOT NULL,
    contract_id          BIGINT         NOT NULL,
    accident_time        DATETIME2(6)   NOT NULL,
    location             NVARCHAR(255)  NOT NULL,
    description          NVARCHAR(1000) NOT NULL,
    damage_type          VARCHAR(20)    NOT NULL,
    estimated_damage     DECIMAL(15,0)  NOT NULL,
    police_report_number NVARCHAR(50)   NULL,
    status               VARCHAR(20)    NOT NULL,
    resolution_note      NVARCHAR(500)  NULL,
    resolved_by          BIGINT         NULL,
    resolved_at          DATETIME2(6)   NULL,
    reported_by          BIGINT         NOT NULL,
    created_at           DATETIME2(6)   NOT NULL,
    updated_at           DATETIME2(6)   NOT NULL,
    CONSTRAINT pk_accidents PRIMARY KEY (id),
    CONSTRAINT uq_accidents_code UNIQUE (accident_code),
    CONSTRAINT fk_accidents_contract FOREIGN KEY (contract_id) REFERENCES contracts (id),
    CONSTRAINT fk_accidents_resolved_by FOREIGN KEY (resolved_by) REFERENCES users (id),
    CONSTRAINT fk_accidents_reported_by FOREIGN KEY (reported_by) REFERENCES users (id),
    CONSTRAINT ck_accidents_damage_type CHECK (damage_type IN ('PROPERTY', 'INJURY', 'BOTH')),
    CONSTRAINT ck_accidents_damage CHECK (estimated_damage >= 0),
    CONSTRAINT ck_accidents_status CHECK (status IN ('REPORTED', 'VERIFIED', 'REJECTED'))
);

CREATE TABLE compensations (
    id               BIGINT IDENTITY(1,1) NOT NULL,
    claim_code       VARCHAR(20)    NOT NULL,
    accident_id      BIGINT         NOT NULL,
    contract_id      BIGINT         NOT NULL,
    requested_amount DECIMAL(15,0)  NOT NULL,
    approved_amount  DECIMAL(15,0)  NULL,
    description      NVARCHAR(1000) NOT NULL,
    status           VARCHAR(20)    NOT NULL,
    resolution_note  NVARCHAR(500)  NULL,
    resolved_by      BIGINT         NULL,
    resolved_at      DATETIME2(6)   NULL,
    paid_at          DATETIME2(6)   NULL,
    requested_by     BIGINT         NOT NULL,
    created_at       DATETIME2(6)   NOT NULL,
    updated_at       DATETIME2(6)   NOT NULL,
    CONSTRAINT pk_compensations PRIMARY KEY (id),
    CONSTRAINT uq_compensations_code UNIQUE (claim_code),
    CONSTRAINT fk_compensations_accident FOREIGN KEY (accident_id) REFERENCES accidents (id),
    CONSTRAINT fk_compensations_contract FOREIGN KEY (contract_id) REFERENCES contracts (id),
    CONSTRAINT fk_compensations_resolved_by FOREIGN KEY (resolved_by) REFERENCES users (id),
    CONSTRAINT fk_compensations_requested_by FOREIGN KEY (requested_by) REFERENCES users (id),
    CONSTRAINT ck_compensations_requested CHECK (requested_amount > 0),
    CONSTRAINT ck_compensations_approved CHECK (approved_amount IS NULL OR
                                                (approved_amount > 0 AND approved_amount <= requested_amount)),
    CONSTRAINT ck_compensations_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAID'))
);

CREATE TABLE punishments (
    id               BIGINT IDENTITY(1,1) NOT NULL,
    punishment_code  VARCHAR(20)   NOT NULL,
    customer_id      BIGINT        NOT NULL,
    contract_id      BIGINT        NULL,
    violation_type   VARCHAR(30)   NOT NULL,
    description      NVARCHAR(500) NOT NULL,
    violation_date   DATE          NOT NULL,
    amount           DECIMAL(15,0) NOT NULL,
    due_date         DATE          NOT NULL,
    status           VARCHAR(20)   NOT NULL,
    resolution_note  NVARCHAR(500) NULL,
    resolved_by      BIGINT        NULL,
    resolved_at      DATETIME2(6)  NULL,
    created_by       BIGINT        NOT NULL,
    created_at       DATETIME2(6)  NOT NULL,
    updated_at       DATETIME2(6)  NOT NULL,
    CONSTRAINT pk_punishments PRIMARY KEY (id),
    CONSTRAINT uq_punishments_code UNIQUE (punishment_code),
    CONSTRAINT fk_punishments_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fk_punishments_contract FOREIGN KEY (contract_id) REFERENCES contracts (id),
    CONSTRAINT fk_punishments_resolved_by FOREIGN KEY (resolved_by) REFERENCES users (id),
    CONSTRAINT fk_punishments_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT ck_punishments_type CHECK (violation_type IN ('LATE_PAYMENT', 'FALSE_DECLARATION',
                                          'FRAUDULENT_CLAIM', 'CONTRACT_VIOLATION', 'OTHER')),
    CONSTRAINT ck_punishments_amount CHECK (amount > 0),
    CONSTRAINT ck_punishments_dates CHECK (due_date >= violation_date),
    CONSTRAINT ck_punishments_status CHECK (status IN ('UNPAID', 'PAID', 'WAIVED'))
);

CREATE TABLE payments (
    id              BIGINT IDENTITY(1,1) NOT NULL,
    payment_code    VARCHAR(20)   NOT NULL,
    customer_id     BIGINT        NOT NULL,
    contract_id     BIGINT        NULL,
    punishment_id   BIGINT        NULL,
    compensation_id BIGINT        NULL,
    type            VARCHAR(20)   NOT NULL,
    amount          DECIMAL(15,0) NOT NULL,
    method          VARCHAR(20)   NULL,
    status          VARCHAR(20)   NOT NULL,
    paid_at         DATETIME2(6)  NULL,
    note            NVARCHAR(255) NULL,
    processed_by    BIGINT        NULL,
    created_at      DATETIME2(6)  NOT NULL,
    updated_at      DATETIME2(6)  NOT NULL,
    CONSTRAINT pk_payments PRIMARY KEY (id),
    CONSTRAINT uq_payments_code UNIQUE (payment_code),
    CONSTRAINT fk_payments_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fk_payments_contract FOREIGN KEY (contract_id) REFERENCES contracts (id),
    CONSTRAINT fk_payments_punishment FOREIGN KEY (punishment_id) REFERENCES punishments (id),
    CONSTRAINT fk_payments_compensation FOREIGN KEY (compensation_id) REFERENCES compensations (id),
    CONSTRAINT fk_payments_processed_by FOREIGN KEY (processed_by) REFERENCES users (id),
    CONSTRAINT ck_payments_type CHECK (type IN ('PREMIUM', 'REFUND', 'PENALTY', 'COMPENSATION')),
    CONSTRAINT ck_payments_amount CHECK (amount > 0),
    CONSTRAINT ck_payments_method CHECK (method IS NULL OR method IN ('CASH', 'BANK_TRANSFER', 'CARD', 'E_WALLET')),
    CONSTRAINT ck_payments_status CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
    CONSTRAINT ck_payments_paid CHECK (status <> 'PAID' OR (paid_at IS NOT NULL AND method IS NOT NULL))
);

CREATE TABLE verification_tokens (
    id         BIGINT IDENTITY(1,1) NOT NULL,
    user_id    BIGINT       NOT NULL,
    token      VARCHAR(64)  NOT NULL,
    type       VARCHAR(20)  NOT NULL,
    expires_at DATETIME2(6) NOT NULL,
    used_at    DATETIME2(6) NULL,
    created_at DATETIME2(6) NOT NULL,
    CONSTRAINT pk_verification_tokens PRIMARY KEY (id),
    CONSTRAINT uq_verification_tokens_token UNIQUE (token),
    CONSTRAINT fk_verification_tokens_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT ck_verification_tokens_type CHECK (type IN ('VERIFY_EMAIL', 'RESET_PASSWORD'))
);

CREATE TABLE system_settings (
    setting_key   VARCHAR(50)   NOT NULL,
    setting_value INT           NOT NULL,
    min_value     INT           NOT NULL,
    max_value     INT           NOT NULL,
    unit          NVARCHAR(20)  NOT NULL,
    description   NVARCHAR(255) NOT NULL,
    updated_by    BIGINT        NULL,
    updated_at    DATETIME2(6)  NOT NULL,
    CONSTRAINT pk_system_settings PRIMARY KEY (setting_key),
    CONSTRAINT fk_system_settings_user FOREIGN KEY (updated_by) REFERENCES users (id),
    CONSTRAINT ck_system_settings_range CHECK (min_value <= max_value
                                              AND setting_value BETWEEN min_value AND max_value)
);
