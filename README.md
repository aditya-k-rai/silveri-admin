# Silveri Admin Dashboard

Standalone Next.js admin panel for the Silveri jewelry store. Deployed separately from the storefront.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Auth**: Firebase Authentication (email/password, 4-hour session gate)
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage (product images, category images, banners, logo)
- **Charts**: Recharts
- **Icons**: Lucide React
- **State**: Zustand (productStore)

## Routes
| URL | Page |
|-----|------|
| `/` | Redirects to `/dashboard` |
| `/login` | Admin login (email + 4-char access code) |
| `/dashboard` | Overview: revenue, orders, product stats |
| `/products` | Product CRUD + image upload |
| `/categories` | Category management |
| `/orders` | Order management + status updates |
| `/custom-orders` | Custom jewelry order requests |
| `/users` | User management + block/unblock |
| `/reviews` | Review moderation + admin replies |
| `/activity` | Live user cart/wishlist activity feed |
| `/reports` | Revenue & order analytics charts |
| `/live-market` | Real-time silver/gold price charts |
| `/promos` | Promo code management |
| `/settings` | Site settings, hero banners, logo, social links |

## Local Development

```bash
# Install dependencies
npm install

# Run dev server (port 3001 to avoid conflict with storefront on 3000)
npm run dev -- -p 3001
```

## Environment Variables

Copy `.env.local` and fill in the actual values. The admin app uses:
- Same Firebase project as the storefront
- No Razorpay keys (admin never processes payments)
- Metals.dev + FRED API keys for the Live Market page

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in Vercel
3. Add all environment variables from `.env.local`
4. Set custom domain (e.g. `admin.silveri.in`)
5. In Firebase Console → Authentication → Authorized domains → add your admin domain

## Security Notes
- Admin login requires a 4-character access code (`AKRP`) in addition to email/password
- Session expires after 4 hours (enforced via `silveri_admin_auth_at` in localStorage)
- All admin routes are protected by `AdminLayout` auth guard
- `robots.txt` noindex — admin is not indexed by search engines
