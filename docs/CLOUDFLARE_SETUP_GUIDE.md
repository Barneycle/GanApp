# Cloudflare Setup Guide for Vercel Domain

## Overview

Adding your Vercel domain to Cloudflare provides:
- ✅ Web Application Firewall (WAF) - Zero-day protection
- ✅ DDoS Protection - Automatic mitigation
- ✅ CDN - Faster global delivery
- ✅ Rate Limiting - Edge-level protection
- ✅ Bot Management - Block malicious bots

---

## Step-by-Step Setup

### Step 1: Sign Up for Cloudflare

1. Go to [https://cloudflare.com](https://cloudflare.com)
2. Click **"Sign Up"** (free tier is sufficient)
3. Create your account

### Step 2: Add Your Domain to Cloudflare

1. **In Cloudflare Dashboard:**
   - Click **"Add a Site"** or **"Add Site"**
   - Enter your domain (e.g., `yourdomain.com` or `your-app.vercel.app`)
   - Click **"Add site"**

2. **Choose Plan:**
   - Select **Free** plan (includes WAF, DDoS protection)
   - Click **"Continue"**

### Step 3: Configure DNS Records

**Option A: Using Custom Domain (yourdomain.com)**

1. **Cloudflare will scan your DNS records**
   - Review the detected records
   - Ensure all necessary records are present

2. **Add/Update Records:**
   ```
   Type: CNAME
   Name: @ (or www)
   Target: cname.vercel-dns.com
   Proxy: ✅ (Orange cloud - ON)
   ```

3. **For Vercel, you typically need:**
   ```
   CNAME  @  cname.vercel-dns.com  ✅ Proxy
   CNAME  www  cname.vercel-dns.com  ✅ Proxy
   ```

**Option B: Using Vercel Domain (your-app.vercel.app)**

⚠️ **Note:** Vercel's default domain (`*.vercel.app`) cannot be added directly to Cloudflare.

**Solution:** Use a custom domain:
1. In Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain (e.g., `yourdomain.com`)
3. Follow DNS setup instructions from Vercel
4. Then add that custom domain to Cloudflare

### Step 4: Update Nameservers

1. **Cloudflare will show you nameservers:**
   ```
   Example:
   nameserver1.cloudflare.com
   nameserver2.cloudflare.com
   ```

2. **Go to your domain registrar** (where you bought the domain):
   - Log in to your domain registrar
   - Find DNS/Nameserver settings
   - Replace existing nameservers with Cloudflare's nameservers
   - Save changes

3. **Wait for propagation** (5 minutes to 48 hours, usually < 1 hour)

### Step 5: Configure Cloudflare Settings

Once DNS is active, configure security:

#### A. Enable WAF (Web Application Firewall)

1. **In Cloudflare Dashboard:**
   - Go to **Security** → **WAF**
   - Enable **WAF** (should be enabled on Free plan)
   - Review rules (default rules are good)

2. **Recommended WAF Rules:**
   - ✅ **Managed Rules** → Enable all
   - ✅ **OWASP Core Rule Set** → Enable
   - ✅ **Cloudflare Managed Ruleset** → Enable

#### B. Configure Rate Limiting

1. **Go to Security → WAF → Rate limiting rules**
2. **Create rules:**
   ```
   Rule 1: Login Protection
   - Match: URI contains "/login"
   - Rate: 5 requests per 5 minutes
   - Action: Block
   
   Rule 2: API Protection
   - Match: URI contains "/api"
   - Rate: 100 requests per minute
   - Action: Challenge
   ```

#### C. Enable Bot Fight Mode

1. **Go to Security → Bots**
2. **Enable "Bot Fight Mode"** (Free tier)
   - Blocks known bad bots automatically
   - Challenges suspicious traffic

#### D. Configure SSL/TLS

1. **Go to SSL/TLS**
2. **Set encryption mode:**
   - Select **"Full"** or **"Full (strict)"**
   - This ensures HTTPS between Cloudflare and Vercel

3. **Enable Always Use HTTPS:**
   - Go to **SSL/TLS → Edge Certificates**
   - Enable **"Always Use HTTPS"**

#### E. Configure Page Rules (Optional)

1. **Go to Rules → Page Rules**
2. **Create rules for security headers:**
   ```
   URL Pattern: *yourdomain.com/*
   Settings:
   - Security Level: High
   - Browser Integrity Check: On
   - Cache Level: Standard
   ```

### Step 6: Update Vercel Domain Settings

1. **In Vercel Dashboard:**
   - Go to your project → Settings → Domains
   - Ensure your domain is added
   - Vercel will automatically detect Cloudflare

2. **No changes needed** - Vercel works seamlessly with Cloudflare

---

## Verification

### Check if Cloudflare is Active:

1. **Visit your site** - Should load normally
2. **Check headers:**
   - Open browser DevTools → Network tab
   - Look for `CF-RAY` header (indicates Cloudflare is active)
   - Look for `server: cloudflare` header

3. **Test WAF:**
   - Try accessing: `yourdomain.com/?<script>alert('xss')</script>`
   - Should be blocked or sanitized

### Verify DNS Propagation:

```bash
# Check nameservers
nslookup -type=NS yourdomain.com

# Should show Cloudflare nameservers
```

---

## Cloudflare Dashboard Overview

### Key Sections:

1. **Overview** - Traffic stats, security events
2. **Analytics** - Performance metrics
3. **Security** - WAF, DDoS, Bot management
4. **Speed** - Caching, optimization
5. **Caching** - Cache rules, purge cache
6. **Rules** - Page rules, redirect rules

---

## Recommended Cloudflare Settings

### Security Settings:

```
✅ WAF: Enabled
✅ Bot Fight Mode: Enabled
✅ Challenge Passage: 30 minutes
✅ Security Level: Medium (or High)
✅ Browser Integrity Check: On
✅ Privacy Pass Support: On
```

### Speed Settings:

```
✅ Auto Minify: CSS, JavaScript, HTML
✅ Brotli: Enabled
✅ HTTP/2: Enabled
✅ HTTP/3 (with QUIC): Enabled
✅ 0-RTT Connection Resumption: Enabled
```

### Caching Settings:

```
✅ Caching Level: Standard
✅ Browser Cache TTL: Respect Existing Headers
✅ Always Online: On
```

---

## Troubleshooting

### Issue: Site Not Loading

**Check:**
1. DNS propagation status (use `dnschecker.org`)
2. Nameservers are correctly set
3. SSL/TLS mode is "Full" or "Full (strict)"
4. Vercel domain is correctly configured

### Issue: SSL Errors

**Solution:**
1. Go to SSL/TLS → Overview
2. Set mode to **"Full"** (not "Flexible")
3. Wait 5-10 minutes for SSL to provision

### Issue: WAF Blocking Legitimate Traffic

**Solution:**
1. Go to Security → WAF → Events
2. Find blocked request
3. Click "Allow" or create exception rule
4. Or adjust WAF sensitivity

### Issue: Vercel Deployment Fails

**Solution:**
1. Ensure Cloudflare SSL mode is "Full"
2. Check Vercel domain settings
3. Verify DNS records are correct

---

## Cost

**Cloudflare Free Tier Includes:**
- ✅ WAF (Web Application Firewall)
- ✅ DDoS Protection
- ✅ CDN
- ✅ SSL/TLS
- ✅ Bot Fight Mode
- ✅ Basic Analytics
- ✅ Rate Limiting (1,000 requests/minute)

**Upgrade When:**
- Need advanced WAF rules
- Need more rate limiting
- Need image optimization
- Need advanced analytics

---

## Next Steps After Setup

1. ✅ **Monitor Security Events**
   - Go to Security → Events
   - Review blocked requests
   - Adjust rules as needed

2. ✅ **Set Up Alerts**
   - Go to Notifications
   - Enable email alerts for:
     - Security events
     - DDoS attacks
     - High traffic

3. ✅ **Optimize Performance**
   - Enable Auto Minify
   - Configure caching rules
   - Enable HTTP/3

4. ✅ **Test Security**
   - Try common attack patterns
   - Verify WAF is blocking
   - Test rate limiting

---

## Important Notes

1. **DNS Propagation:**
   - Can take up to 48 hours (usually < 1 hour)
   - Site may be temporarily unavailable during transition

2. **SSL Certificates:**
   - Cloudflare provides free SSL
   - Vercel also provides SSL
   - Both work together seamlessly

3. **Caching:**
   - Cloudflare caches static assets
   - Vercel handles dynamic content
   - May need to purge cache after deployments

4. **Vercel Integration:**
   - No code changes needed
   - Works automatically
   - Both services complement each other

---

## Quick Checklist

- [ ] Sign up for Cloudflare
- [ ] Add domain to Cloudflare
- [ ] Update nameservers at registrar
- [ ] Wait for DNS propagation
- [ ] Enable WAF
- [ ] Configure SSL/TLS (Full mode)
- [ ] Enable Bot Fight Mode
- [ ] Set up rate limiting rules
- [ ] Verify site is working
- [ ] Monitor security events

---

## Support Resources

- **Cloudflare Docs:** https://developers.cloudflare.com/
- **Vercel + Cloudflare:** https://vercel.com/docs/security/cloudflare
- **Cloudflare Community:** https://community.cloudflare.com/

Your domain is now protected by Cloudflare! 🛡️

