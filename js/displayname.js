        //Display user name function
        // This function will fetch the username from the Supabase database and display it
        // in the user-displayname span element
        document.addEventListener('DOMContentLoaded', async () => {
            if (typeof supabase === 'undefined') return;

            const { data: { session } } = await supabase.auth.getSession();
            if (!session || !session.user) return;

            let displayName = session.user.email;
            try {
                const { data: userRecord, error } = await supabase
                    .from('users')
                    .select('username')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (userRecord && userRecord.username) {
                    displayName = userRecord.username;
                }
            } catch (e) {
                // fallback to email
            }

            const userSpan = document.getElementById('user-displayname');
            if (userSpan) userSpan.textContent = displayName;

            // Update subtitle with displayName
            const subtitle = document.getElementById('dashboard-subtitle');
            if (subtitle) {
                ['en', 'pt'].forEach(lang => {
                    if (subtitle.dataset[lang]) {
                        subtitle.dataset[lang] = subtitle.dataset[lang].replace(/User/g, displayName);
                    }
                });
                subtitle.textContent = subtitle.textContent.replace(/User/g, displayName);
            }
        });

        // Dropdown open/close logic for user menu
        const userProfile = document.getElementById('userProfile');
        const userDropdown = document.getElementById('userDropdown');

        let dropdownTimeout;

        function openDropdown() {
            clearTimeout(dropdownTimeout);
            userProfile.classList.add('open');
        }
        function closeDropdown() {
            dropdownTimeout = setTimeout(() => {
                userProfile.classList.remove('open');
            }, 150);
        }

        userProfile.addEventListener('mouseenter', openDropdown);
        userProfile.addEventListener('mouseleave', closeDropdown);
        userDropdown.addEventListener('mouseenter', openDropdown);
        userDropdown.addEventListener('mouseleave', closeDropdown);

        // Optional: close on click outside
        document.addEventListener('click', function(e) {
            if (!userProfile.contains(e.target)) {
                userProfile.classList.remove('open');
            }
        });