document.addEventListener('DOMContentLoaded', () => {
  // Initialize site functionality
  initLanguageSwitcher();
  initMobileMenu();
  initScrollEffects();
  initTestimonialSlider();
  initPricingToggle();
  initPlayVideo();
  initContactForm();
  initTemplatePopups();
  initThemeToggle();
  
  // Add animation classes to elements
  addAnimations();
});

/**
 * Language Switcher Functionality
 */
function initLanguageSwitcher() {
  // Get language elements
  const languageBtn = document.getElementById('language-btn');
  const languageDropdown = document.getElementById('language-dropdown');
  const languageOptions = languageDropdown.querySelectorAll('a');
  const currentLangSpan = document.getElementById('current-lang');
  
  // Set initial language (defaults to English)
  let currentLanguage = localStorage.getItem('walaka-language') || 'en';
  updateLanguage(currentLanguage);
  
  // Toggle language dropdown
  languageBtn.addEventListener('click', () => {
    languageDropdown.classList.toggle('active');
  });
  
  // Handle language option clicks
  languageOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      const newLang = option.getAttribute('data-lang');
      updateLanguage(newLang);
      languageDropdown.classList.remove('active');
    });
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!languageBtn.contains(e.target) && !languageDropdown.contains(e.target)) {
      languageDropdown.classList.remove('active');
    }
  });
  
  // Update all text on the page based on selected language
  function updateLanguage(lang) {
    // Save selected language to localStorage
    localStorage.setItem('walaka-language', lang);
    currentLanguage = lang;
    
    // Update the language button display
    currentLangSpan.textContent = lang.toUpperCase();
    
    // Update language dropdown active class
    languageOptions.forEach(option => {
      if (option.getAttribute('data-lang') === lang) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
    
    // Update all translatable elements
    document.querySelectorAll('[data-en]').forEach(element => {
      // Get the appropriate language text from data attributes
      const text = element.getAttribute(`data-${lang}`);
      if (text) {
        // For inputs with placeholder, update the placeholder
        if (element.hasAttribute('placeholder')) {
          element.placeholder = element.getAttribute(`data-placeholder-${lang}`);
        } else {
          // For regular elements, update the text content
          element.textContent = text;
        }
      }
    });
    
    // Set html lang attribute
    document.documentElement.lang = lang;
  }
}

/**
 * Mobile Menu Functionality
 */
function initMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  const mobileNavLinks = mobileNav.querySelectorAll('a');
  
  // Toggle mobile menu
  menuBtn.addEventListener('click', () => {
    menuBtn.classList.toggle('active');
    mobileNav.classList.toggle('active');
  });
  
  // Close mobile menu when a link is clicked
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      menuBtn.classList.remove('active');
      mobileNav.classList.remove('active');
    });
  });
}

/**
 * Scroll Effects
 */
function initScrollEffects() {
  const header = document.getElementById('header');
  
  // Add shadow to header on scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
  
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      
      // Skip if it's just "#" or empty
      if (targetId === "#" || !targetId) return;
      
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        e.preventDefault();
        
        window.scrollTo({
          top: targetElement.offsetTop - 80, // Account for fixed header
          behavior: 'smooth'
        });
      }
    });
  });
}

/**
 * Testimonial Slider Functionality
 */
function initTestimonialSlider() {
  const testimonialCards = document.querySelectorAll('.testimonial-card');
  const dots = document.querySelectorAll('.dot');
  const prevBtn = document.querySelector('.testimonial-nav-btn.prev');
  const nextBtn = document.querySelector('.testimonial-nav-btn.next');
  
  if (!testimonialCards.length) return;
  
  let currentSlide = 0;
  
  // Hide all slides except the first one
  testimonialCards.forEach((card, index) => {
    if (index !== 0) {
      card.style.display = 'none';
    }
  });
  
  // Function to show a specific slide
  function showSlide(n) {
    // Hide all slides
    testimonialCards.forEach(card => {
      card.style.display = 'none';
    });
    
    // Remove active class from all dots
    dots.forEach(dot => {
      dot.classList.remove('active');
    });
    
    // Show the selected slide and activate corresponding dot
    testimonialCards[n].style.display = 'block';
    dots[n].classList.add('active');
    
    // Update current slide index
    currentSlide = n;
  }
  
  // Previous button click
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      let newIndex = currentSlide - 1;
      if (newIndex < 0) {
        newIndex = testimonialCards.length - 1;
      }
      showSlide(newIndex);
    });
  }
  
  // Next button click
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      let newIndex = currentSlide + 1;
      if (newIndex >= testimonialCards.length) {
        newIndex = 0;
      }
      showSlide(newIndex);
    });
  }
  
  // Dot click
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      showSlide(index);
    });
  });
  
  // Auto-advance slides every 5 seconds
  setInterval(() => {
    let newIndex = currentSlide + 1;
    if (newIndex >= testimonialCards.length) {
      newIndex = 0;
    }
    showSlide(newIndex);
  }, 5000);
}

/**
 * Pricing Toggle Functionality
 */
