# PORTAL BEHAVIOR SPECIFICATION

**Purpose:** Defines the architectural grouping, route preservation, role/auth boundaries, and adaptive header/navigation behavior for every existing PaikarMart portal across the 6 business categories. *(Covers only implemented product capabilities; no unrequested features invented.)*

---

## 1. Category-Based Portal Taxonomy (6 Business Categories)

### 1. Commerce
| Portal | Existing Route(s) | Primary Purpose & Behavior | Auth / Role Rule |
|---|---|---|---|
| **Marketplace Hub** | `/hub/marketplace` (alias `/portal/marketplace`) | Mixed retail + wholesale discovery feed, category rails, Buy-Box catalog cards | Public browse; Auth for cart checkout |
| **Retail Product Detail** | `/hub/marketplace/product/:id` (alias `/portal/marketplace/product/:id`) | Full SKU detail, verified reviews, Q&A, wishlist, add-to-cart, buy-now | Public view; Auth for review/question/wishlist; Vendor/Admin role to answer Q&A |
| **B2B Wholesale** | `/portal/wholesale` | Bulk MOQ tiered pricing, RFQ submission/negotiation, sample requests | Public browse; Auth for RFQ/sample; Vendor role for quotes |
| **Grocery / Pharmacy / Brand Shops** | Child portals inside Marketplace (`MarketplaceCategoryPortal` variants) | Category-filtered instant commerce, Rx upload support in Pharmacy | Public browse; Auth for Rx upload & checkout |
| **Wishlist** | `/portal/wishlist` | Saved retail & wholesale items synced per user | Public/Guest session or Authenticated |

### 2. Services
| Portal | Existing Route(s) | Primary Purpose & Behavior | Auth / Role Rule |
|---|---|---|---|
| **Services Hub** | `/hub/services` (alias `/portal/services`) | Unified discovery for Food Delivery, Local Services, Appliance Repair, Health Clinic, Travel & Stays | Public browse; Auth for booking/checkout |
| **Service Child Views** | Sub-tabs / `ServiceCategoryPortal` (`local-services`, `food-delivery`, `travel`, `appliance-repair`, `health-clinic`) | Slot booking (`ServiceBookingModal`), menu/service selection, hyperlocal radius | Public browse; Auth for booking confirmation |

### 3. Digital
| Portal | Existing Route(s) | Primary Purpose & Behavior | Auth / Role Rule |
|---|---|---|---|
| **Digital Goods Portal** | Child portal in Marketplace Hub (`DigitalGoodsPortal`) | Software keys, subscriptions, digital downloads, vouchers | Public browse; Auth + verified payment for fulfillment |
| **AI & Grounding Tools** | `AiAssistantDrawer` (global), Search/Maps Grounding widgets | Product verification, conversational shopping help, Maps/Search lookup | Auth-gated AI generation endpoints + rate limiting |

### 4. Mobility & Logistics
| Portal | Existing Route(s) | Primary Purpose & Behavior | Auth / Role Rule |
|---|---|---|---|
| **Transit & Logistics** | `/portal/transit` (tabs: `ride`, `courier`, `cargo`, `fleet`) | Ride tariff quotes/dispatch, parcel courier booking, heavy cargo freight, fleet partner console | Public tariff quote; Auth for dispatch/courier booking; Verified Rider/Fleet role for driver actions |
| **Orders & Tracking Hub** | `/portal/orders` | Buyer Purchases & Seller Sales tabs, live tracking checkpoints, POD OTP confirmation, return pickup request | `AuthGuard` required |
| **Nearby Hyperlocal Radar** | `/portal/nearby` (`?hub=marketplace|services|logistics`) | Live GPS geofenced radar for nearby stores, services, or riders | Public browse (with browser/selected location) |

