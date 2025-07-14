# Trial Restrictions System

This system automatically restricts access to certain features when trial limits are reached (days remaining = 0 or invoices remaining = 0).

## Overview

The trial restrictions system integrates with your existing trial banner to:
- Prevent access to restricted actions when trial limits are reached
- Show visual feedback for restricted elements
- Display helpful modals explaining the restrictions
- Provide a smooth upgrade path

## Files Created/Modified

### New Files:
1. `components/trial-restrictions.js` - Main restriction system
2. `components/trial-restrictions.css` - Styling for restricted elements
3. `test-trial-restrictions.html` - Test page to verify functionality

### Modified Files:
1. `dashboard.html` - Added trial restrictions loading
2. `components/trial-banner.js` - Added custom event dispatch

## How It Works

### 1. Automatic Detection
The system waits for your trial banner to load and extracts trial data from the DOM:
- Days remaining from `#days-remaining`
- Invoices remaining from `#invoices-remaining`
- Automatically determines if restrictions should be applied

### 2. Restricted Actions
The following actions are automatically restricted when trial limits are reached:
- **Quick Action Links:**
  - `invoices.html` (New Invoice)
  - `clients/clients.html` (Add Client)
  - `products.html` (Add Product)
  - `banks/banks.html` (Banks & Wallets)

- **Action Buttons:**
  - `#createInvoiceBtn` (Create Invoice button)
  - `.btn.primary-btn` (Primary action buttons)
  - `[data-action="create"]` (Create action buttons)
  - `[data-action="add"]` (Add action buttons)

### 3. Visual Feedback
When restrictions are active:
- Action cards get a lock overlay with reduced opacity
- Buttons are disabled and show a lock icon
- Hover effects are disabled
- Links become non-clickable

### 4. User Experience
- Clicking restricted elements shows a modal explaining the limitation
- Modal provides options to continue with trial or upgrade
- Upgrade button triggers your existing upgrade modal

## Implementation Details

### Loading Order
1. Trial banner loads first
2. Trial restrictions system loads 500ms after banner
3. System waits for trial data to be populated
4. Restrictions are applied automatically

### Event Handling
- Intercepts clicks on restricted elements
- Prevents navigation to restricted pages
- Handles dynamically added elements via MutationObserver
- Intercepts programmatic navigation (history.pushState)

### Styling
- Uses CSS classes for consistent styling
- Responsive design that works on all screen sizes
- Smooth animations and transitions
- Clear visual indicators for restricted state

## Testing

Use `test-trial-restrictions.html` to test the system:

1. **Open the test page** in your browser
2. **Wait for trial banner** to load
3. **Use simulation buttons** to test different states:
   - "Simulate Trial Expired" - Sets days to 0
   - "Simulate Invoices Exhausted" - Sets invoices to 0
   - "Simulate Active Trial" - Sets normal trial state

### Expected Behavior
- **Active Trial:** All actions work normally
- **Trial Expired:** Quick actions and buttons are restricted
- **Invoices Exhausted:** Same restrictions as trial expired
- **Modal Display:** Clicking restricted elements shows upgrade modal

## Adding New Restrictions

### To restrict new pages:
```javascript
// In trial-restrictions.js, add to restrictedActions Set:
this.restrictedActions = new Set([
    'invoices.html',
    'clients/clients.html',
    'products.html',
    'banks/banks.html',
    'your-new-page.html'  // Add here
]);
```

### To restrict new buttons:
```javascript
// In trial-restrictions.js, add to restrictedSelectors Set:
this.restrictedSelectors = new Set([
    '#createInvoiceBtn',
    '.btn.primary-btn',
    '[data-action="create"]',
    '[data-action="add"]',
    '#yourNewButton'  // Add here
]);
```

### To restrict by button text:
The system automatically detects buttons with these keywords:
- "create"
- "add" 
- "new"
- "generate"

## Integration with Other Pages

To add trial restrictions to other pages (like `invoices.html`, `clients/clients.html`):

1. **Add CSS link:**
```html
<link rel="stylesheet" href="components/trial-restrictions.css">
```

2. **Add trial banner container:**
```html
<div id="trial-banner-container"></div>
```

3. **Load trial banner and restrictions:**
```html
<script>
document.addEventListener('DOMContentLoaded', function() {
    fetch('components/trial-banner.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('trial-banner-container').innerHTML = html;
            
            const script = document.createElement('script');
            script.type = 'module';
            script.src = 'components/trial-banner.js';
            document.body.appendChild(script);
            
            setTimeout(() => {
                const restrictionsScript = document.createElement('script');
                restrictionsScript.src = 'components/trial-restrictions.js';
                document.body.appendChild(restrictionsScript);
            }, 500);
        });
});
</script>
```

## Customization

### Changing Restriction Messages
Edit the modal content in `showRestrictionModal()` method in `trial-restrictions.js`.

### Modifying Visual Style
Update CSS classes in `trial-restrictions.css` to match your design system.

### Adding Custom Logic
Extend the `TrialRestrictions` class with additional methods for custom behavior.

## Troubleshooting

### Common Issues:

1. **Restrictions not applying:**
   - Check browser console for errors
   - Verify trial banner is loading correctly
   - Ensure trial data is being populated

2. **Elements not being restricted:**
   - Check if selectors match your HTML structure
   - Verify elements have correct classes/IDs
   - Check if elements are added dynamically

3. **Modal not showing:**
   - Check for JavaScript errors
   - Verify Font Awesome is loaded
   - Check CSS is not being overridden

### Debug Mode:
Add this to browser console to see trial data:
```javascript
console.log(window.trialRestrictions.getTrialData());
```

## Performance Considerations

- System is lightweight and doesn't affect page performance
- Uses efficient event delegation
- Minimal DOM manipulation
- CSS animations are hardware-accelerated

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires ES6+ support
- Font Awesome 6+ for icons
- CSS Grid and Flexbox for layout

## Security Notes

- Client-side restrictions only (for UX)
- Server-side validation should also be implemented
- Trial data comes from your existing trial banner system
- No sensitive data is exposed

---

This system provides a seamless way to restrict trial users while maintaining a good user experience and clear upgrade path. 