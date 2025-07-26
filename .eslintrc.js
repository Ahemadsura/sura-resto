module.exports = {
  root: true,
  extends: [
    'react-app',
    'react-app/jest'
  ],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        // Add any custom rules here if needed
      }
    }
  ],
  settings: {
    react: {
      version: 'detect'
    }
  }
}; 