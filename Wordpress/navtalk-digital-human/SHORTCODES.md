# NavTalk Shortcode Quick Reference

## 🎭 Avatar Card
Full card with image, name, and button.

```
[navtalk_avatar name="navtalk.Ethan"]
[navtalk_avatar name="navtalk.Emma" width="400px" height="500px" button_text="Chat"]
```

**When to use:** Landing pages, about pages, team sections

---

## 🔘 Button (Instant Connect)
Just a button that connects immediately.

```
[navtalk_button name="navtalk.Sophia" text="Talk to Sophia"]
[navtalk_button name="navtalk.Leo" text="开始对话" style="outline" size="large"]
```

**Styles:** `primary` (default), `secondary`, `outline`
**Sizes:** `small`, `medium` (default), `large`
**Icon:** `true` (default), `false`

**When to use:** Call-to-action sections, forms, contact pages

---

## 🎈 Floating Button
Fixed button at screen corner (instant connect).

```
[navtalk_floating name="navtalk.Mia"]
[navtalk_floating name="navtalk.Chloe" position="bottom-left" color="#ff5e62"]
```

**Positions:** `bottom-right` (default), `bottom-left`, `top-right`, `top-left`
**Color:** Any hex color (e.g., `#667eea`)
**Size:** Any CSS size (e.g., `60px`, `70px`)

**When to use:** Site-wide assistance, support pages

---

## 🔗 Text Link (Instant Connect)
Inline clickable text.

```
[navtalk_link name="navtalk.Ava"]Click here to chat[/navtalk_link]
[navtalk_link name="navtalk.Emma" style="button"]Start Chat[/navtalk_link]
```

**Styles:** `default` (underline), `button`, `underline`

**When to use:** Within paragraphs, blog posts, help text

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
- **Button/Link/Floating:** Opens modal AND connects automatically (1 step)

### Multiple Shortcodes
You can use multiple shortcodes on one page:
```html
<h2>Our AI Team</h2>
[navtalk_list columns="3" filter="available"]

<p>Or quick chat: [navtalk_button name="navtalk.Ethan" text="Quick Support"]</p>

[navtalk_floating name="navtalk.Emma"]
```

### Custom Styling
Add CSS to customize appearance:
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
- Custom HTML blocks

---

## 🚀 Common Use Cases

### Landing Page
```
<h1>Meet Your AI Assistant</h1>
[navtalk_avatar name="navtalk.Ethan" width="400px"]
<p>24/7 AI-powered support for all your needs.</p>
[navtalk_button name="navtalk.Ethan" text="Start Free Consultation" size="large"]
```

### Support Page
```
[navtalk_floating name="navtalk.Emma" position="bottom-right"]

<h2>Need Help?</h2>
<p>[navtalk_link name="navtalk.Emma"]Chat with our AI support[/navtalk_link] 
   or browse our FAQ below.</p>
```

### Team Page
```
<h2>Our AI Team</h2>
[navtalk_list columns="4" filter="available"]
```

### Blog Post
```
<p>Have questions about this article? 
   [navtalk_link name="navtalk.Sophia"]Ask our AI expert[/navtalk_link] 
   for clarification.</p>
```

### Contact Form
```
<h3>Quick Contact Options</h3>
[navtalk_button name="navtalk.Leo" text="Chat Now" style="primary" size="large"]
<p style="margin: 10px 0;">or</p>
[navtalk_button name="navtalk.Mia" text="Email Us" style="outline" size="medium"]
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
