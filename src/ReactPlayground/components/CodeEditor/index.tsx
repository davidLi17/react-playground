import Editor, { EditorFile } from "./Editor";
import FileNameList from "./FileNameList";
export default function CodeEditor() {
	const file: EditorFile = {
		name: "davidli.tsx",
		value:
			'import React from "react";\n' +
			"\n" +
			"export default function App() {\n" +
			"  return <div>xxx</div>\n" +
			"}\n" +
			"    ",
		language: "typescript",
	};
	function onEditerChange() {
		console.log(...arguments);
	}
	return (
		<div className=" flex flex-col h-full">
			<FileNameList />
			<Editor
				file={file}
				onChange={onEditerChange}
			/>
		</div>
	);
}
