# NavTalk Digital Human WordPress Plugin

Integrate NavTalk real-time AI avatar conversations into your WordPress site with ease.

## Description

NavTalk Digital Human is a WordPress plugin that enables you to embed interactive AI avatars on your website. Users can have real-time voice and video conversations with AI-powered digital humans directly from your WordPress pages.

## Features

- ✨ **Simple Configuration**: Only requires a license key to get started
- 🎭 **Multiple Avatars**: Support for multiple digital human avatars
- 💬 **Real-time Communication**: WebSocket and WebRTC powered conversations
- 🎤 **Voice Interaction**: Full duplex voice communication
- 📹 **Video Streaming**: Real-time video of digital human responses
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎨 **Customizable**: Adjustable card dimensions and button text
- 🔒 **Secure**: License-based authentication

## Requirements

- WordPress 5.0 or higher
- PHP 7.2 or higher
- Modern web browser with WebRTC support
- HTTPS enabled (required for microphone access)
- NavTalk account and license key

## Installation

### Method 1: Manual Installation

1. Download the plugin folder `navtalk-digital-human`
2. Upload it to your WordPress `wp-content/plugins/` directory
3. Go to **WordPress Admin → Plugins**
4. Find "NavTalk Digital Human" and click **Activate**

### Method 2: ZIP Installation

1. Compress the `navtalk-digital-human` folder into a ZIP file
2. Go to **WordPress Admin → Plugins → Add New**
3. Click **Upload Plugin**
4. Choose the ZIP file and click **Install Now**
5. Click **Activate Plugin**

## Configuration

### Step 1: Get Your License Key

