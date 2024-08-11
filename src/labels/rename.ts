import { LinearClient } from "@linear/sdk";
import { select } from "inquirer-select-pro";
import ora from "ora";
import { Case } from "change-case-all";
import tableMultiple from "@bartheleway/inquirer-table-multiple";

const caseNames = [
	"camel",
	"capital",
	"constant",
	"dot",
	"kebab",
	"lower",
	"lowerFirst",
	"localeLower",
	"localeUpper",
	"no",
	"pascal",
	"path",
	"sentence",
	"snake",
	"sponge",
	"swap",
	"title",
	"train",
	"upper",
	"upperFirst",
] as const;

import { Argument, Command, Option } from "@commander-js/extra-typings";

export const renameCommand = new Command("rename-labels")
	.summary("Rename a set of labels")
	.description(`Rename a set of labels

Examples:

1. Remove a common prefix and format as a 'Capital Case' with whitespace trimmed.

> clinear rename-labels --case capital --ignore-unmatched --trim --pattern '^.*/(.*)$ -> $1'
"common-prefix/this-is-a-label" -> "This Is A Label"
	`)
	.requiredOption(
		"-p, --pattern <pattern>",
		"The 'match -> replace' pattern to use",
		".* -> $0",
	)
	.option("-i, --ignore-unmatched", "Skip labels that don't match the pattern")
	.addOption(
		new Option(
			"-c, --case <case>",
			"Transform the label to a specific casing",
		).choices(caseNames),
	)
	.option("-t, --trim", "Trim whitespace from the label")
	.addOption(
		new Option("-k, --api-key <apiKey>", "API key")
			.makeOptionMandatory(true)
			.env("LINEAR_API_KEY"),
	)

	.action(async (opts) => {
		const [matchPattern, replacePattern] = opts.pattern
			.split(" -> ")
			.filter(Boolean);
		const matchRegex = new RegExp(matchPattern);

		let spinner = ora({
			text: "Loading labels",
			// must be set if used with inquirer
			discardStdin: false,
		}).start();

		const linearClient = new LinearClient({
			apiKey: opts.apiKey,
		});

		const issueLabels = await linearClient.issueLabels({
			includeArchived: false,
		});

		spinner.succeed("Loaded labels");

		const labelChoices = issueLabels.nodes
			.map((label) => ({ value: label.id, name: label.name }))
			.sort((a, b) => a.name.localeCompare(b.name));

		const filterLabelChoices = (input?: string) => {
			if (!input) return labelChoices;
			return labelChoices.filter((label) => label.name.startsWith(input));
		};

		const targetLabelIds = new Set(
			await select({
				message: "Which labels do you want to rename?",
				options: filterLabelChoices,
				canToggleAll: true,
				filter: true,
				multiple: true,
			}),
		);

		if (!targetLabelIds.size) {
			throw new Error("No labels selected");
		}

		const targetLabels = labelChoices.filter((label) =>
			targetLabelIds.has(label.value),
		);

		spinner = ora({
			text: "Applying patterns",
			// must be set if used with inquirer
			discardStdin: false,
		}).start();
		const renamedLabels = [];
		for (const { name, value: id } of targetLabels) {
			const matchedName = matchRegex.exec(name);
			if (!matchedName) {
				if (opts.ignoreUnmatched) {
					continue;
				}
				throw new Error(`Label ${name} does not match pattern ${matchPattern}`);
			}
			let newName = applyMatchGroups(replacePattern, matchedName);
			if (opts.case) {
				newName = Case[opts.case](newName);
			}
			if (opts.trim) {
				newName = newName.trim();
			}
			renamedLabels.push({ id, after: newName, before: name });
		}

		if (!renamedLabels.length) {
			spinner.fail("No labels matched the pattern");
			throw new Error("No labels matched the pattern");
		}

		spinner.succeed(`Applied patterns to ${renamedLabels.length} labels`);

		const accepted = await tableMultiple({
			message: "Apply changes?",
			columns: [
				{
					title: "Yes?",
					value: 1,
				},
				{
					title: "No?",
					value: 0,
				},
			],
			rows: renamedLabels.map(({ before, after, id }) => ({
				title: `'${before}' => '${after}'`,
				value: id,
				default: [1],
			})),
			loop: true,
			multiple: false,
		});

		const acceptedIds = new Set(
			accepted
				.map(({ choice, answers }) => (answers[0] === 1 ? choice.value : null))
				.filter((x) => x !== null),
		);

		const acceptedRenamedLabels = renamedLabels.filter(({ id }) =>
			acceptedIds.has(id),
		);

		spinner = ora({
			text: "Applying changes",
			// must be set if used with inquirer
			discardStdin: false,
		}).start();
		let appliedChanges = 0;
		let errors = 0;
		for (const { id, before, after } of acceptedRenamedLabels) {
			spinner.suffixText = `(${appliedChanges}/${acceptedRenamedLabels.length})`;
			try {
				await linearClient.updateIssueLabel(id, {
					name: after,
				});
				appliedChanges++;
			} catch (e) {
				errors++;
				console.error(
					`Failed to update label <${id}> '${before}' => '${after}':\n${e}`,
				);
			}
		}
		spinner.suffixText = `(${appliedChanges}/${targetLabelIds.size})`;
		errors
			? spinner.warn(`Renamed ${appliedChanges} labels with ${errors} errors`)
			: spinner.succeed(`Renamed ${appliedChanges} labels`);

		// const accepted = await toggle({
		// 	message: `Are you sure you want to group ${targetLabelIds.size} labels under ${targetGroup?.name}?`,
		// });

		// if (!accepted) {
		// 	throw new Error("Aborted");
		// }

		// spinner = ora("Moving labels").start();
		// let movedLabels = 0;
		// for (const labelId of targetLabelIds) {
		// 	spinner.suffixText = `(${movedLabels++}/${targetLabelIds.size})`;
		// 	await linearClient.updateIssueLabel(labelId, {
		// 		parentId: targetGroupId,
		// 	});
		// }
		// spinner.suffixText = `(${movedLabels++}/${targetLabelIds.size})`;
		// spinner.succeed("All labels moved");
	});

function applyMatchGroups(template: string, groups: string[]): string {
	let result = template;
	groups.forEach((group, index) => {
		result = result.replace(new RegExp(`\\$${index}`, "g"), group);
	});
	return result;
}
