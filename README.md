# Sponsor Action

Add a label to pull requests and issues submitted by sponsors.

## Inputs

### `label`

The label to apply to each issue or PR submitted by your sponsors.

### `maintainers`

A comma separate list of project maintainers that can be sponsored.

### `github_token`

GitHub automatically creates a GITHUB_TOKEN secret to use in your workflow. You use the GITHUB_TOKEN to authenticate the sponsor action workflow run.

## Example usage

on: 
  issues:
    types: [opened]

jobs:
  sponsor_job:
    runs-on: ubuntu-latest
    name: Add Sponsor Labels
    steps:
    - name: Add Sponsor Labels
      id: sponsors-labels
      uses: brianlagunas/sponsor-action@v1.0
      with:
        maintainers: 'brianlagunas,dansiegel'
        github_token: ${{ secrets.GITHUB_TOKEN }}