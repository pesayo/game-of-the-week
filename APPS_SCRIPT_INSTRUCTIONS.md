# Game of the Week - Google Apps Script Form

This document explains how to use the Apps Script to create a Google Form for the Game of the Week schedule.

## Overview

The `game-of-the-week-form.gs` script creates a simple predictions form with:
- 30 questions (one per Game of the Week matchup)
- Question format: "Week # | Date | Time | Sheet"
- Two options per question: Team 1 or Team 2
- No extra fluff, just pick your winners!

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

1. In the function dropdown at the top, select `createGameOfTheWeekForm`
2. Click the **Run** button (▶️)
3. The first time you run it, you'll need to authorize:
   - Click "Review permissions"
   - Select your Google account
   - Click "Advanced" → "Go to [project name] (unsafe)"
   - Click "Allow"

### Step 4: Find Your Form URLs

1. After running, click **"Execution log"** at the bottom
2. You'll see output like:
   ```
   Form created successfully!
   Form URL: https://docs.google.com/forms/d/...
   Edit URL: https://docs.google.com/forms/d/.../edit
   ```
3. Copy these URLs to share or edit your forms

## Form Details

**What the form includes:**
- Name field (text input)
- 30 questions (one per Game of the Week matchup)
- Each question title: "Week # | Date | Time | Sheet"
- Each question has two choices: Team 1 or Team 2
- Limited to one response per person
- Automatically collects email addresses

**Example question:**
- **Title:** Week 3 | 11/12/2025 | 6:35 PM | Sheet 1
- **Help text:** Allan Veler vs Jim Neidhart
- **Choices:** Allan Veler, Jim Neidhart

## Customization

After creating the form, you can:
1. Open the form's **Edit URL** (from the logs)
2. Change colors and themes
3. Modify questions
4. Add your own questions at the end

To modify the schedule in the script, edit the `SCHEDULE` array at the top of the file.

## Viewing Responses

**In Google Forms:**
1. Open the form's Edit URL
2. Click the **"Responses"** tab
3. View summary charts or individual responses

**Link to Google Sheets:**
1. In the Responses tab, click the Sheets icon (📊)
2. Click "Create a new spreadsheet"
3. All responses will automatically populate the sheet

## Troubleshooting

**"Authorization Required" Error:**
- This is normal for first run
- Follow the authorization steps in Step 3

**Can't find the form URLs:**
- Check the Execution log at the bottom
- If logs are cleared, check your Google Drive
- Forms are saved to "My Drive" by default

**Want to recreate the form:**
- Delete the old form from Google Drive
- Run the script again

---

That's it! Simple and straightforward. 🥌
