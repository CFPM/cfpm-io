'use strict';
const _ = require('lodash');
const fs = require('fs');
const glob = require("glob")
const path = require('path');
const shell = require('shelljs');
const prompt = require('prompt');
const request = require('request');

if (!shell.which('git')) {
	console.log('Sorry, cfpm requires git');
	exit(1);
}

const packageSchema = {
	properties: {
		name: {
			description: `Please pick a package name`,
			pattern: /^[a-z0-9\-]+$/,
			message: `Name must be only be lowercase letters, numbers, or dashes`,
			required: true
		},
		author : {
			description: `Author's name`
		},
		version : {
			description: `Version`,
			default: `v0.0.1`
		},
		homepage: {
			description: `Homepage URL`
		},
		description: {
			description: `Package Description`
		},
		keywords: {
			description: `Keywords (comma separated)`
		},
		license: {
			description: `License`,
			default: `MIT`
		}
	}
};

const commandList = `

Available Commands
==================

cfpm
	Installs cfpm

cfpm init
	Builds out cfpm.json package file

cfpm <package_name> (<version>)
	Installs or updates any packages in cfpm.json

cfpm remove <package_name>
	Removes cfpm package

cfpm clean
	Cleans the vendor folder

==================

`;

const cli = {};

cli.setup = () => {
	cli.data = {};
	cli.data.projectFolder = path.resolve();
	cli.data.userFolder = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'] + '/.cfpm';
	cli.data.project = {};
	cli.data.packages = [];

	cli.makeFolder(cli.data.userFolder);
	cli.makeFolder(`${cli.data.userFolder}/packages`);
	cli.projectPackages = [];
	cli.loadPackageJSONLocally();

	if(typeof cli.data.project.name == 'undefined'){
		cli.data.project.name = 'project_' + Date.now();
		cli.updatePackageJSON();
	}
}

cli.loadPackageJSONLocally = (dir) => {
	dir = typeof dir == 'undefined' ? cli.data.projectFolder : dir;
	cli.data.project = cli.loadPackageJSON(dir);
}

cli.loadPackageJSON = (dir) => {
	dir = typeof dir == 'undefined' ? cli.data.projectFolder : dir;
	if(fs.existsSync(`${dir}/cfpm.json`)){
		try{
			const packageJSON = fs.readFileSync(`${dir}/cfpm.json`);
			return JSON.parse(packageJSON);
		}catch(error){
			console.log('Invalid Package JSON.');
		}
	}
	return {};
}

cli.updatePackageJSON = (data) => {
	data = typeof data == 'undefined' ? {} : data;
	_.merge(cli.data.project, data);
	try{
		fs.writeFileSync(`${cli.data.projectFolder}/cfpm.json`, JSON.stringify(cli.data.project, null, 4));
	}catch(error){
		console.log('Failed to write Package JSON');
	}
}

cli.makeFolder = (folder) => {
	if(!fs.existsSync(folder)){
		try{
			fs.mkdirSync(folder);
		}catch(error){
			console.log(`Could not create Folder: ${folder}`);
		}
	}
}

cli.init = () => {
	prompt.start();
	prompt.get(packageSchema, (error, result) => {
		if(error) {
			return error;
		}
		cli.updatePackageJSON(result);
	});
}

cli.help = () => {
	console.log(commandList);
}

cli.clean = () => {
	shell.rm('-rf', `${cli.data.projectFolder}/vendor/*`);
	cli.install();
}

cli.remove = (params) => {
	const name = params.length > 0 ? params[0] : '';

	if(name == ''){
		console.log('please provide a package name');
		return;
	}

	console.log(`removing package ${name}`);

	delete cli.data.project.packages[name];
	cli.updatePackageJSON();
	shell.rm('-rf', `${cli.data.projectFolder}/vendor/${name}`);
}

cli.install = (params) => {
	console.log(`cfpming`);
	cli.getPackages(cli.data.project.packages, `${cli.data.userFolder}/packages/${cli.data.project.name}`);
}

