# API Reference (Current Behavior)

This document reflects current API contracts in `app/api/*`.

> Note: response shapes are not fully standardized yet. Some routes return `{ success: true }`, some return `{ ok: true }`, and some return resource payloads directly.

## Common Notes

- Most routes are rate-limited through `checkRateLimit`.
- All routes are dynamic (`force-dynamic` + `revalidate = 0`).
- Currency values are in copper pieces (`cp`) unless explicitly noted.

## `POST /api/session`

Create a session and initial member links.

### Body

```json
{
  "sessionName": "The Dragon Hoard",
  "memberNames": ["Aldric", "Nyx"],
  "currencyType": "dnd",
  "dmRole": "Dungeon Master"
}
```

### Success

Returns `CreateSessionResponse`:

```json
{
  "session": { "...": "..." },
  "dmUrl": "https://.../dm/<token>",
  "memberLinks": [{ "name": "Aldric", "token": "...", "url": "https://.../p/<token>" }]
}
```

## `PATCH /api/session`

Rename session.

### Body

```json
{
  "dmToken": "...",
  "name": "New Campaign Name"
}
```

### Success

```json
{ "success": true }
```

## `POST /api/items`

Add item.

- DM context: `{ isDM: true, dmToken, item }`
- Player context: `{ token, item }`

### Success

DM pooled multi-quantity may return:

```json
{ "items": [...], "item": { "...": "..." } }
```

Typical response:

```json
{ "item": { "...": "..." } }
```

## `PATCH /api/items`

Item actions with `action`:

- `claim`
- `offer`
- `update`

### Success

- `claim`: `{ "success": true }`
- `offer`: `{ "success": true, "items": [...] }`
- `update`: `{ "success": true }`

## `DELETE /api/items`

Delete item via DM token or member token.

### Success

```json
{ "success": true }
```

## `PATCH /api/gold`

Gold/currency operations.

### DM actions

- `split` with `amountCp`
- `give` with `memberId`, `deltaCp`, `field`
- `party_adjust` with `deltaCp`

### Player actions

- `adjust` with `deltaCp`, `field`
- `transfer_to_pool` with `amountCp`
- `transfer_from_pool` with `amountCp`

### Success

```json
{ "success": true }
```

## `POST /api/members`

Add member to session (DM).

### Body

```json
{ "dmToken": "...", "name": "New Member" }
```

### Success

```json
{ "member": { "...": "..." } }
```

## `PATCH /api/members`

Rename member (player token).

### Body

```json
{ "token": "...", "name": "New Name" }
```

### Success

```json
{ "success": true }
```

## `GET /api/refresh?token=...&role=dm|player`

Returns fresh dashboard data.

### DM success

```json
{ "session": { "...": "..." }, "items": [...], "members": [...] }
```

### Player success

```json
{
  "session": { "...": "..." },
  "member": { "...": "..." },
  "myItems": [...],
  "partyPool": [...],
  "otherMembers": [...]
}
```

## `GET /api/activity?token=...&role=dm|player`

Returns latest activity log entries.

### Success

```json
{ "activity": [...] }
```

## `GET /api/export?token=<dmToken>`

Export session snapshot for DM.

### Success

Returns full export payload (not wrapped):

```json
{
  "version": 1,
  "exportedAt": "...",
  "session": { "...": "..." },
  "members": [...],
  "items": [...]
}
```

## `POST /api/import`

Import session data from JSON file.

### FormData

- `dmToken`
- `file` (JSON)

### Success

```json
{
  "success": true,
  "itemsImported": 10,
  "membersCreated": 2,
  "goldAdjusted": 3
}
```

## `GET /api/cleanup`

Cron-only cleanup endpoint.

Requires `Authorization: Bearer <CRON_SECRET>`.

### Success

```json
{ "deleted": 4 }
```

## `DELETE /api/internal-links`

Delete internal link reference.

### Body

```json
{ "type": "session", "id": "..." }
```

### Success

```json
{ "ok": true }
```

## `POST /api/internal-links/auth`

Set internal links auth cookie.

### Body

```json
{ "pw": "..." }
```

### Success

```json
{ "ok": true }
```

## `DELETE /api/internal-links/auth`

Clear internal links auth cookie.

### Success

```json
{ "ok": true }
```
