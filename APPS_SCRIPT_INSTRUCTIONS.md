# Game of the Week - Google Apps Script Forms

This document explains how to use the Apps Script to create Google Forms for the Game of the Week schedule.

## Overview

The `game-of-the-week-form.gs` script creates three types of Google Forms:

1. **Predictions Form** - Let participants predict winners for all 30 Game of the Week matchups
2. **Results Entry Form** - Enter actual game results after they're played
3. **Attendance Form** - Track who plans to attend each week's games

## Setup Instructions

### Step 1: Open Google Apps Script

1. Go to [script.google.com](https://script.google.com)
2. Click **"New Project"**
3. You'll see a blank code editor

### Step 2: Add the Code

1. Delete any default code in the editor
2. Open the `game-of-the-week-form.gs` file
3. Copy all the code
4. Paste it into the Apps Script editor
5. Give your project a name (e.g., "Game of the Week Forms")
6. Click the **Save** icon (💾)

### Step 3: Run the Script

#### To Create the Predictions Form:
1. In the function dropdown at the top, select `createGameOfTheWeekForm`
2. Click the **Run** button (▶️)
3. The first time you run it, you'll need to authorize:
   - Click "Review permissions"
   - Select your Google account
   - Click "Advanced" → "Go to [project name] (unsafe)"
   - Click "Allow"

#### To Create All Three Forms at Once:
1. Select `createAllForms` from the function dropdown
2. Click **Run** (▶️)

### Step 4: Find Your Form URLs

1. After running, click **"Execution log"** at the bottom
2. You'll see output like:
   ```
   Form created successfully!
   Form URL: https://docs.google.com/forms/d/...
   Edit URL: https://docs.google.com/forms/d/.../edit
   ```
3. Copy these URLs to share or edit your forms

## Forms Description

### 1. Predictions Form (`createGameOfTheWeekForm`)

**Purpose:** Collect predictions for all 30 Game of the Week matchups

**Features:**
- 30 multiple-choice questions (one per game)
- Organized by week with page breaks
- Shows game details (time, sheet, key matchup indicator)
- Tracks respondent confidence level
- Limited to one response per person
- Automatically collects email addresses

**Best For:**
- Season-long prediction competitions
- Engaging league members
- Creating friendly rivalries

### 2. Results Entry Form (`createGameOfTheWeekResultsForm`)

**Purpose:** Record actual game results after they're played

**Features:**
- Week selector
- Date entry
- Team names and winner selection
- Optional final score entry
- Game notes/highlights section

**Best For:**
- Official record keeping
- Creating a results database
- Comparing predictions to actual results

### 3. Attendance Form (`createGameOfTheWeekAttendanceForm`)

**Purpose:** Track attendance for Game of the Week events

**Features:**
- Week selector
- Attendance likelihood scale
- Game preference checkboxes
- Can submit multiple responses (one per week)
- Collects email for follow-up

**Best For:**
- Planning for spectators
- Building excitement for key matchups
- Understanding which games draw the most interest

## Customization Options

### Changing Form Settings

After creating a form, you can customize it further:

1. Open the form's **Edit URL** (from the logs)
2. Use the Form editor to:
   - Change colors and themes
   - Modify questions
   - Add images or videos
   - Set up email notifications
   - View response summary

### Modifying the Script

You can edit the script to:

**Change the schedule data:**
```javascript
// Edit the SCHEDULE array at the top of the script
const SCHEDULE = [
  {week: 3, date: "11/12/2025", time: "6:35 PM", ...},
  // Add/modify games here
];
```

**Add custom questions:**
```javascript
// In the createGameOfTheWeekForm function, add:
form.addTextItem()
  .setTitle('Your custom question')
  .setRequired(true);
```

**Change form titles:**
```javascript
form.setTitle('Your Custom Title');
form.setDescription('Your custom description...');
```

## Viewing Responses

### Option 1: In Google Forms
1. Open the form's Edit URL
2. Click the **"Responses"** tab
3. View summary charts or individual responses

### Option 2: Link to Google Sheets
1. In the Responses tab, click the Sheets icon (📊)
2. Click "Create a new spreadsheet"
3. All responses will automatically populate the sheet
4. You can create charts, pivot tables, and analysis

## Tips and Best Practices

### For Predictions Form:
- Share the form **before Week 3** starts
- Give participants a deadline (e.g., before first game)
- Consider creating a separate form per phase if you want to allow updates

### For Results Form:
- Designate one person as the "official recorder"
- Enter results promptly after each week
- Export to Sheets for automatic scoring

### For Attendance Form:
- Send the form link **weekly** via email/social media
- Send reminders 2-3 days before Game of the Week
- Use responses to plan seating/viewing areas

## Combining with Your Schedule

The schedule data in the script matches your CSV and HTML files:
- ✅ All 30 Game of the Week matchups (Weeks 3-17)
- ✅ Correct times (6:35 PM / 8:45 PM)
- ✅ Correct sheet numbers (1-6)
- ✅ Key matchup indicators (⭐)
- ✅ Three-phase structure (1/2/3 games per week)

## Troubleshooting

### "Authorization Required" Error
- This is normal for first run
- Follow the authorization steps in Step 3

### "Form creation failed"
- Check that you have a Google account
- Verify you have permission to create forms
- Try running the script again

### Can't find the form URLs
- Check the Execution log at the bottom
- If logs are cleared, check your Google Drive
- Forms are saved to "My Drive" by default

### Want to delete and recreate a form
- Delete the form from Google Drive
- Run the script again with the same function

## Support

For issues with:
- **Google Apps Script:** [Apps Script Documentation](https://developers.google.com/apps-script)
- **Google Forms:** [Forms Help Center](https://support.google.com/docs/topic/9054603)
- **This Script:** Review the code comments or modify as needed

## Advanced: Automated Form Distribution

Want to automatically send forms via email? Add this function:

```javascript
function sendPredictionsFormEmail() {
  const formUrl = 'YOUR_FORM_URL_HERE';
  const recipients = 'email1@example.com, email2@example.com';

  MailApp.sendEmail({
    to: recipients,
    subject: '🥌 Game of the Week Predictions - Season 2025-2026',
    htmlBody:
      '<h2>Time to Make Your Predictions!</h2>' +
      '<p>The Game of the Week schedule is here. Make your predictions for all 30 games:</p>' +
      '<p><a href="' + formUrl + '">Click here to submit predictions</a></p>' +
      '<p>Good luck!</p>'
  });

  Logger.log('Emails sent successfully!');
}
```

---

**Ready to create your forms?** Follow the setup instructions above and have fun with the 2025-2026 season! 🥌
