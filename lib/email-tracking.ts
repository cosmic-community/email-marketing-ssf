export function addTrackingToEmail(
  htmlContent: string,
  campaignId: string,
  contactId: string,
  baseUrl: string
): string {
  let trackedContent = htmlContent

  // Create multiple tracking pixels with different approaches for maximum compatibility
  // Some email clients block certain implementations, so we use multiple fallbacks
  
  // Clean the campaign and contact IDs to ensure no test indicators leak through
  const cleanCampaignId = campaignId.replace(/[^a-zA-Z0-9\-_]/g, '')
  const cleanContactId = contactId.replace(/[^a-zA-Z0-9\-_]/g, '')
  const timestamp = Date.now()
  
  // Method 1: Standard tracking pixel in a table (best for most email clients)
  const standardPixel = `
    <table role="presentation" style="width: 1px; height: 1px; margin: 0; padding: 0; border: 0; border-collapse: collapse; font-size: 1px; line-height: 1px;">
      <tr>
        <td style="width: 1px; height: 1px; margin: 0; padding: 0; border: 0; font-size: 1px; line-height: 1px; overflow: hidden;">
          <img src="${baseUrl}/api/track/open?c=${encodeURIComponent(cleanCampaignId)}&u=${encodeURIComponent(cleanContactId)}&m=img&t=${timestamp}" 
               width="1" 
               height="1" 
               style="width: 1px !important; height: 1px !important; margin: 0 !important; padding: 0 !important; border: none !important; display: block !important; max-width: 1px !important; max-height: 1px !important; min-width: 1px !important; min-height: 1px !important; opacity: 0; visibility: hidden;" 
               alt="" 
               border="0"
               loading="eager">
        </td>
      </tr>
    </table>`

  // Method 2: CSS background image pixel (backup for clients that strip img tags)
  const backgroundPixel = `
    <div style="width: 1px; height: 1px; background-image: url('${baseUrl}/api/track/open?c=${encodeURIComponent(cleanCampaignId)}&u=${encodeURIComponent(cleanContactId)}&m=bg&t=${timestamp}'); background-repeat: no-repeat; background-size: 1px 1px; overflow: hidden; font-size: 1px; line-height: 1px; opacity: 0; position: absolute; left: -9999px;"></div>`

  // Method 3: Alternative image implementation (different attributes)
  const alternativePixel = `
    <img src="${baseUrl}/api/track/open?c=${encodeURIComponent(cleanCampaignId)}&u=${encodeURIComponent(cleanContactId)}&m=alt&t=${timestamp}" 
         width="1" 
         height="1" 
         border="0" 
         alt=""
         style="display: block; width: 1px; height: 1px; border: 0; outline: none; text-decoration: none; opacity: 0;">`

  // Method 4: Hidden div with minimal tracking (for clients that support it)
  const hiddenPixel = `
    <div style="display: none; width: 0; height: 0; overflow: hidden; opacity: 0; font-size: 0; line-height: 0; color: transparent; background: transparent;">
      <img src="${baseUrl}/api/track/open?c=${encodeURIComponent(cleanCampaignId)}&u=${encodeURIComponent(cleanContactId)}&m=hidden&t=${timestamp}" width="1" height="1" alt="" border="0" style="display: none;">
    </div>`

  // Combine all tracking pixels for maximum compatibility
  const allPixels = standardPixel + backgroundPixel + alternativePixel + hiddenPixel
  
  // Insert tracking pixels in multiple locations to increase chances of loading
  if (trackedContent.includes('</body>')) {
    // Primary: Before closing body tag
    trackedContent = trackedContent.replace('</body>', `${allPixels}</body>`)
  } else if (trackedContent.includes('</html>')) {
    // Secondary: Before closing html tag
    trackedContent = trackedContent.replace('</html>', `${allPixels}</html>`)
  } else {
    // Fallback: Append at the end
    trackedContent += allPixels
  }

  // Also try to insert a pixel early in the content for faster loading
  const earlyPixel = `
    <div style="width: 0; height: 0; overflow: hidden; opacity: 0; position: absolute; left: -9999px;">
      <img src="${baseUrl}/api/track/open?c=${encodeURIComponent(cleanCampaignId)}&u=${encodeURIComponent(cleanContactId)}&m=early&t=${timestamp}" width="1" height="1" alt="" border="0" style="display: none;">
    </div>`
  
  // Insert early pixel after opening body tag or at the beginning
  if (trackedContent.includes('<body')) {
    trackedContent = trackedContent.replace(/(<body[^>]*>)/i, `$1${earlyPixel}`)
  } else {
    // If no body tag, insert at the beginning of content
    trackedContent = earlyPixel + trackedContent
  }

  // Track all links in the email with improved URL encoding
  trackedContent = trackedContent.replace(
    /href\s*=\s*["']([^"']+)["']/g,
    (match, url) => {
      // Skip tracking pixels, mailto links, tel links, anchors, and unsubscribe links
      if (
        url.includes('/api/track/open') ||
        url.startsWith('mailto:') ||
        url.startsWith('tel:') ||
        url.startsWith('#') ||
        url.includes('/unsubscribe') ||
        url.includes('/api/unsubscribe') ||
        url.startsWith('javascript:') ||
        url.startsWith('data:')
      ) {
        return match
      }

      // Create click tracking URL with timestamp for uniqueness and clean IDs
      const encodedUrl = encodeURIComponent(url)
      const trackingUrl = `${baseUrl}/api/track/click?c=${encodeURIComponent(cleanCampaignId)}&u=${encodeURIComponent(cleanContactId)}&url=${encodedUrl}&t=${timestamp}`
      return `href="${trackingUrl}"`
    }
  )

  return trackedContent
}

export function extractTextFromHtml(html: string): string {
  // Simple HTML to text conversion for email clients that don't support HTML
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function createUnsubscribeUrl(email: string, baseUrl: string): string {
  const encodedEmail = encodeURIComponent(email)
  return `${baseUrl}/api/unsubscribe?email=${encodedEmail}`
}