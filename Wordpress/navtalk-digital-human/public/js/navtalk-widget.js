/**
 * NavTalk Widget JavaScript
 * Global floating digital human assistant component script
 */

(function($) {
    'use strict';
    
    /**
     * NavTalk Widget Class
     */
    class NavTalkWidget {
        constructor() {
            this.STORAGE_KEY = 'navtalk_widget_state';
            this.$container = $('#ntw-widget-root');
            this.$toggleBtn = $('#ntw-toggle-widget');
            this.$video = $('#ntw-avatar-video');
            this.$characterAvatar = $('.ntw-character-avatar');
            this.isExpanded = this.loadState();
            this.isConnected = false;
            
            if (this.$container.length === 0) {
                return;
            }
            
            this.init();
        }
        
        /**
         * Initialize widget
         */
        init() {
            console.log('[NavTalk Widget] Initializing...');
            
            // Apply saved state
            if (!this.isExpanded) {
                this.$container.addClass('ntw-collapsed');
                this.$toggleBtn.attr('aria-expanded', 'false');
                this.$toggleBtn.find('.ntw-toggle-text').text('Show');
            }else {
                this.$toggleBtn.find('.ntw-toggle-text').text('Hide');
            }
            
            // Bind toggle button event
            this.$toggleBtn.on('click', () => this.toggle());
            
            // Initialize digital human connection
            this.initAvatar();
            
            // Trigger custom initialization callback
            if (typeof window.navtalkOnInit === 'function') {
                try {
                    window.navtalkOnInit(this);
                } catch (e) {
                    console.error('[NavTalk Widget] Error in navtalkOnInit callback:', e);
                }
            }
            
            console.log('[NavTalk Widget] Initialized successfully with state:', this.isExpanded ? 'expanded' : 'collapsed');
        }
        
        /**
         * Toggle show/hide widget
         */
        toggle() {
            this.isExpanded = !this.isExpanded;
            this.$container.toggleClass('ntw-collapsed');
            this.$toggleBtn.attr('aria-expanded', this.isExpanded);
            
            console.log('[NavTalk Widget] Toggled:', this.isExpanded ? 'expanded' : 'collapsed');
            this.$toggleBtn.find('.ntw-toggle-text').text(this.isExpanded ? 'Hide' : 'Show');
            
            // Save state to localStorage
            this.saveState(this.isExpanded);
            
            // Trigger custom toggle callback
            if (typeof window.navtalkOnToggle === 'function') {
                try {
                    window.navtalkOnToggle(this.isExpanded);
                } catch (e) {
                    console.error('[NavTalk Widget] Error in navtalkOnToggle callback:', e);
                }
            }
        }
        
        /**
         * Load saved widget state from localStorage
         * @returns {boolean} true if expanded, false if collapsed
         */
        loadState() {
            try {
                const savedState = localStorage.getItem(this.STORAGE_KEY);
                if (savedState !== null) {
                    return savedState === 'expanded';
                }
            } catch (e) {
                console.warn('[NavTalk Widget] Failed to load state from localStorage:', e);
            }
            // Default to expanded if no saved state
            return true;
        }
        
        /**
         * Save widget state to localStorage
         * @param {boolean} isExpanded - Current expanded state
         */
        saveState(isExpanded) {
            try {
                localStorage.setItem(this.STORAGE_KEY, isExpanded ? 'expanded' : 'collapsed');
            } catch (e) {
                console.warn('[NavTalk Widget] Failed to save state to localStorage:', e);
            }
        }
        
        /**
         * Initialize digital human avatar connection
         */
        initAvatar() {
            const avatarId = this.$container.data('avatar-id');
            const avatarImg = this.$container.data('avatar-img');
            const prompt = this.$container.data('prompt');
            const voice = this.$container.data('voice');
            const model = this.$container.data('model');

            console.log('[NavTalk Widget] Avatar config:', {
                avatarId,
                prompt,
                voice,
                model
            });

            if (!avatarId) {
                console.error('[NavTalk Widget] No avatar ID specified');
                return;
            }

            // Show loading state
            this.$characterAvatar.addClass('loading');

            // Set poster image
            if (avatarImg) {
                this.$video.attr('poster', avatarImg);
            }

            // Integrate existing navtalk-realtime.js logic
            // Check if navtalkConfig is available
            if (typeof navtalkConfig === 'undefined') {
                console.error('[NavTalk Widget] navtalkConfig not found');
                this.$characterAvatar.removeClass('loading');
                return;
            }

            // Prepare configuration
            const config = {
                avatarId: avatarId,
                license: navtalkConfig.license,
                websocketUrl: navtalkConfig.websocketUrl
            };

            // Add custom configuration
            if (prompt) {
                config.prompt = prompt;
            }
            if (voice) {
                config.voice = voice;
            }
            if (model) {
                config.model = model;
            }

            // Trigger custom connection callback
            if (typeof window.navtalkOnConnect === 'function') {
                try {
                    window.navtalkOnConnect(avatarId, config);
                } catch (e) {
                    console.error('[NavTalk Widget] Error in navtalkOnConnect callback:', e);
                }
            }
            
            // NOTE: Actual WebRTC connection logic is handled by navtalk-realtime.js
            // The call button click will trigger the inline call mode
            setTimeout(() => {
                this.$characterAvatar.removeClass('loading');
                this.isConnected = true;
                console.log('[NavTalk Widget] Avatar initialized (ready for call)');
            }, 1000);
        }
        
        /**
         * Show widget panel
         */
        show() {
            if (!this.isExpanded) {
                this.toggle();
            }
        }
        
        /**
         * Hide widget panel
         */
        hide() {
            if (this.isExpanded) {
                this.toggle();
            }
        }
        
        /**
         * Destroy widget component
         */
        destroy() {
            this.$toggleBtn.off('click');
            this.$container.remove();
            console.log('[NavTalk Widget] Destroyed');
        }
    }
    
    /**
     * Initialize widget after page load
     */
    $(document).ready(function() {
        if ($('#ntw-widget-root').length) {
            window.navtalkWidget = new NavTalkWidget();
        }
    });
    
})(jQuery);
