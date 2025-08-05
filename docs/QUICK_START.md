# Quick Start Guide

Get up and running with Qualtrics LTI Connector in 15 minutes!

## 🚀 For Instructors - 5 Minute Setup

### Step 1: Create Assignment (in Agilix Buzz)
```
1. Go to your course
2. Click "Add Assignment"
3. Choose "External Tool"
4. Select "Qualtrics Survey Connector"
5. Name it (e.g., "Module 1 Feedback")
6. Save
```

### Step 2: Configure Survey (first time only)
```
1. Click your new assignment
2. You'll see a configuration page
3. Enter:
   - Qualtrics Survey ID (from survey URL)
   - Points (e.g., 10)
   - Check "Extra Credit" if applicable
4. Click "Save Configuration"
```

### Step 3: Done!
- Students can now take the survey
- Grades auto-sync to gradebook
- View results in your dashboard

---

## 👩‍🎓 For Students - It Just Works!

### Taking a Survey
```
1. Click the assignment in your course
2. You're automatically sent to Qualtrics
3. Complete the survey
4. Your grade appears in gradebook
```

### What You'll See
- **First Time**: Direct to survey (no login needed)
- **After Completion**: "Already submitted" message with your score
- **In Gradebook**: Your points within 5-10 minutes

---

## 👨‍💼 For Administrators - 30 Minute Deployment

### Fastest Path to Production

#### 1. Firebase Setup (10 min)
```bash
# Prerequisites: Node.js 18+ installed

# Clone and setup
git clone https://github.com/RyanGravetteIDLA/qualtrics-lti-connector.git
cd qualtrics-lti-connector
npm install && cd functions && npm install && cd ..

# Login to Firebase
firebase login
```

#### 2. Create Firebase Project (5 min)
```
1. Visit https://console.firebase.google.com
2. Create new project
3. Enable: Firestore, Functions, Hosting
4. Upgrade to Blaze plan (required, but free tier is generous)
```

#### 3. Configure Credentials (5 min)
```bash
# Copy and edit environment file
cp functions/.env.example functions/.env

# Add your credentials:
# - Qualtrics API token
# - Agilix credentials
# - Generate random secrets
```

#### 4. Deploy (5 min)
```bash
firebase use your-project-id
firebase deploy
```

#### 5. Register in Agilix (5 min)
Add as LTI 1.3 tool with URLs from deployment output.

---

## 📊 What Success Looks Like

### For Instructors
✅ Configuration takes < 2 minutes  
✅ Dashboard shows real-time submissions  
✅ Grades appear automatically  
✅ Can export data anytime  

### For Students
✅ One click to survey  
✅ No login required  
✅ Instant confirmation  
✅ Grades in gradebook  

### For Administrators
✅ Functions running without errors  
✅ < 1% error rate in logs  
✅ Response times < 500ms  
✅ Costs < $5/month for typical usage  

---

## 🆘 Troubleshooting Quick Fixes

### "Configuration page won't load"
→ Check you're logged in as instructor role

### "Students can't see survey"
→ Verify survey is active in Qualtrics

### "Grades not showing"
→ Wait 10 minutes, check function logs

### "Session expired error"
→ Clear cookies, relaunch from Buzz

---

## 📚 Need More Help?

- **Detailed Setup**: See [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **User Experience**: See [USER_EXPERIENCE_GUIDE.md](USER_EXPERIENCE_GUIDE.md)
- **Security**: Review [SECURITY_AUDIT.md](../SECURITY_AUDIT.md)
- **Support**: Open issue on [GitHub](https://github.com/RyanGravetteIDLA/qualtrics-lti-connector/issues)

---

## ⚡ Pro Tips

### For Instructors
- Test with a demo student account first
- Use descriptive survey names
- Set reasonable due dates
- Monitor first few submissions

### For Students  
- Complete survey in one sitting
- Don't use back button
- Check for confirmation page
- Allow 10 min for grade sync

### For Administrators
- Monitor first week closely
- Set up error alerts
- Document your configuration
- Keep credentials secure

---

**Ready to go? Choose your path above and get started!** 🎯