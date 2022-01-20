# kwruntime-plugin

Plugin for vscode, atom-ide, or any editor using typescript server, that allows ```Intellisense``` for importing from other protocols, no only from files. 
Made for usage with [kwruntime](https://github.com/kwruntime/core).

## Without kwruntime-plugin



## How to use?

1. Install [kwruntime](https://github.com/kwruntime/core).
2. Create a tsconfig.json with this content (see the plugins section): 

```json 
{
	"compilerOptions": {
		"moduleResolution": "node",
		"module": "es2020",
		"target": "esnext",
		"outDir": "out",
		"lib": [
			"es6",
			"dom"
		],
		"esModuleInterop": true,
		"sourceMap": true,
		"paths": {
			"*.ts": "*"
		},
		"plugins": [{ "enableForWorkspaceTypeScriptVersions": true, "name": "kwruntime-plugin" }]
	},
	"exclude": [
		"node_modules",
		".vscode-test"
	]
}
``` 

3. Install this repo as the plugin. In your package.json add dev dependency

```json 
...
	"typescript": "^4.5.x",
	"kwruntime-plugin": "git://github.com/kwruntime/vscode-plugin"
```

4. Install the module
5. If you use ```vscode``` make CTRL+SHIFT+P and search "Select Typescript version", and please select the local node_modules installed typescript package.