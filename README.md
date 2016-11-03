# cfpm-io

ColdFusion Package Manager [https://cfpm.io](https://cfpm.io)

#### Installation

    npm install -g cfpm-io

#### Commands

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

##### cfpm

`cfpm` installs any packages defined in the project cfpm.json file.

##### cfpm init

`cfpm init` initializes the project by creating a cfpm.json file in the current working directory. Prompts will save the project name, version, description and other fields to cfpm.json.

##### cfpm <package_name>

`cfpm <package_name>` will add the package to the cfpm.json file and install it.

##### cfpm remove <package_name>

`cfpm remove <package_name>` will remove the package from the cfpm.json file and any package files from the vendor folder.

##### cfpm clean

`cfpm clean` will remove all file and folders from the vendor folder and then install packages defined in the cfpm.json file.

##### cfpm freeze

`cfpm freeze` -- comming soon

#### Example

`cd` into the project directory.

	npm install -g cfpm-io
	cfpm init
	cfpm add micro

