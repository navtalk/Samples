/**
 * NavTalk Floating Widget - Collapse State Restorer
 *
 * Reads the saved collapsed/expanded state from localStorage and applies it to
 * the global floating widget as soon as its DOM is available in the footer.
 *
 * This file is intentionally framework-free and runs as an IIFE at <body> end
 * (printed via wp_enqueue_script in includes/class-navtalk-shortcode.php).
 */
(function () {
    try {
        var savedState = localStorage.getItem('navtalk_widget_state');
        if (savedState === 'collapsed') {
            var widget = document.getElementById('navtalk-widget-root');
            var toggleBtn = document.getElementById('navtalk-widget-toggle');
            if (widget) {
                widget.classList.add('navtalk-is-collapsed');
            }
            if (toggleBtn) {
                toggleBtn.setAttribute('aria-expanded', 'false');
                var toggleText = toggleBtn.querySelector('.navtalk-widget-toggle-text');
                if (toggleText) {
                    toggleText.textContent = 'Show';
                }
            }
        }
    } catch (e) {}
})();