cli.add = (params) => {
	const name = params.length > 0 ? params[0] : '';
	const version = params.length > 1 ? params[1] : '*';

	if(name == ''){
		console.log('please provide a package name');
		return;
	}

	console.log(`adding package ${name}`);

	let packages = _.get(cli, 'data.project.packages', {});

	if(name != ''){
		packages = _.get(cli, 'data.project.packages', {});
		packages[name] = version;
		cli.updatePackageJSON({packages: packages});
	}
	cli.data.packages.push({name: name, version: version, dir: `${cli.data.userFolder}/packages/${cli.data.project.name}`});
	cli.installLoop();
}

cli.getPackages = (packages, dir) => {
	for(const name in packages){
		cli.data.packages.push({name: name, version: packages[name], dir: dir});
	}
	cli.installLoop();
}

cli.installLoop = () => {
	if(cli.data.packages.length > 0){
		const packet = cli.data.packages.shift();
		cli.loadPackageData(packet);
	}else{
		cli.installCleanup();
	}
}

cli.loadPackageData = (packet) => {
	request(`https://cfpm.io/api/${packet.name}/${packet.version}`, (error, response, body) => {
		if(error){
			console.log(error.message);
			cli.loadPackageData(packet);
		}
		try{
			const data = JSON.parse(body);
			if(typeof data.error != 'undefined'){
				console.log('================================');
				console.log(data.error);
				console.log('================================');
				cli.installLoop();
			}
			if(typeof data.version == 'undefined'){
				cli.loadPackageData(packet);
				return;
			}
			console.log(`loading package data for package ${packet.name}`);
			packet.branch = packet.version;
			if(packet.version == 'head'){
				packet.branch = data.default_branch;
			}else{
				packet.branch = `tags/${data.version}`;
			}
			console.log(`version ${data.version} of ${packet.name}`);
			packet.repo = data.repo_url;
			cli.checkPackage(packet);
		}catch(error){
			console.log(error.message);
			cli.loadPackageData(packet);
		}
	});
}

cli.checkPackage = (packet) => {
	console.log(`checking local files for package ${packet.name}`);
	cli.makeFolder(`${packet.dir}`);
	if(!fs.existsSync(`${packet.dir}/${packet.name}`)){
		cli.downloadPackage(packet);
	}else if(!fs.existsSync(`${packet.dir}/${packet.name}/.git`)){
		shell.rm('-rf', `${dir}/${name}`);
		cli.downloadPackage(packet);
	}
	cli.updatePackage(packet);
}

cli.downloadPackage = (packet) => {
	console.log(`downloading files for package ${packet.name}`);
	shell.exec(`git clone ${packet.repo} ${packet.dir}/${packet.name}`);
	request(`https://cfpm.io/api/download/${packet.name}/${packet.version}`);
}

cli.updatePackage = (packet) => {
	console.log(`updating local files for package ${packet.name}`);
	shell.exec(`cd ${packet.dir}/${packet.name} && git checkout ${packet.branch}`, {silent: true});
	shell.exec(`cd ${packet.dir}/${packet.name} && git pull origin ${packet.branch}`, {silent: true});
	const localPackage = cli.loadPackageJSON(`${packet.dir}/${packet.name}`);
	const packages = _.get(localPackage, 'packages', {});
	cli.getPackages(packages, `${packet.dir}/${packet.name}/vendor`);
}

cli.installCleanup = () => {
	console.log('install cleanup');
	cli.makeFolder(`${cli.data.projectFolder}/vendor`);
	glob(`${cli.data.userFolder}/packages/${cli.data.project.name}/**/*!(.git*)`, (error, files) => {
		if(error){
			console.log(error);
		}
		for(var i = 0; i < files.length; i++){
			const file = files[i];
			if(fs.lstatSync(file).isFile()){
				const newfile = file.replace(`${cli.data.userFolder}/packages/${cli.data.project.name}`, `${cli.data.projectFolder}/vendor`);
				const filepath = path.dirname(newfile);
				try{
					shell.mkdir('-p', filepath);
				}catch(error){}
				shell.cp('-Rfu', file, newfile);
			}
		}
		cli.downloadCFC();
	});
}

cli.downloadCFC = () => {
	request('https://cfpm.io/install/cfc', (error, response, body) => {
		if(error){
			console.log(error.message);
		}
		fs.writeFileSync(`${cli.data.projectFolder}/cfpm.cfc`, body);
		console.log('installation done');
	});
}

module.exports = cli;