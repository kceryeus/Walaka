-- Add test notifications for testing the notifications page
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users table

-- First, let's see what users exist
SELECT id, email FROM auth.users LIMIT 5;

-- Then add test notifications (replace the user_id with your actual user ID)
INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    action_url,
    read,
    created_at
) VALUES 
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID
(
    'YOUR_USER_ID_HERE', -- Replace this with your actual user ID
    'invoice',
    'Invoice Created Successfully',
    'Invoice INV-001 has been created and sent to client@example.com',
    'invoices.html',
    false,
    now() - interval '2 hours'
),
(
    'YOUR_USER_ID_HERE', -- Replace this with your actual user ID
    'payment',
    'Payment Received',
    'Payment of $1,500.00 has been received for invoice INV-001',
    'invoices.html',
    false,
    now() - interval '1 hour'
),
(
    'YOUR_USER_ID_HERE', -- Replace this with your actual user ID
    'system',
    'System Update Available',
    'A new version of WALAKA is available with improved features and security updates.',
    'settings.html',
    true,
    now() - interval '3 hours'
),
(
    'YOUR_USER_ID_HERE', -- Replace this with your actual user ID
    'subscription_warning',
    'Subscription Expiring Soon',
    'Your subscription will expire in 3 days on 2025-01-15. Please renew to continue using our services.',
    'profile.html',
    false,
    now() - interval '30 minutes'
),
(
    'YOUR_USER_ID_HERE', -- Replace this with your actual user ID
    'alert',
    'Low Stock Alert',
    'Product "Office Supplies" is running low on stock. Current quantity: 5 units',
    'products.html',
    false,
    now() - interval '15 minutes'
);

-- To find your user ID, run this query first:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com'; 