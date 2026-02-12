#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const packagePublishJsonPath = path.join(rootDir, 'package.publish.json');
const packageJsonBackupPath = path.join(rootDir, 'package.json.backup');
const marketplaceJsonPath = path.join(rootDir, '.claude-plugin', 'marketplace.json');
const pluginJsonPath = path.join(rootDir, '.claude-plugin', 'plugin.json');

try {
  // Read both package files
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const packagePublishJson = JSON.parse(fs.readFileSync(packagePublishJsonPath, 'utf8'));
  const version = packageJson.version;
  
  // Sync version from main package.json to publish package.json
  packagePublishJson.version = version;
  fs.writeFileSync(packagePublishJsonPath, JSON.stringify(packagePublishJson, null, 2) + '\n');
  
  // Update versions in .claude-plugin files
  console.log(`🔄 Updating versions in .claude-plugin files to v${version}...`);
  
  // Update marketplace.json
  if (fs.existsSync(marketplaceJsonPath)) {
    const marketplaceJson = JSON.parse(fs.readFileSync(marketplaceJsonPath, 'utf8'));
    marketplaceJson.plugins[0].version = version;
    fs.writeFileSync(marketplaceJsonPath, JSON.stringify(marketplaceJson, null, 2) + '\n');
    console.log('✅ Updated .claude-plugin/marketplace.json');
  } else {
    console.log('⚠️  Warning: .claude-plugin/marketplace.json not found. Skipping version update.');
  }
  
  // Update plugin.json
  if (fs.existsSync(pluginJsonPath)) {
    const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
    pluginJson.version = version;
    fs.writeFileSync(pluginJsonPath, JSON.stringify(pluginJson, null, 2) + '\n');
    console.log('✅ Updated .claude-plugin/plugin.json');
  } else {
    console.log('⚠️  Warning: .claude-plugin/plugin.json not found. Skipping version update.');
  }
  
  // Backup original package.json
  fs.copyFileSync(packageJsonPath, packageJsonBackupPath);
  
  // Replace package.json with package.publish.json
  fs.copyFileSync(packagePublishJsonPath, packageJsonPath);
  
  // Publish
  console.log('Publishing with package.publish.json...');
  execSync('npm publish', { stdio: 'inherit', cwd: rootDir });
  
  // Restore original package.json
  fs.copyFileSync(packageJsonBackupPath, packageJsonPath);
  fs.unlinkSync(packageJsonBackupPath);
  
  console.log('Published successfully!');
} catch (error) {
  // Restore original package.json on error
  if (fs.existsSync(packageJsonBackupPath)) {
    fs.copyFileSync(packageJsonBackupPath, packageJsonPath);
    fs.unlinkSync(packageJsonBackupPath);
  }
  console.error('Publish failed:', error.message);
  process.exit(1);
}
