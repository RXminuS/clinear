import { LinearClient } from "@linear/sdk";
import { select, type SelectFilterItems } from "inquirer-select-pro";
import { confirm } from "@inquirer/prompts";
import assert from "node:assert";
import ora from "ora";

import { Command, Option } from "@commander-js/extra-typings";

export const groupCommand = new Command("group-labels")
	.summary("Group a set of labels under another label")
	.addOption(
		new Option("-k, --api-key <apiKey>", "API key")
			.makeOptionMandatory(true)
			.env("LINEAR_API_KEY"),
	)
	// .setOptionValue("apiKey", Bun.env.LINEAR_API_KEY)
	// .requiredOption("-k, --api-key <apiKey>", "API key")
	.action(async (opts) => {
		let spinner = ora("Loading labels").start();
		const linearClient = new LinearClient({
			apiKey: opts.apiKey,
		});

		const issueLabels = await linearClient.issueLabels({
			includeArchived: false,
		});
		const orphanedLabels = issueLabels.nodes.filter(
			(label) => !label.isGroup && !label.parent,
		);

		spinner.succeed("Loaded labels");

		const orphanedLabelChoices = orphanedLabels
			.map((label) => ({ value: label.id, name: label.name }))
			.sort((a, b) => a.name.localeCompare(b.name));

		const filterOrphanedLabelChoices = (input?: string) => {
			if (!input) return orphanedLabelChoices;
			return orphanedLabelChoices.filter((label) =>
				label.name.startsWith(input),
			);
		};

		const targetLabelIds = new Set(
			await select({
				message: "Which labels do you want to move?",
				options: filterOrphanedLabelChoices,
				canToggleAll: true,
				filter: true,
				multiple: true,
			}),
		);

		if (!targetLabelIds.size) {
			throw new Error("No labels selected");
		}

		const groupChoices = issueLabels.nodes
			.filter((label) => !targetLabelIds.has(label.id))
			.map((label) => ({
				value: label.id,
				name: `${label.isGroup ? "group" : "label"} | ${label.name}`,
			}))
			.sort((a, b) => a.name.localeCompare(b.name));

		const filteredGroupChoices = (input?: string) => {
			if (!input) return groupChoices;
			return groupChoices.filter((label) => {
				const [type, name] = label.name.split("|").map((str) => str.trim());
				return type.startsWith(input) || name.startsWith(input);
			});
		};

		const targetGroupId = await select({
			message: `Which group do you want to move ${targetLabelIds.size} labels to?`,
			options: filteredGroupChoices,
			required: true,
			multiple: false,
			filter: true,
		});

		const targetGroup = issueLabels.nodes.find(
			(label) => label.id === targetGroupId,
		);
		assert(targetGroup);

		const accepted = await confirm({
			message: `Are you sure you want to group ${targetLabelIds.size} labels under ${targetGroup?.name}?`,
		});

		if (!accepted) {
			throw new Error("Aborted");
		}

		spinner = ora({
			text: "Moving labels",
			// must be set if used with inquirer
			discardStdin: false,
		}).start();
		let movedLabels = 0;
		for (const labelId of targetLabelIds) {
			try {
				spinner.suffixText = `(${movedLabels++}/${targetLabelIds.size})`;
				await linearClient.updateIssueLabel(labelId, {
					parentId: targetGroupId,
				});
			} catch (e) {
				console.error(`Failed to move label <${labelId}>:\n${e}`);
			}
		}
		spinner.suffixText = `(${movedLabels++}/${targetLabelIds.size})`;
		spinner.succeed("All labels moved");
	});