### 5. Business Management
| Portal | Existing Route(s) | Primary Purpose & Behavior | Auth / Role Rule |
|---|---|---|---|
| **Seller Central** | `/portal/seller` | Multi-store overview, KYC verification status, B2B/B2C order management, analytics, payout readiness | `AuthGuard` + `RoleGuard (requiredMode="seller")` |
| **Seller Inventory & PMIN Attach** | `/portal/seller/inventory` | Seller SKU pricing, stock, MOQ tiers, PMIN catalog attach & AI audit submission | `AuthGuard` + `RoleGuard (requiredMode="seller")` |
| **Wallet & Escrow Hub** | `/portal/wallet` | BDT available balance, active escrow holds, ledger transactions, bKash/Nagad/SSLCommerz deposit/withdraw, PK Coins | `AuthGuard` required |
| **Super Admin / Governance Console** | `SuperAppHubModal` / `SuperAdminControlModal` / `AdminCatalogGovernanceModal` | Platform KYC approvals, catalog audit, role assignment (`abs.munna1@gmail.com` primary super admin) | `AuthGuard` + `RoleGuard (requiredMode="governance")` |

### 6. Community & Social
| Portal | Existing Route(s) | Primary Purpose & Behavior | Auth / Role Rule |
|---|---|---|---|
| **Social Feed** | `/` -> `/portal/social` | Stories tray, social commerce composer, shoppable tagged posts, reactions, comments | Public read; `requireFirebaseAuth` for posting/commenting |
| **Demand & Offer Board** | `/portal/demand` (`?hub=marketplace|services|logistics`) | Buyer reverse-auction / RFQ demands matched dynamically to portal context | Public browse; Auth to post demand or submit seller offer |
| **Creator Studio** | `/portal/creator` | Short commerce videos/reels, creator monetization & product tagging | Public watch; Auth + Creator capability to publish |
| **Messages Center** | `/portal/messages` | Buyer–Vendor–Rider threaded chat + AI Co-Pilot bridge | `AuthGuard` required; participant ACL verified server-side |
| **Explore / Profile / Storefront / Notifications / Settings / Guide** | `/portal/explore`, `/portal/profile`, `/u/:handle`, `/store/:storeId`, `/portal/notifications`, `/settings`, `/portal/guide` | Discovery directory, private account/KYC/addresses, public storefronts, notifications, theme/language settings | `/u/:handle`, `/store/:storeId`, `/portal/explore`, `/portal/guide` public; Profile/Notifications/Settings behind `AuthGuard` |

---

## 2. Adaptive Mobile & Desktop Header (`TopNavbar`) Behavior Specification

To prevent header crowding on mobile (`< 768px`) while keeping fast contextual actions available per active portal:

| Route Context | Left Slot (Mobile) | Center / Primary Slot | Right Action Slots (Max 3 Compact Controls) |
|---|---|---|---|
| **Social / Community / Explore** (`/portal/social`, `/hub/community`, `/portal/explore`, `/portal/creator`) | Drawer Menu + Brand Mark | Location Pill (Compact) or Search Trigger | Search Icon, Notifications Bell, Account/Auth Avatar |
| **Commerce & Services Discovery** (`/hub/marketplace`, `/hub/services`, `/portal/wholesale`, `/portal/demand`, `/portal/nearby`) | Drawer Menu / Back | Inline Compact Search Trigger (expands `MegaSearch` / voice) | Cart Badge (with count), Wishlist / Filter toggle, Notifications/Menu |
| **Deep Detail / Sub-Flows** (`/hub/marketplace/product/:id`, `/store/:storeId`, `/u/:handle`) | Contextual Back Arrow | Truncated Context Title / Store Name | Search Icon, Cart Badge, Share / Overflow |
| **Account / Utility / Business** (`/portal/orders`, `/portal/wallet`, `/portal/seller*`, `/portal/messages`, `/settings`) | Back / Drawer Menu | Portal Title + Role Badge (`Seller` / `Admin` if active) | Wallet Balance Pill (on Orders/Seller) or AI Copilot + Notifications |
| **Desktop (`>= 1024px`)** | Brand + Hub Switcher + Location Menu | Full `MegaSearch` Bar (`Cmd+K`, Scope toggle `All / B2C / B2B`, Voice) | Hub Modal, AI Assistant, Seller/SuperAdmin Role Pill, Wallet, Notifications, Cart, Theme, Profile |

**Header Invariants:**
- Single horizontal row (`h-14` mobile, `h-16` desktop) without wrapping or overlapping controls at `320px`–`430px` mobile widths.
- Notification, Cart, and SuperAdmin/Seller badges always stay anchored and accessible via either `TopNavbar` or `BottomNav`/`UnifiedSidebar` with zero dead controls.
