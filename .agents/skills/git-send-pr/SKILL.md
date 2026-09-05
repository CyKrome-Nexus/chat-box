---
name: git-send-pr
description: Creates feature branches, commits/cherry-picks changes, pushes to origin, automatically creates GitHub PRs using `gh pr create`, and outputs PR links and ready-to-copy PR descriptions for CyKrome Group projects when user requests "send to dev", "send to qa", "send to main", "send to prod", "send to both", or "send to all".
---

# Automated Git PR Workflow Skill with GitHub CLI (`gh`)

Use this workflow whenever the user asks to send code changes to `dev`, `qa`, `main` (prod), `both`, or `all`.

This skill automates feature branch creation, committing, pushing, and **automatically opening Pull Requests using the `gh` CLI tool** without needing manual web UI steps.

## Branch Mapping
- **`send to dev`** -> Target base branch: `dev`
- **`send to qa`** -> Target base branch: `qa`
- **`send to main`** / **`send to prod`** -> Target base branch: `main`
- **`send to both`** / **`send to qa and prod`** -> Dual targets: `qa` and `main`
- **`send to dev and qa`** -> Dual targets: `dev` and `qa`
- **`send to dev, qa and prod`** / **`send to all`** -> Triple targets: `dev`, `qa`, and `main`

---

## Workflow Steps

### Scenario 1: Single Target Branch (`dev`, `qa`, or `main`)

1. **Verify State & Working Changes**:
   - Check `git status` and `git diff`.
   - Remember the starting working branch (e.g. `CURRENT_BRANCH=$(git branch --show-current)`).

2. **Create Feature Branch**:
   - Stash uncommitted changes if needed: `git stash`.
   - Checkout base branch and pull latest:
     ```bash
     git checkout <base-branch> && git pull origin <base-branch>
     ```
   - Create dedicated feature branch:
     ```bash
     git checkout -b <branch-type>/<feature-name>-<base-branch>
     ```
     - Examples: `feat/request-tabs-dev`, `fix/kv-table-props-qa`, `chore/release-v1-main`.
   - Apply stashed changes if any: `git stash pop`.

3. **Commit & Push**:
   - Stage all relevant changes:
     ```bash
     git add .
     ```
   - Commit with a concise conventional commit message:
     ```bash
     git commit -m "<type>(<scope>): <summary>"
     ```
   - Push feature branch to origin:
     ```bash
     git push -u origin <branch-type>/<feature-name>-<base-branch>
     ```

4. **Create Pull Request using `gh` CLI**:
   - Prepare PR Title: `<type>(<scope>): <concise summary>`
   - Prepare PR Body:
     ```markdown
     ## Summary
     - <Clear bullet points of what changed>

     ## Motivation / Context
     - <Why this change was made>

     ## Testing & Verification
     - <How the change was tested and verified>

     ## Checklist
     - [x] Tested locally
     - [x] Clean compilation / type checks
     - [ ] Ready for review
     ```
   - Execute PR creation command:
     ```bash
     gh pr create --base <base-branch> --head <branch-type>/<feature-name>-<base-branch> --title "<title>" --body "<body-markdown>"
     ```
   - The CLI will output the created PR URL directly (e.g. `https://github.com/CyKrome-Nexus/Aperture/pull/42`).

5. **Return to Working Branch**:
   - Checkout the user's original branch (e.g. `git checkout $CURRENT_BRANCH` or `git checkout dev`).

6. **Output to User**:
   - Present the created PR URL clearly.
   - Provide the clean PR description codeblock ready for 1-click copying.

---

### Scenario 2: Multiple Target Branches (e.g., `qa` and `main` / `prod`)

1. **Primary Target (`qa` or `dev`) Flow**:
   - Remember the starting working branch: `CURRENT_BRANCH=$(git branch --show-current)`.
   - Checkout first base branch and pull latest:
     ```bash
     git checkout <primary-base> && git pull origin <primary-base>
     ```
   - Create feature branch:
     ```bash
     git checkout -b <branch-type>/<feature-name>-<primary-base>
     ```
   - Stage and commit changes:
     ```bash
     git add .
     git commit -m "<type>(<scope>): <summary>"
     ```
   - Record the commit hash:
     ```bash
     COMMIT_HASH=$(git rev-parse HEAD)
     ```
   - Push to origin:
     ```bash
     git push -u origin <branch-type>/<feature-name>-<primary-base>
     ```
   - Create PR 1 via `gh`:
     ```bash
     gh pr create --base <primary-base> --head <branch-type>/<feature-name>-<primary-base> --title "<title> [<primary-base>]" --body "$PR_BODY"
     ```

2. **Secondary Target (`main` / `prod`) Flow (Cherry-Pick)**:
   - Checkout second base branch and pull latest:
     ```bash
     git checkout <secondary-base> && git pull origin <secondary-base>
     ```
   - Create feature branch for secondary target:
     ```bash
     git checkout -b <branch-type>/<feature-name>-<secondary-base>
     ```
   - Cherry-pick the commit from the primary branch:
     ```bash
     git cherry-pick $COMMIT_HASH
     ```
   - If conflicts arise, resolve them cleanly, stage, and continue (`git cherry-pick --continue`).
   - Push to origin:
     ```bash
     git push -u origin <branch-type>/<feature-name>-<secondary-base>
     ```
   - Create PR 2 via `gh`:
     ```bash
     gh pr create --base <secondary-base> --head <branch-type>/<feature-name>-<secondary-base> --title "<title> [<secondary-base>]" --body "$PR_BODY"
     ```

3. **Return to Working Branch**:
   - Checkout the user's original branch (e.g. `git checkout $CURRENT_BRANCH`).

4. **Output to User**:
   - List all created PR URLs:
     - **QA PR**: `<output-url-1>`
     - **Main/Prod PR**: `<output-url-2>`
   - Provide copyable PR description block.

---

## PR Description Format Guidelines
Every PR description MUST follow this clean format inside a single copyable block with NO conversational prefix/suffix inside the block:

```markdown
## Summary
- <Clear bullet points of what changed>

## Motivation / Context
- <Why this change was made>

## Testing & Verification
- <How the change was tested and verified>

## Checklist
- [x] Tested locally
- [x] Clean compilation / type checks
- [ ] Ready for review
```

---

## Safety & Operational Rules
- **NEVER** push directly to `dev`, `qa`, `main`, or `master`. Always create a dedicated `<type>/<feature-name>-<target>` branch.
- **ALWAYS** pull the latest commits from the remote base branch before creating a feature branch.
- **ALWAYS** use `gh pr create` with explicit `--base` and `--head` flags to avoid ambiguous default mappings.
- Return to the user's working branch (e.g. `dev`) when completed.
