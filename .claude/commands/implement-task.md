Implement a task from a Notion page. Usage: /implement-task <notion-url-or-id>

You will be given a Notion page URL or ID as `$ARGUMENTS`. Follow each step carefully and in order.

---

## Step 1 — Fetch the Notion task

Parse the Notion page ID from `$ARGUMENTS`:
- If it looks like a full URL (contains `notion.so`), extract the ID from the end of the path (the last 32-character hex segment, ignoring any query string)
- If it looks like a plain ID already, use it as-is

Use the `notion-fetch` MCP tool with that page ID to retrieve the task details. Extract:
- **Task title** (the page title / Name property)
- **QPB ID** (the QPB-NNN identifier — check the page title or a dedicated ID property)
- **Task description / requirements** (from page content/body)
- **Page URL** (canonical Notion URL for the page)

If the fetch fails or the page cannot be found, stop and tell the user.

---

## Step 2 — Prepare the branch

Derive a branch name from the QPB ID and task title:
- Slug the title: lowercase, replace spaces and special chars with `-`, trim to ~40 chars
- Format: `qpb-{NNN}-{slug}` (e.g. `qpb-42-add-rainbow-gradient`)

Run these commands in order:
```bash
git fetch origin main
git checkout main
git pull origin main
git checkout -b <branch-name>
```

If the branch already exists locally, check it out instead.

---

## Step 3 — Rename this session

Run `/rename <task-title>` so the session is labelled with the task name.

---

## Step 4 — Implement the task

Read the task description carefully, explore the codebase as needed, and implement the required changes. Do not commit yet.

---

## Step 5 — Test

Run `/run-localhost` and verify the changes look correct. Fix any issues before proceeding.

---

## Step 6 — Open the PR

Stage and commit all changes, then push the branch and open a PR.

PR description format (Summary section only — no Test plan section):
```
Notion: [QPB-{NNN}](<page-URL>)

## Summary
<bullet points describing the changes>
```

Use `gh pr create` to open the PR. Capture the PR URL from the output.

---

## Step 7 — Update the Notion page

Using the MCP Notion tools:

1. **Set the PR property** on the page to the PR URL (use `notion-update-page` — find the correct property name for the PR/GitHub link field).
2. **Move Status to "In Review"** by updating the Status property on the page.

---

## Step 8 — Request reviews

Post a comment on the PR:
```bash
gh pr comment <pr-url> --body "@claude review and @codex review"
```

---

## Step 9 — Wait 5 minutes

Wait for automated review comments to appear. Use a shell sleep:
```bash
sleep 300
```

Then fetch the latest PR comments:
```bash
gh pr view <pr-url> --comments
```

---

## Step 10 — Apply valid feedback

Read all review comments carefully. For each comment:
- If the feedback is valid and actionable, apply the change
- If the feedback is unclear or you disagree, note it but do not apply it blindly

After applying changes, commit them to the same branch and push:
```bash
git add -p   # or specific files
git commit -m "fix: address review feedback"
git push
```

---

## Step 11 — Create follow-up tasks in Notion

If there are outstanding issues, suggestions, or out-of-scope improvements raised during the review (or that you identified during implementation), create follow-up Notion pages as sub-tasks or linked tasks on the original page:
- Use `notion-create-pages` to create each task in the same database
- Set the **Priority property to empty** (do not set it — leave it unset so the user knows it was added by you)
- Give each task a clear title and description

List what follow-ups you created (if any) in your final summary.

---

## Final summary

Report back to the user:
- Branch name and PR URL
- What was implemented
- Review feedback that was applied
- Follow-up tasks created (if any)
