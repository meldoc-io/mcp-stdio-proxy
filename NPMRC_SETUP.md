# Setting up .npmrc for package publishing

## .npmrc file format

The `.npmrc` file should contain your npm token for authentication:

```ini
# Token for publishing packages
//registry.npmjs.org/:_authToken=YOUR_TOKEN_HERE

# Optional: configuration for scoped packages
@meldocio:registry=https://registry.npmjs.org/
```

## Where to store .npmrc

### Option 1: Locally in the project (recommended for CI/CD)

Create a `.npmrc` file in the project root:

```bash
# Copy the example
cp .npmrc.example .npmrc

# Edit and add your token
nano .npmrc  # or use your editor
```

**Important:** `.npmrc` is already added to `.gitignore` and will not be committed to git.

### Option 2: Globally in the home directory

Add the token to `~/.npmrc`:

```bash
echo "//registry.npmjs.org/:_authToken=YOUR_TOKEN" >> ~/.npmrc
```

## Security

### 1. File permissions

Set file permissions for owner only:

```bash
chmod 600 .npmrc        # for local file
chmod 600 ~/.npmrc      # for global file
```

This means:

- `6` (rw-) - owner can read and write
- `0` (---) - group has no access
- `0` (---) - others have no access

### 2. Checking permissions

```bash
# Check current permissions
ls -la .npmrc
ls -la ~/.npmrc

# Should show: -rw------- (600)
```

### 3. Never commit .npmrc to git

The `.npmrc` file is already added to `.gitignore`. Make sure it doesn't get into the repository:

```bash
# Check that .npmrc is ignored
git status --ignored | grep .npmrc
```

### 4. Use Granular Access Token

Instead of a full token, create a token with limited permissions:

1. Go to <https://www.npmjs.com/settings/YOUR_USERNAME/tokens>
2. Create a "Granular Access Token"
3. Select scope: `write:packages` for the `@meldocio` organization
4. Enable "Bypass 2FA" (if required)

### 5. Token rotation

Regularly update tokens:

- Delete unused tokens
- Create new tokens with limited expiration
- Revoke tokens if compromise is suspected

## Getting a token

1. Log in to <https://www.npmjs.com>
2. Go to Settings → Access Tokens
3. Create a new token:
   - **Classic Token** - for simple cases
   - **Granular Access Token** - for more precise control (recommended)
4. Copy the token (it's only shown once!)

## Usage example

```bash
# 1. Create .npmrc from example
cp .npmrc.example .npmrc

# 2. Edit and add token
nano .npmrc

# 3. Set secure permissions
chmod 600 .npmrc

# 4. Verify the file won't be committed
git status

# 5. Publish the package
npm publish --access public
```

## Troubleshooting

### Error: "403 Forbidden - Two-factor authentication required"

Solution: Enable 2FA in npm settings or use a Granular Access Token with "Bypass 2FA".

### Error: "401 Unauthorized"

Solution: Check that the token is correct and hasn't expired. Create a new token.

### Token visible in git history

Solution: If the token got into git, immediately:

1. Revoke the token on npmjs.com
2. Create a new token
3. Remove `.npmrc` from git history (if needed)
