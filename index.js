#!/usr/bin/env node
'use strict';
const cli = require('./lib/cli');
const commands = {
	init: cli.init,
	add: cli.add,
	remove: cli.remove,
	clean: cli.clean
}

function run() {
	let args = process.argv.slice(2);
	const command = args[0];
	cli.setup();
	if(typeof command != 'undefined' && typeof commands[command] != 'undefined'){
		args.shift();
		commands[command](args);
	}else if(typeof command != 'undefined'){
		console.log(`Command '${command}' is not a valid command`);
		cli.help();
	}else{
		cli.install();
	}
}

run();