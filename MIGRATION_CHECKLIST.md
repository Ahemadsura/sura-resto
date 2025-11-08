# Firebase to Supabase Migration Checklist

Use this checklist to ensure a smooth migration from Firebase Auth to Supabase Auth.

## 📋 Pre-Migration Setup

### Environment Setup
- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Note down Supabase URL and anon key
- [ ] Install migration dependencies: `npm run migrate:setup`
- [ ] Copy `.env.example` to `.env` in migration directory
- [ ] Add Supabase credentials to migration `.env` file
- [ ] Download Firebase service account JSON from Firebase Console
- [ ] Place service account file as `migration/firebase-service-account.json`

### Database Setup
- [ ] Copy contents of `migration/supabase-schema.sql`
- [ ] Run SQL schema in Supabase SQL Editor
- [ ] Verify all tables are created successfully
- [ ] Check Row Level Security policies are applied

### Connection Testing
- [ ] Run connection test: `npm run migrate:test`
- [ ] Verify Firebase connection works
- [ ] Verify Supabase connection works
- [ ] Fix any connection issues before proceeding

## 🚀 Migration Execution

### Data Migration
- [ ] Run Firebase export: `npm run migrate:export`
- [ ] Review exported data in `migration/firebase-users-export.json`
- [ ] Review restaurant data in `migration/firebase-restaurants-export.json`
- [ ] Run Supabase import: `npm run migrate:import`
- [ ] Review import results in `migration/supabase-import-results.json`
- [ ] Check success rate (should be >95%)
- [ ] Handle any failed imports manually

### Code Migration
- [ ] Install Supabase client: `npm install @supabase/supabase-js`
- [ ] Add Supabase environment variables to main `.env` file:
  ```env
  REACT_APP_SUPABASE_URL=https://your-project.supabase.co
  REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
  ```
- [ ] Update import statements: `npm run migrate:update-imports`
- [ ] Review and fix any remaining Firebase imports manually
- [ ] Update main App.tsx to use SupabaseAuthContext
- [ ] Test application in development mode

## 🧪 Testing Phase

### Authentication Testing
- [ ] Test owner login with migrated account
- [ ] Test manager login with migrated account
- [ ] Test password reset flow
- [ ] Test role-based access control
- [ ] Test session persistence
- [ ] Test logout functionality

### Feature Testing
- [ ] Menu item CRUD operations
- [ ] Bill creation and management
- [ ] Staff management (owners only)
- [ ] Expense tracking (owners only)
- [ ] Manager user creation (owners only)
- [ ] Manager activation/deactivation
- [ ] Data filtering by restaurant
- [ ] Subscription status checks

### Database Testing
- [ ] Verify all user data migrated correctly
- [ ] Check restaurant associations are preserved
- [ ] Test Row Level Security policies
- [ ] Verify data permissions by role
- [ ] Test database performance with real queries

## 📧 User Communication

### Pre-Migration
- [ ] Draft migration announcement email
- [ ] Prepare password reset instructions
- [ ] Update login page with migration notice
- [ ] Brief support team on expected password reset requests

### Post-Migration
- [ ] Send migration completion email to all users
- [ ] Include password reset instructions
- [ ] Monitor support channels for user issues
- [ ] Track password reset completion rates

## 🚀 Production Deployment

### Environment Configuration
- [ ] Update production environment variables
- [ ] Set `REACT_APP_USE_SUPABASE=true` (if using feature flag)
- [ ] Remove or comment out Firebase environment variables
- [ ] Verify all environment variables are correct

### Deployment
- [ ] Deploy to staging environment first
- [ ] Run full test suite on staging
- [ ] Deploy to production during low-traffic hours
- [ ] Monitor application logs for errors
- [ ] Monitor authentication success rates
- [ ] Monitor database performance

### Monitoring
- [ ] Set up Supabase dashboard monitoring
- [ ] Monitor authentication metrics
- [ ] Track password reset requests
- [ ] Monitor database query performance
- [ ] Set up error alerting

## 🔧 Post-Migration Tasks

### Immediate (First 24 hours)
- [ ] Monitor error rates and user feedback
- [ ] Respond to password reset support requests
- [ ] Fix any critical issues immediately
- [ ] Verify all core functionality works

### Short-term (First week)
- [ ] Analyze user adoption of password resets
- [ ] Optimize any slow database queries
- [ ] Address user feedback and minor issues
- [ ] Update documentation and help articles

### Long-term (After 30 days)
- [ ] Remove Firebase dependencies from codebase
- [ ] Delete Firebase configuration files
- [ ] Clean up old environment variables
- [ ] Archive migration scripts and data
- [ ] Update onboarding flows for new users

## 🛡️ Security Verification

### Access Control
- [ ] Verify owners can only access their restaurant data
- [ ] Verify managers can only access their restaurant data
- [ ] Test that deactivated users cannot login
- [ ] Verify role-based permissions work correctly
- [ ] Test dev bypass functionality (if applicable)

### Data Protection
- [ ] Verify all sensitive data is properly protected
- [ ] Check that users cannot access other restaurants' data
- [ ] Test API endpoints for proper authorization
- [ ] Verify password reset tokens expire properly
- [ ] Check that temporary passwords are secure

## 📊 Success Metrics

### Migration Success
- [ ] >95% user migration success rate
- [ ] <5% failed imports requiring manual intervention
- [ ] Zero data loss during migration
- [ ] All restaurant associations preserved

### User Experience
- [ ] <24 hour average password reset completion time
- [ ] <1% increase in support tickets
- [ ] Maintained or improved login success rates
- [ ] No increase in user churn

### Technical Performance
- [ ] Database query performance maintained or improved
- [ ] Authentication response times <500ms
- [ ] Zero downtime during migration
- [ ] Error rates remain below 1%

## 🆘 Rollback Plan

If migration fails or critical issues arise:

### Immediate Actions
- [ ] Revert frontend to use Firebase Auth
- [ ] Restore Firebase environment variables
- [ ] Communicate issue to users
- [ ] Analyze failure reasons

### Recovery Steps
- [ ] Keep Firebase Auth active (don't disable)
- [ ] Fix identified issues
- [ ] Re-test migration in development
- [ ] Plan retry with lessons learned

## ✅ Migration Complete

Once all items are checked:

- [ ] Migration is successful and stable
- [ ] Users are successfully using Supabase Auth
- [ ] All features work as expected
- [ ] Performance is acceptable
- [ ] Support requests are manageable
- [ ] Team is trained on new system

**Congratulations! Your Firebase to Supabase migration is complete! 🎉**

---

**Notes:**
- Keep this checklist updated as you progress
- Document any issues and solutions for future reference
- Consider this migration a learning experience for future projects