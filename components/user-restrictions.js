// components/user-restrictions.js
// Restrict admin-only actions in usermanagement-vanilla for non-admins

// console.log('[UserRestrictions] Script loaded!');

(async function() {
    // console.log('[UserRestrictions] Waiting for Supabase...');
    while (!window.supabase || !window.supabase.auth) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    // console.log('[UserRestrictions] Supabase ready!');
    // Get current user role
    let userRole = null;
    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (session && session.user) {
            const { data: userData } = await window.supabase
                .from('users')
                .select('role')
                .eq('id', session.user.id)
                .maybeSingle();
            userRole = userData?.role || null;
            // console.log('[UserRestrictions] Detected user role:', userRole);
            if (!userRole) {
                // console.warn('[UserRestrictions] No role found for user in users table:', session.user.id, userData);
            }
        } else {
            // console.warn('[UserRestrictions] No session or user found.');
        }
    } catch (e) {
        // console.warn('[UserRestrictions] Could not determine user role:', e);
    }
    if (userRole === 'admin') {
        // console.log('[UserRestrictions] User is admin, no restrictions applied.');
        return;
    }

    // Inject restriction CSS if not present
    if (!document.getElementById('user-restriction-css')) {
        const style = document.createElement('style');
        style.id = 'user-restriction-css';
        style.textContent = `
            .user-restricted {
                opacity: 0.7 !important;
                cursor: not-allowed !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Helper to restrict a button visually and functionally
    function restrictButton(btn, action) {
        if (!btn) return;
        btn.disabled = true;
        btn.classList.add('user-restricted');
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // console.log(`[UserRestrictions] Blocked action: ${action}`);
            showUserRestrictionModal(action);
        }, true);
        // console.log(`[UserRestrictions] Restricted button: ${action}`, btn);
    }

    // Helper to check if user is editor
    function isEditor() {
        return userRole === 'editor';
    }

    // Restrict Add User button
    restrictButton(document.getElementById('addUserBtn'), 'add user');
    // Restrict Add New Client button (editors cannot add clients)
    restrictButton(document.getElementById('add-new-client-btn'), 'add client');
    // Restrict Save Client button (editors cannot save clients)
    restrictButton(document.getElementById('save-client-btn'), 'save client');
    // Restrict Add New Product button (editors cannot add products)
    restrictButton(document.getElementById('add-new-product-btn'), 'add product');
    // Restrict Save Product button(s) (editors cannot save products)
    document.querySelectorAll('button.btn-primary[data-translate="save_product"]').forEach(btn => restrictButton(btn, 'save product'));

    // Restrict Create Invoice button for all non-admins except editors
    if (!isEditor()) {
        restrictButton(document.getElementById('createInvoiceBtn'), 'create invoice');
    }
    // Restrict Create Receipt button for all non-admins except editors
    if (!isEditor()) {
        restrictButton(document.getElementById('createReceiptBtn'), 'create receipt');
        document.querySelectorAll('.primary-btn[data-translate="create_receipt_button_modal"]').forEach(btn => restrictButton(btn, 'create receipt'));
    }

    // Restrict edit, delete, and status buttons in clients and products
    document.querySelectorAll('.edit-btn').forEach(btn => restrictButton(btn, 'edit'));
    document.querySelectorAll('.delete-btn').forEach(btn => restrictButton(btn, 'delete'));
    document.querySelectorAll('.status-toggle-btn').forEach(btn => restrictButton(btn, 'change status'));

    // Restrict edit and delete icons
    document.querySelectorAll('i.fa-edit').forEach(icon => {
        icon.classList.add('user-restricted');
        icon.style.pointerEvents = 'auto';
        icon.style.opacity = '0.7';
        icon.style.cursor = 'not-allowed';
        icon.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showUserRestrictionModal('edit');
        }, true);
        // console.log('[UserRestrictions] Restricted edit icon', icon);
    });
    document.querySelectorAll('i.fa-trash, i.fa-trash-alt').forEach(icon => {
        icon.classList.add('user-restricted');
        icon.style.pointerEvents = 'auto';
        icon.style.opacity = '0.7';
        icon.style.cursor = 'not-allowed';
        icon.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showUserRestrictionModal('delete');
        }, true);
        // console.log('[UserRestrictions] Restricted delete icon', icon);
    });

    // Restrict Edit buttons (no lock icon, just block action)
    document.querySelectorAll('.edit-user-btn').forEach(btn => restrictButton(btn, 'edit user'));

    // Restrict Activate/Deactivate toggles (no lock icon, just block action)
    document.querySelectorAll('.toggle-user-status').forEach(toggle => restrictButton(toggle, 'change user status'));

    // SETTINGS PAGE SPECIAL RESTRICTIONS
    if (window.location.pathname.endsWith('settings.html')) {
        // Allow access to #account-settings and #security-settings tab/section for non-admins
        const allowedTabSelector = 'a[href="#account-settings"], a[href="#security-settings"]';
        const allowedSectionSelector = '#account-settings, #security-settings';
        // Restrict all other tabs
        document.querySelectorAll('.settings-tabs a').forEach(tab => {
            if (!tab.matches(allowedTabSelector)) {
                // Add lock icon if not present
                if (!tab.querySelector('.user-restriction-lock')) {
                    const lock = document.createElement('i');
                    lock.className = 'fas fa-lock user-restriction-lock';
                    lock.style.position = 'absolute';
                    lock.style.right = '1em';
                    lock.style.top = '50%';
                    lock.style.transform = 'translateY(-50%)';
                    lock.style.color = '#9ca3af'; // grey
                    lock.title = 'Access restricted';
                    tab.style.position = 'relative';
                    tab.appendChild(lock);
                }
                tab.classList.add('user-restricted');
                tab.style.opacity = '0.7';
                tab.style.cursor = 'not-allowed';
                tab.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    showUserRestrictionModal('access this settings section');
                }, true);
            }
        });
        // Prevent switching to other sections
        document.querySelectorAll('.settings-section').forEach(section => {
            if (!section.matches(allowedSectionSelector)) {
                // Disable all inputs, selects, textareas, and buttons
                section.querySelectorAll('input, select, textarea, button').forEach(el => {
                    el.disabled = true;
                    el.classList.add('user-restricted');
                    if (el.tagName === 'BUTTON') {
                        el.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            showUserRestrictionModal('change these settings');
                        }, true);
                    }
                });
                section.style.opacity = '0.7';
            }
        });
    }

    // Optionally, re-apply restrictions after a longer delay for dynamically loaded elements
    setTimeout(() => {
        restrictButton(document.getElementById('addUserBtn'), 'add user');
        restrictButton(document.getElementById('add-new-client-btn'), 'add client');
        restrictButton(document.getElementById('save-client-btn'), 'save client');
        restrictButton(document.getElementById('add-new-product-btn'), 'add product');
        document.querySelectorAll('button.btn-primary[data-translate="save_product"]').forEach(btn => restrictButton(btn, 'save product'));
        if (!isEditor()) {
            restrictButton(document.getElementById('createInvoiceBtn'), 'create invoice');
            restrictButton(document.getElementById('createReceiptBtn'), 'create receipt');
            document.querySelectorAll('.primary-btn[data-translate="create_receipt_button_modal"]').forEach(btn => restrictButton(btn, 'create receipt'));
        }
        document.querySelectorAll('.edit-user-btn').forEach(btn => restrictButton(btn, 'edit user'));
        document.querySelectorAll('.edit-btn').forEach(btn => restrictButton(btn, 'edit'));
        document.querySelectorAll('.delete-btn').forEach(btn => restrictButton(btn, 'delete'));
        document.querySelectorAll('.status-toggle-btn').forEach(btn => restrictButton(btn, 'change status'));
        document.querySelectorAll('.toggle-user-status').forEach(toggle => restrictButton(toggle, 'change user status'));
        // Re-apply icon restrictions
        document.querySelectorAll('i.fa-edit').forEach(icon => {
            icon.classList.add('user-restricted');
            icon.style.pointerEvents = 'auto';
            icon.style.opacity = '0.7';
            icon.style.cursor = 'not-allowed';
            icon.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                showUserRestrictionModal('edit');
            }, true);
        });
        document.querySelectorAll('i.fa-trash, i.fa-trash-alt').forEach(icon => {
            icon.classList.add('user-restricted');
            icon.style.pointerEvents = 'auto';
            icon.style.opacity = '0.7';
            icon.style.cursor = 'not-allowed';
            icon.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                showUserRestrictionModal('delete');
            }, true);
        });
        document.querySelectorAll('i.fa-toggle-on.status-active').forEach(icon => {
            icon.classList.add('user-restricted');
            icon.style.pointerEvents = 'auto';
            icon.style.opacity = '0.7';
            icon.style.cursor = 'not-allowed';
            icon.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                showUserRestrictionModal('change user status');
            }, true);
        });
        // console.log('[UserRestrictions] Re-applied restrictions after delay.');

        // Re-apply settings restrictions after delay
        if (window.location.pathname.endsWith('settings.html')) {
            const allowedTabSelector = 'a[href="#account-settings"], a[href="#security-settings"]';
            const allowedSectionSelector = '#account-settings, #security-settings';
            document.querySelectorAll('.settings-tabs a').forEach(tab => {
                if (!tab.matches(allowedTabSelector)) {
                    if (!tab.querySelector('.user-restriction-lock')) {
                        const lock = document.createElement('i');
                        lock.className = 'fas fa-lock user-restriction-lock';
                        lock.style.position = 'absolute';
                        lock.style.right = '1em';
                        lock.style.top = '50%';
                        lock.style.transform = 'translateY(-50%)';
                        lock.style.color = '#9ca3af'; // grey
                        lock.title = 'Access restricted';
                        tab.style.position = 'relative';
                        tab.appendChild(lock);
                    }
                    tab.classList.add('user-restricted');
                    tab.style.opacity = '0.7';
                    tab.style.cursor = 'not-allowed';
                    tab.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        showUserRestrictionModal('access this settings section');
                    }, true);
                }
            });
            document.querySelectorAll('.settings-section').forEach(section => {
                if (!section.matches(allowedSectionSelector)) {
                    section.querySelectorAll('input, select, textarea, button').forEach(el => {
                        el.disabled = true;
                        el.classList.add('user-restricted');
                        if (el.tagName === 'BUTTON') {
                            el.addEventListener('click', function(e) {
                                e.preventDefault();
                                e.stopPropagation();
                                showUserRestrictionModal('change these settings');
                            }, true);
                        }
                    });
                    section.style.opacity = '0.7';
                }
            });
        }
    }, 2000);

    // Show restriction modal/alert
    function showUserRestrictionModal(action) {
        if (document.getElementById('userRestrictionModal')) return;
        const modal = document.createElement('div');
        modal.id = 'userRestrictionModal';
        modal.style.position = 'fixed';
        modal.style.top = 0;
        modal.style.left = 0;
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.18)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = 10000;
        modal.innerHTML = `
            <div style="background: var(--card-bg, #fff); padding: 2.5em 2.5em 2em 2.5em; border-radius: 18px; min-width: 320px; max-width: 95vw; text-align: center; font-family: system-ui, 'Segoe UI', Arial, sans-serif;">
                <h3 style="margin-top:0;font-size:1.5em;margin-bottom:1.2em;font-weight:700;letter-spacing:-0.5px;color:var(--heading-color,#222);">Restricted Action</h3>
                <div style="font-size:1.08em;margin-bottom:2em;color:var(--text-color,#444);">You do not have permission to <b>${action}</b>.</div>
                <button id="userRestrictionCloseBtn" style="margin-top:0.5em;min-width:120px;padding:0.7em 0;font-size:1em;border:none;border-radius:8px;background:var(--primary-color,#3b82f6);color:#fff;font-weight:600;cursor:pointer;transition:background 0.18s;outline:none;box-shadow:none;">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
        const closeBtn = document.getElementById('userRestrictionCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('mouseover', () => {
                closeBtn.style.background = 'var(--primary-dark, #2563eb)';
            });
            closeBtn.addEventListener('mouseout', () => {
                closeBtn.style.background = 'var(--primary-color, #3b82f6)';
            });
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }
    }
})(); 