const core = require('@actions/core');
const github = require('@actions/github');
const Octokit = require("@octokit/rest");

const octokit = Octokit({ auth: core.getInput("github-token"), baseUrl: 'https://api.github.com' });
const release = github.context.payload.release;
const owner = github.context.payload.repository.owner.login;
const repo = github.context.payload.repository.name;

async function updateMilestoneWithPreRelease(milestone) {
	const resp = await octokit.issues.updateMilestone({
		owner: owner,
		repo: repo,
		milestone_number: milestone.number,
		description: 'Pre-release: [' + release.tag_name + '](' + release.html_url + ')'
	});
	if (resp.status === 200) {
		console.log('Updated Milestone ' + milestone.title + '!');
	} else {
		console.error('Failed to Update Milestone ' + milestone.title + '. GitHub API returned Status Code: ' + resp.status);
		process.exit(1);
	}
}

async function updateMilestoneWithRelease(milestone) {
	const resp = await octokit.issues.updateMilestone({
		owner: owner,
		repo: repo,
		milestone_number: milestone.number,
		description: 'Release: [' + release.tag_name + '](' + release.html_url + ')',
		state: 'closed'
	});
	if (resp.status === 200) {
		console.log('Updated & Closed Milestone ' + milestone.title + '!');
	} else {
		console.error('Failed to Update & Close Milestone ' + milestone.title + '. GitHub API returned Status Code: ' + resp.status);
		process.exit(1);
	}
}

function doesVersionMatch(milestone, release) {
	const milestoneVersion = milestone.title.match(/\d+\.\d+\.\d+/);
	//for our mods that contain both the MC version and the mod version we need to find all matches, and use the 2nd one.
	const releaseVersion = release.tag_name.match(/\d+\.\d+\.\d+/g);
	return milestoneVersion !== null && releaseVersion !== null && milestoneVersion[0] === releaseVersion[1];
}

octokit.issues.listMilestonesForRepo({ owner: owner, repo: repo }).then((payload) => {
	const milestones = payload.data.filter((milestone) => {
		return milestone.state === 'open' && doesVersionMatch(milestone, release);
	});
	
	if (milestones.length > 0) {
		milestones.forEach((milestone) => {
			if (release.prerelease) {
				updateMilestoneWithPreRelease(milestone);
			} else {
				updateMilestoneWithRelease(milestone);
			}
		});
	} else {
		console.log('No Milestones matched the Release\'s Tag');
	}
	
}, () => {
	console.error('Unable to get Milestones for repository ' + owner + '/' + repo);
	process.exit(1);
});