function initPricingToggle() {
  const pricingToggle = document.getElementById('pricing-toggle');
  const monthlyPrices = document.querySelectorAll('.price.monthly');
  const annualPrices = document.querySelectorAll('.price.annual');
  
  if (!pricingToggle) return;
  
  pricingToggle.addEventListener('change', () => {
    if (pricingToggle.checked) {
      // Show annual pricing
      monthlyPrices.forEach(price => price.classList.add('hidden'));
      annualPrices.forEach(price => price.classList.remove('hidden'));
    } else {
      // Show monthly pricing
      monthlyPrices.forEach(price => price.classList.remove('hidden'));
      annualPrices.forEach(price => price.classList.add('hidden'));
    }
  });
}

/**
 * Video Player Functionality
 */
function initPlayVideo() {
  const playButton = document.querySelector('.play-button');
  const videoPlaceholder = document.querySelector('.video-placeholder');
  
  if (!playButton || !videoPlaceholder) return;
  
  playButton.addEventListener('click', () => {
    // In a real implementation, this would play a video
    // For this demo, we'll just show an alert
    alert('Video player would start here in the production version.');
  });
}

/**
 * Contact Form Functionality
 */
function initContactForm() {
  const contactForm = document.getElementById('contact-form');
  
  if (!contactForm) return;
  
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // In a real implementation, this would send form data to a server
    // For this demo, we'll just show an alert
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    
    if (nameInput && emailInput) {
      const name = nameInput.value;
      const email = emailInput.value;
      
      const currentLanguage = localStorage.getItem('walaka-language') || 'en';
      const message = currentLanguage === 'pt'
        ? `Obrigado ${name}! Nós entraremos em contato através do email ${email} em breve.`
        : `Thank you ${name}! We'll contact you at ${email} shortly.`;
      
      alert(message);
      
      // Reset form
      contactForm.reset();
    }
  });
}

/**
 * Template Preview Popups
 */
function initTemplatePopups() {
  // Get all template preview buttons
  const previewButtons = document.querySelectorAll('.template-btn');
  const closeButtons = document.querySelectorAll('.dialog-close, .close-dialog');
  const templateDialogs = document.querySelectorAll('.template-dialog');
  
  // Exit if no template preview buttons exist on this page
  if (!previewButtons.length) return;
  
  // Add click event to template preview buttons
  previewButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Get the template type from the parent card
      const templateCard = button.closest('.template-card');
      const templateName = templateCard.querySelector('h4').textContent.trim().toLowerCase();
      
      // Find and open the corresponding template dialog
      const dialog = document.getElementById(`template-${templateName}`);
      if (dialog) {
        dialog.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when dialog is open
      }
    });
  });
  
  // Add click event to close buttons
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Find the parent dialog and close it
      const dialog = button.closest('.template-dialog');
      if (dialog) {
        dialog.classList.remove('active');
        document.body.style.overflow = ''; // Re-enable scrolling
      }
    });
  });
  
  // Close dialog when clicking outside of content
  templateDialogs.forEach(dialog => {
    dialog.addEventListener('click', (e) => {
      // If clicking on the overlay (not the content)
      if (e.target === dialog) {
        dialog.classList.remove('active');
        document.body.style.overflow = ''; // Re-enable scrolling
      }
    });
  });
  
  // Close dialog with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      templateDialogs.forEach(dialog => {
        if (dialog.classList.contains('active')) {
          dialog.classList.remove('active');
          document.body.style.overflow = ''; // Re-enable scrolling
        }
      });
    }
  });
}

/**
 * Theme Toggle Functionality
 */
function initThemeToggle() {
  const themeBtn = document.getElementById('theme-btn');
  const themeIcon = themeBtn.querySelector('i');
  
  // Set initial theme based on user preference or default to light
  const savedTheme = localStorage.getItem('walaka-theme') || 'light';
  setTheme(savedTheme);
  
  // Toggle theme on button click
  themeBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  });
  
  // Function to set the theme
  function setTheme(theme) {
    // Update HTML data attribute
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update button icon
    if (theme === 'dark') {
      themeIcon.classList.remove('fa-moon');
      themeIcon.classList.add('fa-sun');
    } else {
      themeIcon.classList.remove('fa-sun');
      themeIcon.classList.add('fa-moon');
    }
    
    // Save theme preference
    localStorage.setItem('walaka-theme', theme);
  }
}

/**
 * Add animation classes to elements as they come into view
 */
function addAnimations() {
  // Add fade-in and slide-up animations when elements enter viewport
  const animateOnScroll = () => {
    const elementsToAnimate = document.querySelectorAll('.feature-card, .use-case-card, .step-card, .pricing-card, .section-header h2, .section-header p, .template-card, .preview-feature, .trust-badge');
    
    elementsToAnimate.forEach(element => {
      const elementTop = element.getBoundingClientRect().top;
      const elementVisible = 150; // How much of the element needs to be visible
      
      if (elementTop < window.innerHeight - elementVisible) {
        if (element.classList.contains('feature-card') || 
            element.classList.contains('step-card') || 
            element.classList.contains('pricing-card') ||
            element.classList.contains('use-case-card') ||
            element.classList.contains('template-card') ||
            element.classList.contains('preview-feature')) {
          element.classList.add('slide-up');
        } else {
          element.classList.add('fade-in');
        }
      }
    });
  };
  
  // Run once on load
  animateOnScroll();
  
  // Run on scroll
  window.addEventListener('scroll', animateOnScroll);
}
