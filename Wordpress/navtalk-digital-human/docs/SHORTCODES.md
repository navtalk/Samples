# NavTalk Shortcode Quick Reference

## 🎭 Avatar Card
Full card with image, name, and button.

```
[navtalk_avatar name="navtalk.Ethan"]
[navtalk_avatar name="navtalk.Emma" width="400px" height="500px" button_text="Chat"]
```

**When to use:** Landing pages, about pages, team sections

---

## 🎈 Floating Button
Fixed button at screen corner (instant connect).

```
[navtalk_floating name="navtalk.Mia"]
[navtalk_floating name="navtalk.Chloe" position="bottom-left" color="#ff5e62"]
```

**Positions:** `bottom-right` (default), `bottom-left`, `top-right`, `top-left`
**Color:** Any hex color (e.g., `#667eea`)
**Size:** Controlled pixel size, 32px to 120px (e.g., `60px`, `70px`)

**When to use:** Site-wide assistance, support pages

---

## 📋 Avatar List (WordPress Integration)
Grid of all your avatars from NavTalk account.

```
[navtalk_list]
[navtalk_list columns="4" filter="available"]
[navtalk_list filter="custom" names="navtalk.Ethan, navtalk.Emma" columns="2"]
```

**Parameters:**
- `columns`: `1`, `2`, `3` (default), `4`, `5`, etc.
- `filter`: `all` (default), `available`, `custom`
- `names`: Comma-separated list (when filter="custom")
- `limit`: Max number to show (default: `20`)

**When to use:** Avatar gallery, team showcase, selection pages

---

## 💡 Tips

### Instant Connect vs Manual Connect
- **Avatar Card:** Opens modal, user clicks call button (2 steps)
- **Floating Button:** Opens modal AND connects automatically (1 step)

### Multiple Shortcodes
You can use multiple shortcodes on one page:
```html
<h2>Our AI Team</h2>
[navtalk_list columns="3" filter="available"]

[navtalk_floating name="navtalk.Emma"]
```

### Custom Styling
Add CSS through WordPress Appearance > Customize > Additional CSS if your site needs theme-level overrides:
```css
/* Customize button colors */
.navtalk-btn-primary {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
}

/* Customize floating button */
.navtalk-floating-button {
    box-shadow: 0 8px 30px rgba(255, 107, 107, 0.5);
}
```

### WordPress Blocks
All shortcodes work in:
- Classic Editor (paste shortcode directly)
- Block Editor (use Shortcode block)
- Page Builders (Elementor, Divi, etc.)
- Widgets

---

## 🚀 Common Use Cases

### Landing Page
```
<h1>Meet Your AI Assistant</h1>
[navtalk_avatar name="navtalk.Ethan" width="400px"]
<p>24/7 AI-powered support for all your needs.</p>
```

### Support Page
```
[navtalk_floating name="navtalk.Emma" position="bottom-right"]

<h2>Need Help?</h2>
<p>Ask our AI expert below or browse our FAQ.</p>
```

### Team Page
```
<h2>Our AI Team</h2>
[navtalk_list columns="4" filter="available"]
```

### Blog Post
```
<p>Have questions about this article? 
   See our AI expert team for clarification.</p>
[navtalk_list filter="custom" names="navtalk.Sophia" columns="1"]
```

### Contact Form
```
<h3>Quick Contact Options</h3>
[navtalk_avatar name="navtalk.Leo"]
<p style="margin: 10px 0;">or email us directly.</p>
```

---

## ⚙️ Configuration Required

All shortcodes require:
1. License key configured in **Settings → NavTalk Digital Human**
2. HTTPS enabled on your site (for microphone access)
3. Avatar must exist in your NavTalk account (for custom avatars)

---

## 📞 Support

Need help? Visit https://docs.navtalk.ai or email support@navtalk.ai
