
<img src="./assets/logo.svg" width="256px">

[Linear.app](https://linear.app) toolbelt for those more at home on the command line.

## About
A simple CLI to help (me) manage some annoyingly manual tasks on Linear.

Originally created because using the UI to convert prefix-labels to a group 1 by 1...

![Ain't nobody got time for that](https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjZoYzJ5Nm1mNnJ1cmd0a3g2NGk5d29vMXdibTJuZ3B5YXZ2ZmM0eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/bWM2eWYfN3r20/giphy.gif)

## How to use

> Note: I'll add builds & releases soon. For now, you'll need to build from source yourself.

First we build the `clinear` binary.
```bash
mise install
bun install
bun build ./src/index.ts --compile --outfile dist/clinear
```

Then run it with `./dist/clinear` or add the binary to your `PATH`.


Instructions for creating a Linear API key can be found [here](https://developers.linear.app/docs/graphql/working-with-the-graphql-api#personal-api-keys). You can either supply a Linear API key with the `--api-key` flag or create a `.env` file with the `LINEAR_API_KEY` variable. 

## Features
- [x] Find and select labels to move to a group/parent-label
- [x] Modify label names in bulk
  - Casing
  - Pattern match & replace
- [ ] Anything else annoying
- [ ] Great suggestions / PRs 😊

### Demos
Rename labels
![Rename Labels](./assets/rename-labels.gif)

Group labels
![Group Labels](./assets/group-labels.gif)