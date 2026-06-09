# Installation Guide

## Quick Start

### 1. Upload Plugin

**Option A: Via WordPress Admin**
1. Compress the `navtalk-digital-human` folder to `navtalk-digital-human.zip`
2. Go to WordPress Admin → Plugins → Add New → Upload Plugin
3. Select the ZIP file and click Install Now
4. Click Activate

**Option B: Via FTP/SFTP**
1. Upload the `navtalk-digital-human` folder to `/wp-content/plugins/`
2. Go to WordPress Admin → Plugins
3. Find "NavTalk Digital Human" and click Activate

### 2. Configure License

1. Go to **Settings → NavTalk Digital Human**
2. Enter your license key from https://console.navtalk.ai
3. Click **Test Connection** (optional)
4. Click **Save Settings**

### 3. Add to Your Page

1. Edit any page or post
2. Add the shortcode:
   ```
   [navtalk_avatar name="navtalk.Ethan"]
   ```
3. Publish and view the page

### 4. Test the Avatar

1. Visit the published page
2. Click "Start Chat" on the avatar card
3. Allow microphone access when prompted
4. Start talking to the avatar

## Configuration Options

### API URLs (Advanced)

If you need to use custom API URLs:

1. Open `includes/class-navtalk-config.php`
2. Edit these lines:
   ```php
   const API_URL = 'https://your-api.com';
   const WEBSOCKET_URL = 'wss://your-ws.com';
   ```
3. Save and re-upload

### Custom Styling

Add custom CSS in **Appearance → Customize → Additional CSS**:

```css
/* Customize avatar card */
.navtalk-avatar-card {
    border: 2px solid #667eea;
}

/* Customize button */
.navtalk-start-chat {
    background: #ff5e62 !important;
}
```

## Troubleshooting

### Plugin Not Showing in Admin

- Check file permissions (755 for folders, 644 for files)
- Verify the folder is in `/wp-content/plugins/`
- Check PHP error logs

### License Connection Failed

- Ensure your server can make HTTPS requests
- Check firewall settings
- Verify license key is correct

### Microphone Not Working

- **HTTPS Required**: Your site MUST use HTTPS
- Check browser permissions
- Try different browser

## System Requirements

- WordPress 5.0+ (tested up to 7.0)
- PHP 7.2+
- MySQL 5.6+
- HTTPS enabled (required)
- Modern browser with WebRTC support

## Support

Need help? Contact support@navtalk.ai or visit https://docs.navtalk.ai
