#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const packagePublishJsonPath = path.join(rootDir, 'package.publish.json');
const packageJsonBackupPath = path.join(rootDir, 'package.json.backup');

try {
  // Read both package files
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const packagePublishJson = JSON.parse(fs.readFileSync(packagePublishJsonPath, 'utf8'));
  
  // Sync version from main package.json to publish package.json
  packagePublishJson.version = packageJson.version;
  fs.writeFileSync(packagePublishJsonPath, JSON.stringify(packagePublishJson, null, 2) + '\n');
  
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
