# User Experience Guide

This guide describes the complete user experience for all stakeholders using the Qualtrics LTI Connector.

## Table of Contents
1. [Instructor Experience](#instructor-experience)
2. [Student Experience](#student-experience)
3. [Administrator Experience](#administrator-experience)
4. [User Interface Screenshots](#user-interface-screenshots)
5. [Workflow Diagrams](#workflow-diagrams)

---

## Instructor Experience

### Initial Setup Flow

#### 1. Creating an Assignment

When an instructor creates a new assignment in Agilix Buzz:

```
1. Navigate to Course → Assignments → Add Assignment
2. Select "External Tool" as assignment type
3. Choose "Qualtrics Survey Connector" from tool list
4. Set basic assignment properties:
   - Title: "Module 3 Feedback Survey"
   - Category: "Assignments" or "Extra Credit"
   - Due Date: (optional)
5. Save assignment
```

#### 2. First Launch - Configuration

When instructor clicks the assignment for the first time:

**What They See:**
```
┌─────────────────────────────────────────────────────────┐
│            Configure Qualtrics Survey                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Course: Biology 101                                    │
│  Assignment: Module 3 Feedback Survey                   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Qualtrics Survey ID: [___________________]     │  │
│  │ ℹ️ Find this in your Qualtrics survey URL      │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Survey Name: [Module 3 Feedback_______]        │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Point Value: [100____] (0-1000)                │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  □ This is an extra credit assignment               │
│                                                         │
│  Scoring Type:                                      │
│  ○ Completion-based (full points for submitting)    │
│  ● Percentage-based (use Qualtrics scoring)         │
│  ○ Manual grading (instructor enters grades)        │
│                                                         │
│  Due Date: [2025-12-15 11:59 PM____] (Optional)    │
│                                                         │
│  [Save Configuration]  [Cancel]                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Behind the Scenes:**
- System validates instructor role from LTI claims
- Creates entry in `survey_configs` collection
- Sets up Qualtrics distribution if needed
- Activates grade passback listeners

#### 3. Subsequent Launches - Dashboard

After configuration, instructors see a dashboard:

```
┌─────────────────────────────────────────────────────────┐
│              Module 3 Feedback Survey                    │
│                    Dashboard                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 Summary Statistics                                  │
│  ┌─────────────────┬───────────────────────────────┐  │
│  │ Total Students   │ 32                            │  │
│  │ Submissions      │ 28 (87.5%)                    │  │
│  │ Average Score    │ 92.5/100                      │  │
│  │ Last Response    │ 2 hours ago                   │  │
│  └─────────────────┴───────────────────────────────┘  │
│                                                         │
│  📋 Recent Submissions                                  │
│  ┌──────────────┬───────────┬──────┬──────────────┐  │
│  │ Student      │ Submitted │ Score│ Action       │  │
│  ├──────────────┼───────────┼──────┼──────────────┤  │
│  │ Jane Smith   │ 2hr ago   │ 95   │ [View] [✓]   │  │
│  │ John Doe     │ 5hr ago   │ 88   │ [View] [✓]   │  │
│  │ Mary Johnson │ Yesterday │ 100  │ [View] [✓]   │  │
│  └──────────────┴───────────┴──────┴──────────────┘  │
│                                                         │
│  [↻ Refresh] [📥 Export CSV] [⚙️ Settings]            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Features Available:**
- Real-time submission tracking
- Manual grade override
- Export results to CSV
- View individual responses (links to Qualtrics)
- Modify survey settings

### Grade Management

Instructors can:
1. **View Grades**: See all submitted grades in dashboard
2. **Override Grades**: Click student row → adjust grade → save
3. **Bulk Actions**: Select multiple → apply curve or bonus
4. **Export Data**: Download CSV with all responses and grades

---

## Student Experience

### 1. Assignment Launch

When a student clicks the assignment in Buzz:

**What Happens:**
1. LTI launch validates student identity
2. System checks for existing submission
3. If no submission → redirect to Qualtrics
4. If submitted → show status page

### 2. Survey Experience

**First Time Taking Survey:**

```
Automatic redirect to Qualtrics...
                ↓
┌─────────────────────────────────────────────────────────┐
│                 Qualtrics Survey                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Welcome to the Module 3 Feedback Survey                │
│                                                         │
│  This survey is part of your Biology 101 course.       │
│  Your responses will be graded automatically.          │
│                                                         │
│  [Start Survey →]                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Hidden Embedded Data (automatic):**
- `ltiUserId`: student's unique ID
- `ltiContextId`: course ID
- `ltiLaunchId`: session identifier
- `courseName`: "Biology 101"

### 3. After Submission

When student completes survey:

```
┌─────────────────────────────────────────────────────────┐
│              Survey Submitted Successfully!              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ Your response has been recorded                     │
│                                                         │
│  📊 Your Score: 95/100 (95%)                           │
│                                                         │
│  This grade will appear in your Buzz gradebook         │
│  within 5-10 minutes.                                  │
│                                                         │
│  [Return to Course]                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4. Returning to Assignment

If student clicks assignment again after submitting:

```
┌─────────────────────────────────────────────────────────┐
│              Module 3 Feedback Survey                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ Status: Completed                                   │
│                                                         │
│  Submitted: March 15, 2025 at 3:45 PM                  │
│  Score: 95/100 (95%)                                   │
│                                                         │
│  This assignment has already been completed.           │
│  Your grade has been recorded in the gradebook.        │
│                                                         │
│  [View in Gradebook] [Return to Course]                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Administrator Experience

### System Monitoring

Administrators can monitor through Firebase Console:

#### 1. Function Analytics
```
┌─────────────────────────────────────────────────────────┐
│              Function Execution Metrics                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  api                    ████████████ 1,234 calls/day   │
│  pollQualtricsResponses ██████ 288 calls/day           │
│  processGradePassback   ████ 156 calls/day             │
│  cleanupSessions        █ 1 call/day                   │
│                                                         │
│  Error Rate: 0.02%     Median Latency: 234ms          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 2. Database Usage
- Monitor collection sizes
- Set up usage alerts
- Review security rules effectiveness

### Configuration Management

Admins handle:
1. **API Key Rotation**: Update environment variables
2. **Scaling**: Adjust function memory/timeout
3. **Security**: Review audit logs
4. **Maintenance**: Database cleanup policies

---

## User Interface Screenshots

### Teacher Configuration Page

**Step 1: Initial Setup**
- Clean, material-design inspired interface
- Clear field labels with help text
- Real-time validation
- Save/Cancel buttons

**Step 2: Dashboard View**
- Summary cards at top
- Data table with sorting
- Action buttons for each row
- Export functionality

### Student Views

**Launch Experience:**
1. Loading spinner (< 2 seconds)
2. Automatic redirect to Qualtrics
3. No manual steps required

**Completion Page:**
- Success message
- Score display (if applicable)
- Clear next steps

---

## Workflow Diagrams

### Instructor Workflow

```
Start
  │
  ├─→ Create Assignment
  │     │
  │     └─→ Select LTI Tool
  │           │
  │           └─→ First Launch?
  │                 │
  │                 ├─→ Yes: Configure Survey
  │                 │     │
  │                 │     └─→ Save Settings
  │                 │           │
  │                 │           └─→ View Dashboard
  │                 │
  │                 └─→ No: View Dashboard
  │                       │
  │                       ├─→ Monitor Progress
  │                       ├─→ Export Data
  │                       └─→ Override Grades
  │
  └─→ End
```

### Student Workflow

```
Start
  │
  ├─→ Click Assignment
  │     │
  │     └─→ Already Submitted?
  │           │
  │           ├─→ No: Redirect to Survey
  │           │     │
  │           │     └─→ Complete Survey
  │           │           │
  │           │           └─→ View Confirmation
  │           │                 │
  │           │                 └─→ Grade Posted
  │           │
  │           └─→ Yes: Show Status
  │                 │
  │                 └─→ Display Score
  │
  └─→ End
```

### System Workflow

```
Every 5 Minutes:
  │
  ├─→ Poll Qualtrics API
  │     │
  │     └─→ New Responses?
  │           │
  │           ├─→ Yes: Process Each
  │           │     │
  │           │     ├─→ Calculate Grade
  │           │     ├─→ Create Passback Record
  │           │     └─→ Trigger Grade Sync
  │           │
  │           └─→ No: Wait
  │
  └─→ Repeat

On Grade Passback Trigger:
  │
  ├─→ Get LTI Context
  │     │
  │     └─→ Call Agilix API
  │           │
  │           ├─→ Success: Mark Processed
  │           │
  │           └─→ Failure: Retry (3x)
  │
  └─→ End
```

---

## Best Practices for Users

### For Instructors
1. **Test First**: Always test with a sample student account
2. **Clear Instructions**: Add survey purpose in assignment description
3. **Timely Setup**: Configure before making visible to students
4. **Monitor Early**: Check first few submissions for issues

### For Students
1. **Complete in One Session**: Don't close browser mid-survey
2. **Check Completion**: Verify you see confirmation page
3. **Allow Time**: Grades appear within 5-10 minutes
4. **One Submission**: Multiple attempts not allowed by default

### For Administrators
1. **Regular Monitoring**: Check function logs weekly
2. **Update Promptly**: Keep dependencies current
3. **Backup Data**: Export Firestore regularly
4. **Test Updates**: Use staging environment first

---

## Accessibility

The system supports:
- **Screen Readers**: ARIA labels on all UI elements
- **Keyboard Navigation**: Full keyboard support
- **High Contrast**: Respects system preferences
- **Mobile Responsive**: Works on all devices

---

## Support Resources

### For All Users
- **In-App Help**: "?" icon on each page
- **Documentation**: This guide and setup guide
- **Issue Tracking**: GitHub issues

### Quick Fixes
- **"Session Expired"**: Re-launch from Buzz
- **"Survey Not Found"**: Check Survey ID with instructor
- **"Grade Not Showing"**: Wait 10 minutes, then contact support