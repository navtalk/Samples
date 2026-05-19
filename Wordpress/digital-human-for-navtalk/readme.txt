=== Digital Human for NavTalk ===
Contributors: navtalk
Tags: ai, avatar, chatbot, digital human, voice chat
Requires at least: 5.0
Tested up to: 6.9
Stable tag: 1.1.0
Requires PHP: 7.2
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Third-party integration: connect your WordPress site to NavTalk for real-time AI avatar conversations.

== Description ==

Digital Human for NavTalk is a WordPress plugin that enables you to embed interactive AI avatars on your website. Users can have real-time voice and video conversations with AI-powered digital humans directly from your WordPress pages. This plugin is not affiliated with or endorsed by WordPress.

The plugin itself is free and the full plugin code is included in this package. Avatar and conversation features are provided by the NavTalk cloud service (Software as a Service); a NavTalk account and license key are required to use that service—this is not hidden or trial-locked code inside the plugin.

= Features =

* Simple Configuration: Only requires a license key to get started
* Multiple Avatars: Support for multiple digital human avatars
* Real-time Communication: WebSocket and WebRTC powered conversations
* Voice Interaction: Full duplex voice communication
* Video Streaming: Real-time video of digital human responses
* Responsive Design: Works on desktop and mobile devices
* Customizable: Adjustable card dimensions and button text
* Secure: License-based authentication
* Elementor Integration: Custom widgets for Elementor page builder
* Multiple Shortcodes: Avatar card, floating button, and list

= Requirements =

* WordPress 5.0 or higher
* PHP 7.2 or higher
* Modern web browser with WebRTC support
* HTTPS enabled (required for microphone access)
* NavTalk account and license key

== Installation ==

= Automatic Installation =

1. Log in to your WordPress admin panel
2. Go to Plugins > Add New
3. Search for "Digital Human for NavTalk"
4. Click "Install Now" and then "Activate"

= Manual Installation =

1. Download the plugin ZIP file (folder must be `digital-human-for-navtalk` with main file `digital-human-for-navtalk.php` inside)
2. Go to Plugins > Add New > Upload Plugin
3. Choose the ZIP file and click "Install Now"
4. Click "Activate Plugin"

= Configuration =