1. Visit [NavTalk Console](https://console.navtalk.ai)
2. Log in to your account
3. Navigate to API Keys section
4. Copy your license key

### Step 2: Configure the Plugin

1. Go to **WordPress Admin → Settings → NavTalk Digital Human**
2. Paste your license key into the "License Key" field
3. Click "Test Connection" to verify (optional)
4. Click **Save Settings**

### Step 3: Adjust API URLs (If Needed)

The plugin comes with pre-configured API and WebSocket URLs. If you need to change them:

1. Open `includes/class-navtalk-config.php`
2. Modify the constants:
   ```php
   const API_URL = 'https://api.navtalk.ai';  // Your API URL
   const WEBSOCKET_URL = 'wss://transfer.navtalk.ai';  // Your WebSocket URL
   ```
3. Save the file

## Usage

### 1. Avatar Card (Standard)

Embed a single avatar with full card display:

```
[navtalk_avatar avatarId="your-avatar-id"]
```

### 2. Floating Button

Fixed position button at corner of screen (instant connect):

```
[navtalk_floating avatarId="your-avatar-id"]
```

**Parameters:**
- `avatarId` (required): Avatar ID
- `position` (optional): `bottom-right`, `bottom-left`, `top-right`, `top-left`, default: `bottom-right`
- `color` (optional): Button color (hex), default: `#667eea`
- `size` (optional): Button size, default: `60px`

**Examples:**
```
[navtalk_floating avatarId="your-avatar-id" position="bottom-left" color="#ff5e62"]
[navtalk_floating avatarId="your-avatar-id" position="top-right" size="70px"]
```

### 3. Avatar List (WordPress Integration)

Display a grid of all available avatars from your account:

```
[navtalk_list]
```

**Parameters:**
- `columns` (optional): Number of columns, default: `3`
- `style` (optional): `grid` or `list`, default: `grid`
- `filter` (optional): `all`, `available`, `custom`, default: `all`
- `avatarIds` (optional): Comma-separated avatar IDs (when filter="custom")
- `limit` (optional): Maximum number of avatars to display, default: `20`

**Examples:**

All available avatars in 4 columns:
```
[navtalk_list columns="4" filter="available"]
```

Specific avatars only:
```
[navtalk_list filter="custom" avatarIds="id1, id2, id3" columns="3"]
```

Limited to first 6 avatars:
```
[navtalk_list limit="6" columns="2"]
```

### Available Avatars

Avatars and their IDs are provided by your NavTalk account. Use the avatar list in Settings > NavTalk Digital Human or the API to get each avatar’s ID for shortcodes.

### Shortcode Parameters

Customize the avatar display with these parameters:

| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `avatarId` | Avatar ID (required for real-time call) | - | From API / avatar list |
| `width` | Card width | `300px` | `400px` |
| `height` | Card height | `400px` | `500px` |
| `button_text` | Button label | `Start Chat` | `Talk to Me` |

### Examples

**Single avatar card:**
```
[navtalk_avatar avatarId="your-avatar-id"]
```

**Floating button in corner:**
```
[navtalk_floating avatarId="your-avatar-id" position="bottom-right"]
```

**Grid of all available avatars:**
```
[navtalk_list columns="3" filter="available"]
```

**Multiple avatars in a row (using custom HTML):**
```html
<div style="display: flex; gap: 20px; flex-wrap: wrap;">
    [navtalk_avatar avatarId="avatar-id-1"]
    [navtalk_avatar avatarId="avatar-id-2"]
    [navtalk_avatar avatarId="avatar-id-3"]
</div>
```

**Mixed layout:**
```html
<h2>Talk to Our AI Team</h2>
<p>Choose an AI assistant from the list below:</p>

[navtalk_list columns="3" filter="available"]

[navtalk_floating avatarId="your-avatar-id"]
```

## User Experience

### Avatar Card Flow
1. **View Avatar**: Visitors see an attractive avatar card with image and name
2. **Click to Start**: Click the "Start Chat" button to begin
3. **Modal Opens**: Full-screen modal appears with avatar image
4. **Click Call Button**: Click the phone icon to connect
5. **Allow Microphone**: Browser requests microphone permission
6. **Start Talking**: Begin speaking naturally
7. **See Response**: Watch avatar respond with voice and video
8. **View Transcript**: See conversation text in real-time
9. **End Chat**: Click close button or call button to end

### Floating Button Flow
1. **Always Visible**: Floating button always visible on page
2. **Click Anytime**: Click button from any scroll position
3. **Instant Connect**: Opens modal and connects immediately
4. **Quick Access**: Fast access to AI assistant from anywhere
5. **Interactive Chat**: Real-time voice and video interaction
6. **End Chat**: Click close button to end

### Technical Flow

1. Shortcode renders avatar card with data from NavTalk API
2. User clicks "Start Chat" button
3. Modal opens with avatar image
4. WebSocket connection established to NavTalk server
5. WebRTC peer connection created for video streaming
6. Audio recording starts from user's microphone
7. Audio chunks sent to server via WebSocket
8. Server processes and responds with video and audio
9. Chat transcript displayed in real-time
10. Resources cleaned up on disconnect

## Troubleshooting

### License Key Issues

**Problem**: "License key is not configured"
- **Solution**: Go to Settings → NavTalk Digital Human and enter your license key

**Problem**: "Connection test failed"
- **Solution**: 
  - Verify your license key is correct
  - Check if your WordPress site can make outbound HTTPS requests
  - Ensure the API URL is accessible from your server

### Avatar Not Loading

**Problem**: Avatar shows error message
- **Solution**:
  - Check that the avatar ID (avatarId) is correct
  - Verify the avatar exists in your NavTalk account
  - Check browser console for errors

### Microphone Access

**Problem**: "Unable to access microphone"
- **Solution**:
  - Ensure your site is served over HTTPS (required for microphone access)
  - Check browser permissions for microphone
  - Try a different browser

### Video Not Playing

**Problem**: Video doesn't start after connection
- **Solution**:
  - Check browser console for WebRTC errors
  - Verify your browser supports WebRTC
  - Check firewall settings (WebRTC requires UDP)

### Connection Drops

**Problem**: Connection frequently drops
- **Solution**:
  - Check internet connection stability
  - Verify WebSocket URL is correct
  - Check server logs for errors

## Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 80+ | ✅ Full |
| Firefox | 75+ | ✅ Full |
| Safari | 13+ | ✅ Full |
| Edge | 80+ | ✅ Full |
| Opera | 67+ | ✅ Full |
| IE | Any | ❌ Not supported |

## Security

- All communication is encrypted (HTTPS/WSS)
- License key authentication required
- Microphone access requires user permission
- No data is stored on your WordPress site
- Chat history stored in browser localStorage only

## Performance

- Lightweight plugin (~50KB total)
- Minimal server load (communication is direct to NavTalk)
- Responsive design for mobile devices
- Optimized WebRTC for low latency

## Additional Documentation

For detailed information about specific features, please refer to these documents:

- **[Avatar Video & Button Style](AVATAR-VIDEO-BUTTON-STYLE.md)** - Preview video support and custom button styling
- **[Shortcode & Elementor Consistency](SHORTCODE-ELEMENTOR-CONSISTENCY.md)** - Complete guide on how shortcodes and Elementor components work identically
- **[Elementor Widgets Guide](ELEMENTOR-WIDGETS.md)** - How to use NavTalk custom widgets in Elementor
- **[Avatar Optimization](AVATAR-OPTIMIZATION.md)** - Avatar card display and responsive layout details
- **[Download Button Feature](DOWNLOAD-BUTTON-FEATURE.md)** - Download button and custom icon implementation
- **[Auto-Call Feature](AUTO-CALL-FEATURE.md)** - Automatic call initiation when modal opens
- **[Inline Video Mode](INLINE-VIDEO-MODE.md)** - How inline video mode works for single avatars
- **[Installation Guide](INSTALL.md)** - Detailed installation instructions
- **[Features Overview](FEATURES.md)** - Comprehensive feature list

## Support

For support, please contact:
- **Website**: https://navtalk.ai
- **Documentation**: https://docs.navtalk.ai
- **Email**: support@navtalk.ai

## Changelog

### Version 1.0.0 (2026-03-09)
- Initial release
- Basic shortcode functionality (`[navtalk_avatar]`)
- Floating button shortcode (`[navtalk_floating]`)
- Avatar list shortcode (`[navtalk_list]`) - WordPress integration
- WebSocket and WebRTC integration
- Real-time voice and video communication
- Chat transcript display
- Multiple avatar support
- Responsive design
- Admin configuration panel
- Instant connect feature for floating buttons

## License

This plugin is licensed under GPL v2 or later.

## Credits

Developed by NavTalk Team
- Website: https://navtalk.ai
- GitHub: https://github.com/navtalk

## FAQ

**Q: What's the difference between avatar card and floating button?**
A: Avatar cards show full card UI and require clicking the call button after opening modal (unless auto-call is enabled). Floating buttons connect immediately when clicked.

**Q: Do I need to create avatars manually?**
A: Avatars and their IDs come from your NavTalk account; use Settings > NavTalk Digital Human or the API to get avatar IDs for shortcodes.

**Q: Can I use custom avatars?**
A: Yes, you can create custom avatars in your NavTalk account and use them with this plugin.

**Q: How does [navtalk_list] get avatars?**
A: It fetches all avatars from your NavTalk account via API, so you see only the avatars you own.

**Q: Can I have multiple shortcodes on one page?**
A: Yes! You can mix and match avatar cards, buttons, links, and floating buttons on the same page.

**Q: Does the floating button stay on all pages?**
A: The floating button only appears on pages where you add the `[navtalk_floating]` shortcode.

**Q: Is there a usage limit?**
A: Usage limits depend on your NavTalk subscription plan.

**Q: Can I style the avatar cards?**
A: Yes, you can add custom CSS to override the default styles. The cards use the class `navtalk-avatar-card`.

**Q: Does this work with page builders?**
A: Yes, the shortcode works with all major page builders (Elementor, Divi, WPBakery, etc.).

**Q: Can I have multiple avatars on one page?**
A: Yes, you can add as many avatars as you want on a single page.

**Q: What happens if my license expires?**
A: The avatars will stop working until you renew your license.

**Q: Is this GDPR compliant?**
A: The plugin doesn't store personal data. However, you should review NavTalk's privacy policy for their services.
