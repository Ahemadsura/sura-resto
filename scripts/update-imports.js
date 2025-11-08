const fs = require('fs');
const path = require('path');

/**
 * Script to help update import statements from Firebase to Supabase
 * Run this after completing the migration to help update your codebase
 */

const srcDir = path.join(__dirname, '..', 'src');

// Files to update and their replacements
const replacements = [
  {
    from: "import { useAuth } from '../contexts/AuthContext';",
    to: "import { useAuth } from '../contexts/SupabaseAuthContext';",
    description: "Update auth context imports"
  },
  {
    from: "import { auth, db } from '../config/firebase';",
    to: "import { supabase } from '../config/supabase';",
    description: "Update config imports"
  },
  {
    from: "import { AuthProvider } from './contexts/AuthContext';",
    to: "import { AuthProvider } from './contexts/SupabaseAuthContext';",
    description: "Update AuthProvider import in App.tsx"
  }
];

// File extensions to process
const fileExtensions = ['.ts', '.tsx', '.js', '.jsx'];

/**
 * Recursively find all files with specified extensions
 */
function findFiles(dir, extensions) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and other build directories
        if (!['node_modules', 'build', 'dist', '.git'].includes(item)) {
          traverse(fullPath);
        }
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Update imports in a file
 */
function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;
  
  for (const replacement of replacements) {
    if (content.includes(replacement.from)) {
      content = content.replace(new RegExp(replacement.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement.to);
      console.log(`✅ Updated: ${path.relative(srcDir, filePath)} - ${replacement.description}`);
      updated = true;
    }
  }
  
  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  return updated;
}

/**
 * Main function
 */
function main() {
  console.log('🔄 Updating import statements from Firebase to Supabase...\n');
  
  const files = findFiles(srcDir, fileExtensions);
  let totalUpdated = 0;
  
  for (const file of files) {
    if (updateFile(file)) {
      totalUpdated++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`Files processed: ${files.length}`);
  console.log(`Files updated: ${totalUpdated}`);
  
  if (totalUpdated > 0) {
    console.log('\n⚠️  Important: Please review the changes and test your application!');
    console.log('Some imports may need manual adjustment based on your specific implementation.');
  } else {
    console.log('\n✅ No automatic updates needed. Your imports may already be correct or need manual review.');
  }
  
  console.log('\n📝 Next steps:');
  console.log('1. Review all updated files');
  console.log('2. Update any remaining Firebase-specific code manually');
  console.log('3. Test your application thoroughly');
  console.log('4. Update environment variables for production');
}

if (require.main === module) {
  main();
}

module.exports = { updateFile, findFiles };