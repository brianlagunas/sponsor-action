const core = require("@actions/core");
const github = require("@actions/github");

const query = `query ($maintainerName: String!, $after: String) { 
                  user (login: $maintainerName) {
                    sponsorshipsAsMaintainer(first: 100, after: $after) {
                      pageInfo {
                        hasNextPage
                        endCursor
                      }
                      nodes {
                        sponsorEntity {
                          ... on User {
                            id
                          }
                          ... on Organization {
                            id
                          }
                        }
                      }
                    }
                  }
                }`;

async function run() {
  try {
    const label = core.getInput("label");
    const maintainers = core.getInput("maintainers");
    const token = core.getInput("github_token");
    const client = github.getOctokit(token);

    //create the sponsor label if it does not exist
    await createLabel(client, label);

    //set the default maintainer of the repo to the owner
    let maintainerArray = [github.context.repo.owner];

    //check for hard coded maintainers
    if (maintainers != null && maintainers !== "") {
      maintainerArray = maintainers.split(",");
    }

    //get the user id of the person submitting the issue/pr
    const userId = getUserId(github.context.payload);

    //if any of the maintainers are sponsored add the label
    var isSponsor = await maintainersAreSponsored(client, maintainerArray, userId);
    if (isSponsor) {
      await addLabel(client, label);
      console.log("Label added");
    }

  } catch (error) {
    console.log(error);
    core.setFailed(error.message);
  }

  async function createLabel(client, label) {

    let repoLabels = await getLabelsForRepo(client);
    let labelNames = repoLabels.map(l => l.name);

    if (labelNames.includes(label)) {
      console.log("Label already exists");
    }
    else {
      console.log("Creating label");
      await client.issues.createLabel({
        ...github.context.repo,
        name: label,
        color: 'fedbf0'
      });
    }
  }

  async function getLabelsForRepo(client) {
    let response = await client.issues.listLabelsForRepo({
      ...github.context.repo,
      previews: ["symmetra"]
    });    
    let data = response.data;
    return data;
  }

  function getUserId(payload) {

    if (payload.issue) {
      return payload.issue.user.node_id
    }
    else if (payload.pull_request) {
      return payload.pull_request.user.node_id
    }
    else {
      throw new Error('No user id found')
    }
  }

  async function maintainersAreSponsored(client, maintainers, userId) {

    console.log("Checking if user is a sponsor");

    let isSponsored = false;
    for (let mName of maintainers) {

      isSponsored = await userIsSponsor(client, mName, userId, null);

      if (isSponsored) {
        console.log("User is sponsor for " + mName);
        break;
      }
      else{
        console.log("User is NOT a sponsor for " + mName);
      }
    }
    return isSponsored;
  }

  async function userIsSponsor(client, maintainerName, userId, after) {

    const result = await client.graphql(query, { maintainerName, after });

    const { nodes, pageInfo } = result["user"].sponsorshipsAsMaintainer

    // Check if the issue/PR creator is a sponsor
    if (nodes.find(node => node.sponsorEntity.id === userId)) {
      return true;
    }

    // We have more pages to check
    if (pageInfo.hasNextPage) {
      return userIsSponsor(client, maintainerName, userId, pageInfo.endCursor);
    }

    // We checked em all, creator is not a sponsor
    return false;
  }

  async function addLabel(client, label) {
    await client.issues.addLabels({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: github.context.issue.number,
      labels: [label]
    });
  }
}

run();