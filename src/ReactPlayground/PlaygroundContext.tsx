import React, { createContext, PropsWithChildren, useState } from "react";
import { fileName2Language } from "./utils.ts";
export interface File {
	name: string;
	value: string;
	language: string;
}

export interface Files {
	[key: string]: File;
}

export interface PlaygroundContext {
	files: Files;
	selectedFileName: string;
	setSelectedFileName: (fileName: string) => void;
	setFiles: (files: Files) => void;
	addFile: (fileName: string) => void;
	removeFile: (fileName: string) => void;
	updateFileName: (oldFileName: string, newFileName: string) => void;
}

export const PlaygroundContext = createContext<PlaygroundContext>({
	selectedFileName: "App.tsx",
} as PlaygroundContext);

const FILE_TEMPLATES = {
	typescript: (name: string) =>
		`import React from "react";\n\nexport default function ${
			name.split(".")[0]
		}() {\n  return <div>Hello from ${name}</div>;\n}`,

	javascript: (name: string) =>
		`export default function ${
			name.split(".")[0]
		}() {\n  return <div>Hello from ${name}</div>;\n}`,

	css: () => `.container {\n  padding: 20px;\n  color: #333;\n}`,

	markdown: (name: string) =>
		`# ${name.split(".")[0]}\n\n## Description\n\nAdd your content here...`,

	json: () => `{\n  "name": "project",\n  "version": "1.0.0"\n}`,

	plaintext: () => "",
};
export const PlaygroundProvider = (props: PropsWithChildren) => {
	const { children } = props;
	const [files, setFiles] = useState<Files>({});
	const [selectedFileName, setSelectedFileName] = useState<string>("App.tsx");

	const addFile = (name: string) => {
		if (files[name]) return;

		const language = fileName2Language(name);
		const templateFn =
			FILE_TEMPLATES[language as keyof typeof FILE_TEMPLATES] ||
			FILE_TEMPLATES.plaintext;

		files[name] = {
			name,
			value: templateFn(name),
			language,
		};

		setFiles({ ...files });
	};
	const removeFile = (name: string) => {
		delete files[name];
		setFiles({ ...files });
	};
	const updateFileName = (oldFileName: string, newFileName: string) => {
		if (!files[oldFileName] || !newFileName) {
			return;
		}
		//此处的value是files[oldFileName]
		const { [oldFileName]: value, ...rest } = files;
		//此处就是动态Key插入.
		const newFile = {
			[newFileName]: {
				...value,
				name: newFileName,
				language: fileName2Language(newFileName),
			},
		};
		setFiles({ ...rest, ...newFile });
	};
	return (
		<PlaygroundContext.Provider
			value={{
				files,
				selectedFileName,
				setSelectedFileName,
				setFiles,
				addFile,
				removeFile,
				updateFileName,
			}}>
			{children}
		</PlaygroundContext.Provider>
	);
};
