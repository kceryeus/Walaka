-- Initialize business profiles for all users
INSERT INTO business_profiles (user_id, company_name, tax_id, business_address, website, business_email)
SELECT 
    id as user_id,
    'My Company' as company_name,
    '' as tax_id,
    '' as business_address,
    '' as website,
    email as business_email
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM business_profiles);

-- Initialize appearance settings for all users
INSERT INTO appearance_settings (user_id, theme, accent_color, font_size, sidebar_position, logo_url)
SELECT 
    id as user_id,
    'light' as theme,
    '#007ec7' as accent_color,
    'medium' as font_size,
    'left' as sidebar_position,
    NULL as logo_url
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM appearance_settings);

-- Initialize invoice settings for all users
INSERT INTO invoice_settings (
    user_id, 
    invoice_prefix, 
    next_invoice_number, 
    default_template, 
    invoice_color, 
    default_currency, 
    default_tax_rate, 
    payment_terms, 
    default_notes
)
SELECT 
    id as user_id,
    'INV-' as invoice_prefix,
    1 as next_invoice_number,
    'classic' as default_template,
    '#007ec7' as invoice_color,
    'MZN' as default_currency,
    17 as default_tax_rate,
    'net-30' as payment_terms,
    'Obrigado pela preferência. O pagamento deve ser efetuado no prazo de 30 dias.' as default_notes
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM invoice_settings);

-- Initialize notification settings for all users
INSERT INTO notification_settings (
    user_id,
    notify_invoice_created,
    notify_payment_received,
    notify_invoice_due,
    notify_invoice_overdue,
    notify_product_low_stock,
    notify_system_updates,
    notify_client_activity,
    notify_login_attempts
)
SELECT 
    id as user_id,
    true as notify_invoice_created,
    true as notify_payment_received,
    true as notify_invoice_due,
    true as notify_invoice_overdue,
    true as notify_product_low_stock,
    true as notify_system_updates,
    false as notify_client_activity,
    true as notify_login_attempts
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM notification_settings);

-- Initialize security settings for all users
INSERT INTO security_settings (
    user_id,
    enable_2fa,
    session_timeout,
    require_login_confirmation
)
SELECT 
    id as user_id,
    false as enable_2fa,
    30 as session_timeout,
    false as require_login_confirmation
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM security_settings); 