1. Get your license key from [NavTalk Console](https://console.navtalk.ai/#/projects)
2. Go to Settings > Digital Human for NavTalk
3. Enter your license key
4. Click "Test Connection" (optional)
5. Click "Save Settings"

== Frequently Asked Questions ==

= What is Digital Human for NavTalk? =

It connects your site to NavTalk so you can embed AI-powered avatars that have real-time voice and video conversations with visitors.

= Do I need a license key? =

Yes, you need a NavTalk license key. Sign up at https://navtalk.ai to get your key.

= What browsers are supported? =

Chrome 80+, Firefox 75+, Safari 13+, Edge 80+, Opera 67+. WebRTC support is required.

= Does this work with Elementor? =

Yes! The plugin includes custom Elementor widgets for easy drag-and-drop integration.

= Is HTTPS required? =

Yes, HTTPS is required for microphone access (browser security requirement).

= Can I use multiple avatars? =

Yes, you can use as many avatars as your NavTalk plan allows.

= How do I add an avatar to my page? =

Use the shortcode: [navtalk_avatar avatarId="your-avatar-id"] or use Elementor widgets.

= How do I customize appearance? =

Use WordPress Appearance > Customize > Additional CSS (or your theme’s equivalent) to style the plugin’s markup and classes. The plugin no longer stores custom CSS in its settings (WordPress.org guideline alignment).

= What happens if I delete (uninstall) the plugin? =

Uninstalling removes all settings stored in WordPress (including the license key) and the per-page "show digital human" meta. It does not delete your NavTalk account or data on navtalk.ai; manage those in the NavTalk console.

= What shortcodes are available? =

* [navtalk_avatar] - Display avatar card
* [navtalk_floating] - Fixed position floating button
* [navtalk_list] - Display grid of all your avatars

== Screenshots ==

1. Avatar card display with video preview
2. Admin settings page
3. Real-time chat modal with video
4. Elementor widget integration
5. Avatar list grid view
6. Mobile responsive design

== Changelog ==

= 1.1.0 =
* Packaging: plugin folder renamed to `digital-human-for-navtalk` to match the plugin slug and main bootstrap file, aligning with WordPress.org guidelines.
* Encoding: source files normalized to UTF-8 (without BOM) and line endings standardized for better cross-platform compatibility and editor support.
* Maintenance: documentation refreshed (README, install/shortcodes docs) and version metadata kept in sync across `digital-human-for-navtalk.php`, `readme.txt` and the installed-version option.
* Compatibility: tested up to current WordPress release; no breaking changes to existing shortcodes, settings or Elementor widgets.

= 1.0.7 =
* Security: AJAX handlers (`wp_ajax_navtalk_test_connection`, `wp_ajax_navtalk_refresh_avatars`) now verify capability and nonce explicitly with `current_user_can()` + `wp_verify_nonce()` so Plugin Check can detect both checks statically.
* Security: late escaping applied to all variable, option and generated output that was previously echoed via `phpcs:ignore`. `render_overlay_layout()` / `render_bottom_layout()` output is now passed through `wp_kses()` with a strict tag/attribute whitelist (`NavTalk_Shortcode::allowed_avatar_card_html()`); same fix applied to the Elementor avatar widget.
* Security: remaining ternary echoes in admin/shortcode templates wrapped with `esc_attr()` / `esc_html()` (display:none toggles, status colors/badges, "Available/Unavailable" labels).
* Refactor: the global floating-widget collapse-state script moved out of `wp_add_inline_script` into a registered file at `public/js/navtalk-floating-collapse.js`.

= 1.0.6 =
* Plugin Check: limit readme tags to five; prefix globals in uninstall.php; SVG preview uses sanitize_svg_field; drop redundant load_plugin_textdomain (WordPress.org-hosted translations load automatically since WP 4.6).
* Note for scans: run Plugin Check with the plugin folder named `digital-human-for-navtalk` so the expected text domain matches the slug.

= 1.0.5 =
* Release build for WordPress.org: `Stable tag` aligned with `NAVTALK_VERSION`; package root folder `digital-human-for-navtalk` with main file `digital-human-for-navtalk.php` (no functional change from 1.0.4).

= 1.0.4 =
* WordPress.org review: plugin display name and text domain updated (Digital Human for NavTalk / `digital-human-for-navtalk`); main bootstrap file renamed to `digital-human-for-navtalk.php`
* Removed plugin settings field that stored custom CSS; use the theme Customizer "Additional CSS" (or Site Editor) instead
* Elementor copy updated to clarify third-party NavTalk integration
* Minor escaping and user-visible error label consistency

= 1.0.3 =
* i18n: load text domain on plugins_loaded
* Security: require valid nonces for admin AJAX (test connection, refresh avatars)
* Uninstall: add uninstall.php to remove plugin options and _navtalk_show_floating post meta
* Privacy: suggested policy text for Tools > Privacy (NavTalk data handling and policy links)
* Readme: clarify SaaS model vs. trial-locked local code

= 1.0.2 =
* Security and WordPress.org guidelines: removed admin-stored arbitrary JavaScript output; admin/settings scripts use `wp_add_inline_script`
* Floating widget collapse-state script uses `wp_add_inline_script` instead of raw tags in the footer
* Readme: expanded External services disclosure with data flow and Terms/Privacy links
* Settings: floating position option sanitized against an allowed list (bottom/top corners)

= 1.0.0 =
* Initial release
* Basic shortcode functionality ([navtalk_avatar])
* Floating button shortcode ([navtalk_floating])
* Avatar list shortcode ([navtalk_list])
* WebSocket and WebRTC integration
* Real-time voice and video communication
* Chat transcript display
* Multiple avatar support
* Responsive design
* Admin configuration panel
* Elementor widgets integration
* Global floating widget feature
* Custom button styling options
* Inline video mode support
* Download button feature
* Avatar video preview support

== Upgrade Notice ==

= 1.1.0 =
Maintenance release: plugin folder renamed to `digital-human-for-navtalk` to match the slug, source files normalized to UTF-8, and documentation refreshed. No changes to shortcodes or saved settings; safe to update.

= 1.0.7 =
Security hardening to address WordPress.org Plugin Team review: explicit AJAX nonce/capability checks, late escaping of all dynamic output, and inline JS moved to a registered file.

= 1.0.6 =
Maintenance release for Plugin Check / tooling alignment.

= 1.0.5 =
Version alignment and packaging for directory submission. No feature changes from 1.0.4.

= 1.0.4 =
Renamed plugin for WordPress.org naming guidelines; custom CSS is no longer saved in plugin settings—move any rules to Appearance > Customize > Additional CSS. After upload, confirm the plugin folder and main file match `digital-human-for-navtalk`.

= 1.0.3 =
Adds translations loading, stricter admin AJAX nonces, uninstall cleanup, and privacy policy helper text. No change required to shortcodes; re-save settings if you use "Test Connection".

= 1.0.2 =
Security and WordPress.org guideline updates. The settings field for arbitrary custom JavaScript has been removed; use a child theme or custom plugin to enqueue scripts if you need `window.navtalkOnInit` and related hooks.

= 1.0.0 =
Initial release.

== Additional Info ==

For support, documentation, and updates, visit:
* Website: https://navtalk.ai
* Documentation: https://docs.navtalk.ai
* Support: support@navtalk.ai

== Privacy Policy ==

This plugin does not collect or store visitor personal data in the WordPress database. The site administrator stores the NavTalk license key in WordPress options. When visitors use the digital human, audio, video, and chat-related data are processed by NavTalk's services as described below.

== External services ==

This plugin connects the visitor's browser and your WordPress site to NavTalk (operated by NavTalk / navtalk.ai) to load avatars and run real-time conversations.

* HTTPS REST API (`https://api.navtalk.ai`): Used when the plugin or wp-admin requests avatar lists, avatar details, and connection tests. Requests send your license key in HTTP headers and may receive avatar metadata and media URLs.
* WebSocket (`wss://transfer.navtalk.ai`): Used during an active session for real-time voice/video and messaging between the visitor's browser and NavTalk.
* Media delivery: Avatar images and preview videos are loaded from URLs returned by the API (for example from NavTalk CDN hosts such as `https://cdn.navtalk.ai`). The browser requests those assets directly.

Data sent to NavTalk includes at least your license key (from WordPress), session-related traffic over WebSocket (including voice/video where the user grants browser permissions), and any prompts or configuration you set in the plugin. What NavTalk logs or retains is governed by their policies.

Official policies (review before use):
* Terms of Service: https://navtalk.ai/policy/terms-of-service/
* Privacy Policy: https://navtalk.ai/policy/privacy-policy/

== Third Party Services ==

Same as "External services" above: the plugin depends on NavTalk API, WebSocket, and related media hosts. See that section for endpoints, data flow, and policy links.
