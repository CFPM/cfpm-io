#!/usr/bin/env node
'use strict';

const cli = require('./lib/cli');

function run() {
	let args = process.argv.slice(2);
	const command = args[0];
	cli.setup();
	if(typeof command != 'undefined' && typeof cli[command] != 'undefined'){
		args.shift();
		cli[command](args);
	}else if(typeof command != 'undefined'){
		cli.add(args);
	}else{
		cli.install();
	}
}

run();