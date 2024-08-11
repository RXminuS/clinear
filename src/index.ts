import { program } from "@commander-js/extra-typings";
import { groupCommand as labelsGroupCommand } from "./labels/group";
import { renameCommand as labelsRenameCommand } from "./labels/rename";
import gradient from "gradient-string";

// This obviously is the most important thing about a CLI app...
const ivritLogo =
	" __               _  _                           \n \\ \\         ___ | |(_) _ __    ___   __ _  _ __ \n  \\ \\       / __|| || || '_ \\  / _ \\ / _` || '__|\n  / /      | (__ | || || | | ||  __/| (_| || |   \n /_/_____   \\___||_||_||_| |_| \\___| \\__,_||_|   \n   |_____|                                       \n";
const magicBlue = "#5E6AD2";
const mercuryWhite = "#F4F5F8";
const gradientLogo = gradient(magicBlue, mercuryWhite)(ivritLogo, {
	interpolation: "hsv",
});
const clinear = program
	.name("clinear")
	.description("Linear terminal utilities")
	.addHelpText("beforeAll", gradientLogo)
	.version("0.1.0");

clinear.addCommand(labelsGroupCommand);
clinear.addCommand(labelsRenameCommand);

clinear.parse();
