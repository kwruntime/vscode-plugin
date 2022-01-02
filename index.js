// node_modules/typescript/lib/tsserverlibrary.d.ts
var fs = require("fs")
var Path= require("path")
var crypto = require("crypto")
var os = require("os")
var Child = require("child_process")
var redirects = new Map()


let logPath = Path.join(os.homedir(), "kwruntime-plugin-error.log")
let logPath1 = Path.join(os.homedir(), "kwruntime-plugin-names.log")

let st = fs.createWriteStream(logPath, {
	flags: "a"
})
st.on("error", function(){})


function create(info){

	//fs.appendFileSync("/home/ubuntu/init", String(Date.now()) + "\n")

	const urlFromGh = function(request){
		if(request.startsWith("gh+/") || request.startsWith("github+/") || request.startsWith("github://")){
            let parts = request.split("/")
            if(request.startsWith("github://"))
                parts.shift()
            let parts1 = parts[2].split("@")
            let name = parts1[0]
            let version = parts1[1] || "master"
            let url = `https://raw.githubusercontent.com/${parts[1]}/${name}/${version}/${parts.slice(3).join("/")}`
            return url
        }
		if(request.startsWith("gl+/") || request.startsWith("gitlab+/") || request.startsWith("gitlab://")){


            let parts = request.split("/")
            if(request.startsWith("gitlab://"))
                parts.shift()
            let parts1 = parts[2].split("@")
            let name = parts1[0]
            let version = parts1[1] || "main"
            //let url = `https://raw.githubusercontent.com/${parts[1]}/${name}/${version}/${parts.slice(3).join("/")}`
			let url = `https://gitlab.com/${parts[1]}/${name}/-/raw/${version}/${parts.slice(3).join("/")}`
            return url
        }
		return request
	}


	const cacheModules = {}

	const getRedirect = function(mod){
		let file = ''
		if(mod.location) file = mod.location.folder
		if(mod.filename) file = mod.filename
		if(file.endsWith(".ts")) file = file.substring(0, file.length - 3)
		return file
	}

	const load = function(names){

		var res = {}, nams = []
		for(var i=0;i<names.length;i++){
			var name = names[i]
			if(cacheModules["types=" + name]){
				res[name] = cacheModules["types=" + name]
			}
			else if(cacheModules[name]){
				res[name] = cacheModules[name]
			}
			else{
				if(name.startsWith("npm://") && (!name.startsWith("npm://@types/"))){
					var npmmod = name.substring(6)
					var y = npmmod.lastIndexOf("@")
					var mname = npmmod.substring(0, y)
					var mversion = npmmod.substring(y+1)
					if(!mname.startsWith("@")){
						nams.push( "npm://@types/" + mname + "@" + mversion)
					}
				}
				nams.push(name)
			}
		}


		if(nams.length){
			var m = function(a){
				return '"' + a + '"'
			}
			var result = Child.execSync('kwrun --cache ' + nams.map(m).join(" "))
			var str = result.toString()
			var z = str.indexOf("[kwruntime] Cache result =")

			if(z >= 0){
				var json = str.substring(z + 26)
				var mod_infos = null
				try{
					mod_infos = JSON.parse(json)
				}catch(e){
					throw new Error("Failed parse JSON:" + json)
				}

				for(var y=0;y<mod_infos.length;y++){
					var mod_info = mod_infos[y]
					var name = nams[y]
					if(mod_info && mod_info.imports){
						for(var i=0;i<mod_info.imports.length;i++){
							var imp = mod_info.imports[i]
							var req = imp.request
							if(req){
								if(cacheModules[req] === undefined){
									cacheModules[req] = getRedirect(imp)
								}
								if(req.startsWith("npm://@types/")){
									req = "types=npm://" + req.substring(13)
									if(!imp.error){
										if(cacheModules[req] === undefined){
											cacheModules[req] = getRedirect(imp)
										}
									}
								}
							}
						}

						res[name] = cacheModules[name] = getRedirect(mod_info)
						if(name.startsWith("npm://@types/")){
							name = "types=npm://" + name.substring(13)
							if(!mod_info.error){
								if(cacheModules[name] === undefined){
									cacheModules[name] = getRedirect(mod_info)
								}
							}
						}
					}
				}
			}
		}


		return res
	}

	const resolveModuleNames = info.languageServiceHost.resolveModuleNames.bind(info.languageServiceHost)

	/*
	var originalRead = info.languageServiceHost.readFile
	info.languageServiceHost.readFile = function(path, encoding){
		let res = originalRead.apply(info.languageServiceHost, arguments)
		fs.appendFileSync("/home/ubuntu/fileread", JSON.stringify({
			path,
			encoding,
			res
		})+ "\n")
		return res
	}
	*/



	info.languageServiceHost.resolveModuleNames = function (moduleNames, containingFile, reusedNames, redirectedReferences, options) {
		try{
			var redirect = redirects.get(containingFile)
			var originals = [], newmods = []

			for(var i=0;i<moduleNames.length;i++){
				var name = moduleNames[i]
				var y = name.indexOf("##")
				if(y >= 0){
					name = name.substring(0, y)
				}

				originals.push(name)
				name = urlFromGh(name)


				// saber si viene de un archivo de red
				if(redirect){
					var href = ''
					if(name.startsWith("./") || name.startsWith("/") || name.startsWith("../")){
						// URL Resolve
						href = (new URL(name, redirect)).href
						name = href
					}
				}

				newmods[i] = name
			}

			var mods1 = newmods.filter(function(name){
				return name.startsWith("http://") || name.startsWith("https://") || name.startsWith("npm://")
			})
			var mods2 = []
			var resImports = {}, resFiles = {}
			if(mods1.length){
				for(var z=0;z<mods1.length;z++){
					var name = mods1[z]
					var file = ''
					if(name.startsWith("http://") || name.startsWith("https://")){
						var uri = new URL(name)
						var id = crypto.createHash("md5").update(name).digest('hex')
						var ext = Path.extname(uri.pathname)
						var rname = Path.basename(uri.pathname)
						if(!ext) rname += ".ts"
						file = Path.join(os.homedir(), ".kawi", "genv2", "network", id + "-" +  rname)
						resFiles[name] = file
						if(fs.existsSync(file)){
							resImports[name] = file
							cacheModules[name] = file
						}
						else{
							file = ''
						}
					}
					if(!file) mods2.push(name)
				}

				if(mods2.length)
					Object.assign(resImports, load(mods2))
			}

			for(var i=0;i<moduleNames.length;i++){
				var name = newmods[i]
				if(name.startsWith("http://") || name.startsWith("https://") || name.startsWith("npm://")){


					var file = resImports["types="+name]
					if(!file){
						file = resImports[name]
					}
					if(!file){
						file= resFiles[name]
					}

					if(file){
						moduleNames[i] = file
						redirects.set(file, name)
					}

				}
				else{

					var ext = Path.extname(name)
					if(ext == ".ts"){

						if(name.startsWith("./") || name.startsWith("../")){
							//var nname = Path.basename(name, ext)
							name = Path.join(Path.dirname(containingFile), name.substring(0, name.length - 3))
						}

					}
					moduleNames[i] = name
				}

			}
		}catch(e){
			st.write(JSON.stringify({
				moduleNames,
				message:e.message,
				stack: e.stack.substring(0, 200)
			}, null, '\t') + "\n")
		}
		finally{
			fs.writeFileSync(logPath1, JSON.stringify(cacheModules, null, '\t'))
		}

		let res = resolveModuleNames(moduleNames, containingFile, reusedNames, redirectedReferences, options)
		return res
	}
	return info.languageService
}


module.exports = function ({ /** @type {tssl} */ typescript }) {
	return {create}
};
